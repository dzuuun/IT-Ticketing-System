const crypto = require("crypto");
const { query, getPool } = require("../db");

const hashToken = (token) =>
  crypto.createHash("sha256").update(token).digest("hex");

async function storeRefreshToken({
  userId,
  token,
  expiresAt,
  userAgent,
  ipAddress,
}) {
  await query(
    "INSERT INTO refresh_tokens (user_id, token_hash, expires_at, user_agent, ip_address) VALUES (?, ?, ?, ?, ?)",
    [userId, hashToken(token), expiresAt, userAgent || null, ipAddress || null],
  );
}

async function consumeRefreshToken(token) {
  const connection = await getPool().getConnection();
  const tokenHash = hashToken(token);
  try {
    await connection.beginTransaction();
    const [result] = await connection.query(
      `UPDATE refresh_tokens
       SET revoked_at = NOW(), last_used_at = NOW()
       WHERE token_hash = ? AND revoked_at IS NULL AND expires_at > NOW()`,
      [tokenHash],
    );
    if (result.affectedRows !== 1) {
      await connection.rollback();
      return null;
    }

    const [tokens] = await connection.query(
      `SELECT rt.*, u.id AS user_id, u.email, u.full_name, u.role, u.is_active
       FROM refresh_tokens rt
       JOIN users u ON u.id = rt.user_id
       WHERE rt.token_hash = ?`,
      [tokenHash],
    );
    await connection.commit();
    return tokens[0]?.is_active ? tokens[0] : null;
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

async function revokeRefreshToken(token) {
  await query(
    "UPDATE refresh_tokens SET revoked_at = NOW() WHERE token_hash = ? AND revoked_at IS NULL",
    [hashToken(token)],
  );
}
async function revokeUserTokens(userId) {
  await query(
    "UPDATE refresh_tokens SET revoked_at = NOW() WHERE user_id = ? AND revoked_at IS NULL",
    [userId],
  );
}

module.exports = {
  storeRefreshToken,
  consumeRefreshToken,
  revokeRefreshToken,
  revokeUserTokens,
};
