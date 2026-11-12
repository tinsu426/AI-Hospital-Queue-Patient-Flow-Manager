const navigationService = require('../services/navigationService');

async function getDirectory(req, res, next) {
  try {
    const directory = await navigationService.getDepartmentDirectory();
    res.json({
      success: true,
      count: directory.length,
      departments: directory,
    });
  } catch (err) {
    next(err);
  }
}

async function getWaypoints(req, res, next) {
  try {
    const floor = req.query.floor ? parseInt(req.query.floor, 10) : null;
    const waypoints = await navigationService.getAllWaypoints(floor);
    res.json({
      success: true,
      count: waypoints.length,
      waypoints,
    });
  } catch (err) {
    next(err);
  }
}

async function getRoute(req, res, next) {
  try {
    const { from, to } = req.query;
    if (!from || !to) {
      return res.status(400).json({ success: false, message: 'Both "from" and "to" location codes are required.' });
    }
    const route = await navigationService.calculateRoute(from, to);
    res.json({
      success: true,
      route,
    });
  } catch (err) {
    next(err);
  }
}

async function updateLocation(req, res, next) {
  try {
    const { id } = req.params;
    const updated = await navigationService.updateDepartmentLocation(id, req.body);
    res.json({
      success: true,
      message: 'Department location updated.',
      department: updated,
    });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  getDirectory,
  getWaypoints,
  getRoute,
  updateLocation,
};
