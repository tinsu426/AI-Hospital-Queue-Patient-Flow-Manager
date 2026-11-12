const db = require('../config/db');
const { emitDoctorStatusChanged } = require('../socket/socketManager');

async function getAllDoctors(req, res, next) {
  try {
    const { departmentId, status } = req.query;
    let sql = `
      SELECT doc.*, u.full_name, u.email, u.username,
             d.name as department_name, d.code as department_code,
             COUNT(CASE WHEN qt.status IN ('WAITING', 'CALLED', 'SERVING') THEN 1 END) as active_patient_count
      FROM doctors doc
      JOIN users u ON doc.user_id = u.id
      JOIN departments d ON doc.department_id = d.id
      LEFT JOIN queue_tickets qt ON doc.id = qt.doctor_id AND qt.issued_at::DATE = CURRENT_DATE
      WHERE doc.is_active = TRUE
    `;
    const params = [];

    if (departmentId) {
      params.push(departmentId);
      sql += ` AND doc.department_id = $${params.length}`;
    }

    if (status) {
      params.push(status);
      sql += ` AND doc.status = $${params.length}`;
    }

    sql += `
      GROUP BY doc.id, u.full_name, u.email, u.username, d.name, d.code
      ORDER BY d.name, doc.room_number;
    `;

    const result = await db.query(sql, params);
    res.json({
      success: true,
      count: result.rows.length,
      doctors: result.rows,
    });
  } catch (err) {
    next(err);
  }
}

async function getDoctorById(req, res, next) {
  try {
    const { id } = req.params;

    const docRes = await db.query(`
      SELECT doc.*, u.full_name, u.email, u.username,
             d.name as department_name, d.code as department_code
      FROM doctors doc
      JOIN users u ON doc.user_id = u.id
      JOIN departments d ON doc.department_id = d.id
      WHERE doc.id = $1;
    `, [id]);

    if (docRes.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Doctor not found.' });
    }

    const doctor = docRes.rows[0];

    // Schedules
    const schedRes = await db.query(`
      SELECT * FROM doctor_schedules WHERE doctor_id = $1 ORDER BY day_of_week ASC;
    `, [id]);

    // Active Queue for Doctor
    const queueRes = await db.query(`
      SELECT qt.*, p.patient_id_display, p.first_name, p.last_name, p.date_of_birth, p.gender, p.blood_group
      FROM queue_tickets qt
      JOIN patients p ON qt.patient_id = p.id
      WHERE qt.doctor_id = $1 AND qt.status IN ('CALLED', 'SERVING', 'LAB_COMPLETED')
         OR (qt.department_id = $2 AND qt.status = 'WAITING' AND qt.doctor_id IS NULL)
      ORDER BY 
        CASE qt.status WHEN 'SERVING' THEN 1 WHEN 'CALLED' THEN 2 WHEN 'LAB_COMPLETED' THEN 3 ELSE 4 END,
        CASE qt.priority WHEN 'EMERGENCY' THEN 1 WHEN 'URGENT' THEN 2 ELSE 3 END,
        qt.issued_at ASC;
    `, [id, doctor.department_id]);

    res.json({
      success: true,
      doctor,
      schedules: schedRes.rows,
      activeQueue: queueRes.rows,
    });
  } catch (err) {
    next(err);
  }
}

async function updateDoctorStatus(req, res, next) {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const validStatuses = ['AVAILABLE', 'BUSY', 'ON_BREAK', 'OFF_DUTY'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: `Invalid status. Must be one of [${validStatuses.join(', ')}].`,
      });
    }

    const result = await db.query(`
      UPDATE doctors
      SET status = $1, updated_at = CURRENT_TIMESTAMP
      WHERE id = $2
      RETURNING *;
    `, [status, id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Doctor not found.' });
    }

    const updatedDoctor = result.rows[0];

    // Broadcast doctor status change via Socket.IO
    emitDoctorStatusChanged(updatedDoctor);

    res.json({
      success: true,
      message: `Doctor status updated to ${status}.`,
      doctor: updatedDoctor,
    });
  } catch (err) {
    next(err);
  }
}

async function updateDoctorSchedule(req, res, next) {
  try {
    const { id } = req.params;
    const { schedules } = req.body; // array of { dayOfWeek, startTime, endTime, maxPatients }

    if (!Array.isArray(schedules)) {
      return res.status(400).json({ success: false, message: 'Schedules must be an array.' });
    }

    for (const s of schedules) {
      await db.query(`
        INSERT INTO doctor_schedules (doctor_id, day_of_week, start_time, end_time, max_patients)
        VALUES ($1, $2, $3, $4, $5)
        ON CONFLICT (doctor_id, day_of_week) DO UPDATE
          SET start_time = EXCLUDED.start_time,
              end_time = EXCLUDED.end_time,
              max_patients = EXCLUDED.max_patients;
      `, [id, s.dayOfWeek, s.startTime, s.endTime, s.maxPatients || 30]);
    }

    const updated = await db.query(`
      SELECT * FROM doctor_schedules WHERE doctor_id = $1 ORDER BY day_of_week ASC;
    `, [id]);

    res.json({
      success: true,
      message: 'Doctor schedules updated.',
      schedules: updated.rows,
    });
  } catch (err) {
    next(err);
  }
}

async function assignPatientToDoctor(req, res, next) {
  try {
    const { id: doctorId } = req.params;
    const { ticketId } = req.body;

    if (!ticketId) {
      return res.status(400).json({ success: false, message: 'ticketId is required.' });
    }

    const result = await db.query(`
      UPDATE queue_tickets
      SET doctor_id = $1
      WHERE id = $2
      RETURNING *;
    `, [doctorId, ticketId]);

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Queue ticket not found.' });
    }

    res.json({
      success: true,
      message: 'Patient assigned to doctor.',
      ticket: result.rows[0],
    });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  getAllDoctors,
  getDoctorById,
  updateDoctorStatus,
  updateDoctorSchedule,
  assignPatientToDoctor,
};
