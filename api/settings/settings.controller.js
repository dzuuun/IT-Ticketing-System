const { query } = require('../../db');

async function getSettings(req, res) {
  try {
    const rows = await query('SELECT setting_key, setting_value, description FROM system_settings ORDER BY setting_key');
    return res.json({ success: true, settings: Object.fromEntries(rows.map((row) => [row.setting_key, row.setting_value])) });
  } catch (error) { return res.status(500).json({ success: false, message: 'Unable to load settings.' }); }
}

async function updateSettings(req, res) {
  try {
    const allowed = ['sla_critical_hours', 'sla_high_hours', 'sla_medium_hours', 'sla_low_hours', 'auto_close_days', 'school_name', 'mis_email'];
    for (const [key, value] of Object.entries(req.body || {})) {
      if (!allowed.includes(key) || value === undefined) continue;
      await query('INSERT INTO system_settings (setting_key, setting_value) VALUES (?, ?) ON DUPLICATE KEY UPDATE setting_value = VALUES(setting_value)', [key, String(value).trim()]);
    }
    return res.json({ success: true, message: 'Settings saved.' });
  } catch (error) { return res.status(500).json({ success: false, message: 'Unable to save settings.' }); }
}

module.exports = { getSettings, updateSettings };
