const { query } = require('../../db/index');
const bcrypt = require('bcryptjs');

async function getTechnicians(req, res) {
  try {
    const technicians = await query(
      `SELECT u.id, u.full_name, u.email, u.role, u.department_id, d.name AS department_name, u.phone
       FROM users u
       LEFT JOIN departments d ON d.id = u.department_id
       WHERE u.role IN ('technician', 'team_leader', 'admin') AND u.is_active = 1
       ORDER BY u.full_name ASC`
    );

    return res.json({
      success: true,
      technicians,
    });
  } catch (error) {
    console.error('[Get Technicians Error]:', error);
    return res.status(500).json({ success: false, message: 'Failed to fetch technicians.' });
  }
}

async function getAllUsers(req, res) {
  try {
    const users = await query(
      `SELECT u.id, u.email, u.full_name, u.first_name, u.middle_name, u.last_name,
              u.role, u.department_id, d.name AS department_name, u.phone, u.is_active, u.created_at
       FROM users u
       LEFT JOIN departments d ON d.id = u.department_id
       ORDER BY u.created_at DESC`
    );
    return res.json({
      success: true,
      users,
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to fetch users.' });
  }
}

async function createUser(req, res) {
  try {
    const { email, password, first_name, middle_name, last_name, role = 'requestor', department_name, department_id, phone, is_active = true } = req.body;
    const validRoles = ['requestor', 'technician', 'team_leader', 'admin'];
    if (!email || !password || !first_name || !last_name) return res.status(400).json({ success: false, message: 'Email, password, first name, and last name are required.' });
    if (!validRoles.includes(role)) return res.status(400).json({ success: false, message: 'Invalid role.' });
    const normalizedEmail = email.trim().toLowerCase();
    if ((await query('SELECT id FROM users WHERE email = ?', [normalizedEmail])).length) return res.status(409).json({ success: false, message: 'An account with this email already exists.' });
    const fullName = [first_name, middle_name, last_name].filter(Boolean).map((name) => name.trim()).join(' ');
    let normalizedDepartmentId = department_id || null;
    if (!normalizedDepartmentId && department_name) {
      const [department] = await query('SELECT id FROM departments WHERE name = ? LIMIT 1', [department_name.trim()]);
      normalizedDepartmentId = department?.id || null;
    }
    const result = await query('INSERT INTO users (email, password_hash, full_name, first_name, middle_name, last_name, role, department_id, phone, is_active) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)', [normalizedEmail, await bcrypt.hash(password, 12), fullName, first_name.trim(), middle_name?.trim() || null, last_name.trim(), role, normalizedDepartmentId, phone?.trim() || null, is_active ? 1 : 0]);
    return res.status(201).json({ success: true, user: { id: result.insertId, email: normalizedEmail, full_name: fullName, first_name, middle_name: middle_name || null, last_name, role } });
  } catch (error) { console.error('[Create User Error]:', error); return res.status(500).json({ success: false, message: 'Failed to create user.' }); }
}

async function updateUserRole(req, res) {
  try {
    const { userId } = req.params;
    const { role, is_active, email, first_name, middle_name, last_name, department_id, department_name, phone, password } = req.body;

    const updates = [];
    const params = [];

    if (role) {
      updates.push('role = ?');
      params.push(role);
    }
    if (is_active !== undefined) {
      updates.push('is_active = ?');
      params.push(is_active ? 1 : 0);
    }
    if (email) { updates.push('email = ?'); params.push(email.trim().toLowerCase()); }
    if (department_id !== undefined) {
      updates.push('department_id = ?');
      params.push(department_id || null);
    } else if (department_name !== undefined) {
      const [department] = department_name ? await query('SELECT id FROM departments WHERE name = ? LIMIT 1', [department_name.trim()]) : [];
      updates.push('department_id = ?');
      params.push(department?.id || null);
    }
    if (phone !== undefined) { updates.push('phone = ?'); params.push(phone?.trim() || null); }
    if (first_name && last_name) {
      const fullName = [first_name, middle_name, last_name].filter(Boolean).map((value) => value.trim()).join(' ');
      updates.push('first_name = ?', 'middle_name = ?', 'last_name = ?', 'full_name = ?');
      params.push(first_name.trim(), middle_name?.trim() || null, last_name.trim(), fullName);
    }
    if (password) { updates.push('password_hash = ?'); params.push(await bcrypt.hash(password, 12)); }

    if (updates.length > 0) {
      params.push(userId);
      await query(`UPDATE users SET ${updates.join(', ')} WHERE id = ?`, params);
    }

    return res.json({ success: true, message: 'User updated successfully.' });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to update user.' });
  }
}

module.exports = {
  getTechnicians,
  getAllUsers,
  createUser,
  updateUserRole,
};
