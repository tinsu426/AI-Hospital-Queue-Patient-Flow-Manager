const express = require('express');
const router = express.Router();
const patientController = require('../controllers/patientController');
const { authenticateToken } = require('../middleware/authMiddleware');
const { authorizeRoles } = require('../middleware/roleMiddleware');

router.use(authenticateToken);

// All authenticated hospital staff can search and view patients
router.get('/', patientController.searchPatients);
router.get('/:id', patientController.getPatientById);

// Registration & updates by receptionist, triage nurse, or admin
router.post('/', authorizeRoles('receptionist', 'triage', 'admin'), patientController.registerPatient);
router.put('/:id', authorizeRoles('receptionist', 'triage', 'doctor', 'admin'), patientController.updatePatient);

module.exports = router;
