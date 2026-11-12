const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { authenticateToken } = require('../middleware/authMiddleware');
const { authorizeRoles } = require('../middleware/roleMiddleware');

router.post('/login', authController.login);
router.get('/me', authenticateToken, authController.getMe);
router.post('/register-staff', authenticateToken, authorizeRoles('admin'), authController.registerStaff);

module.exports = router;
