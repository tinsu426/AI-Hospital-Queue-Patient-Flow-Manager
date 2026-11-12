const db = require('../config/db');

async function getAllDepartments(req, res, next) {
  try {
    const result = await db.query(`
      SELECT 
        d.*,
        COUNT(DISTINCT doc.id) as total_doctors,
        COUNT(DISTINCT CASE WHEN doc.status = 'AVAILABLE' THEN doc.id END) as available_doctors,
        COUNT(DISTINCT CASE WHEN qt.status IN ('WAITING', 'CALLED') AND qt.issued_at::DATE = CURRENT_DATE THEN qt.id END) as waiting_count,
        COUNT(DISTINCT CASE WHEN qt.status = 'SERVING' AND qt.issued_at::DATE = CURRENT_DATE THEN qt.id END) as serving_count
      FROM departments d
      LEFT JOIN doctors doc ON d.id = doc.department_id AND doc.is_active = TRUE
      LEFT JOIN queue_tickets qt ON d.id = qt.department_id
      WHERE d.is_active = TRUE
      GROUP BY d.id
      ORDER BY d.name;
    `);

    res.json({
      success: true,
      count: result.rows.length,
      departments: result.rows,
    });
  } catch (err) {
    next(err);
  }
}

async function getDepartmentById(req, res, next) {
  try {
    const { id } = req.params;
    const result = await db.query('SELECT * FROM departments WHERE id = $1', [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Department not found.' });
    }
    res.json({ success: true, department: result.rows[0] });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  getAllDepartments,
  getDepartmentById,
};
