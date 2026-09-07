const bcrypt = require('bcryptjs');
const { OAuth2Client } = require('google-auth-library');
const { query } = require('../db');
const { signAccessToken, signRefreshToken, verifyRefreshToken } = require('./jwt');
const { storeRefreshToken, useRefreshToken, revokeRefreshToken } = require('./refreshTokens');

const cookieName = () => process.env.REFRESH_COOKIE_NAME || 'ndmu_refresh_token';
const refreshDays = () => Number.parseInt(process.env.JWT_REFRESH_DAYS || '7', 10);
const cookieOptions = () => ({ httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax', maxAge: refreshDays() * 86400000, path: '/auth' });
const safeUser = (user) => ({ id: user.id || user.user_id, email: user.email, full_name: user.full_name, role: user.role, department_id: user.department_id, department_name: user.department_name, phone: user.phone, avatar_url: user.avatar_url });

async function issueSession(user, req, res) {
  return { accessToken: signAccessToken(user), user: safeUser(user) };
}

async function register(req, res) {
  try {
    const { email, password, first_name, middle_name, last_name, department_id, department_name, phone } = req.body;
    if (!email || !password || !first_name || !last_name) return res.status(400).json({ success: false, message: 'Email, first name, last name, and password are required.' });
    const normalizedEmail = email.trim().toLowerCase();
    if ((await query('SELECT id FROM users WHERE email = ?', [normalizedEmail])).length) return res.status(409).json({ success: false, message: 'An account with this email already exists.' });
    const fullName = [first_name, middle_name, last_name].filter(Boolean).map((name) => name.trim()).join(' ');
    let normalizedDepartmentId = department_id || null;
    if (!normalizedDepartmentId && department_name) {
      const [department] = await query('SELECT id FROM departments WHERE name = ? LIMIT 1', [department_name.trim()]);
      normalizedDepartmentId = department?.id || null;
    }
    const result = await query('INSERT INTO users (email, password_hash, full_name, first_name, middle_name, last_name, role, department_id, phone) VALUES (?, ?, ?, ?, ?, ?, \'requestor\', ?, ?)', [normalizedEmail, await bcrypt.hash(password, 12), fullName, first_name.trim(), middle_name?.trim() || null, last_name.trim(), normalizedDepartmentId, phone?.trim() || null]);
    const [user] = await query('SELECT u.*, d.name AS department_name FROM users u LEFT JOIN departments d ON d.id = u.department_id WHERE u.id = ?', [result.insertId]);
    const session = await issueSession(user, req, res);
    return res.status(201).json({ success: true, message: 'Account registered successfully.', ...session });
  } catch (error) { console.error('[Register Error]:', error); return res.status(500).json({ success: false, message: 'Unable to register this account.' }); }
}

async function login(req, res) {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ success: false, message: 'Email and password are required.' });
    const [user] = await query('SELECT u.*, d.name AS department_name FROM users u LEFT JOIN departments d ON d.id = u.department_id WHERE u.email = ?', [email.trim().toLowerCase()]);
    if (!user || !user.password_hash || !(await bcrypt.compare(password, user.password_hash))) return res.status(401).json({ success: false, message: 'Invalid email or password.' });
    if (!user.is_active) return res.status(403).json({ success: false, message: 'This account has been deactivated.' });
    const session = await issueSession(user, req, res);
    return res.json({ success: true, message: 'Login successful.', ...session });
  } catch (error) { console.error('[Login Error]:', error); return res.status(500).json({ success: false, message: 'Unable to sign in.' }); }
}

function googleClient() { return new OAuth2Client(process.env.GOOGLE_CLIENT_ID, process.env.GOOGLE_CLIENT_SECRET, process.env.GOOGLE_CALLBACK_URL); }
function googleLogin(req, res) {
  if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET || !process.env.GOOGLE_CALLBACK_URL) return res.status(503).json({ success: false, message: 'Google sign-in has not been configured.' });
  return res.redirect(googleClient().generateAuthUrl({ access_type: 'offline', prompt: 'select_account', scope: ['openid', 'email', 'profile'] }));
}

async function googleCallback(req, res) {
  try {
    if (!req.query.code) return res.redirect(`${process.env.CLIENT_URL || 'http://localhost:5173'}/login?error=google`);
    const client = googleClient();
    const { tokens } = await client.getToken(req.query.code);
    const ticket = await client.verifyIdToken({ idToken: tokens.id_token, audience: process.env.GOOGLE_CLIENT_ID });
    const profile = ticket.getPayload();
    const email = profile.email?.toLowerCase();
    const allowedDomain = process.env.GOOGLE_ALLOWED_DOMAIN;
    if (!email || !profile.email_verified || (allowedDomain && !email.endsWith(`@${allowedDomain}`))) return res.status(403).send('Only verified NDMU accounts may sign in.');
    let [user] = await query('SELECT u.*, d.name AS department_name FROM users u LEFT JOIN departments d ON d.id = u.department_id WHERE u.email = ? OR u.google_id = ?', [email, profile.sub]);
    if (!user) {
      const result = await query('INSERT INTO users (google_id, email, full_name, role, avatar_url) VALUES (?, ?, ?, \'requestor\', ?)', [profile.sub, email, profile.name || email.split('@')[0], profile.picture || null]);
      [user] = await query('SELECT u.*, d.name AS department_name FROM users u LEFT JOIN departments d ON d.id = u.department_id WHERE u.id = ?', [result.insertId]);
    } else await query('UPDATE users SET google_id = ?, avatar_url = COALESCE(?, avatar_url) WHERE id = ?', [profile.sub, profile.picture || null, user.id]);
    if (!user.is_active) return res.status(403).send('This account has been deactivated.');
    const session = await issueSession(user, req, res);
    const target = `${process.env.CLIENT_URL || 'http://localhost:5173'}/login#access_token=${encodeURIComponent(session.accessToken)}`;
    return res.redirect(target);
  } catch (error) { console.error('[Google Callback Error]:', error); return res.redirect(`${process.env.CLIENT_URL || 'http://localhost:5173'}/login?error=google`); }
}

async function refresh(req, res) {
  try {
    const token = req.cookies?.[cookieName()];
    if (!token || !verifyRefreshToken(token)) return res.status(401).json({ success: false, message: 'Refresh token is invalid or expired.' });
    const stored = await useRefreshToken(token);
    if (!stored) return res.status(401).json({ success: false, message: 'Refresh token is no longer valid.' });
    await revokeRefreshToken(token);
    const session = await issueSession(safeUser(stored), req, res);
    return res.json({ success: true, ...session });
  } catch (error) { console.error('[Refresh Error]:', error); return res.status(401).json({ success: false, message: 'Unable to refresh session.' }); }
}

async function logout(req, res) { try { const token = req.cookies?.[cookieName()]; if (token) await revokeRefreshToken(token); res.clearCookie(cookieName(), cookieOptions()); return res.json({ success: true }); } catch { return res.status(500).json({ success: false, message: 'Unable to sign out.' }); } }
async function getMe(req, res) { return res.json({ success: true, user: safeUser(req.user) }); }

module.exports = { register, login, googleLogin, googleCallback, refresh, logout, getMe };
