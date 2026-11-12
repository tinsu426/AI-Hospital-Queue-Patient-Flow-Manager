const express = require('express');
const router = express.Router();
const navigationController = require('../controllers/navigationController');
const { authenticateToken } = require('../middleware/authMiddleware');
const { authorizeRoles } = require('../middleware/roleMiddleware');

// Public or authenticated reading of directory and routes
router.get('/directory', navigationController.getDirectory);
router.get('/waypoints', navigationController.getWaypoints);
router.get('/route', navigationController.getRoute);

// Admin editing of floor plan & department map coordinates
router.put('/department/:id', authenticateToken, authorizeRoles('admin'), navigationController.updateLocation);

module.exports = router;
