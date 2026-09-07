const { query } = require('../../db/index');

async function getTeams(req, res) {
  try {
    const teams = await query('SELECT * FROM teams ORDER BY name ASC');
    const users = await query(
      `SELECT u.id, u.full_name, u.email, u.role, tm.team_id, d.name AS department_name, u.phone
       FROM team_memberships tm
       JOIN users u ON u.id = tm.user_id
       LEFT JOIN departments d ON d.id = u.department_id
       WHERE u.role IN ('technician', 'team_leader', 'admin')
         AND u.is_active = 1 AND tm.is_active = 1`
    );

    const result = teams.map((team) => ({
      ...team,
      members: users.filter((u) => u.team_id === team.id),
    }));

    return res.json({ success: true, teams: result });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to fetch teams.' });
  }
}

async function createTeam(req, res) {
  try { const { name, description } = req.body; if (!name) return res.status(400).json({ success: false, message: 'Team name is required.' }); const result = await query('INSERT INTO teams (name, description, is_active) VALUES (?, ?, 1)', [name.trim(), description?.trim() || null]); return res.status(201).json({ success: true, id: result.insertId }); } catch { return res.status(500).json({ success: false, message: 'Unable to create team.' }); }
}
async function updateTeam(req, res) {
  try { const { name, description, is_active } = req.body; await query('UPDATE teams SET name = COALESCE(?, name), description = COALESCE(?, description), is_active = COALESCE(?, is_active) WHERE id = ?', [name?.trim() || null, description ?? null, is_active === undefined ? null : Boolean(is_active), req.params.teamId]); return res.json({ success: true }); } catch { return res.status(500).json({ success: false, message: 'Unable to update team.' }); }
}

module.exports = { getTeams, createTeam, updateTeam };
