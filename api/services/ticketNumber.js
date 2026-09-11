const crypto = require("crypto");
const { getPool } = require("../../db");

async function generateTicketNumber() {
  const pool = getPool();
  if (!pool) throw new Error("Database pool has not been initialized.");
  const sequenceYear = new Date().getFullYear();
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    const [sequenceInsert] = await connection.query(
      "INSERT IGNORE INTO ticket_sequences (sequence_year, last_number) VALUES (?, 0)",
      [sequenceYear],
    );
    if (sequenceInsert.affectedRows === 1) {
      const [existing] = await connection.query(
        "SELECT COALESCE(MAX(CAST(SUBSTRING_INDEX(ticket_number, '-', -1) AS UNSIGNED)), 0) AS last_number FROM tickets WHERE ticket_number LIKE ?",
        [`ICT-MIS-${sequenceYear}-%`],
      );
      await connection.query(
        "UPDATE ticket_sequences SET last_number = ? WHERE sequence_year = ?",
        [existing[0].last_number, sequenceYear],
      );
    }
    const [rows] = await connection.query(
      "SELECT last_number FROM ticket_sequences WHERE sequence_year = ? FOR UPDATE",
      [sequenceYear],
    );
    const nextNumber = Number(rows[0].last_number) + 1;
    await connection.query(
      "UPDATE ticket_sequences SET last_number = ? WHERE sequence_year = ?",
      [nextNumber, sequenceYear],
    );
    await connection.commit();
    return {
      ticketNumber: `ICT-MIS-${sequenceYear}-${String(nextNumber).padStart(6, "0")}`,
      trackingCode: `NDMU-${crypto.randomBytes(4).toString("hex").toUpperCase()}`,
    };
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

module.exports = { generateTicketNumber };
