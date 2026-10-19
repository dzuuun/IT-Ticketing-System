const bcrypt = require("bcryptjs");
const { getPool } = require("../../db");
const { linkRequestsToAccount } = require("../services/requestorAccountLink");
const { isInstitutionalEmail } = require("../services/institutionalEmail");

const VALID_ROLES = new Set([
  "requestor",
  "encoder",
  "technician",
  "team_leader",
  "admin",
]);
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function text(value) {
  return String(value ?? "").trim();
}

async function validateRows(rows, connection) {
  const errors = [];
  const seenEmails = new Set();
  const normalizedRows = rows.map((rawRow, index) => {
    const row = rawRow && typeof rawRow === "object" ? rawRow : {};
    const spreadsheetRow = Number.isSafeInteger(row._row) && row._row >= 2
      ? row._row : index + 2;
    const errorCount = errors.length;
    const normalized = {
      firstName: text(row.first_name),
      middleName: text(row.middle_name),
      lastName: text(row.last_name),
      email: text(row.email).toLowerCase(),
      role: text(row.role).toLowerCase(),
      password: text(row.password),
    };

    if (!normalized.firstName)
      errors.push({
        row: spreadsheetRow,
        field: "first_name",
        message: "First name is required.",
      });
    if (!normalized.lastName)
      errors.push({
        row: spreadsheetRow,
        field: "last_name",
        message: "Last name is required.",
      });
    if (!EMAIL_PATTERN.test(normalized.email))
      errors.push({
        row: spreadsheetRow,
        field: "email",
        message: "Enter a valid email address.",
      });
    if (!VALID_ROLES.has(normalized.role))
      errors.push({
        row: spreadsheetRow,
        field: "role",
        message: "Role must be requestor, encoder, technician, team_leader, or admin.",
      });
    if (
      normalized.role === "requestor" &&
      !isInstitutionalEmail(normalized.email)
    )
      errors.push({
        row: spreadsheetRow,
        field: "email",
        message:
          "Requestor accounts must use an @ndmu.edu.ph institutional email address.",
      });
    if (normalized.password && normalized.password.length < 8)
      errors.push({
        row: spreadsheetRow,
        field: "password",
        message: "Password must contain at least 8 characters.",
      });
    for (const [field, value, max] of [
      ["first_name", normalized.firstName, 100],
      ["middle_name", normalized.middleName, 100],
      ["last_name", normalized.lastName, 100],
      ["email", normalized.email, 150],
      ["full_name", [normalized.firstName, normalized.middleName, normalized.lastName].filter(Boolean).join(" "), 150],
    ]) {
      if ([...value].length > max)
        errors.push({ row: spreadsheetRow, field, message: `Must contain no more than ${max} characters.` });
    }
    // An invalid occurrence must not prevent a later valid account importing.
    if (errors.length === errorCount) {
      if (seenEmails.has(normalized.email))
        errors.push({ row: spreadsheetRow, field: "email", message: "Email is duplicated in this spreadsheet." });
      else seenEmails.add(normalized.email);
    }
    return {
      ...normalized,
      spreadsheetRow,
    };
  });

  const emails = [...seenEmails].filter(Boolean);
  if (emails.length) {
    const placeholders = emails.map(() => "?").join(", ");
    const [existing] = await connection.query(
      `SELECT email FROM users WHERE email IN (${placeholders})`,
      emails,
    );
    const existingEmails = new Set(
      existing.map((account) => account.email.toLowerCase()),
    );
    normalizedRows.forEach((row) => {
      if (existingEmails.has(row.email))
        errors.push({
          row: row.spreadsheetRow,
          field: "email",
          message: "An account with this email already exists.",
        });
    });
  }

  return { normalizedRows, errors };
}

async function importUsers(rows) {
  if (!Array.isArray(rows) || rows.length === 0) {
    return {
      errors: [
        {
          row: 1,
          field: "file",
          message: "The spreadsheet does not contain any user rows.",
        },
      ],
    };
  }
  const connection = await getPool().getConnection();
  let inTransaction = false;
  try {
    const { normalizedRows, errors } = await validateRows(rows, connection);
    const invalidRows = new Set(errors.map((error) => error.row));
    const validRows = normalizedRows.filter((row) => !invalidRows.has(row.spreadsheetRow));
    let imported = 0;
    if (validRows.length) {
      await connection.beginTransaction();
      inTransaction = true;
    }
    for (const row of validRows) {
      const fullName = [row.firstName, row.middleName, row.lastName]
        .filter(Boolean)
        .join(" ");
      const passwordHash = row.password ? await bcrypt.hash(row.password, 12) : null;
      await connection.query("SAVEPOINT import_user_row");
      try {
        const [result] = await connection.query(
          `INSERT INTO users
           (email, password_hash, full_name, first_name, middle_name, last_name, role, is_active)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            row.email,
            passwordHash,
            fullName,
            row.firstName,
            row.middleName || null,
            row.lastName,
            row.role,
            1,
          ],
        );
        await linkRequestsToAccount(
          connection.query.bind(connection),
          result.insertId,
          row.email,
        );
        await connection.query("RELEASE SAVEPOINT import_user_row");
        imported++;
      } catch (error) {
        // These are recoverable errors confined to this account. Infrastructure
        // failures still abort the request rather than claiming completion.
        const rowErrors = {
          ER_DUP_ENTRY: ["email", "An account with this email already exists."],
          ER_DATA_TOO_LONG: ["row", "One or more values exceed the allowed length."],
          ER_TRUNCATED_WRONG_VALUE_FOR_FIELD: ["row", "One or more values are invalid."],
        };
        if (!rowErrors[error.code]) throw error;
        await connection.query("ROLLBACK TO SAVEPOINT import_user_row");
        await connection.query("RELEASE SAVEPOINT import_user_row");
        const [field, message] = rowErrors[error.code];
        errors.push({ row: row.spreadsheetRow, field, message });
        invalidRows.add(row.spreadsheetRow);
      }
    }
    if (inTransaction) {
      await connection.commit();
      inTransaction = false;
    }
    const skippedRows = normalizedRows
      .filter((row) => invalidRows.has(row.spreadsheetRow))
      .map((row) => ({
        row: row.spreadsheetRow,
        first_name: row.firstName,
        middle_name: row.middleName,
        last_name: row.lastName,
        email: row.email,
        role: row.role,
      }));
    return { imported, skipped: skippedRows.length, errors, skipped_rows: skippedRows };
  } catch (error) {
    if (inTransaction) await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

module.exports = { importUsers };
