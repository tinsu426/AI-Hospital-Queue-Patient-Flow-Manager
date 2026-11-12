const express = require('express');
const router = express.Router();
const referralController = require('../controllers/referralController');
const { authenticateToken } = require('../middleware/authMiddleware');
const { authorizeRoles } = require('../middleware/roleMiddleware');

router.use(authenticateToken);

// Doctor initiates referral to lab
router.post('/', authorizeRoles('doctor', 'admin'), referralController.createReferral);

// Lab technician fetches workbench queue
router.get('/lab', authorizeRoles('lab', 'admin'), referralController.getLabWorkbenchQueue);

// Doctor gets their own referral history
router.get('/doctor/:doctorId', authorizeRoles('doctor', 'admin'), referralController.getDoctorReferrals);

// Lab technician updates status and completes results
router.patch('/:id/status', authorizeRoles('lab', 'admin'), referralController.updateReferralStatus);
router.post('/:id/complete', authorizeRoles('lab', 'admin'), referralController.completeReferral);

module.exports = router;
