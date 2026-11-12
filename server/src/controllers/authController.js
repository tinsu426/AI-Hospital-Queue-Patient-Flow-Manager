const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../config/db');
const config = require('../config/config');

async function login(req, res, next) {
  try {
    const { username, password } = req.body;
    if (!username || !password) {
      return res.status(400).json({ success: false, message: 'Username and password are required.' });
    }

    const userRes = await db.query(`
      SELECT u.*, d.id as doctor_id, d.room_number, d.specialization, d.department_id, d.status as doctor_status
      FROM users u
      LEFT JOIN doctors d ON u.id = d.user_id
      WHERE u.username = $1 AND u.is_active = TRUE;
    `, [username]);

    if (userRes.rows.length === 0) {
      return res.status(401).json({ success: false, message: 'Invalid credentials or inactive account.' });
    }

    const user = userRes.rows[0];
    const isPasswordValid = await bcrypt.compare(password, user.password_hash);
    if (!isPasswordValid) {
      return res.status(401).json({ success: false, message: 'Invalid credentials.' });
    }

    const tokenPayload = {
      id: user.id,
      username: user.username,
      email: user.email,
      fullName: user.full_name,
      role: user.role,
      doctorId: user.doctor_id || null,
      departmentId: user.department_id || null,
    };

    const token = jwt.sign(tokenPayload, config.jwt.secret, {
      expiresIn: config.jwt.expiresIn,
    });

    res.json({
      success: true,
      token,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        fullName: user.full_name,
        role: user.role,
        doctor: user.doctor_id ? {
          id: user.doctor_id,
          roomNumber: user.room_number,
          specialization: user.specialization,
          departmentId: user.department_id,
          status: user.doctor_status
        } : null,
      },
    });
  } catch (err) {
    next(err);
  }
}

async function getMe(req, res, next) {
  try {
    const userRes = await db.query(`
      SELECT u.id, u.username, u.email, u.full_name, u.role,
             d.id as doctor_id, d.room_number, d.specialization, d.department_id, d.status as doctor_status
      FROM users u
      LEFT JOIN doctors d ON u.id = d.user_id
      WHERE u.id = $1 AND u.is_active = TRUE;
    `, [req.user.id]);

    if (userRes.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'User not found.' });
    }

    const user = userRes.rows[0];
    res.json({
      success: true,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        fullName: user.full_name,
        role: user.role,
        doctor: user.doctor_id ? {
          id: user.doctor_id,
          roomNumber: user.room_number,
          specialization: user.specialization,
          departmentId: user.department_id,
          status: user.doctor_status,
        } : null,
      },
    });
  } catch (err) {
    next(err);
  }
}

async function registerStaff(req, res, next) {
  try {
    const { username, email, password, fullName, role } = req.body;
    if (!username || !email || !password || !fullName || !role) {
      return res.status(400).json({ success: false, message: 'All fields are required.' });
    }

    const salt = await bcrypt.genSalt(10);
    const hash = await bcrypt.hash(password, salt);

    const result = await db.query(`
      INSERT INTO users (username, email, password_hash, full_name, role)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING id, username, email, full_name, role, created_at;
    `, [username, email, hash, fullName, role]);

    res.status(201).json({
      success: true,
      message: 'Staff user created successfully.',
      user: result.rows[0],
    });
  } catch (err) {
    if (err.code === '23505') {
      return res.status(409).json({ success: false, message: 'Username or email already in use.' });
    }
    next(err);
  }
}

module.exports = {
  login,
  getMe,
  registerStaff,
};
