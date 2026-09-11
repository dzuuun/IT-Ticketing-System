const { query } = require("../../db/index");

async function getTeams(req, res) {
  try {
    const teams = await query("SELECT * FROM teams ORDER BY name ASC");
    const users = await query(
      `SELECT u.id, u.full_name, u.email, u.role, tm.team_id, tm.membership_role
       FROM team_memberships tm
       JOIN users u ON u.id = tm.user_id
       WHERE u.role IN ('technician', 'team_leader', 'admin')
         AND u.is_active = 1 AND tm.is_active = 1`,
    );

    const result = teams.map((team) => ({
      ...team,
      members: users.filter((u) => u.team_id === team.id),
    }));

    return res.json({ success: true, teams: result });
  } catch (error) {
    return res
      .status(500)
      .json({ success: false, message: "Failed to fetch teams." });
  }
}

async function createTeam(req, res) {
  try {
    const { name, description } = req.body;
    if (!name)
      return res
        .status(400)
        .json({ success: false, message: "Team name is required." });
    const result = await query(
      "INSERT INTO teams (name, description, is_active) VALUES (?, ?, 1)",
      [name.trim(), description?.trim() || null],
    );
    return res.status(201).json({ success: true, id: result.insertId });
  } catch {
    return res
      .status(500)
      .json({ success: false, message: "Unable to create team." });
  }
}
async function updateTeam(req, res) {
  try {
    const { name, description, is_active } = req.body;
    await query(
      "UPDATE teams SET name = COALESCE(?, name), description = COALESCE(?, description), is_active = COALESCE(?, is_active) WHERE id = ?",
      [
        name?.trim() || null,
        description ?? null,
        is_active === undefined ? null : Boolean(is_active),
        req.params.teamId,
      ],
    );
    return res.json({ success: true });
  } catch {
    return res
      .status(500)
      .json({ success: false, message: "Unable to update team." });
  }
}

async function addTeamMember(req, res) {
  try {
    const teamId = Number(req.params.teamId);
    const submittedIds = Array.isArray(req.body.user_ids)
      ? req.body.user_ids
      : [req.body.user_id];
    const userIds = [
      ...new Set(
        submittedIds.map(Number).filter((userId) => Number.isInteger(userId)),
      ),
    ];
    const membershipRole =
      req.body.membership_role === "leader" ? "leader" : "member";

    if (!Number.isInteger(teamId) || userIds.length === 0) {
      return res
        .status(400)
        .json({ success: false, message: "Select a valid team and user." });
    }

    const [team] = await query("SELECT id FROM teams WHERE id = ?", [teamId]);
    const accounts = await query(
      `SELECT id FROM users
       WHERE id IN (${userIds.map(() => "?").join(", ")}) AND is_active = 1
         AND role IN ('admin', 'team_leader', 'technician')`,
      userIds,
    );
    if (!team || accounts.length !== userIds.length) {
      return res.status(404).json({
        success: false,
        message: "The selected active staff member or team was not found.",
      });
    }

    for (const userId of userIds) {
      await query(
        `INSERT INTO team_memberships (team_id, user_id, membership_role, is_active)
         VALUES (?, ?, ?, 1)
         ON DUPLICATE KEY UPDATE membership_role = VALUES(membership_role), is_active = 1`,
        [teamId, userId, membershipRole],
      );
    }
    return res
      .status(201)
      .json({
        success: true,
        added: userIds.length,
        message: "Team members added.",
      });
  } catch (error) {
    console.error("[Add Team Member Error]:", error);
    return res
      .status(500)
      .json({ success: false, message: "Unable to add the team member." });
  }
}

async function removeTeamMember(req, res) {
  try {
    const teamId = Number(req.params.teamId);
    const userId = Number(req.params.userId);
    if (!Number.isInteger(teamId) || !Number.isInteger(userId)) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid team member." });
    }
    await query(
      "UPDATE team_memberships SET is_active = 0 WHERE team_id = ? AND user_id = ?",
      [teamId, userId],
    );
    return res.json({ success: true, message: "Team member removed." });
  } catch (error) {
    console.error("[Remove Team Member Error]:", error);
    return res
      .status(500)
      .json({ success: false, message: "Unable to remove the team member." });
  }
}

module.exports = {
  getTeams,
  createTeam,
  updateTeam,
  addTeamMember,
  removeTeamMember,
};
