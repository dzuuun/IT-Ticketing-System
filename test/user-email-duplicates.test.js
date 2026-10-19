const test = require("node:test");
const assert = require("node:assert/strict");
const db = require("../db");

let execute;
const originalQuery = db.query;
db.query = (...args) => execute(...args);
const { createUser, updateUserRole } = require("../api/users/user.controller");
db.query = originalQuery;

function response() {
  return {
    statusCode: 200,
    status(code) { this.statusCode = code; return this; },
    json(body) { this.body = body; return this; },
  };
}

test("editing rejects another user's normalized email before writing any changes", async () => {
  execute = async (sql, params) => {
    if (sql.startsWith("SELECT id, role, email"))
      return [{ id: 7, role: "requestor", email: "current@ndmu.edu.ph" }];
    assert.equal(sql, "SELECT id FROM users WHERE email = ? AND id <> ?");
    assert.deepEqual(params, ["taken@ndmu.edu.ph", "7"]);
    return [{ id: 8 }];
  };
  const res = response();
  await updateUserRole({ params: { userId: "7" }, body: { email: " TAKEN@ndmu.edu.ph " } }, res);
  assert.equal(res.statusCode, 409);
  assert.match(res.body.message, /email already exists/);
});

test("editing allows an unchanged email and a name shared by other users", async () => {
  let updated = false;
  execute = async (sql, params) => {
    if (sql.startsWith("SELECT id, role, email"))
      return [{ id: 7, role: "requestor", email: "current@ndmu.edu.ph" }];
    if (sql.startsWith("SELECT id FROM users")) {
      assert.deepEqual(params, ["current@ndmu.edu.ph", "7"]);
      return [];
    }
    assert.ok(sql.startsWith("UPDATE users"));
    assert.ok(params.includes("Maria Cruz"));
    updated = true;
    return { affectedRows: 1 };
  };
  const res = response();
  await updateUserRole({ params: { userId: "7" }, body: {
    email: " CURRENT@ndmu.edu.ph ", first_name: "Maria", last_name: "Cruz",
  } }, res);
  assert.equal(res.statusCode, 200);
  assert.equal(updated, true);
});

test("creation accepts a shared name when the email is new", async () => {
  execute = async (sql, params) => {
    if (sql.startsWith("SELECT id FROM users")) {
      assert.equal(sql, "SELECT id FROM users WHERE email = ?");
      assert.deepEqual(params, ["new@ndmu.edu.ph"]);
      return [];
    }
    if (sql.startsWith("INSERT INTO users")) {
      assert.equal(params[0], "new@ndmu.edu.ph");
      assert.equal(params[2], "Maria Cruz");
      return { insertId: 10 };
    }
    assert.ok(sql.startsWith("UPDATE tickets") || sql.startsWith("UPDATE ticket_requestors"));
    return { affectedRows: 0 };
  };
  const res = response();
  await createUser({ body: {
    email: " NEW@ndmu.edu.ph ", password: "TestPassword123!", first_name: "Maria", last_name: "Cruz",
  } }, res);
  assert.equal(res.statusCode, 201);
  assert.equal(res.body.user.email, "new@ndmu.edu.ph");
});

test("database email conflicts during editing return a useful conflict response", async () => {
  execute = async (sql) => {
    if (sql.startsWith("SELECT id, role, email"))
      return [{ id: 7, role: "requestor", email: "current@ndmu.edu.ph" }];
    if (sql.startsWith("SELECT id FROM users")) return [];
    throw Object.assign(new Error("Concurrent email conflict"), { code: "ER_DUP_ENTRY" });
  };
  const res = response();
  await updateUserRole({ params: { userId: "7" }, body: { email: "taken@ndmu.edu.ph" } }, res);
  assert.equal(res.statusCode, 409);
  assert.match(res.body.message, /email already exists/);
});
