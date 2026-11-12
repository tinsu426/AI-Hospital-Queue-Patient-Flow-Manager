const db = require('../config/db');

async function recordMovement(patientId, queueTicketId, fromStation, toStation, status, notes = null) {
  try {
    const query = `
      INSERT INTO patient_movements (patient_id, queue_ticket_id, from_station, to_station, status, notes)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *;
    `;
    const res = await db.query(query, [patientId, queueTicketId, fromStation, toStation, status, notes]);
    return res.rows[0];
  } catch (err) {
    console.error('Error logging patient movement:', err);
    // Non-blocking: continue workflow even if movement logging encountered an issue
    return null;
  }
}

async function getPatientMovements(patientId) {
  const query = `
    SELECT pm.*, qt.ticket_number 
    FROM patient_movements pm
    LEFT JOIN queue_tickets qt ON pm.queue_ticket_id = qt.id
    WHERE pm.patient_id = $1
    ORDER BY pm.timestamp ASC;
  `;
  const res = await db.query(query, [patientId]);
  return res.rows;
}

module.exports = {
  recordMovement,
  getPatientMovements,
};
