const db = require('../config/db');
const {
  emitReferralCreated,
  emitReferralStatusUpdated,
  emitReferralCompleted,
  emitQueueStatusUpdated,
  emitTicketCreated,
} = require('../socket/socketManager');
const { recordMovement } = require('../services/movementService');

/**
 * Generate sequential lab ticket number
 */
async function generateLabTicketNumber(labDeptId) {
  const countRes = await db.query(`
    SELECT COUNT(*) as count 
    FROM queue_tickets 
    WHERE department_id = $1 AND issued_at::DATE = CURRENT_DATE;
  `, [labDeptId]);

  const seq = parseInt(countRes.rows[0].count, 10) + 1;
  return `LAB-${String(seq).padStart(3, '0')}`;
}

async function createReferral(req, res, next) {
  const client = await db.getClient();
  try {
    const {
      patientId,
      referringDoctorId,
      sourceQueueTicketId,
      testType,
      priority,
      clinicalNotes,
    } = req.body;

    if (!patientId || !referringDoctorId || !sourceQueueTicketId || !testType) {
      return res.status(400).json({
        success: false,
        message: 'patientId, referringDoctorId, sourceQueueTicketId, and testType are required.',
      });
    }

    await client.query('BEGIN');

    // 1. Locate Laboratory department ID
    const labDeptRes = await client.query("SELECT id FROM departments WHERE code = 'LAB'");
    if (labDeptRes.rows.length === 0) {
      throw new Error('Laboratory department not found.');
    }
    const labDeptId = labDeptRes.rows[0].id;

    // 2. Automatically generate linked laboratory queue ticket
    const countRes = await client.query(`
      SELECT COUNT(*) as count 
      FROM queue_tickets 
      WHERE department_id = $1 AND issued_at::DATE = CURRENT_DATE;
    `, [labDeptId]);
    const labSeq = parseInt(countRes.rows[0].count, 10) + 1;
    const labTicketNumber = `LAB-${String(labSeq).padStart(3, '0')}`;

    const validPriority = ['NORMAL', 'URGENT', 'EMERGENCY'].includes(priority) ? priority : 'NORMAL';

    const labTicketRes = await client.query(`
      INSERT INTO queue_tickets (
        ticket_number, patient_id, department_id, priority, status, notes
      ) VALUES ($1, $2, $3, $4, 'WAITING', $5)
      RETURNING *;
    `, [labTicketNumber, patientId, labDeptId, validPriority, `Lab Order: ${testType}`]);

    const labTicket = labTicketRes.rows[0];

    // 3. Update source doctor queue ticket to REFERRED_TO_LAB
    await client.query(`
      UPDATE queue_tickets 
      SET status = 'REFERRED_TO_LAB' 
      WHERE id = $1;
    `, [sourceQueueTicketId]);

    // 4. Create lab referral record
    const referralRes = await client.query(`
      INSERT INTO lab_referrals (
        patient_id, referring_doctor_id, source_queue_ticket_id, lab_queue_ticket_id,
        test_type, priority, clinical_notes, status
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, 'PENDING')
      RETURNING *;
    `, [
      patientId,
      referringDoctorId,
      sourceQueueTicketId,
      labTicket.id,
      testType,
      validPriority,
      clinicalNotes || null,
    ]);

    const referral = referralRes.rows[0];

    // 5. Log movement
    await recordMovement(
      patientId,
      sourceQueueTicketId,
      'DOCTOR_ROOM',
      'LABORATORY',
      'REFERRED_TO_LAB',
      `Doctor ordered ${testType} (${validPriority})`
    );

    await client.query('COMMIT');

    // Fetch joined referral details
    const fullReferral = await getFullReferralData(referral.id);

    // Socket.IO Notifications
    emitTicketCreated(labTicket);
    emitReferralCreated(fullReferral);

    res.status(201).json({
      success: true,
      message: 'Laboratory referral created and lab queue ticket generated.',
      referral: fullReferral,
      labTicket,
    });
  } catch (err) {
    await client.query('ROLLBACK');
    next(err);
  } finally {
    client.release();
  }
}

async function getLabWorkbenchQueue(req, res, next) {
  try {
    const referralsRes = await db.query(`
      SELECT lr.*, 
             p.patient_id_display, p.first_name, p.last_name, p.date_of_birth, p.gender, p.blood_group,
             u.full_name as doctor_name, doc.room_number,
             qt_lab.ticket_number as lab_ticket_number,
             qt_source.ticket_number as source_ticket_number
      FROM lab_referrals lr
      JOIN patients p ON lr.patient_id = p.id
      JOIN doctors doc ON lr.referring_doctor_id = doc.id
      JOIN users u ON doc.user_id = u.id
      LEFT JOIN queue_tickets qt_lab ON lr.lab_queue_ticket_id = qt_lab.id
      LEFT JOIN queue_tickets qt_source ON lr.source_queue_ticket_id = qt_source.id
      WHERE lr.status IN ('PENDING', 'SAMPLE_COLLECTED', 'PROCESSING')
      ORDER BY 
        CASE lr.priority WHEN 'EMERGENCY' THEN 1 WHEN 'URGENT' THEN 2 ELSE 3 END,
        lr.requested_at ASC;
    `);

    res.json({
      success: true,
      count: referralsRes.rows.length,
      referrals: referralsRes.rows,
    });
  } catch (err) {
    next(err);
  }
}

async function getDoctorReferrals(req, res, next) {
  try {
    const { doctorId } = req.params;

    const referralsRes = await db.query(`
      SELECT lr.*, 
             p.patient_id_display, p.first_name, p.last_name, p.gender,
             qt_lab.ticket_number as lab_ticket_number,
             qt_source.ticket_number as source_ticket_number
      FROM lab_referrals lr
      JOIN patients p ON lr.patient_id = p.id
      LEFT JOIN queue_tickets qt_lab ON lr.lab_queue_ticket_id = qt_lab.id
      LEFT JOIN queue_tickets qt_source ON lr.source_queue_ticket_id = qt_source.id
      WHERE lr.referring_doctor_id = $1
      ORDER BY lr.requested_at DESC;
    `, [doctorId]);

    res.json({
      success: true,
      count: referralsRes.rows.length,
      referrals: referralsRes.rows,
    });
  } catch (err) {
    next(err);
  }
}

async function updateReferralStatus(req, res, next) {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const validStatuses = ['PENDING', 'SAMPLE_COLLECTED', 'PROCESSING', 'CANCELLED'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ success: false, message: `Invalid status. Must be one of [${validStatuses.join(', ')}].` });
    }

    const updateRes = await db.query(`
      UPDATE lab_referrals
      SET status = $1
      WHERE id = $2
      RETURNING *;
    `, [status, id]);

    if (updateRes.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Referral not found.' });
    }

    const fullReferral = await getFullReferralData(id);

    // Update the associated lab queue ticket status
    if (fullReferral.lab_queue_ticket_id) {
      const ticketStatus = status === 'PROCESSING' ? 'SERVING' : 'WAITING';
      await db.query(`UPDATE queue_tickets SET status = $1 WHERE id = $2`, [ticketStatus, fullReferral.lab_queue_ticket_id]);
    }

    // Broadcast
    emitReferralStatusUpdated(fullReferral);

    res.json({
      success: true,
      message: `Referral status updated to ${status}.`,
      referral: fullReferral,
    });
  } catch (err) {
    next(err);
  }
}

async function completeReferral(req, res, next) {
  const client = await db.getClient();
  try {
    const { id } = req.params;
    const { resultsSummary } = req.body;

    if (!resultsSummary) {
      return res.status(400).json({ success: false, message: 'resultsSummary is required to complete lab test.' });
    }

    await client.query('BEGIN');

    // 1. Complete referral
    const refRes = await client.query(`
      UPDATE lab_referrals
      SET status = 'COMPLETED',
          results_summary = $1,
          completed_at = CURRENT_TIMESTAMP
      WHERE id = $2
      RETURNING *;
    `, [resultsSummary, id]);

    if (refRes.rows.length === 0) {
      throw new Error('Referral not found.');
    }

    const referral = refRes.rows[0];

    // 2. Complete lab queue ticket
    if (referral.lab_queue_ticket_id) {
      await client.query(`
        UPDATE queue_tickets
        SET status = 'COMPLETED',
            completed_at = CURRENT_TIMESTAMP
        WHERE id = $1;
      `, [referral.lab_queue_ticket_id]);
    }

    // 3. CRITICAL: Automatically return patient to referring doctor!
    // Set source queue ticket status to LAB_COMPLETED (Ready for doctor to review results)
    await client.query(`
      UPDATE queue_tickets
      SET status = 'LAB_COMPLETED',
          notes = CONCAT(COALESCE(notes, ''), ' [Lab results returned: ready for review]')
      WHERE id = $1;
    `, [referral.source_queue_ticket_id]);

    // 4. Log movement
    await recordMovement(
      referral.patient_id,
      referral.source_queue_ticket_id,
      'LABORATORY',
      'DOCTOR_ROOM',
      'LAB_COMPLETED',
      'Specimen analyzed. Results submitted; patient returned to doctor review queue.'
    );

    await client.query('COMMIT');

    const fullReferral = await getFullReferralData(id);

    // Fetch updated doctor source ticket
    const doctorTicketRes = await db.query('SELECT * FROM queue_tickets WHERE id = $1', [referral.source_queue_ticket_id]);
    const doctorTicket = doctorTicketRes.rows[0];

    // Broadcasts
    emitReferralCompleted(fullReferral);
    if (doctorTicket) {
      emitQueueStatusUpdated(doctorTicket);
    }

    res.json({
      success: true,
      message: 'Laboratory test completed. Patient returned to referring doctor.',
      referral: fullReferral,
      doctorTicket,
    });
  } catch (err) {
    await client.query('ROLLBACK');
    next(err);
  } finally {
    client.release();
  }
}

async function getFullReferralData(referralId) {
  const res = await db.query(`
    SELECT lr.*, 
           p.patient_id_display, p.first_name, p.last_name, p.gender, p.blood_group,
           u.full_name as doctor_name, doc.room_number,
           qt_lab.ticket_number as lab_ticket_number,
           qt_source.ticket_number as source_ticket_number
    FROM lab_referrals lr
    JOIN patients p ON lr.patient_id = p.id
    JOIN doctors doc ON lr.referring_doctor_id = doc.id
    JOIN users u ON doc.user_id = u.id
    LEFT JOIN queue_tickets qt_lab ON lr.lab_queue_ticket_id = qt_lab.id
    LEFT JOIN queue_tickets qt_source ON lr.source_queue_ticket_id = qt_source.id
    WHERE lr.id = $1;
  `, [referralId]);
  return res.rows[0];
}

module.exports = {
  createReferral,
  getLabWorkbenchQueue,
  getDoctorReferrals,
  updateReferralStatus,
  completeReferral,
};
