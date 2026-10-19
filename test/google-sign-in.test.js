const test = require("node:test");
const assert = require("node:assert/strict");
const crypto = require("node:crypto");
const jwt = require("jsonwebtoken");
const { OAuth2Client } = require("google-auth-library");

process.env.JWT_ACCESS_SECRET = "google-tests-access-secret";
process.env.JWT_REFRESH_SECRET = "google-tests-refresh-secret";
const db = require("../db");
let execute;
const originalQuery = db.query;
db.query = (...args) => execute(...args);
const routes = require("../auth/routes");
db.query = originalQuery;
const { verifyAccessToken } = require("../auth/jwt");

const { publicKey, privateKey } = crypto.generateKeyPairSync("rsa", { modulusLength: 2048 });
test.mock.method(OAuth2Client.prototype, "getFederatedSignonCertsAsync", async () => ({
  certs: { fixture: publicKey.export({ type: "spki", format: "pem" }) },
  format: "PEM",
}));

let server;
let base;
test.before(async () => {
  const express = require("express");
  const app = express();
  app.use(express.json(), require("cookie-parser")());
  app.use("/it-ticketing-system/auth", routes);
  await new Promise((resolve) => { server = app.listen(0, "127.0.0.1", resolve); });
  base = `http://127.0.0.1:${server.address().port}/it-ticketing-system/auth`;
});
test.after(() => new Promise((resolve) => server.close(resolve)));
test.beforeEach(() => {
  process.env.GOOGLE_CLIENT_ID = "fixture.apps.googleusercontent.com";
  process.env.GOOGLE_ALLOWED_DOMAIN = "ndmu.edu.ph";
  process.env.COOKIE_SECURE = "false";
  process.env.CLIENT_URL = "http://localhost/it-ticketing-system";
  execute = () => assert.fail("Rejected credentials must never access the database");
});

async function configuration() {
  const response = await fetch(`${base}/google/config`);
  return {
    response,
    data: await response.json(),
    cookie: response.headers.get("set-cookie")?.split(";")[0],
  };
}
function credential(nonce, claims = {}, options = {}) {
  return jwt.sign({
    sub: "google-user-123", email: "staff@ndmu.edu.ph", email_verified: true,
    hd: "ndmu.edu.ph", nonce, name: "Test Staff", ...claims,
  }, privateKey, {
    algorithm: "RS256", keyid: "fixture", audience: process.env.GOOGLE_CLIENT_ID,
    issuer: "https://accounts.google.com", expiresIn: "10m", ...options,
  });
}
function login(token, cookie) {
  return fetch(`${base}/google`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...(cookie ? { cookie } : {}) },
    body: JSON.stringify({ credential: token, role: "admin", email: "spoofed@ndmu.edu.ph" }),
  });
}

test("Google configuration handles missing client ID without a fake button or secrets", async () => {
  delete process.env.GOOGLE_CLIENT_ID;
  const config = await configuration();
  assert.deepEqual(config.data, { enabled: false });
  assert.equal(config.cookie, undefined);
  assert.equal(config.response.headers.get("cache-control"), "no-store");
  assert.equal((await login("anything")).status, 503);
});

test("Google configuration issues a fresh HttpOnly browser nonce", async () => {
  const first = await configuration();
  const second = await configuration();
  assert.deepEqual(Object.keys(first.data).sort(), ["client_id", "enabled", "nonce"]);
  assert.match(first.data.nonce, /^[a-f0-9]{64}$/);
  assert.notEqual(first.data.nonce, second.data.nonce);
  assert.equal(first.cookie, `ndmu_google_nonce=${first.data.nonce}`);
  assert.match(first.response.headers.get("set-cookie"), /HttpOnly/);
  assert.match(first.response.headers.get("set-cookie"), /SameSite=Lax/);
});

test("Google sign-in rejects missing credentials or the browser nonce", async () => {
  assert.equal((await login("anything")).status, 401);
  assert.equal((await login(undefined, "ndmu_google_nonce=test")).status, 401);
});

test("Google sign-in verifies signature, audience, issuer, expiry, and nonce", async () => {
  const config = await configuration();
  const invalidTokens = [
    credential(config.data.nonce, {}, { audience: "another-app" }),
    credential(config.data.nonce, {}, { issuer: "https://attacker.example" }),
    credential(config.data.nonce, {}, { expiresIn: -3600 }),
    credential("another-browser"),
    `${credential(config.data.nonce).slice(0, -20)}invalid-signature`,
  ];
  for (const token of invalidTokens) assert.equal((await login(token, config.cookie)).status, 401);
});

test("Google sign-in rejects unverified email and non-NDMU Workspace accounts", async () => {
  const config = await configuration();
  for (const claims of [
    { email_verified: false }, { email: "attacker@gmail.com" },
    { hd: "other.edu.ph" }, { hd: undefined },
  ]) {
    assert.equal((await login(credential(config.data.nonce, claims), config.cookie)).status, 403);
  }
});

test("Google sign-in preserves database roles and issues a protected session under the app path", async () => {
  const config = await configuration();
  const calls = [];
  execute = async (sql, params) => {
    calls.push({ sql, params });
    if (sql.startsWith("SELECT * FROM users")) {
      assert.deepEqual(params, ["staff@ndmu.edu.ph", "google-user-123"]);
      return [{ id: 7, email: "staff@ndmu.edu.ph", full_name: "Staff", role: "technician", is_active: 1 }];
    }
    return { affectedRows: 1 };
  };
  const result = await login(credential(config.data.nonce), config.cookie);
  assert.equal(result.status, 200);
  const session = await result.json();
  assert.equal(session.user.role, "technician");
  assert.equal(verifyAccessToken(session.accessToken).userId, 7);
  const cookies = result.headers.getSetCookie();
  assert.ok(cookies.some((cookie) => cookie.includes("Path=/it-ticketing-system/auth") && cookie.includes("HttpOnly")));
  assert.ok(calls.some(({ sql }) => sql.startsWith("INSERT INTO refresh_tokens")));
  assert.ok(calls.some(({ sql }) => sql.startsWith("UPDATE ticket_requestors")));
});

test("disabled or differently linked accounts cannot sign in or update their Google identity", async () => {
  for (const user of [
    { id: 7, is_active: 0 },
    { id: 7, is_active: 1, google_id: "a-different-google-user" },
  ]) {
    const config = await configuration();
    execute = async (sql) => {
      assert.ok(sql.startsWith("SELECT * FROM users"));
      return [user];
    };
    assert.equal((await login(credential(config.data.nonce), config.cookie)).status, 403);
  }
});

test("new Google users are created as requestors regardless of client role data", async () => {
  const config = await configuration();
  execute = async (sql, params) => {
    if (sql.includes("WHERE email = ? OR google_id = ?")) return [];
    if (sql.startsWith("INSERT INTO users")) {
      assert.ok(sql.includes("'requestor'"));
      assert.equal(params[0], "google-user-123");
      return { insertId: 9 };
    }
    if (sql.startsWith("SELECT * FROM users")) return [{ id: 9, email: "staff@ndmu.edu.ph", role: "requestor", is_active: 1 }];
    return { affectedRows: 1 };
  };
  const result = await login(credential(config.data.nonce), config.cookie);
  assert.equal(result.status, 200);
  assert.equal((await result.json()).user.role, "requestor");
});
