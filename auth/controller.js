const bcrypt = require("bcryptjs");
const { query } = require("../db");
const {
  linkRequestsToAccount,
} = require("../api/services/requestorAccountLink");
const { isInstitutionalEmail } = require("../api/services/institutionalEmail");
const {
  signAccessToken,
  signRefreshToken,
  verifyRefreshToken,
} = require("./jwt");
const {
  storeRefreshToken,
  consumeRefreshToken,
  revokeRefreshToken,
  revokeUserTokens,
} = require("./refreshTokens");

const cookieName = () =>
  process.env.REFRESH_COOKIE_NAME || "ndmu_refresh_token";
const refreshDays = () =>
  Number.parseInt(process.env.JWT_REFRESH_DAYS || "7", 10);
const cookieSecure = () => {
  if (process.env.COOKIE_SECURE === "true") return true;
  if (process.env.COOKIE_SECURE === "false") return false;
  return process.env.NODE_ENV === "production";
};
const cookieSameSite = () => {
  const configured = process.env.COOKIE_SAME_SITE?.toLowerCase();
  if (["lax", "strict", "none"].includes(configured)) return configured;
  return cookieSecure() ? "none" : "lax";
};
const cookieOptions = () => ({
  httpOnly: true,
  secure: cookieSecure(),
  sameSite: cookieSameSite(),
  maxAge: refreshDays() * 86400000,
  path: `${new URL(process.env.CLIENT_URL || "http://localhost:5173").pathname.replace(/\/$/, "")}/auth`,
});
const safeUser = (user) => ({
  id: user.id || user.user_id,
  email: user.email,
  full_name: user.full_name,
  role: user.role,
  avatar_url: user.avatar_url,
});

async function issueSession(user, req, res) {
  const refreshToken = signRefreshToken(user);
  await storeRefreshToken({
    userId: user.id || user.user_id,
    token: refreshToken,
    expiresAt: new Date(Date.now() + refreshDays() * 86400000),
    userAgent: req.get("user-agent"),
    ipAddress: req.ip,
  });
  res.cookie(cookieName(), refreshToken, cookieOptions());
  return { accessToken: signAccessToken(user), user: safeUser(user) };
}

async function register(req, res) {
  try {
    const { email, password, first_name, middle_name, last_name } = req.body;
    if (!email || !password || !first_name || !last_name)
      return res.status(400).json({
        success: false,
        message: "Email, first name, last name, and password are required.",
      });
    const normalizedEmail = email.trim().toLowerCase();
    if (!isInstitutionalEmail(normalizedEmail))
      return res.status(400).json({
        success: false,
        message:
          "Requestor accounts must use an @ndmu.edu.ph institutional email address.",
      });
    if (
      (await query("SELECT id FROM users WHERE email = ?", [normalizedEmail]))
        .length
    )
      return res.status(409).json({
        success: false,
        message: "An account with this email already exists.",
      });
    const fullName = [first_name, middle_name, last_name]
      .filter(Boolean)
      .map((name) => name.trim())
      .join(" ");
    const result = await query(
      "INSERT INTO users (email, password_hash, full_name, first_name, middle_name, last_name, role) VALUES (?, ?, ?, ?, ?, ?, 'requestor')",
      [
        normalizedEmail,
        await bcrypt.hash(password, 12),
        fullName,
        first_name.trim(),
        middle_name?.trim() || null,
        last_name.trim(),
      ],
    );
    await linkRequestsToAccount(query, result.insertId, normalizedEmail);
    const [user] = await query("SELECT * FROM users WHERE id = ?", [
      result.insertId,
    ]);
    const session = await issueSession(user, req, res);
    return res.status(201).json({
      success: true,
      message: "Account registered successfully.",
      ...session,
    });
  } catch (error) {
    console.error("[Register Error]:", error);
    return res
      .status(500)
      .json({ success: false, message: "Unable to register this account." });
  }
}

async function getSetupStatus(req, res) {
  try {
    const [result] = await query("SELECT COUNT(*) AS total FROM users");
    return res.json({ success: true, setup_required: result.total === 0 });
  } catch (error) {
    console.error("[Setup Status Error]:", error);
    return res
      .status(500)
      .json({ success: false, message: "Unable to check setup status." });
  }
}

async function setup(req, res) {
  try {
    const { email, password, first_name, middle_name, last_name } =
      req.body || {};
    if (!email || !password || !first_name || !last_name)
      return res.status(400).json({
        success: false,
        message: "Email, first name, last name, and password are required.",
      });
    if (String(password).length < 8)
      return res.status(400).json({
        success: false,
        message: "Password must contain at least 8 characters.",
      });
    const normalizedEmail = email.trim().toLowerCase();
    if (!isInstitutionalEmail(normalizedEmail))
      return res.status(400).json({
        success: false,
        message:
          "The administrator must use an @ndmu.edu.ph institutional email address.",
      });
    const [count] = await query("SELECT COUNT(*) AS total FROM users");
    if (count.total > 0)
      return res.status(409).json({
        success: false,
        message: "Initial setup has already been completed.",
      });
    const fullName = [first_name, middle_name, last_name]
      .filter(Boolean)
      .map((name) => name.trim())
      .join(" ");
    const result = await query(
      "INSERT INTO users (email, password_hash, full_name, first_name, middle_name, last_name, role, is_active) VALUES (?, ?, ?, ?, ?, ?, 'admin', 1)",
      [
        normalizedEmail,
        await bcrypt.hash(password, 12),
        fullName,
        first_name.trim(),
        middle_name?.trim() || null,
        last_name.trim(),
      ],
    );
    const [user] = await query("SELECT * FROM users WHERE id = ?", [
      result.insertId,
    ]);
    const session = await issueSession(user, req, res);
    return res.status(201).json({
      success: true,
      message: "Initial administrator created successfully.",
      ...session,
    });
  } catch (error) {
    console.error("[Initial Setup Error]:", error);
    return res
      .status(500)
      .json({ success: false, message: "Unable to complete initial setup." });
  }
}

async function login(req, res) {
  try {
    const { email, password } = req.body;
    if (!email || !password)
      return res
        .status(400)
        .json({ success: false, message: "Email and password are required." });
    const [user] = await query("SELECT * FROM users WHERE email = ?", [
      email.trim().toLowerCase(),
    ]);
    if (
      !user ||
      !user.password_hash ||
      !(await bcrypt.compare(password, user.password_hash))
    )
      return res
        .status(401)
        .json({ success: false, message: "Invalid email or password." });
    if (!user.is_active)
      return res.status(403).json({
        success: false,
        message: "This account has been deactivated.",
      });
    const session = await issueSession(user, req, res);
    return res.json({
      success: true,
      message: "Login successful.",
      ...session,
    });
  } catch (error) {
    console.error("[Login Error]:", error);
    return res
      .status(500)
      .json({ success: false, message: "Unable to sign in." });
  }
}

async function googleLogin(req, res) {
  try {
    const profile = req.googleProfile;
    const email = profile.email;
    let [user] = await query(
      "SELECT * FROM users WHERE email = ? OR google_id = ?",
      [email, profile.sub],
    );
    if (user && !user.is_active)
      return res.status(403).json({ success: false, message: "This account has been deactivated." });
    if (user?.google_id && user.google_id !== profile.sub)
      return res.status(403).json({ success: false, message: "This account is linked to a different Google identity." });
    if (!user) {
      const result = await query(
        "INSERT INTO users (google_id, email, full_name, role, avatar_url) VALUES (?, ?, ?, 'requestor', ?)",
        [
          profile.sub,
          email,
          profile.name || email.split("@")[0],
          profile.picture || null,
        ],
      );
      [user] = await query("SELECT * FROM users WHERE id = ?", [
        result.insertId,
      ]);
    } else
      await query(
        "UPDATE users SET google_id = ?, avatar_url = COALESCE(?, avatar_url) WHERE id = ?",
        [profile.sub, profile.picture || null, user.id],
      );
    await linkRequestsToAccount(query, user.id, email);
    const session = await issueSession(user, req, res);
    return res.json({ success: true, message: "Google sign-in successful.", ...session });
  } catch (error) {
    console.error("[Google Sign-in Error]:", error.message);
    return res.status(500).json({ success: false, message: "Unable to sign in with Google." });
  }
}

async function refresh(req, res) {
  try {
    const token = req.cookies?.[cookieName()];
    if (!token || !verifyRefreshToken(token))
      return res.status(401).json({
        success: false,
        message: "Refresh token is invalid or expired.",
      });
    const stored = await consumeRefreshToken(token);
    if (!stored)
      return res
        .status(401)
        .json({ success: false, message: "Refresh token is no longer valid." });
    const session = await issueSession(safeUser(stored), req, res);
    return res.json({ success: true, ...session });
  } catch (error) {
    console.error("[Refresh Error]:", error);
    return res
      .status(401)
      .json({ success: false, message: "Unable to refresh session." });
  }
}

async function logout(req, res) {
  try {
    const token = req.cookies?.[cookieName()];
    if (token) await revokeRefreshToken(token);
    res.clearCookie(cookieName(), cookieOptions());
    return res.json({ success: true });
  } catch {
    return res
      .status(500)
      .json({ success: false, message: "Unable to sign out." });
  }
}
async function updatePassword(req, res) {
  try {
    const { current_password, new_password } = req.body || {};
    if (!current_password || !new_password)
      return res.status(400).json({
        success: false,
        message: "Current password and new password are required.",
      });
    if (String(new_password).length < 8)
      return res.status(400).json({
        success: false,
        message: "Your new password must contain at least 8 characters.",
      });
    if (current_password === new_password)
      return res.status(400).json({
        success: false,
        message:
          "Choose a new password that differs from your current password.",
      });

    const [account] = await query(
      "SELECT password_hash FROM users WHERE id = ? AND is_active = 1",
      [req.user.id],
    );
    if (!account?.password_hash)
      return res.status(400).json({
        success: false,
        message:
          "This account does not have a local password. Sign in with its configured identity provider.",
      });
    if (!(await bcrypt.compare(current_password, account.password_hash)))
      return res.status(400).json({
        success: false,
        message: "Your current password is incorrect.",
      });

    await query("UPDATE users SET password_hash = ? WHERE id = ?", [
      await bcrypt.hash(new_password, 12),
      req.user.id,
    ]);
    await revokeUserTokens(req.user.id);
    const session = await issueSession(req.user, req, res);
    return res.json({
      success: true,
      message: "Password updated. Other signed-in sessions have been revoked.",
      ...session,
    });
  } catch (error) {
    console.error("[Update Password Error]:", error);
    return res
      .status(500)
      .json({ success: false, message: "Unable to update your password." });
  }
}
async function getMe(req, res) {
  return res.json({ success: true, user: safeUser(req.user) });
}

module.exports = {
  register,
  getSetupStatus,
  setup,
  login,
  googleLogin,
  refresh,
  logout,
  updatePassword,
  getMe,
};
