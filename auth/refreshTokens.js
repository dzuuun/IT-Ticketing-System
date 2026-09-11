const crypto = require("crypto");
const { query } = require("../db");

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

async function useRefreshToken(token) {
  const tokens = await query(
    `SELECT rt.*, u.id AS user_id, u.email, u.full_name, u.role, u.is_active FROM refresh_tokens rt JOIN users u ON u.id = rt.user_id WHERE rt.token_hash = ? AND rt.revoked_at IS NULL AND rt.expires_at > NOW()`,
    [hashToken(token)],
  );
  if (!tokens[0] || !tokens[0].is_active) return null;
  await query("UPDATE refresh_tokens SET last_used_at = NOW() WHERE id = ?", [
    tokens[0].id,
  ]);
  return tokens[0];
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
  useRefreshToken,
  revokeRefreshToken,
  revokeUserTokens,
};
