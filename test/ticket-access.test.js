const test = require("node:test");
const assert = require("node:assert/strict");
const { __test } = require("../api/tickets/ticket.controller");

test("a technician can access an unassigned ticket", async () => {
  assert.equal(
    await __test.canTechnicianAccessTicket(
      { id: 7, role: "technician" },
      { assigned_technician_id: null, assigned_team_id: null },
    ),
    true,
  );
});

test("a technician can access only their assigned ticket", async () => {
  const technician = { id: 7, role: "technician" };
  assert.equal(
    await __test.canTechnicianAccessTicket(technician, { assigned_technician_id: 7 }),
    true,
  );
  assert.equal(
    await __test.canTechnicianAccessTicket(technician, { assigned_technician_id: 8 }),
    false,
  );
});

test("administrators and team leaders are not constrained by technician assignment", async () => {
  const ticket = { assigned_technician_id: 7 };
  assert.equal(await __test.canTechnicianAccessTicket({ id: 1, role: "admin" }, ticket), true);
  assert.equal(await __test.canTechnicianAccessTicket({ id: 2, role: "team_leader" }, ticket), true);
});

test("ticket-number lookups never compare a text ticket number with numeric IDs", () => {
  const lookup = __test.ticketLookupForIdentifier("ICT-MIS-2026-000001");
  assert.equal(lookup.clause, "t.ticket_number = ?");
  assert.deepEqual(lookup.params, ["ICT-MIS-2026-000001"]);
});

test("numeric ticket lookups still support ID and ticket-number matching", () => {
  const lookup = __test.ticketLookupForIdentifier("42");
  assert.equal(lookup.clause, "t.id = ? OR t.ticket_number = ?");
  assert.deepEqual(lookup.params, [42, "42"]);
});
