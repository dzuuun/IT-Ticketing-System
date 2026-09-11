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
    const spreadsheetRow = index + 2;
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
    if (seenEmails.has(normalized.email))
      errors.push({
        row: spreadsheetRow,
        field: "email",
        message: "Email is duplicated in this spreadsheet.",
      });
    seenEmails.add(normalized.email);
    if (!VALID_ROLES.has(normalized.role))
      errors.push({
        row: spreadsheetRow,
        field: "role",
        message: "Role must be requestor, technician, team_leader, or admin.",
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
    if (normalized.password.length < 8)
      errors.push({
        row: spreadsheetRow,
        field: "password",
        message: "Password must contain at least 8 characters.",
      });
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
  let transactionStarted = false;
  try {
    const { normalizedRows, errors } = await validateRows(rows, connection);
    if (errors.length) return { errors };

    const passwordHashes = await Promise.all(
      normalizedRows.map((row) => bcrypt.hash(row.password, 12)),
    );
    await connection.beginTransaction();
    transactionStarted = true;
    for (const [index, row] of normalizedRows.entries()) {
      const fullName = [row.firstName, row.middleName, row.lastName]
        .filter(Boolean)
        .join(" ");
      const [result] = await connection.query(
        `INSERT INTO users
         (email, password_hash, full_name, first_name, middle_name, last_name, role, is_active)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          row.email,
          passwordHashes[index],
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
    }
    await connection.commit();
    return { imported: normalizedRows.length, errors: [] };
  } catch (error) {
    if (transactionStarted) await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

module.exports = { importUsers };
