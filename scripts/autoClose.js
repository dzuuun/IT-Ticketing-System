const { query } = require('../db/index');

async function checkAndAutoCloseTickets() {
  try {
    const now = new Date();
    // Find tickets that are resolved and have reached auto_close_at
    const expiredTickets = await query(
      `SELECT id, ticket_number, requestor_name, requestor_email, status, auto_close_at 
       FROM tickets 
       WHERE status = 'resolved' AND auto_close_at IS NOT NULL AND auto_close_at <= ?`,
      [now]
    );

    if (expiredTickets.length > 0) {
      console.log(`[Auto-Close Job] Found ${expiredTickets.length} resolved tickets to auto-close.`);
      for (const t of expiredTickets) {
        await query(
          `UPDATE tickets SET status = 'closed', closed_at = ? WHERE id = ?`,
          [now, t.id]
        );

        await query(
          `INSERT INTO ticket_activity_logs (ticket_id, actor_name, action_type, old_value, new_value, comment)
           VALUES (?, ?, ?, ?, ?, ?)`,
          [t.id, 'System Auto-Close', 'STATUS_CHANGE', 'resolved', 'closed', 'Automatically closed after resolution period expired with no dispute.']
        );

        console.log(`[Auto-Close Job] Closed ticket #${t.ticket_number}`);
      }
    }
  } catch (error) {
    console.error('[Auto-Close Job Error]:', error.message);
  }
}

function startAutoCloseWorker(intervalMs = 60000 * 30) {
  console.log('[Worker] Auto-close background worker started (checking every 30 minutes).');
  // Run once immediately after 10s
  setTimeout(checkAndAutoCloseTickets, 10000);
  // Recurring interval
  return setInterval(checkAndAutoCloseTickets, intervalMs);
}

module.exports = { checkAndAutoCloseTickets, startAutoCloseWorker };
