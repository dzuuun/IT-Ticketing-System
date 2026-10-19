const test = require("node:test");
const assert = require("node:assert/strict");
const bcrypt = require("bcryptjs");
const db = require("../db");

let connection;
const originalGetPool = db.getPool;
db.getPool = () => ({ getConnection: async () => connection });
const { importUsers } = require("../api/users/user-import.service");
db.getPool = originalGetPool;

const account = (email, password) => ({
  first_name: "Maria", last_name: "Cruz", email, role: "requestor",
  ...(password === undefined ? {} : { password }),
});

function database(existing = []) {
  const inserted = [];
  const state = { inserted, started: false, committed: false, released: false };
  let savepoint;
  connection = {
    async query(sql, params) {
      if (sql.startsWith("SAVEPOINT")) savepoint = inserted.length;
      if (sql.startsWith("ROLLBACK TO SAVEPOINT")) inserted.splice(savepoint);
      if (sql.startsWith("SELECT email")) return [existing];
      if (sql.startsWith("INSERT INTO users")) {
        inserted.push(params);
        return [{ insertId: inserted.length }];
      }
      return [{ affectedRows: 1 }];
    },
    async beginTransaction() { state.started = true; },
    async commit() { state.committed = true; },
    async rollback() { state.rolledBack = true; inserted.splice(0); },
    release() { state.released = true; },
  };
  return state;
}

test("bulk user import accepts absent, empty, null, and whitespace passwords without a local password", async () => {
  const state = database();
  const result = await importUsers([
    account("one@ndmu.edu.ph"),
    account("two@ndmu.edu.ph", ""),
    account("three@ndmu.edu.ph", null),
    account("four@ndmu.edu.ph", "   "),
  ]);
  assert.deepEqual(result, { imported: 4, skipped: 0, errors: [], skipped_rows: [] });
  assert.equal(state.inserted.length, 4);
  for (const row of state.inserted) assert.equal(row[1], null);
  assert.ok(state.committed);
  assert.ok(state.released);
});

test("bulk user import can mix Google-only accounts with hashed local passwords", async () => {
  const state = database();
  const result = await importUsers([
    account("google@ndmu.edu.ph"),
    account("local@ndmu.edu.ph", "TestPassword123!"),
  ]);
  assert.equal(result.imported, 2);
  assert.equal(state.inserted[0][1], null);
  assert.notEqual(state.inserted[1][1], "TestPassword123!");
  assert.equal(await bcrypt.compare("TestPassword123!", state.inserted[1][1]), true);
});

test("a supplied short password skips only the invalid row and imports valid accounts", async () => {
  const state = database();
  const result = await importUsers([
    account("google@ndmu.edu.ph"),
    account("local@ndmu.edu.ph", "short"),
  ]);
  assert.deepEqual(result.errors, [{
    row: 3, field: "password", message: "Password must contain at least 8 characters.",
  }]);
  assert.equal(result.imported, 1);
  assert.equal(result.skipped, 1);
  assert.equal(state.inserted.length, 1);
  assert.equal(state.inserted[0][0], "google@ndmu.edu.ph");
  assert.equal(result.skipped_rows[0].email, "local@ndmu.edu.ph");
  assert.ok(!Object.hasOwn(result.skipped_rows[0], "password"));
  assert.equal(state.committed, true);
  assert.ok(state.released);
});

test("optional passwords do not bypass existing-email or institutional-email validation", async () => {
  const state = database([{ email: "existing@ndmu.edu.ph" }]);
  const result = await importUsers([
    account("existing@ndmu.edu.ph"),
    account("outside@example.com"),
  ]);
  assert.ok(result.errors.some((error) => error.row === 2 && /already exists/.test(error.message)));
  assert.ok(result.errors.some((error) => error.row === 3 && /institutional/.test(error.message)));
  assert.equal(state.inserted.length, 0);
  assert.equal(result.imported, 0);
  assert.equal(result.skipped, 2);
});

test("error reports preserve source row numbers across empty spreadsheet rows and combine row errors", async () => {
  database();
  const result = await importUsers([
    { ...account("good@ndmu.edu.ph"), _row: 3 },
    { ...account("bad-email", "short"), first_name: "", _row: 20 },
  ]);
  assert.equal(result.imported, 1);
  assert.equal(result.skipped, 1);
  assert.ok(result.errors.length > 1);
  assert.ok(result.errors.every((error) => error.row === 20));
  assert.deepEqual(result.skipped_rows.map((row) => row.row), [20]);
});

test("duplicate emails skip later valid occurrences while an invalid first occurrence does not block a valid one", async () => {
  const state = database();
  const result = await importUsers([
    { ...account("same@ndmu.edu.ph"), first_name: "" },
    account("same@ndmu.edu.ph"),
    account("SAME@ndmu.edu.ph"),
  ]);
  assert.equal(result.imported, 1);
  assert.equal(result.skipped, 2);
  assert.deepEqual(result.skipped_rows.map((row) => row.row), [2, 4]);
  assert.equal(state.inserted.length, 1);
});

test("an existing account is skipped without preventing new accounts importing", async () => {
  const state = database([{ email: "existing@ndmu.edu.ph" }]);
  const result = await importUsers([
    account("existing@ndmu.edu.ph"), account("new@ndmu.edu.ph"),
  ]);
  assert.equal(result.imported, 1);
  assert.equal(result.skipped, 1);
  assert.equal(state.inserted[0][0], "new@ndmu.edu.ph");
});

test("a database duplicate detected during insert rolls back that row and continues", async () => {
  const state = database();
  const query = connection.query;
  connection.query = async (sql, params) => {
    if (sql.startsWith("INSERT INTO users") && params[0] === "race@ndmu.edu.ph")
      throw Object.assign(new Error("Duplicate"), { code: "ER_DUP_ENTRY" });
    return query(sql, params);
  };
  const result = await importUsers([
    account("first@ndmu.edu.ph"), account("race@ndmu.edu.ph"), account("last@ndmu.edu.ph"),
  ]);
  assert.equal(result.imported, 2);
  assert.equal(result.skipped, 1);
  assert.equal(result.errors[0].row, 3);
  assert.deepEqual(state.inserted.map((row) => row[0]), ["first@ndmu.edu.ph", "last@ndmu.edu.ph"]);
});

test("an unexpected database failure rolls back the import instead of reporting incomplete success", async () => {
  const state = database();
  const query = connection.query;
  connection.query = async (sql, params) => {
    if (sql.startsWith("INSERT INTO users") && params[0] === "failure@ndmu.edu.ph")
      throw Object.assign(new Error("Connection lost"), { code: "PROTOCOL_CONNECTION_LOST" });
    return query(sql, params);
  };
  await assert.rejects(importUsers([
    account("first@ndmu.edu.ph"), account("failure@ndmu.edu.ph"),
  ]), /Connection lost/);
  assert.equal(state.rolledBack, true);
  assert.equal(state.committed, false);
  assert.equal(state.inserted.length, 0);
  assert.equal(state.released, true);
});
