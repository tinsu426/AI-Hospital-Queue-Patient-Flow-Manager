const db = require('../config/db');
const {
  emitTicketCreated,
  emitTicketCalled,
  emitQueueStatusUpdated,
  emitPriorityEscalated,
} = require('../socket/socketManager');
const { recordMovement } = require('../services/movementService');
const { predictTicketWaitTime } = require('../services/aiService');

/**
 * Generate next sequential ticket number for department
 * e.g. GEN-001, PED-004
 */
async function generateNextTicketNumber(departmentId) {
  const deptRes = await db.query('SELECT code FROM departments WHERE id = $1', [departmentId]);
  if (deptRes.rows.length === 0) throw new Error('Department not found.');
  const code = deptRes.rows[0].code;

  const countRes = await db.query(`
    SELECT COUNT(*) as count 
    FROM queue_tickets 
    WHERE department_id = $1 AND issued_at::DATE = CURRENT_DATE;
  `, [departmentId]);

  const seq = parseInt(countRes.rows[0].count, 10) + 1;
  const seqFormatted = String(seq).padStart(3, '0');
  return `${code}-${seqFormatted}`;
}

async function issueTicket(req, res, next) {
  try {
    const { patientId, departmentId, doctorId, priority, notes } = req.body;

    if (!patientId || !departmentId) {
      return res.status(400).json({ success: false, message: 'patientId and departmentId are required.' });
    }

    const ticketNumber = await generateNextTicketNumber(departmentId);
    const validPriority = ['NORMAL', 'URGENT', 'EMERGENCY'].includes(priority) ? priority : 'NORMAL';

    const insertQuery = `
      INSERT INTO queue_tickets (
        ticket_number, patient_id, department_id, doctor_id, priority, status, notes
      ) VALUES ($1, $2, $3, $4, $5, 'WAITING', $6)
      RETURNING *;
    `;

    const ticketRes = await db.query(insertQuery, [
      ticketNumber,
      patientId,
      departmentId,
      doctorId || null,
      validPriority,
      notes || null,
    ]);

    const ticket = ticketRes.rows[0];

    // Calculate AI estimated wait time
    let aiEstimate;
    try {
      aiEstimate = await predictTicketWaitTime(ticket.id);
      ticket.estimated_wait_minutes = aiEstimate.estimated_wait_minutes;
    } catch {
      ticket.estimated_wait_minutes = 15;
    }

    // Log movement
    await recordMovement(
      patientId,
      ticket.id,
      'RECEPTION',
      'TRIAGE_WAITING',
      'QUEUED',
      `Issued ticket ${ticketNumber} (${validPriority})`
    );

    // Fetch full ticket details for broadcast
    const fullTicket = await getFullTicketData(ticket.id);

    // Socket.IO Broadcast
    emitTicketCreated(fullTicket);

    res.status(201).json({
      success: true,
      message: 'Queue ticket issued successfully.',
      ticket: fullTicket,
      aiEstimate,
    });
  } catch (err) {
    next(err);
  }
}

async function getDepartmentQueue(req, res, next) {
  try {
    const { deptId } = req.params;

    const ticketsRes = await db.query(`
      SELECT qt.*, p.patient_id_display, p.first_name, p.last_name, p.date_of_birth, p.gender, p.blood_group,
             u.full_name as doctor_name, doc.room_number, d.name as department_name, d.code as department_code
      FROM queue_tickets qt
      JOIN patients p ON qt.patient_id = p.id
      JOIN departments d ON qt.department_id = d.id
      LEFT JOIN doctors doc ON qt.doctor_id = doc.id
      LEFT JOIN users u ON doc.user_id = u.id
      WHERE qt.department_id = $1 
        AND qt.issued_at::DATE = CURRENT_DATE
        AND qt.status IN ('WAITING', 'CALLED', 'SERVING', 'REFERRED_TO_LAB', 'LAB_COMPLETED')
      ORDER BY 
        CASE qt.status WHEN 'SERVING' THEN 1 WHEN 'CALLED' THEN 2 WHEN 'LAB_COMPLETED' THEN 3 ELSE 4 END,
        CASE qt.priority WHEN 'EMERGENCY' THEN 1 WHEN 'URGENT' THEN 2 ELSE 3 END,
        qt.issued_at ASC;
    `, [deptId]);

    // Summary counters
    const waiting = ticketsRes.rows.filter(t => t.status === 'WAITING').length;
    const serving = ticketsRes.rows.filter(t => t.status === 'SERVING');
    const called = ticketsRes.rows.filter(t => t.status === 'CALLED');

    res.json({
      success: true,
      departmentId: deptId,
      counts: {
        totalActive: ticketsRes.rows.length,
        waiting,
        serving: serving.length,
        called: called.length,
      },
      currentServing: serving.length > 0 ? serving[0].ticket_number : null,
      tickets: ticketsRes.rows,
    });
  } catch (err) {
    next(err);
  }
}

async function getActiveHospitalQueues(req, res, next) {
  try {
    const activeRes = await db.query(`
      SELECT qt.*, p.patient_id_display, p.first_name, p.last_name, p.gender,
             u.full_name as doctor_name, doc.room_number, d.name as department_name, d.code as department_code
      FROM queue_tickets qt
      JOIN patients p ON qt.patient_id = p.id
      JOIN departments d ON qt.department_id = d.id
      LEFT JOIN doctors doc ON qt.doctor_id = doc.id
      LEFT JOIN users u ON doc.user_id = u.id
      WHERE qt.issued_at::DATE = CURRENT_DATE
        AND qt.status IN ('WAITING', 'CALLED', 'SERVING', 'REFERRED_TO_LAB', 'LAB_COMPLETED')
      ORDER BY 
        CASE qt.priority WHEN 'EMERGENCY' THEN 1 WHEN 'URGENT' THEN 2 ELSE 3 END,
        qt.issued_at ASC;
    `);

    res.json({
      success: true,
      count: activeRes.rows.length,
      tickets: activeRes.rows,
    });
  } catch (err) {
    next(err);
  }
}

async function updatePriority(req, res, next) {
  try {
    const { id } = req.params;
    const { priority } = req.body;

    if (!['NORMAL', 'URGENT', 'EMERGENCY'].includes(priority)) {
      return res.status(400).json({ success: false, message: 'Invalid priority value.' });
    }

    const result = await db.query(`
      UPDATE queue_tickets
      SET priority = $1
      WHERE id = $2
      RETURNING *;
    `, [priority, id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Ticket not found.' });
    }

    const fullTicket = await getFullTicketData(id);

    // Recalculate wait time based on escalated priority
    await predictTicketWaitTime(id);

    // Broadcast priority change
    emitPriorityEscalated(fullTicket);

    res.json({
      success: true,
      message: `Priority updated to ${priority}.`,
      ticket: fullTicket,
    });
  } catch (err) {
    next(err);
  }
}

async function callTicket(req, res, next) {
  try {
    const { id } = req.params;
    const { doctorId, roomNumber } = req.body;

    const updateRes = await db.query(`
      UPDATE queue_tickets
      SET status = 'CALLED',
          called_at = CURRENT_TIMESTAMP,
          doctor_id = COALESCE($1, doctor_id)
      WHERE id = $2
      RETURNING *;
    `, [doctorId || null, id]);

    if (updateRes.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Ticket not found.' });
    }

    const fullTicket = await getFullTicketData(id);

    // Log movement
    await recordMovement(
      fullTicket.patient_id,
      id,
      'WAITING_AREA',
      'DOCTOR_ROOM',
      'CALLED',
      `Called to ${roomNumber || fullTicket.room_number || 'Consultation Room'}`
    );

    // Broadcast ticket called event to TV billboard and department
    emitTicketCalled({
      ticket_id: fullTicket.id,
      ticket_number: fullTicket.ticket_number,
      department_id: fullTicket.department_id,
      department_name: fullTicket.department_name,
      room_number: roomNumber || fullTicket.room_number || 'Room 1',
      doctor_name: fullTicket.doctor_name,
      priority: fullTicket.priority,
    });

    res.json({
      success: true,
      message: `Ticket ${fullTicket.ticket_number} called.`,
      ticket: fullTicket,
    });
  } catch (err) {
    next(err);
  }
}

async function startServingTicket(req, res, next) {
  try {
    const { id } = req.params;
    const { doctorId } = req.body;

    const updateRes = await db.query(`
      UPDATE queue_tickets
      SET status = 'SERVING',
          served_at = CURRENT_TIMESTAMP,
          doctor_id = COALESCE($1, doctor_id)
      WHERE id = $2
      RETURNING *;
    `, [doctorId || null, id]);

    if (updateRes.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Ticket not found.' });
    }

    const fullTicket = await getFullTicketData(id);

    // If doctor assigned, update doctor status to BUSY
    if (fullTicket.doctor_id) {
      await db.query("UPDATE doctors SET status = 'BUSY' WHERE id = $1", [fullTicket.doctor_id]);
    }

    // Broadcast status change
    emitQueueStatusUpdated(fullTicket);

    res.json({
      success: true,
      message: `Started serving ticket ${fullTicket.ticket_number}.`,
      ticket: fullTicket,
    });
  } catch (err) {
    next(err);
  }
}

async function completeTicket(req, res, next) {
  try {
    const { id } = req.params;

    const updateRes = await db.query(`
      UPDATE queue_tickets
      SET status = 'COMPLETED',
          completed_at = CURRENT_TIMESTAMP
      WHERE id = $1
      RETURNING *;
    `, [id]);

    if (updateRes.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Ticket not found.' });
    }

    const fullTicket = await getFullTicketData(id);

    // If doctor was assigned, return doctor status to AVAILABLE
    if (fullTicket.doctor_id) {
      await db.query("UPDATE doctors SET status = 'AVAILABLE' WHERE id = $1", [fullTicket.doctor_id]);
    }

    // Log final movement
    await recordMovement(
      fullTicket.patient_id,
      id,
      'DOCTOR_ROOM',
      'DISCHARGED',
      'COMPLETED',
      'Consultation completed and patient discharged'
    );

    // Broadcast status change
    emitQueueStatusUpdated(fullTicket);

    res.json({
      success: true,
      message: `Ticket ${fullTicket.ticket_number} completed.`,
      ticket: fullTicket,
    });
  } catch (err) {
    next(err);
  }
}

/**
 * PUBLIC TV BILLBOARD FEED
 * Rule: Show queue numbers, department, and room only. Zero PII!
 */
async function getPublicBillboardFeed(req, res, next) {
  try {
    const result = await db.query(`
      SELECT 
        qt.ticket_number,
        d.name as department_name,
        d.code as department_code,
        COALESCE(doc.room_number, 'Station') as room_number,
        qt.status,
        qt.priority,
        qt.called_at,
        qt.served_at
      FROM queue_tickets qt
      JOIN departments d ON qt.department_id = d.id
      LEFT JOIN doctors doc ON qt.doctor_id = doc.id
      WHERE qt.issued_at::DATE = CURRENT_DATE
        AND qt.status IN ('CALLED', 'SERVING', 'WAITING')
      ORDER BY 
        CASE qt.status WHEN 'CALLED' THEN 1 WHEN 'SERVING' THEN 2 ELSE 3 END,
        qt.called_at DESC NULLS LAST,
        qt.issued_at ASC
      LIMIT 25;
    `);

    // Grouping by department for clean screen presentation
    const calledNow = result.rows.filter(r => r.status === 'CALLED');
    const currentlyServing = result.rows.filter(r => r.status === 'SERVING');
    const waitingQueue = result.rows.filter(r => r.status === 'WAITING').slice(0, 15);

    res.json({
      success: true,
      timestamp: new Date().toISOString(),
      calledNow,
      currentlyServing,
      waitingQueue,
    });
  } catch (err) {
    next(err);
  }
}

// Internal helper to fetch full joined ticket data
async function getFullTicketData(ticketId) {
  const res = await db.query(`
    SELECT qt.*, p.patient_id_display, p.first_name, p.last_name, p.gender, p.blood_group,
           u.full_name as doctor_name, doc.room_number, d.name as department_name, d.code as department_code
    FROM queue_tickets qt
    JOIN patients p ON qt.patient_id = p.id
    JOIN departments d ON qt.department_id = d.id
    LEFT JOIN doctors doc ON qt.doctor_id = doc.id
    LEFT JOIN users u ON doc.user_id = u.id
    WHERE qt.id = $1;
  `, [ticketId]);
  return res.rows[0];
}

module.exports = {
  issueTicket,
  getDepartmentQueue,
  getActiveHospitalQueues,
  updatePriority,
  callTicket,
  startServingTicket,
  completeTicket,
  getPublicBillboardFeed,
};
