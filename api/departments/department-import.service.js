const { getPool } = require("../../db");

const VALID_TYPES = new Set(["college", "office", "unit", "other"]);
const text = (value) => String(value ?? "").trim();

async function importDepartments(rows) {
  if (!Array.isArray(rows) || !rows.length)
    return {
      errors: [
        {
          row: 1,
          field: "file",
          message: "The spreadsheet does not contain any department rows.",
        },
      ],
    };
  const errors = [];
  const codes = new Set();
  const normalizedRows = rows.map((raw, index) => {
    const row = raw && typeof raw === "object" ? raw : {};
    const spreadsheetRow = index + 2;
    const normalized = {
      name: text(row.name),
      code: text(row.code).toUpperCase(),
      type: text(row.type).toLowerCase(),
      spreadsheetRow,
    };
    if (!normalized.name)
      errors.push({
        row: spreadsheetRow,
        field: "name",
        message: "Unit name is required.",
      });
    if (!normalized.code)
      errors.push({
        row: spreadsheetRow,
        field: "code",
        message: "Unit code is required.",
      });
    if (codes.has(normalized.code))
      errors.push({
        row: spreadsheetRow,
        field: "code",
        message: "Code is duplicated in this spreadsheet.",
      });
    codes.add(normalized.code);
    if (!VALID_TYPES.has(normalized.type))
      errors.push({
        row: spreadsheetRow,
        field: "type",
        message: "Type must be college, office, unit, or other.",
      });
    return normalized;
  });
  if (errors.length) return { errors };
  const connection = await getPool().getConnection();
  let inTransaction = false;
  try {
    const placeholders = normalizedRows.map(() => "?").join(", ");
    const [existing] = await connection.query(
      `SELECT code FROM locations WHERE code IN (${placeholders})`,
      normalizedRows.map((row) => row.code),
    );
    const existingCodes = new Set(
      existing.map((department) => department.code.toUpperCase()),
    );
    normalizedRows.forEach((row) => {
      if (existingCodes.has(row.code))
        errors.push({
          row: row.spreadsheetRow,
          field: "code",
          message: "A department with this code already exists.",
        });
    });
    if (errors.length) return { errors };
    await connection.beginTransaction();
    inTransaction = true;
    for (const row of normalizedRows)
      await connection.query(
        "INSERT INTO locations (name, code, type, is_active) VALUES (?, ?, ?, ?)",
        [row.name, row.code, row.type, 1],
      );
    await connection.commit();
    return { imported: normalizedRows.length, errors: [] };
  } catch (error) {
    if (inTransaction) await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

module.exports = { importDepartments };
