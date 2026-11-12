const db = require('../config/db');

async function getSettings(key = null) {
  if (key) {
    const res = await db.query('SELECT value FROM system_settings WHERE key = $1', [key]);
    return res.rows.length > 0 ? res.rows[0].value : null;
  }
  const res = await db.query('SELECT key, value, description, updated_at FROM system_settings');
  const settingsMap = {};
  res.rows.forEach(r => { settingsMap[r.key] = r.value; });
  return settingsMap;
}

async function updateSettings(key, value) {
  const res = await db.query(`
    INSERT INTO system_settings (key, value, updated_at)
    VALUES ($1, $2, CURRENT_TIMESTAMP)
    ON CONFLICT (key) DO UPDATE
      SET value = EXCLUDED.value,
          updated_at = CURRENT_TIMESTAMP
    RETURNING *;
  `, [key, JSON.stringify(value)]);
  return res.rows[0];
}

module.exports = {
  getSettings,
  updateSettings,
};
