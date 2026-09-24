const test = require("node:test");
const assert = require("node:assert/strict");

process.env.JWT_ACCESS_SECRET = "test-access-secret";
process.env.JWT_REFRESH_SECRET = "test-refresh-secret";

const {
  signAccessToken,
  verifyAccessToken,
  signRefreshToken,
  verifyRefreshToken,
} = require("../auth/jwt");
const { requireRole } = require("../auth/middleware");
const { __test: ticketRules } = require("../api/tickets/ticket.controller");

function response() {
  return {
    statusCode: null,
    body: null,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(body) {
      this.body = body;
      return this;
    },
  };
}

test("access and refresh JWTs are distinct and verify only for their intended use", () => {
  const user = { id: 42 };
  const access = signAccessToken(user);
  const refresh = signRefreshToken(user);

  assert.equal(verifyAccessToken(access).userId, user.id);
  assert.equal(verifyRefreshToken(refresh).userId, user.id);
  assert.equal(verifyAccessToken(refresh), null);
  assert.equal(verifyRefreshToken(access), null);
});

test("role middleware rejects missing and unauthorized roles", () => {
  const adminOnly = requireRole("admin");
  const next = () => assert.fail("next must not run");

  const missing = response();
  adminOnly({}, missing, next);
  assert.equal(missing.statusCode, 401);

  const requestor = response();
  adminOnly({ user: { role: "requestor" } }, requestor, next);
  assert.equal(requestor.statusCode, 403);
});

test("role middleware permits an authorized admin", () => {
  let called = false;
  requireRole("admin")({ user: { role: "admin" } }, response(), () => {
    called = true;
  });
  assert.equal(called, true);
});

test("requestors can respond only after a ticket is resolved", () => {
  assert.match(
    ticketRules.validateResolutionAction({ status: "in_progress" }, "confirm"),
    /Only a resolved ticket/,
  );
  assert.equal(
    ticketRules.validateResolutionAction({ status: "resolved" }, "confirm"),
    null,
  );
  assert.equal(
    ticketRules.validateResolutionAction({ status: "resolved" }, "reopen"),
    null,
  );
});
