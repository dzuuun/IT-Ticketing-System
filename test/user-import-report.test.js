const test = require("node:test");
const assert = require("node:assert/strict");
const ExcelJS = require("../client/node_modules/exceljs");

test("Excel report contains skipped row data, original row numbers, and all errors without passwords or executable formulas", async () => {
  const { createUserImportErrorWorkbook } = await import("../client/src/utils/userImportReport.js");
  const errors = [
    { row: 20, field: "email", message: "Enter a valid email address." },
    { row: 20, field: "password", message: "Password must contain at least 8 characters." },
    { row: 35, field: "role", message: "Select a valid role." },
  ];
  const workbook = createUserImportErrorWorkbook(ExcelJS, errors, [
    { row: 20, first_name: "=SUM(1,2)", middle_name: "", last_name: "Cruz", email: "invalid", role: "requestor", password: "secret" },
    { row: 35, first_name: "Juan", last_name: "Santos", email: "juan@ndmu.edu.ph", role: "unknown" },
  ]);
  const loaded = new ExcelJS.Workbook();
  await loaded.xlsx.load(await workbook.xlsx.writeBuffer());
  const skipped = loaded.worksheets[0];
  assert.equal(skipped.name, "Skipped Users");
  assert.equal(skipped.rowCount, 3);
  assert.equal(skipped.getCell("A2").value, "=SUM(1,2)");
  assert.equal(skipped.getCell("A2").type, ExcelJS.ValueType.String);
  assert.equal(skipped.getCell("F2").text, "");
  assert.equal(skipped.getCell("G2").value, 20);
  assert.match(skipped.getCell("H2").text, /email: Enter a valid email/);
  assert.match(skipped.getCell("H2").text, /password: Password must/);
  assert.equal(skipped.getCell("G3").value, 35);
  const details = loaded.getWorksheet("Error Details");
  assert.equal(details.rowCount, 4);
  assert.deepEqual(details.getRow(2).values.slice(1), [20, "email", "Enter a valid email address."]);
});

test("file-level errors can still be downloaded when no user rows could be read", async () => {
  const { createUserImportErrorWorkbook } = await import("../client/src/utils/userImportReport.js");
  const workbook = createUserImportErrorWorkbook(ExcelJS, [
    { row: 1, field: "email", message: "Missing column: email" },
  ]);
  assert.equal(workbook.getWorksheet("Skipped Users").rowCount, 1);
  assert.equal(workbook.getWorksheet("Error Details").getCell("C2").value, "Missing column: email");
});
