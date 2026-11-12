const express = require('express');
const router = express.Router();
const aiController = require('../controllers/aiController');
const { authenticateToken } = require('../middleware/authMiddleware');

router.use(authenticateToken);

router.get('/predict-wait/:ticketId', aiController.getWaitTimePrediction);
router.get('/busy-hours', aiController.getBusyHoursPrediction);
router.get('/bottlenecks', aiController.getOvercrowdingAlerts);
router.get('/flow-analytics', aiController.getPatientFlowAnalytics);

module.exports = router;
