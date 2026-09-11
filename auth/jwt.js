const jwt = require("jsonwebtoken");

const accessSecret = () =>
  process.env.JWT_ACCESS_SECRET || process.env.JWT_SECRET;
const refreshSecret = () =>
  process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET;

function signAccessToken(user) {
  if (!accessSecret()) throw new Error("JWT_ACCESS_SECRET must be configured.");
  return jwt.sign(
    { userId: user.id, email: user.email, role: user.role, type: "access" },
    accessSecret(),
    { expiresIn: process.env.JWT_ACCESS_EXPIRES_IN || "8h" },
  );
}

function signRefreshToken(user) {
  if (!refreshSecret())
    throw new Error("JWT_REFRESH_SECRET must be configured.");
  return jwt.sign({ userId: user.id, type: "refresh" }, refreshSecret(), {
    expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || "7d",
  });
}

function verifyAccessToken(token) {
  try {
    const payload = jwt.verify(token, accessSecret());
    return payload.type === "access" ? payload : null;
  } catch {
    return null;
  }
}

function verifyRefreshToken(token) {
  try {
    const payload = jwt.verify(token, refreshSecret());
    return payload.type === "refresh" ? payload : null;
  } catch {
    return null;
  }
}

module.exports = {
  signAccessToken,
  signRefreshToken,
  verifyAccessToken,
  verifyRefreshToken,
};
