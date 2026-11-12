const express = require('express');
const router = express.Router();
const chatbotController = require('../controllers/chatbotController');
const { authenticateToken } = require('../middleware/authMiddleware');

router.use(authenticateToken);

router.post('/message', chatbotController.handleMessage);
router.get('/suggestions', chatbotController.getSuggestions);

module.exports = router;
