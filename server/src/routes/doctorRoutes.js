const express = require('express');
const router = express.Router();
const doctorController = require('../controllers/doctorController');
const { authenticateToken } = require('../middleware/authMiddleware');
const { authorizeRoles } = require('../middleware/roleMiddleware');

router.use(authenticateToken);

router.get('/', doctorController.getAllDoctors);
router.get('/:id', doctorController.getDoctorById);
router.patch('/:id/status', authorizeRoles('doctor', 'admin'), doctorController.updateDoctorStatus);
router.post('/:id/schedules', authorizeRoles('admin'), doctorController.updateDoctorSchedule);
router.post('/:id/assign', authorizeRoles('receptionist', 'triage', 'doctor', 'admin'), doctorController.assignPatientToDoctor);

module.exports = router;
