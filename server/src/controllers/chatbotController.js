const chatbotService = require('../services/chatbotService');

async function handleMessage(req, res, next) {
  try {
    const { message } = req.body;
    if (!message || typeof message !== 'string' || message.trim() === '') {
      return res.status(400).json({ success: false, message: 'Message content is required.' });
    }

    const response = await chatbotService.processChatMessage(message, req.user);
    res.json({
      success: true,
      data: response,
    });
  } catch (err) {
    next(err);
  }
}

async function getSuggestions(req, res, next) {
  try {
    const userRole = req.user?.role || 'staff';
    const suggestions = [
      'How many patients are waiting right now?',
      'Which departments are busy?',
      'Where is the laboratory?',
      'How do I register a new patient?',
      'How do I add a doctor?',
      'Where is Reception?',
      'How does emergency priority work?',
      'How do doctor-to-lab referrals work?',
    ];

    res.json({
      success: true,
      role: userRole,
      suggestions,
    });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  handleMessage,
  getSuggestions,
};
