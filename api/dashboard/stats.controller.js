const { query } = require('../../db/index');

async function getDashboardStats(req, res) {
  try {
    const user = req.user;
    const isRequestor = user.role === 'requestor';
    const userFilter = isRequestor ? 'WHERE (requestor_user_id = ? OR requestor_email = ?)' : '';
    const userParams = isRequestor ? [user.id, user.email] : [];

    // 1. Status Counts
    const statusRows = await query(
      `SELECT status, COUNT(*) as count FROM tickets ${userFilter} GROUP BY status`,
      userParams
    );

    const statusCounts = {
      total: 0,
      new: 0,
      assigned: 0,
      in_progress: 0,
      pending_user: 0,
      resolved: 0,
      closed: 0,
    };

    statusRows.forEach((row) => {
      if (statusCounts[row.status] !== undefined) {
        statusCounts[row.status] = row.count;
      }
      statusCounts.total += row.count;
    });

    // 2. Type breakdown
    const typeRows = await query(
      `SELECT ticket_type, COUNT(*) as count FROM tickets ${userFilter} GROUP BY ticket_type`,
      userParams
    );

    // 3. Priority breakdown
    const priorityRows = await query(
      `SELECT priority, COUNT(*) as count FROM tickets ${userFilter} GROUP BY priority`,
      userParams
    );

    // 4. Category breakdown
    const categoryRows = await query(
      `SELECT c.name, COUNT(t.id) as count 
       FROM categories c
       LEFT JOIN tickets t ON t.category_id = c.id ${isRequestor ? 'AND (t.requestor_user_id = ? OR t.requestor_email = ?)' : ''}
       GROUP BY c.id, c.name
       ORDER BY count DESC`,
      userParams
    );

    // 5. SLA Tracking metrics for MIS Staff
    let slaStats = {
      breachedResolution: 0,
      breachedResponse: 0,
      withinSla: 0,
    };

    if (!isRequestor) {
      const slaRows = await query(`
        SELECT 
          SUM(CASE WHEN (sla_due_resolution IS NOT NULL AND status NOT IN ('resolved', 'closed') AND sla_due_resolution < NOW()) THEN 1 ELSE 0 END) as breached_resolution,
          SUM(CASE WHEN (sla_due_response IS NOT NULL AND sla_responded_at IS NULL AND sla_due_response < NOW()) THEN 1 ELSE 0 END) as breached_response,
          SUM(CASE WHEN status IN ('resolved', 'closed') THEN 1 ELSE 0 END) as total_resolved
        FROM tickets
      `);

      if (slaRows.length > 0) {
        slaStats.breachedResolution = slaRows[0].breached_resolution || 0;
        slaStats.breachedResponse = slaRows[0].breached_response || 0;
        slaStats.totalResolved = slaRows[0].total_resolved || 0;
      }
    }

    // 6. Technician workload
    let techWorkload = [];
    if (!isRequestor) {
      techWorkload = await query(`
        SELECT 
          u.id, u.full_name,
          SUM(CASE WHEN t.status IN ('assigned', 'in_progress') THEN 1 ELSE 0 END) as active_tickets,
          SUM(CASE WHEN t.status IN ('resolved', 'closed') THEN 1 ELSE 0 END) as resolved_tickets
        FROM users u
        LEFT JOIN tickets t ON t.assigned_technician_id = u.id
        WHERE u.role IN ('technician', 'admin') AND u.is_active = 1
        GROUP BY u.id, u.full_name
        ORDER BY active_tickets DESC
      `);
    }

    return res.json({
      success: true,
      statusCounts,
      typeBreakdown: typeRows,
      priorityBreakdown: priorityRows,
      categoryBreakdown: categoryRows,
      slaStats,
      techWorkload,
    });
  } catch (error) {
    console.error('[Get Stats Error]:', error);
    return res.status(500).json({ success: false, message: 'Failed to fetch statistics.' });
  }
}

module.exports = { getDashboardStats };
