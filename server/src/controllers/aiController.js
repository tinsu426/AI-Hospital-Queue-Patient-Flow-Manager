const aiService = require('../services/aiService');

async function getWaitTimePrediction(req, res, next) {
  try {
    const { ticketId } = req.params;
    const prediction = await aiService.predictTicketWaitTime(ticketId);
    res.json({
      success: true,
      prediction,
    });
  } catch (err) {
    next(err);
  }
}

async function getBusyHoursPrediction(req, res, next) {
  try {
    const busyHours = await aiService.predictBusyHours();
    res.json({
      success: true,
      busyHours,
    });
  } catch (err) {
    next(err);
  }
}

async function getOvercrowdingAlerts(req, res, next) {
  try {
    const bottlenecks = await aiService.detectOvercrowdedDepartments();
    res.json({
      success: true,
      bottlenecks,
    });
  } catch (err) {
    next(err);
  }
}

async function getPatientFlowAnalytics(req, res, next) {
  try {
    const flowAnalytics = await aiService.analyzePatientFlow();
    res.json({
      success: true,
      flowAnalytics,
    });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  getWaitTimePrediction,
  getBusyHoursPrediction,
  getOvercrowdingAlerts,
  getPatientFlowAnalytics,
};
