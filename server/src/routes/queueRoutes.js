const express = require('express');
const router = express.Router();
const queueController = require('../controllers/queueController');
const { authenticateToken } = require('../middleware/authMiddleware');
const { authorizeRoles } = require('../middleware/roleMiddleware');

// Public TV Billboard (Waiting room display - No authentication required, strictly sanitized data)
router.get('/billboard', queueController.getPublicBillboardFeed);

// Protected endpoints
router.use(authenticateToken);

router.get('/active', queueController.getActiveHospitalQueues);
router.get('/department/:deptId', queueController.getDepartmentQueue);
router.post('/ticket', authorizeRoles('receptionist', 'triage', 'doctor', 'admin'), queueController.issueTicket);
router.patch('/:id/priority', authorizeRoles('triage', 'doctor', 'admin'), queueController.updatePriority);
router.post('/:id/call', authorizeRoles('doctor', 'triage', 'admin'), queueController.callTicket);
router.post('/:id/start-serving', authorizeRoles('doctor', 'admin'), queueController.startServingTicket);
router.post('/:id/complete', authorizeRoles('doctor', 'admin'), queueController.completeTicket);

module.exports = router;
