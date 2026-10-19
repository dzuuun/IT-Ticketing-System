export function createUserImportErrorWorkbook(ExcelJS, errors, skippedRows = []) {
  const workbook = new ExcelJS.Workbook();
  const users = workbook.addWorksheet("Skipped Users", {
    views: [{ state: "frozen", ySplit: 1 }],
  });
  users.columns = [
    { header: "first_name", key: "first_name", width: 22 },
    { header: "middle_name", key: "middle_name", width: 22 },
    { header: "last_name", key: "last_name", width: 22 },
    { header: "email", key: "email", width: 36 },
    { header: "role", key: "role", width: 20 },
    { header: "password", key: "password", width: 22 },
    { header: "source_row", key: "source_row", width: 14 },
    { header: "errors", key: "errors", width: 80 },
  ];
  users.getCell("F1").note =
    "Passwords are not copied into this report. Leave blank for Google sign-in or enter a new password of at least 8 characters.";
  const errorsByRow = new Map();
  for (const error of errors) {
    const messages = errorsByRow.get(error.row) || [];
    messages.push(`${error.field}: ${error.message}`);
    errorsByRow.set(error.row, messages);
  }
  for (const row of skippedRows) {
    const messages = errorsByRow.get(row.row) || [];
    // Assign strings, never spreadsheet formulas, and never export passwords.
    users.addRow({
      ...Object.fromEntries(["first_name", "middle_name", "last_name", "email", "role"]
        .map((field) => [field, String(row[field] ?? "").slice(0, 32767)])),
      password: "",
      source_row: row.row,
      errors: messages.join("\n").slice(0, 32767),
    });
  }
  const details = workbook.addWorksheet("Error Details", {
    views: [{ state: "frozen", ySplit: 1 }],
  });
  details.columns = [
    { header: "source_row", key: "row", width: 14 },
    { header: "field", key: "field", width: 24 },
    { header: "error", key: "message", width: 90 },
  ];
  errors.forEach((error) => details.addRow({ row: error.row, field: error.field, message: error.message }));
  for (const sheet of [users, details]) {
    sheet.getRow(1).font = { bold: true, color: { argb: "FFFFFFFF" } };
    sheet.getRow(1).fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF075C3B" } };
    sheet.getRow(1).height = 26;
    sheet.autoFilter = { from: { row: 1, column: 1 }, to: { row: sheet.rowCount, column: sheet.columnCount } };
    sheet.eachRow((row) => { row.alignment = { vertical: "top", wrapText: true }; });
  }
  return workbook;
}
