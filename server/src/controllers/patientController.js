const db = require('../config/db');
const { recordMovement } = require('../services/movementService');

/**
 * Generate a unique formatted Patient ID
 * Format: PAT-YYYYMMDD-XXXX (e.g. PAT-20261111-4821)
 */
function generatePatientId() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const randomSuffix = Math.floor(1000 + Math.random() * 9000);
  return `PAT-${year}${month}${day}-${randomSuffix}`;
}

async function registerPatient(req, res, next) {
  try {
    const {
      firstName,
      lastName,
      dateOfBirth,
      gender,
      phone,
      emergencyContactName,
      emergencyContactPhone,
      bloodGroup,
      allergies,
      medicalNotes,
    } = req.body;

    if (!firstName || !lastName || !dateOfBirth || !gender || !phone) {
      return res.status(400).json({
        success: false,
        message: 'First name, last name, date of birth, gender, and phone are required.',
      });
    }

    let patientIdDisplay = generatePatientId();
    // Safety check for collision
    let exists = true;
    while (exists) {
      const check = await db.query('SELECT 1 FROM patients WHERE patient_id_display = $1', [patientIdDisplay]);
      if (check.rows.length === 0) exists = false;
      else patientIdDisplay = generatePatientId();
    }

    const insertQuery = `
      INSERT INTO patients (
        patient_id_display, first_name, last_name, date_of_birth, gender,
        phone, emergency_contact_name, emergency_contact_phone, blood_group,
        allergies, medical_notes
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      RETURNING *;
    `;

    const result = await db.query(insertQuery, [
      patientIdDisplay,
      firstName.trim(),
      lastName.trim(),
      dateOfBirth,
      gender,
      phone.trim(),
      emergencyContactName || null,
      emergencyContactPhone || null,
      bloodGroup || null,
      allergies || null,
      medicalNotes || null,
    ]);

    const newPatient = result.rows[0];

    // Log arrival movement
    await recordMovement(newPatient.id, null, 'EXTERNAL', 'RECEPTION', 'REGISTERED', 'Patient registered at intake');

    res.status(201).json({
      success: true,
      message: 'Patient registered successfully.',
      patient: newPatient,
    });
  } catch (err) {
    next(err);
  }
}

async function searchPatients(req, res, next) {
  try {
    const { query } = req.query;
    let sql = 'SELECT * FROM patients ';
    const params = [];

    if (query && query.trim() !== '') {
      const searchTerm = `%${query.trim()}%`;
      sql += `
        WHERE patient_id_display ILIKE $1
           OR phone ILIKE $1
           OR first_name ILIKE $1
           OR last_name ILIKE $1
           OR (first_name || ' ' || last_name) ILIKE $1
      `;
      params.push(searchTerm);
    }

    sql += ' ORDER BY created_at DESC LIMIT 50;';

    const result = await db.query(sql, params);
    res.json({
      success: true,
      count: result.rows.length,
      patients: result.rows,
    });
  } catch (err) {
    next(err);
  }
}

async function getPatientById(req, res, next) {
  try {
    const { id } = req.params;

    const patientRes = await db.query('SELECT * FROM patients WHERE id = $1', [id]);
    if (patientRes.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Patient not found.' });
    }

    const patient = patientRes.rows[0];

    // Fetch queue ticket history
    const ticketsRes = await db.query(`
      SELECT qt.*, d.name as department_name, d.code as department_code,
             u.full_name as doctor_name, doc.room_number
      FROM queue_tickets qt
      JOIN departments d ON qt.department_id = d.id
      LEFT JOIN doctors doc ON qt.doctor_id = doc.id
      LEFT JOIN users u ON doc.user_id = u.id
      WHERE qt.patient_id = $1
      ORDER BY qt.issued_at DESC;
    `, [id]);

    // Fetch lab referrals history
    const referralsRes = await db.query(`
      SELECT lr.*, u.full_name as doctor_name, doc.room_number
      FROM lab_referrals lr
      JOIN doctors doc ON lr.referring_doctor_id = doc.id
      JOIN users u ON doc.user_id = u.id
      WHERE lr.patient_id = $1
      ORDER BY lr.requested_at DESC;
    `, [id]);

    // Fetch movements history
    const movementsRes = await db.query(`
      SELECT pm.*, qt.ticket_number
      FROM patient_movements pm
      LEFT JOIN queue_tickets qt ON pm.queue_ticket_id = qt.id
      WHERE pm.patient_id = $1
      ORDER BY pm.timestamp DESC;
    `, [id]);

    res.json({
      success: true,
      patient,
      history: {
        tickets: ticketsRes.rows,
        referrals: referralsRes.rows,
        movements: movementsRes.rows,
      },
    });
  } catch (err) {
    next(err);
  }
}

async function updatePatient(req, res, next) {
  try {
    const { id } = req.params;
    const {
      firstName,
      lastName,
      dateOfBirth,
      gender,
      phone,
      emergencyContactName,
      emergencyContactPhone,
      bloodGroup,
      allergies,
      medicalNotes,
    } = req.body;

    const updateQuery = `
      UPDATE patients
      SET first_name = COALESCE($1, first_name),
          last_name = COALESCE($2, last_name),
          date_of_birth = COALESCE($3, date_of_birth),
          gender = COALESCE($4, gender),
          phone = COALESCE($5, phone),
          emergency_contact_name = COALESCE($6, emergency_contact_name),
          emergency_contact_phone = COALESCE($7, emergency_contact_phone),
          blood_group = COALESCE($8, blood_group),
          allergies = COALESCE($9, allergies),
          medical_notes = COALESCE($10, medical_notes),
          updated_at = CURRENT_TIMESTAMP
      WHERE id = $11
      RETURNING *;
    `;

    const result = await db.query(updateQuery, [
      firstName,
      lastName,
      dateOfBirth,
      gender,
      phone,
      emergencyContactName,
      emergencyContactPhone,
      bloodGroup,
      allergies,
      medicalNotes,
      id,
    ]);

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Patient not found.' });
    }

    res.json({
      success: true,
      message: 'Patient profile updated.',
      patient: result.rows[0],
    });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  registerPatient,
  searchPatients,
  getPatientById,
  updatePatient,
};
