const express = require('express');
const router = express.Router();
const settingsController = require('../controllers/settingsController');
const { authenticateToken } = require('../middleware/authMiddleware');
const { authorizeRoles } = require('../middleware/roleMiddleware');

// Reading settings can be public / authenticated
router.get('/', settingsController.getAllSettings);

// Updating settings is restricted to admins
router.put('/:key', authenticateToken, authorizeRoles('admin'), settingsController.updateSettingByKey);

module.exports = router;
