const test = require("node:test");
const assert = require("node:assert/strict");
const { __test: dashboard } = require("../api/dashboard/stats.controller");
const upload = require("../api/middleware/upload");

test("dashboard ticket scope keeps requestor statistics private, including later account links", () => {
  const scope = dashboard.ticketScopeFor({
    id: 3,
    email: "requestor@ndmu.edu.ph",
    role: "requestor",
  });
  assert.match(scope.clause, /ticket_requestors/);
  assert.deepEqual(scope.params, [
    3,
    "requestor@ndmu.edu.ph",
    3,
    "requestor@ndmu.edu.ph",
  ]);
});

test("encoder and technician dashboards receive constrained ticket scopes", () => {
  const encoder = dashboard.ticketScopeFor({ id: 4, role: "encoder" });
  const technician = dashboard.ticketScopeFor({ id: 5, role: "technician" });
  assert.match(encoder.clause, /encoded_by_user_id/);
  assert.match(technician.clause, /assigned_technician_id/);
  assert.deepEqual(encoder.params, [4]);
  assert.deepEqual(technician.params, [5, 5]);
});

test("upload policy accepts only matching extension and MIME type", () => {
  assert.equal(
    upload.isAllowedUpload({
      originalname: "evidence.pdf",
      mimetype: "application/pdf",
    }),
    true,
  );
  assert.equal(
    upload.isAllowedUpload({
      originalname: "evidence.pdf",
      mimetype: "image/png",
    }),
    false,
  );
  assert.equal(
    upload.isAllowedUpload({
      originalname: "payload.exe",
      mimetype: "application/pdf",
    }),
    false,
  );
  assert.equal(
    upload.isAllowedUpload({
      originalname: "screen.png",
      mimetype: "image/png",
    }),
    true,
  );
});
