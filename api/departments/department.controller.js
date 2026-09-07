const { query } = require('../../db/index');

async function getDepartments(req, res) {
  try {
    const departments = await query('SELECT * FROM departments ORDER BY name ASC');
    return res.json({
      success: true,
      departments,
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to fetch departments.' });
  }
}

async function createDepartment(req, res) {
  try { const { name, code, type = 'office' } = req.body; if (!name || !code) return res.status(400).json({ success: false, message: 'Name and code are required.' }); const result = await query('INSERT INTO departments (name, code, type, is_active) VALUES (?, ?, ?, 1)', [name.trim(), code.trim().toUpperCase(), type]); return res.status(201).json({ success: true, id: result.insertId }); } catch { return res.status(500).json({ success: false, message: 'Unable to create department.' }); }
}
async function updateDepartment(req, res) {
  try { const { name, code, type, is_active } = req.body; await query('UPDATE departments SET name = COALESCE(?, name), code = COALESCE(?, code), type = COALESCE(?, type), is_active = COALESCE(?, is_active) WHERE id = ?', [name?.trim() || null, code?.trim().toUpperCase() || null, type || null, is_active === undefined ? null : Boolean(is_active), req.params.departmentId]); return res.json({ success: true }); } catch { return res.status(500).json({ success: false, message: 'Unable to update department.' }); }
}

module.exports = { getDepartments, createDepartment, updateDepartment };
