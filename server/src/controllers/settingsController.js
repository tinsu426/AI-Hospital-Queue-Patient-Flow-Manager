const settingsService = require('../services/settingsService');

async function getAllSettings(req, res, next) {
  try {
    const settings = await settingsService.getSettings();
    res.json({
      success: true,
      settings,
    });
  } catch (err) {
    next(err);
  }
}

async function updateSettingByKey(req, res, next) {
  try {
    const { key } = req.params;
    const { value } = req.body;
    if (!value) {
      return res.status(400).json({ success: false, message: 'Setting value is required.' });
    }
    const updated = await settingsService.updateSettings(key, value);
    res.json({
      success: true,
      message: `Setting "${key}" updated.`,
      setting: updated,
    });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  getAllSettings,
  updateSettingByKey,
};
