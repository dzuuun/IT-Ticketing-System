const { query } = require("../../db/index");
const bcrypt = require("bcryptjs");
const userImportService = require("./user-import.service");
const { linkRequestsToAccount } = require("../services/requestorAccountLink");
const { isInstitutionalEmail } = require("../services/institutionalEmail");
const { revokeUserTokens } = require("../../auth/refreshTokens");

async function getTechnicians(req, res) {
  try {
    const technicians = await query(
      `SELECT u.id, u.full_name, u.email, u.role
       FROM users u
       WHERE u.role IN ('technician', 'team_leader', 'admin') AND u.is_active = 1
       ORDER BY u.full_name ASC`,
    );

    return res.json({
      success: true,
      technicians,
    });
  } catch (error) {
    console.error("[Get Technicians Error]:", error);
    return res
      .status(500)
      .json({ success: false, message: "Failed to fetch technicians." });
  }
}

async function getAllUsers(req, res) {
  try {
    const users = await query(
      `SELECT u.id, u.email, u.full_name, u.first_name, u.middle_name, u.last_name,
              u.role, u.is_active
       FROM users u
       ORDER BY u.created_at DESC`,
    );
    return res.json({
      success: true,
      users,
    });
  } catch (error) {
    return res
      .status(500)
      .json({ success: false, message: "Failed to fetch users." });
  }
}

async function createUser(req, res) {
  try {
    const {
      email,
      password,
      first_name,
      middle_name,
      last_name,
      role = "requestor",
      is_active = true,
    } = req.body;
    const validRoles = [
      "requestor",
      "encoder",
      "technician",
      "team_leader",
      "admin",
    ];
    if (!email || !password || !first_name || !last_name)
      return res.status(400).json({
        success: false,
        message: "Email, password, first name, and last name are required.",
      });
    if (String(password).length < 8)
      return res.status(400).json({
        success: false,
        message: "Password must contain at least 8 characters.",
      });
    if (!validRoles.includes(role))
      return res.status(400).json({ success: false, message: "Invalid role." });
    const normalizedEmail = email.trim().toLowerCase();
    if (role === "requestor" && !isInstitutionalEmail(normalizedEmail))
      return res.status(400).json({
        success: false,
        message:
          "Requestor accounts must use an @ndmu.edu.ph institutional email address.",
      });
    if (
      (await query("SELECT id FROM users WHERE email = ?", [normalizedEmail]))
        .length
    )
      return res.status(409).json({
        success: false,
        message: "An account with this email already exists.",
      });
    const fullName = [first_name, middle_name, last_name]
      .filter(Boolean)
      .map((name) => name.trim())
      .join(" ");
    const result = await query(
      "INSERT INTO users (email, password_hash, full_name, first_name, middle_name, last_name, role, is_active) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
      [
        normalizedEmail,
        await bcrypt.hash(password, 12),
        fullName,
        first_name.trim(),
        middle_name?.trim() || null,
        last_name.trim(),
        role,
        is_active ? 1 : 0,
      ],
    );
    await linkRequestsToAccount(query, result.insertId, normalizedEmail);
    return res.status(201).json({
      success: true,
      user: {
        id: result.insertId,
        email: normalizedEmail,
        full_name: fullName,
        first_name,
        middle_name: middle_name || null,
        last_name,
        role,
      },
    });
  } catch (error) {
    if (error.code === "ER_DUP_ENTRY")
      return res.status(409).json({
        success: false,
        message: "An account with this email already exists.",
      });
    console.error("[Create User Error]:", error);
    return res
      .status(500)
      .json({ success: false, message: "Failed to create user." });
  }
}

async function updateUserRole(req, res) {
  try {
    const { userId } = req.params;
    const {
      role,
      is_active,
      email,
      first_name,
      middle_name,
      last_name,
      password,
    } = req.body;

    const [existingUser] = await query(
      "SELECT id, role, email FROM users WHERE id = ?",
      [userId],
    );
    if (!existingUser)
      return res
        .status(404)
        .json({ success: false, message: "User account was not found." });

    const targetRole = role || existingUser.role;
    const targetEmail = (email || existingUser.email).trim().toLowerCase();
    const validRoles = [
      "requestor",
      "encoder",
      "technician",
      "team_leader",
      "admin",
    ];
    if (!validRoles.includes(targetRole)) {
      return res.status(400).json({ success: false, message: "Invalid role." });
    }
    if (targetRole === "requestor" && !isInstitutionalEmail(targetEmail))
      return res.status(400).json({
        success: false,
        message:
          "Requestor accounts must use an @ndmu.edu.ph institutional email address.",
      });

    const updates = [];
    const params = [];

    if (email) {
      const duplicates = await query(
        "SELECT id FROM users WHERE email = ? AND id <> ?",
        [targetEmail, userId],
      );
      if (duplicates.length)
        return res.status(409).json({
          success: false,
          message: "An account with this email already exists.",
        });
    }

    if (role) {
      updates.push("role = ?");
      params.push(role);
    }
    if (is_active !== undefined) {
      updates.push("is_active = ?");
      params.push(is_active ? 1 : 0);
    }
    if (email) {
      updates.push("email = ?");
      params.push(email.trim().toLowerCase());
    }
    if (first_name && last_name) {
      const fullName = [first_name, middle_name, last_name]
        .filter(Boolean)
        .map((value) => value.trim())
        .join(" ");
      updates.push(
        "first_name = ?",
        "middle_name = ?",
        "last_name = ?",
        "full_name = ?",
      );
      params.push(
        first_name.trim(),
        middle_name?.trim() || null,
        last_name.trim(),
        fullName,
      );
    }
    if (password) {
      if (String(password).length < 8)
        return res.status(400).json({
          success: false,
          message: "Password must contain at least 8 characters.",
        });
      updates.push("password_hash = ?");
      params.push(await bcrypt.hash(password, 12));
    }

    if (updates.length > 0) {
      params.push(userId);
      await query(
        `UPDATE users SET ${updates.join(", ")} WHERE id = ?`,
        params,
      );
      if (password) await revokeUserTokens(userId);
    }

    return res.json({ success: true, message: "User updated successfully." });
  } catch (error) {
    if (error.code === "ER_DUP_ENTRY")
      return res.status(409).json({
        success: false,
        message: "An account with this email already exists.",
      });
    return res
      .status(500)
      .json({ success: false, message: "Failed to update user." });
  }
}

async function bulkImportUsers(req, res) {
  try {
    const result = await userImportService.importUsers(req.body.rows);
    if (result.imported === undefined) {
      return res.status(400).json({
        success: false,
        message: "The spreadsheet contains validation errors.",
        errors: result.errors,
      });
    }
    return res.status(result.imported ? 201 : 200).json({
      success: true,
      message: `${result.imported} user accounts imported. ${result.skipped} rows skipped.`,
      imported: result.imported,
      skipped: result.skipped,
      errors: result.errors,
      skipped_rows: result.skipped_rows,
    });
  } catch (error) {
    console.error("[Bulk User Import Error]:", error);
    return res.status(500).json({
      success: false,
      message: "The bulk import could not be completed.",
    });
  }
}

module.exports = {
  getTechnicians,
  getAllUsers,
  createUser,
  updateUserRole,
  bulkImportUsers,
};
