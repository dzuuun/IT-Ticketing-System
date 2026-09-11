const { query } = require("../../db/index");

function ticketScopeFor(user, alias = "t") {
  if (user.role === "requestor") {
    return {
      clause: `WHERE (${alias}.requestor_user_id = ? OR ${alias}.requestor_email = ? OR EXISTS (SELECT 1 FROM ticket_requestors tr WHERE tr.ticket_id = ${alias}.id AND (tr.user_id = ? OR tr.email = ?)))`,
      params: [user.id, user.email, user.id, user.email],
    };
  }
  if (user.role === "encoder") {
    return { clause: `WHERE ${alias}.encoded_by_user_id = ?`, params: [user.id] };
  }
  if (user.role === "technician") {
    return {
      clause: `WHERE (${alias}.assigned_technician_id = ? OR EXISTS (
        SELECT 1 FROM team_memberships tm
        WHERE tm.team_id = ${alias}.assigned_team_id AND tm.user_id = ? AND tm.is_active = 1
      ) OR (${alias}.assigned_technician_id IS NULL AND ${alias}.assigned_team_id IS NULL))`,
      params: [user.id, user.id],
    };
  }
  return { clause: "", params: [] };
}

async function getDashboardStats(req, res) {
  try {
    const user = req.user;
    const canViewOperations = ["admin", "team_leader"].includes(user.role);
    const scope = ticketScopeFor(user);
    const statusRows = await query(
      `SELECT t.status, COUNT(*) AS count FROM tickets t ${scope.clause} GROUP BY t.status`,
      scope.params,
    );
    const statusCounts = { total: 0, new: 0, assigned: 0, in_progress: 0, pending_user: 0, resolved: 0, closed: 0 };
    statusRows.forEach((row) => {
      if (statusCounts[row.status] !== undefined) statusCounts[row.status] = row.count;
      statusCounts.total += row.count;
    });

    const typeRows = await query(
      `SELECT t.ticket_type, COUNT(*) AS count FROM tickets t ${scope.clause} GROUP BY t.ticket_type`,
      scope.params,
    );
    const priorityRows = await query(
      `SELECT t.priority, COUNT(*) AS count FROM tickets t ${scope.clause} GROUP BY t.priority`,
      scope.params,
    );
    const categoryFilter = scope.clause ? `AND ${scope.clause.replace(/^WHERE\s+/i, "")}` : "";
    const categoryRows = await query(
      `SELECT c.name, COUNT(t.id) AS count FROM categories c LEFT JOIN tickets t ON t.category_id = c.id ${categoryFilter} GROUP BY c.id, c.name ORDER BY count DESC`,
      scope.params,
    );

    let slaStats = { breachedResolution: 0, breachedResponse: 0, totalResolved: 0 };
    if (canViewOperations) {
      const [slaRow] = await query(`
        SELECT
          SUM(CASE WHEN sla_due_resolution IS NOT NULL AND status NOT IN ('resolved', 'closed') AND sla_due_resolution < NOW() THEN 1 ELSE 0 END) AS breached_resolution,
          SUM(CASE WHEN sla_due_response IS NOT NULL AND sla_responded_at IS NULL AND sla_due_response < NOW() THEN 1 ELSE 0 END) AS breached_response,
          SUM(CASE WHEN status IN ('resolved', 'closed') THEN 1 ELSE 0 END) AS total_resolved
        FROM tickets
      `);
      slaStats = {
        breachedResolution: slaRow?.breached_resolution || 0,
        breachedResponse: slaRow?.breached_response || 0,
        totalResolved: slaRow?.total_resolved || 0,
      };
    }

    let techWorkload = [];
    if (canViewOperations) {
      techWorkload = await query(`
        SELECT u.id, u.full_name,
          SUM(CASE WHEN t.status IN ('assigned', 'in_progress') THEN 1 ELSE 0 END) AS active_tickets,
          SUM(CASE WHEN t.status IN ('resolved', 'closed') THEN 1 ELSE 0 END) AS resolved_tickets
        FROM users u
        LEFT JOIN tickets t ON t.assigned_technician_id = u.id
        WHERE u.role IN ('technician', 'admin') AND u.is_active = 1
        GROUP BY u.id, u.full_name
        ORDER BY active_tickets DESC
      `);
    }

    return res.json({ success: true, statusCounts, typeBreakdown: typeRows, priorityBreakdown: priorityRows, categoryBreakdown: categoryRows, slaStats, techWorkload });
  } catch (error) {
    console.error("[Get Stats Error]:", error);
    return res.status(500).json({ success: false, message: "Failed to fetch statistics." });
  }
}

module.exports = { getDashboardStats, __test: { ticketScopeFor } };
