const crypto = require("crypto");
const { OAuth2Client } = require("google-auth-library");
const { isInstitutionalEmail } = require("../api/services/institutionalEmail");

const nonceCookie = "ndmu_google_nonce";
const client = new OAuth2Client();
const nonceCookieOptions = () => ({
  httpOnly: true,
  secure:
    process.env.COOKIE_SECURE === "true" ||
    (process.env.COOKIE_SECURE !== "false" &&
      process.env.NODE_ENV === "production"),
  sameSite: "lax",
  path: "/",
});

function getGoogleConfiguration(req, res) {
  res.set("Cache-Control", "no-store");
  const clientId = process.env.GOOGLE_CLIENT_ID?.trim();
  if (!clientId) return res.json({ enabled: false });

  // Bind the returned ID token to the browser that opened the sign-in page.
  const nonce = crypto.randomBytes(32).toString("hex");
  res.cookie(nonceCookie, nonce, {
    ...nonceCookieOptions(),
    maxAge: 10 * 60 * 1000,
  });
  return res.json({ enabled: true, client_id: clientId, nonce });
}

async function authenticateGoogle(req, res, next) {
  const clientId = process.env.GOOGLE_CLIENT_ID?.trim();
  if (!clientId)
    return res.status(503).json({
      success: false,
      message: "Google sign-in is currently unavailable.",
    });

  const credential = req.body?.credential;
  const nonce = req.cookies?.[nonceCookie];
  if (
    typeof credential !== "string" || !credential ||
    typeof nonce !== "string" || !nonce
  )
    return res.status(401).json({
      success: false,
      message: "Please reload the page and try Google sign-in again.",
    });

  let profile;
  try {
    // Google's library checks signature, expiry, issuer, and audience.
    const ticket = await client.verifyIdToken({
      idToken: credential,
      audience: clientId,
    });
    profile = ticket.getPayload();
  } catch {
    return res.status(401).json({
      success: false,
      message: "Google sign-in could not be verified. Please try again.",
    });
  }

  const tokenNonce = Buffer.from(String(profile?.nonce || ""));
  const browserNonce = Buffer.from(nonce);
  if (
    tokenNonce.length !== browserNonce.length ||
    !crypto.timingSafeEqual(tokenNonce, browserNonce)
  )
    return res.status(401).json({
      success: false,
      message: "Google sign-in session does not match this browser.",
    });

  const email = typeof profile.email === "string" ? profile.email.toLowerCase() : "";
  const domain = (process.env.GOOGLE_ALLOWED_DOMAIN || "ndmu.edu.ph").trim().toLowerCase();
  if (
    !profile.sub || profile.email_verified !== true ||
    !isInstitutionalEmail(email) || profile.hd !== domain
  )
    return res.status(403).json({
      success: false,
      message: "Only verified NDMU Google Workspace accounts may sign in.",
    });

  req.googleProfile = { ...profile, email };
  res.clearCookie(nonceCookie, nonceCookieOptions());
  next();
}

module.exports = { getGoogleConfiguration, authenticateGoogle };
