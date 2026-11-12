const express = require('express');
const router = express.Router();
const departmentController = require('../controllers/departmentController');
const { authenticateToken } = require('../middleware/authMiddleware');

// Public read or authenticated
router.get('/', departmentController.getAllDepartments);
router.get('/:id', departmentController.getDepartmentById);

module.exports = router;
