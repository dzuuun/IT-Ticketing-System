const { query } = require("../../db/index");
const { generateTicketNumber } = require("../services/ticketNumber");
const { calculateSlaDeadlines } = require("../services/slaService");
const { sendTicketNotification } = require("../services/emailService");
const crypto = require("crypto");
const path = require("path");

const hashGuestToken = (token) =>
  crypto.createHash("sha256").update(token).digest("hex");

async function canTechnicianAccessTicket(user, ticket) {
  if (user?.role !== "technician") return true;
  if (ticket.assigned_technician_id)
    return Number(ticket.assigned_technician_id) === Number(user.id);
  if (!ticket.assigned_team_id) return true;
  const [membership] = await query(
    `SELECT 1 FROM team_memberships
     WHERE team_id = ? AND user_id = ? AND is_active = 1`,
    [ticket.assigned_team_id, user.id],
  );
  return Boolean(membership);
}

async function canUserAccessTicket(user, ticket) {
  if (!user) return false;
  if (user.role === "requestor")
    return (
      Number(ticket.requestor_user_id) === Number(user.id) ||
      String(ticket.requestor_email || "").toLowerCase() ===
        String(user.email || "").toLowerCase()
    );
  if (user.role === "encoder")
    return Number(ticket.encoded_by_user_id) === Number(user.id);
  return canTechnicianAccessTicket(user, ticket);
}

async function downloadAttachmentByFilename(req, res) {
  try {
    const [attachment] = await query(
      `SELECT a.filename, a.original_name, t.id, t.requestor_user_id,
              t.requestor_email, t.encoded_by_user_id, t.assigned_technician_id,
              t.assigned_team_id
       FROM ticket_attachments a JOIN tickets t ON t.id = a.ticket_id
       WHERE a.filename = ? LIMIT 1`,
      [req.params.filename],
    );
    if (!attachment || !(await canUserAccessTicket(req.user, attachment)))
      return res.status(404).json({ success: false, message: "Attachment not found." });
    const filePath = path.join(__dirname, "../../uploads", path.basename(attachment.filename));
    return res.download(filePath, attachment.original_name);
  } catch (error) {
    console.error("[Download Attachment Error]:", error);
    return res.status(500).json({ success: false, message: "Unable to download attachment." });
  }
}

function ticketLookupForIdentifier(identifier) {
  const value = String(identifier || "").trim();
  if (/^\d+$/.test(value)) {
    return {
      clause: "t.id = ? OR t.ticket_number = ?",
      params: [Number(value), value],
    };
  }
  return { clause: "t.ticket_number = ?", params: [value] };
}

async function getAssignedStaffEmails(ticket) {
  const recipients = new Set();
  if (ticket.assigned_technician_id) {
    const [technician] = await query(
      "SELECT email FROM users WHERE id = ? AND is_active = 1",
      [ticket.assigned_technician_id],
    );
    if (technician?.email) recipients.add(technician.email);
  }
  if (ticket.assigned_team_id) {
    const members = await query(
      `SELECT u.email
       FROM team_memberships tm
       JOIN users u ON u.id = tm.user_id
       WHERE tm.team_id = ? AND tm.is_active = 1 AND u.is_active = 1`,
      [ticket.assigned_team_id],
    );
    members.forEach((member) => {
      if (member.email) recipients.add(member.email);
    });
  }
  return [...recipients];
}

// 1. Create a new ticket (Authenticated or Guest)
async function createTicket(req, res) {
  try {
    const user = req.user || null;
    const isEncoder = user?.role === "encoder";
    let {
      title,
      description,
      category_id,
      subcategory_id,
      ticket_type = "service_request",
      priority,
      custom_fields,
      requestor_name,
      requestor_email,
      requestor_id_number,
      requestor_department,
      location_office,
    } = req.body;

    if (!title || !description) {
      return res.status(400).json({
        success: false,
        message: "Ticket title and description are required.",
      });
    }

    const finalName = !user || isEncoder ? requestor_name : user.full_name;
    const finalEmail = !user || isEncoder ? requestor_email : user.email;
    const finalIdNumber =
      !user || isEncoder
        ? requestor_id_number
        : user.id_number || requestor_id_number;
    const finalDept =
      !user || isEncoder
        ? requestor_department
        : requestor_department;

    if (!finalName?.trim() || !finalEmail?.trim()) {
      return res.status(400).json({
        success: false,
        message: "Requestor name and institutional email are required.",
      });
    }
    if (isEncoder && !finalDept?.trim()) {
      return res.status(400).json({
        success: false,
        message: "A department or college is required for encoded requests.",
      });
    }

    const normalizedRequestorEmail = finalEmail.trim().toLowerCase();
    const normalizedLocation = location_office?.trim() || null;
    if (normalizedLocation) {
      // Requests may introduce a new room or office. Keep the shared location
      // directory current without creating duplicate entries.
      await query(
        `INSERT INTO locations (name, code, type, is_active) VALUES (?, NULL, 'other', 1)
         ON DUPLICATE KEY UPDATE name = VALUES(name)`,
        [normalizedLocation],
      );
    }
    let requestorUserId = user && !isEncoder ? user.id : null;
    if (isEncoder) {
      const [requestorAccount] = await query(
        "SELECT id FROM users WHERE LOWER(email) = ? AND role = 'requestor' AND is_active = 1 LIMIT 1",
        [normalizedRequestorEmail],
      );
      requestorUserId = requestorAccount?.id || null;
    }

    // Determine initial priority: default or requested
    let assignedPriority = priority || "medium";
    if (subcategory_id) {
      const subRows = await query(
        "SELECT default_priority, default_type FROM subcategories WHERE id = ?",
        [subcategory_id],
      );
      if (subRows.length > 0) {
        if (!priority) assignedPriority = subRows[0].default_priority;
      }
    }

    // Generate Ticket Number & Tracking Code
    const { ticketNumber, trackingCode } = await generateTicketNumber();
    const guestToken = user ? null : crypto.randomBytes(32).toString("hex");

    // Calculate SLA
    const { dueResponse, dueResolution } =
      await calculateSlaDeadlines(assignedPriority);

    let customFieldValues = custom_fields || {};
    if (typeof customFieldValues === "string") {
      try {
        customFieldValues = JSON.parse(customFieldValues);
      } catch {
        customFieldValues = {};
      }
    }
    if (
      !customFieldValues ||
      Array.isArray(customFieldValues) ||
      typeof customFieldValues !== "object"
    )
      customFieldValues = {};
    const parsedCustomFields = JSON.stringify(customFieldValues);

    const insertResult = await query(
      `INSERT INTO tickets (
        ticket_number, tracking_code, ticket_type, title, description,
        category_id, subcategory_id, priority, status, custom_fields,
        requestor_user_id, encoded_by_user_id, requestor_name, requestor_email, requestor_id_number,
        requestor_department, location_office, sla_due_response,
        sla_due_resolution, guest_token_hash
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        ticketNumber,
        trackingCode,
        ticket_type || "service_request",
        title.trim(),
        description.trim(),
        category_id || null,
        subcategory_id || null,
        assignedPriority,
        "new",
        parsedCustomFields,
        requestorUserId,
        isEncoder ? user.id : null,
        finalName.trim(),
        normalizedRequestorEmail,
        finalIdNumber || null,
        finalDept || null,
        normalizedLocation,
        dueResponse,
        dueResolution,
        guestToken ? hashGuestToken(guestToken) : null,
      ],
    );

    const ticketId = insertResult.insertId;

    let requestorDepartmentId = null;
    if (!requestorDepartmentId && finalDept) {
      const [department] = await query(
        "SELECT id FROM locations WHERE name = ? LIMIT 1",
        [finalDept],
      );
      requestorDepartmentId = department?.id || null;
    }
    await query(
      `INSERT INTO ticket_requestors
       (ticket_id, user_id, full_name, email, department_id, department_name_snapshot, location_office)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        ticketId,
        requestorUserId,
        finalName.trim(),
        normalizedRequestorEmail,
        requestorDepartmentId,
        finalDept || null,
        normalizedLocation,
      ],
    );
    for (const [fieldKey, fieldValue] of Object.entries(customFieldValues)) {
      await query(
        "INSERT INTO ticket_custom_field_values (ticket_id, field_key, field_value) VALUES (?, ?, ?)",
        [
          ticketId,
          fieldKey,
          fieldValue == null
            ? null
            : typeof fieldValue === "string"
              ? fieldValue
              : JSON.stringify(fieldValue),
        ],
      );
    }

    // Handle uploaded file attachments if any
    if (req.files && req.files.length > 0) {
      for (const file of req.files) {
        await query(
          `INSERT INTO ticket_attachments (ticket_id, filename, original_name, file_size, mime_type, file_path)
           VALUES (?, ?, ?, ?, ?, ?)`,
          [
            ticketId,
            file.filename,
            file.originalname,
            file.size,
            file.mimetype,
            `/uploads/${file.filename}`,
          ],
        );
      }
    }

    // Create initial message
    await query(
      `INSERT INTO ticket_messages (ticket_id, sender_user_id, sender_name, sender_role, message, is_internal)
       VALUES (?, ?, ?, ?, ?, 0)`,
      [
        ticketId,
        isEncoder ? null : user?.id || null,
        finalName.trim(),
        "requestor",
        description.trim(),
      ],
    );

    // Create activity log
    await query(
      `INSERT INTO ticket_activity_logs (ticket_id, actor_user_id, actor_name, action_type, comment)
       VALUES (?, ?, ?, ?, ?)`,
      [
        ticketId,
        user?.id || null,
        isEncoder ? user.full_name : finalName.trim(),
        "CREATED",
        isEncoder
          ? `Ticket encoded on behalf of ${finalName.trim()}.`
          : "Ticket submitted to NDMU MIS portal.",
      ],
    );

    // Send email notification
    sendTicketNotification({
      to: finalEmail,
      subject: `Ticket Created: ${title}`,
      ticket: {
        ticket_number: ticketNumber,
        tracking_code: trackingCode,
        title,
        status: "new",
        priority: assignedPriority,
        guest_token: guestToken,
      },
      action: "created",
      extraMessage: `Thank you for reaching out to NDMU MIS. Your ticket #${ticketNumber} has been logged and assigned to the triage queue.${guestToken ? ` Track it securely at ${process.env.CLIENT_URL || "http://localhost:5173"}/guest/ticket/${guestToken}` : ""}`,
    });

    return res.status(201).json({
      success: true,
      message: "Ticket created successfully.",
      ticket: {
        id: ticketId,
        ticket_number: ticketNumber,
        tracking_code: trackingCode,
        title,
        status: "new",
        priority: assignedPriority,
        ...(guestToken ? { guest_token: guestToken } : {}),
      },
    });
  } catch (error) {
    console.error("[Create Ticket Error]:", error);
    return res
      .status(500)
      .json({ success: false, message: "Failed to create ticket." });
  }
}

// 2. Get tickets list with filters
async function getTickets(req, res) {
  try {
    const user = req.user;
    const {
      status,
      priority,
      category_id,
      ticket_type,
      assigned_to,
      requested_by,
      search,
      date_from,
      date_to,
      page = 1,
      limit = 50,
    } = req.query;

    const datePattern = /^\d{4}-\d{2}-\d{2}$/;
    if (
      (date_from && !datePattern.test(date_from)) ||
      (date_to && !datePattern.test(date_to))
    ) {
      return res
        .status(400)
        .json({ success: false, message: "Dates must use YYYY-MM-DD format." });
    }
    if (date_from && date_to && date_from > date_to) {
      return res.status(400).json({
        success: false,
        message: "Start date cannot be after end date.",
      });
    }

    const conditions = [];
    const params = [];

    // Role-based restrictions
    if (user.role === "encoder") {
      conditions.push("t.encoded_by_user_id = ?");
      params.push(user.id);
    } else if (requested_by === "me" || user.role === "requestor") {
      conditions.push(
        "(COALESCE(tr.user_id, t.requestor_user_id) = ? OR COALESCE(tr.email, t.requestor_email) = ?)",
      );
      params.push(user.id, user.email);
    } else if (user.role === "technician") {
      if (assigned_to && !["all", "me", "unassigned"].includes(assigned_to)) {
        return res.status(403).json({
          success: false,
          message: "Technicians can only view their own or unassigned tickets.",
        });
      }
      if (assigned_to === "me") {
        conditions.push(`(t.assigned_technician_id = ? OR EXISTS (
          SELECT 1 FROM team_memberships tm
          WHERE tm.team_id = t.assigned_team_id AND tm.user_id = ? AND tm.is_active = 1
        ))`);
        params.push(user.id, user.id);
      } else if (assigned_to === "unassigned") {
        conditions.push(
          "t.assigned_technician_id IS NULL AND t.assigned_team_id IS NULL",
        );
      } else {
        conditions.push(
          `(t.assigned_technician_id = ? OR EXISTS (
            SELECT 1 FROM team_memberships tm
            WHERE tm.team_id = t.assigned_team_id AND tm.user_id = ? AND tm.is_active = 1
          ) OR (t.assigned_technician_id IS NULL AND t.assigned_team_id IS NULL))`,
        );
        params.push(user.id, user.id);
      }
    }

    if (status && status !== "all") {
      conditions.push("t.status = ?");
      params.push(status);
    }
    if (priority && priority !== "all") {
      conditions.push("t.priority = ?");
      params.push(priority);
    }
    if (category_id && category_id !== "all") {
      conditions.push("t.category_id = ?");
      params.push(category_id);
    }
    if (ticket_type && ticket_type !== "all") {
      conditions.push("t.ticket_type = ?");
      params.push(ticket_type);
    }
    if (
      user.role !== "technician" &&
      assigned_to &&
      assigned_to !== "me" &&
      assigned_to !== "all"
    ) {
      if (assigned_to === "unassigned") {
        conditions.push(
          "t.assigned_technician_id IS NULL AND t.assigned_team_id IS NULL",
        );
      } else {
        conditions.push("t.assigned_technician_id = ?");
        params.push(assigned_to);
      }
    }
    if (search) {
      conditions.push(
        "(t.ticket_number LIKE ? OR t.title LIKE ? OR COALESCE(tr.full_name, t.requestor_name) LIKE ? OR COALESCE(tr.email, t.requestor_email) LIKE ?)",
      );
      const searchParam = `%${search}%`;
      params.push(searchParam, searchParam, searchParam, searchParam);
    }
    if (date_from) {
      conditions.push("t.created_at >= ?");
      params.push(`${date_from} 00:00:00`);
    }
    if (date_to) {
      conditions.push("t.created_at < DATE_ADD(?, INTERVAL 1 DAY)");
      params.push(`${date_to} 00:00:00`);
    }

    const whereClause =
      conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";
    const parsedPage = Math.max(1, parseInt(page, 10) || 1);
    const parsedLimit = Math.min(500, Math.max(1, parseInt(limit, 10) || 50));
    const offset = (parsedPage - 1) * parsedLimit;

    const countSql = `SELECT COUNT(*) as total FROM tickets t LEFT JOIN ticket_requestors tr ON tr.ticket_id = t.id ${whereClause}`;
    const [countRows] = await query(countSql, params);
    const total = countRows ? countRows.total : 0;

    const dataSql = `
      SELECT 
        t.*,
        c.name as category_name,
        c.icon as category_icon,
        sc.name as subcategory_name,
        tech.full_name as assigned_technician_name,
        tech.email as assigned_technician_email,
        assigned_team.name as assigned_team_name,
        COALESCE(tr.user_id, t.requestor_user_id) AS requestor_user_id,
        COALESCE(tr.full_name, t.requestor_name) AS requestor_name,
        COALESCE(tr.email, t.requestor_email) AS requestor_email,
        COALESCE(tr.department_name_snapshot, t.requestor_department) AS requestor_department,
        COALESCE(tr.location_office, t.location_office) AS location_office
      FROM tickets t
      LEFT JOIN ticket_requestors tr ON tr.ticket_id = t.id
      LEFT JOIN categories c ON t.category_id = c.id
      LEFT JOIN subcategories sc ON t.subcategory_id = sc.id
      LEFT JOIN users tech ON t.assigned_technician_id = tech.id
      LEFT JOIN teams assigned_team ON t.assigned_team_id = assigned_team.id
      ${whereClause}
      ORDER BY 
        CASE 
          WHEN t.status = 'new' THEN 1
          WHEN t.status = 'assigned' THEN 2
          WHEN t.status = 'in_progress' THEN 3
          WHEN t.status = 'pending_user' THEN 4
          WHEN t.status = 'resolved' THEN 5
          WHEN t.status = 'closed' THEN 6
        END,
        CASE 
          WHEN t.priority = 'critical' THEN 1
          WHEN t.priority = 'urgent' THEN 2
          WHEN t.priority = 'high' THEN 3
          WHEN t.priority = 'medium' THEN 4
          WHEN t.priority = 'low' THEN 5
        END,
        t.created_at DESC
      LIMIT ? OFFSET ?
    `;

    const tickets = await query(dataSql, [...params, parsedLimit, offset]);

    return res.json({
      success: true,
      total,
      page: parsedPage,
      limit: parsedLimit,
      tickets,
    });
  } catch (error) {
    console.error("[Get Tickets Error]:", error);
    return res
      .status(500)
      .json({ success: false, message: "Failed to fetch tickets." });
  }
}

// 3. Get single ticket with full details
async function getTicketByIdOrNumber(req, res) {
  try {
    const { identifier } = req.params;
    const user = req.user || null;

    const lookup = ticketLookupForIdentifier(identifier);
    const sql = `
      SELECT 
        t.*,
        c.name as category_name,
        c.icon as category_icon,
        sc.name as subcategory_name,
        tech.full_name as assigned_technician_name,
        tech.email as assigned_technician_email,
        assigned_team.name as assigned_team_name,
        COALESCE(tr.user_id, t.requestor_user_id) AS requestor_user_id,
        COALESCE(tr.full_name, t.requestor_name) AS requestor_name,
        COALESCE(tr.email, t.requestor_email) AS requestor_email,
        COALESCE(tr.department_name_snapshot, t.requestor_department) AS requestor_department,
        COALESCE(tr.location_office, t.location_office) AS location_office
      FROM tickets t
      LEFT JOIN ticket_requestors tr ON tr.ticket_id = t.id
      LEFT JOIN categories c ON t.category_id = c.id
      LEFT JOIN subcategories sc ON t.subcategory_id = sc.id
      LEFT JOIN users tech ON t.assigned_technician_id = tech.id
      LEFT JOIN teams assigned_team ON t.assigned_team_id = assigned_team.id
      WHERE ${lookup.clause}
    `;

    const tickets = await query(sql, lookup.params);
    if (tickets.length === 0) {
      return res
        .status(404)
        .json({ success: false, message: "Ticket not found." });
    }

    const ticket = tickets[0];
    const normalizedFields = await query(
      "SELECT field_key, field_value FROM ticket_custom_field_values WHERE ticket_id = ? ORDER BY field_key",
      [ticket.id],
    );
    if (normalizedFields.length > 0) {
      ticket.custom_fields = Object.fromEntries(
        normalizedFields.map((field) => [field.field_key, field.field_value]),
      );
    }

    // Access control check for requestors
    if (user && user.role === "requestor") {
      if (
        ticket.requestor_user_id !== user.id &&
        ticket.requestor_email !== user.email
      ) {
        return res.status(403).json({
          success: false,
          message: "Unauthorized to view this ticket.",
        });
      }
    }
    if (user?.role === "encoder" && ticket.encoded_by_user_id !== user.id) {
      return res.status(403).json({
        success: false,
        message: "You can only view requests you encoded.",
      });
    }
    if (!(await canTechnicianAccessTicket(user, ticket))) {
      return res.status(403).json({
        success: false,
        message: "You can only view tickets assigned to you or still unassigned.",
      });
    }

    // Fetch messages (hide internal notes if requestor or unauthenticated guest)
    const isStaff =
      user && ["admin", "technician", "team_leader"].includes(user.role);
    const msgCondition = isStaff ? "" : "WHERE is_internal = 0";

    const messages = await query(
      `SELECT * FROM ticket_messages WHERE ticket_id = ? ${msgCondition ? "AND is_internal = 0" : ""} ORDER BY created_at ASC`,
      [ticket.id],
    );

    // Fetch attachments
    const attachments = await query(
      `SELECT * FROM ticket_attachments WHERE ticket_id = ? ORDER BY created_at ASC`,
      [ticket.id],
    );

    // Fetch activity logs (only staff get full audit, requestor gets high level)
    let logs = [];
    if (isStaff) {
      logs = await query(
        `SELECT * FROM ticket_activity_logs WHERE ticket_id = ? ORDER BY created_at DESC`,
        [ticket.id],
      );
    }

    return res.json({
      success: true,
      ticket,
      messages,
      attachments,
      activityLogs: logs,
    });
  } catch (error) {
    console.error("[Get Single Ticket Error]:", error);
    return res
      .status(500)
      .json({ success: false, message: "Failed to retrieve ticket." });
  }
}

// 4. Guest track ticket
async function getGuestTicket(req, res) {
  try {
    const { ticket_number, tracking_code, email } = req.body;

    if (!ticket_number || (!tracking_code && !email)) {
      return res.status(400).json({
        success: false,
        message: "Ticket number and tracking code or email are required.",
      });
    }

    let sql = `
      SELECT 
        t.*,
        c.name as category_name,
        sc.name as subcategory_name,
        tech.full_name as assigned_technician_name,
        assigned_team.name as assigned_team_name,
        COALESCE(tr.full_name, t.requestor_name) AS requestor_name,
        COALESCE(tr.email, t.requestor_email) AS requestor_email,
        COALESCE(tr.department_name_snapshot, t.requestor_department) AS requestor_department,
        COALESCE(tr.location_office, t.location_office) AS location_office
      FROM tickets t
      LEFT JOIN ticket_requestors tr ON tr.ticket_id = t.id
      LEFT JOIN categories c ON t.category_id = c.id
      LEFT JOIN subcategories sc ON t.subcategory_id = sc.id
      LEFT JOIN users tech ON t.assigned_technician_id = tech.id
      LEFT JOIN teams assigned_team ON t.assigned_team_id = assigned_team.id
      WHERE t.ticket_number = ?
    `;

    const params = [ticket_number.trim()];
    if (tracking_code) {
      sql += " AND t.tracking_code = ?";
      params.push(tracking_code.trim());
    } else if (email) {
      sql += " AND LOWER(COALESCE(tr.email, t.requestor_email)) = ?";
      params.push(email.trim().toLowerCase());
    }

    const tickets = await query(sql, params);
    if (tickets.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Ticket not found or credentials do not match.",
      });
    }

    const ticket = tickets[0];
    const normalizedFields = await query(
      "SELECT field_key, field_value FROM ticket_custom_field_values WHERE ticket_id = ? ORDER BY field_key",
      [ticket.id],
    );
    if (normalizedFields.length > 0)
      ticket.custom_fields = Object.fromEntries(
        normalizedFields.map((field) => [field.field_key, field.field_value]),
      );
    const messages = await query(
      `SELECT * FROM ticket_messages WHERE ticket_id = ? AND is_internal = 0 ORDER BY created_at ASC`,
      [ticket.id],
    );
    const attachments = await query(
      `SELECT * FROM ticket_attachments WHERE ticket_id = ? ORDER BY created_at ASC`,
      [ticket.id],
    );

    return res.json({
      success: true,
      ticket,
      messages,
      attachments,
    });
  } catch (error) {
    console.error("[Guest Track Error]:", error);
    return res
      .status(500)
      .json({ success: false, message: "Failed to track ticket." });
  }
}

// Secure guest access: a random token is required instead of a guessable ticket number.
async function getGuestTicketByToken(req, res) {
  try {
    const [ticket] = await query(
      `SELECT t.*, c.name AS category_name, sc.name AS subcategory_name, tech.full_name AS assigned_technician_name, assigned_team.name AS assigned_team_name, COALESCE(tr.full_name, t.requestor_name) AS requestor_name, COALESCE(tr.email, t.requestor_email) AS requestor_email, COALESCE(tr.department_name_snapshot, t.requestor_department) AS requestor_department, COALESCE(tr.location_office, t.location_office) AS location_office FROM tickets t LEFT JOIN ticket_requestors tr ON tr.ticket_id = t.id LEFT JOIN categories c ON t.category_id = c.id LEFT JOIN subcategories sc ON t.subcategory_id = sc.id LEFT JOIN users tech ON t.assigned_technician_id = tech.id LEFT JOIN teams assigned_team ON t.assigned_team_id = assigned_team.id WHERE t.guest_token_hash = ?`,
      [hashGuestToken(req.params.token)],
    );
    if (!ticket)
      return res
        .status(404)
        .json({ success: false, message: "Ticket not found." });
    const normalizedFields = await query(
      "SELECT field_key, field_value FROM ticket_custom_field_values WHERE ticket_id = ? ORDER BY field_key",
      [ticket.id],
    );
    if (normalizedFields.length > 0)
      ticket.custom_fields = Object.fromEntries(
        normalizedFields.map((field) => [field.field_key, field.field_value]),
      );
    const messages = await query(
      "SELECT * FROM ticket_messages WHERE ticket_id = ? AND is_internal = 0 ORDER BY created_at ASC",
      [ticket.id],
    );
    const attachments = await query(
      "SELECT * FROM ticket_attachments WHERE ticket_id = ? ORDER BY created_at ASC",
      [ticket.id],
    );
    return res.json({ success: true, ticket, messages, attachments });
  } catch (error) {
    console.error("[Guest Token Access Error]:", error);
    return res
      .status(500)
      .json({ success: false, message: "Unable to retrieve this ticket." });
  }
}

async function postGuestReply(req, res) {
  try {
    const [ticket] = await query(
      "SELECT * FROM tickets WHERE guest_token_hash = ?",
      [hashGuestToken(req.params.token)],
    );
    const message = req.body.message?.trim();
    if (!ticket)
      return res
        .status(404)
        .json({ success: false, message: "Ticket not found." });
    if (!message)
      return res
        .status(400)
        .json({ success: false, message: "Message cannot be empty." });
    const result = await query(
      "INSERT INTO ticket_messages (ticket_id, sender_name, sender_role, message, is_internal) VALUES (?, ?, 'requestor', ?, 0)",
      [ticket.id, ticket.requestor_name, message],
    );
    for (const file of req.files || []) {
      await query(
        "INSERT INTO ticket_attachments (ticket_id, message_id, filename, original_name, file_size, mime_type, file_path) VALUES (?, ?, ?, ?, ?, ?, ?)",
        [
          ticket.id,
          result.insertId,
          file.filename,
          file.originalname,
          file.size,
          file.mimetype,
          `/uploads/${file.filename}`,
        ],
      );
    }
    if (ticket.status === "pending_user")
      await query("UPDATE tickets SET status = 'in_progress' WHERE id = ?", [
        ticket.id,
      ]);
    await query(
      "INSERT INTO ticket_activity_logs (ticket_id, actor_name, action_type, comment) VALUES (?, ?, 'GUEST_REPLY', ?)",
      [
        ticket.id,
        ticket.requestor_name,
        "Requestor replied through the secure guest link.",
      ],
    );
    return res.status(201).json({ success: true, message: "Reply sent." });
  } catch (error) {
    console.error("[Guest Reply Error]:", error);
    return res
      .status(500)
      .json({ success: false, message: "Unable to post this reply." });
  }
}

async function confirmGuestResolution(req, res) {
  try {
    const [ticket] = await query(
      "SELECT * FROM tickets WHERE guest_token_hash = ?",
      [hashGuestToken(req.params.token)],
    );
    const { action, rating, rating_feedback, comment } = req.body;
    if (!ticket)
      return res
        .status(404)
        .json({ success: false, message: "Ticket not found." });
    if (!["confirm", "reopen"].includes(action))
      return res
        .status(400)
        .json({ success: false, message: "Invalid resolution action." });
    if (action === "confirm") {
      await query(
        "UPDATE tickets SET status = 'closed', closed_at = NOW(), rating = ?, rating_feedback = ? WHERE id = ?",
        [rating || 5, rating_feedback || null, ticket.id],
      );
      await query(
        "INSERT INTO ticket_activity_logs (ticket_id, actor_name, action_type, old_value, new_value, comment) VALUES (?, ?, 'CONFIRMED_CLOSED', ?, 'closed', ?)",
        [
          ticket.id,
          ticket.requestor_name,
          ticket.status,
          "Requestor confirmed the resolution through the secure guest link.",
        ],
      );
    } else {
      const reason = comment || "Requestor reported the issue persists.";
      await query(
        "UPDATE tickets SET status = 'in_progress', auto_close_at = NULL WHERE id = ?",
        [ticket.id],
      );
      await query(
        "INSERT INTO ticket_messages (ticket_id, sender_name, sender_role, message, is_internal) VALUES (?, ?, 'requestor', ?, 0)",
        [ticket.id, ticket.requestor_name, `[REOPENED TICKET]: ${reason}`],
      );
      await query(
        "INSERT INTO ticket_activity_logs (ticket_id, actor_name, action_type, old_value, new_value, comment) VALUES (?, ?, 'REOPENED', ?, 'in_progress', ?)",
        [ticket.id, ticket.requestor_name, ticket.status, reason],
      );
    }
    return res.json({
      success: true,
      message: action === "confirm" ? "Ticket closed." : "Ticket reopened.",
    });
  } catch (error) {
    console.error("[Guest Resolution Error]:", error);
    return res.status(500).json({
      success: false,
      message: "Unable to process this resolution response.",
    });
  }
}

// 5. MIS Triage ticket (Admin / Tech)
async function triageTicket(req, res) {
  try {
    const user = req.user;
    const { ticketId } = req.params;
    let {
      category_id,
      subcategory_id,
      priority,
      ticket_type,
      assigned_technician_id,
      assigned_team_id,
      internal_notes,
    } = req.body;
    const normalizeAssignmentId = (value) => {
      const parsed = Number(value);
      return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
    };
    if (assigned_technician_id !== undefined)
      assigned_technician_id = normalizeAssignmentId(assigned_technician_id);
    if (assigned_team_id !== undefined)
      assigned_team_id = normalizeAssignmentId(assigned_team_id);
    if (assigned_technician_id && assigned_team_id) {
      return res.status(400).json({
        success: false,
        message: "Assign a ticket to either a team or an individual, not both.",
      });
    }

    const [ticket] = await query(
      `SELECT t.*, COALESCE(tr.user_id, t.requestor_user_id) AS requestor_user_id,
              COALESCE(tr.email, t.requestor_email) AS requestor_email
       FROM tickets t
       LEFT JOIN ticket_requestors tr ON tr.ticket_id = t.id
       WHERE t.id = ?`,
      [ticketId],
    );
    if (!ticket) {
      return res
        .status(404)
        .json({ success: false, message: "Ticket not found." });
    }
    if (!(await canTechnicianAccessTicket(user, ticket))) {
      return res.status(403).json({
        success: false,
        message: "You can only triage tickets assigned to you or still unassigned.",
      });
    }
    if (
      user.role === "technician" &&
      assigned_technician_id !== undefined &&
      assigned_technician_id !== null &&
      Number(assigned_technician_id) !== Number(user.id)
    ) {
      return res.status(403).json({
        success: false,
        message: "Technicians can only assign a ticket to themselves.",
      });
    }
    if (
      user.role === "technician" &&
      assigned_team_id !== undefined &&
      assigned_team_id !== ticket.assigned_team_id
    ) {
      return res.status(403).json({
        success: false,
        message: "Only an administrator can change a ticket's assigned team.",
      });
    }
    if (assigned_technician_id) {
      const [technician] = await query(
        `SELECT id FROM users
         WHERE id = ? AND is_active = 1
           AND role IN ('admin', 'team_leader', 'technician')`,
        [assigned_technician_id],
      );
      if (!technician)
        return res.status(400).json({
          success: false,
          message: "Select an active ICT-MIS staff member.",
        });
    }
    if (assigned_team_id) {
      const [team] = await query(
        "SELECT id FROM teams WHERE id = ? AND is_active = 1",
        [assigned_team_id],
      );
      if (!team)
        return res.status(400).json({
          success: false,
          message: "Select an active ICT-MIS team.",
        });
    }

    const updates = [];
    const params = [];
    const logs = [];

    if (category_id !== undefined && category_id !== ticket.category_id) {
      updates.push("category_id = ?");
      params.push(category_id);
      logs.push(`Category updated`);
    }

    if (
      subcategory_id !== undefined &&
      subcategory_id !== ticket.subcategory_id
    ) {
      updates.push("subcategory_id = ?");
      params.push(subcategory_id);
    }

    if (ticket_type && ticket_type !== ticket.ticket_type) {
      updates.push("ticket_type = ?");
      params.push(ticket_type);
      logs.push(`Type changed to ${ticket_type}`);
    }

    if (priority && priority !== ticket.priority) {
      updates.push("priority = ?");
      params.push(priority);
      // Recalculate SLA
      const { dueResponse, dueResolution } =
        await calculateSlaDeadlines(priority);
      updates.push("sla_due_response = ?", "sla_due_resolution = ?");
      params.push(dueResponse, dueResolution);
      logs.push(`Priority changed from ${ticket.priority} to ${priority}`);
      await query(
        "INSERT INTO ticket_priority_history (ticket_id, old_priority, new_priority, changed_by_user_id) VALUES (?, ?, ?, ?)",
        [ticketId, ticket.priority, priority, user.id],
      );
    }

    if (
      assigned_technician_id !== undefined &&
      assigned_technician_id !== ticket.assigned_technician_id
    ) {
      updates.push("assigned_technician_id = ?");
      params.push(assigned_technician_id);

      const [tech] = await query("SELECT full_name FROM users WHERE id = ?", [
        assigned_technician_id,
      ]);
      const techName = tech ? tech.full_name : "Unassigned";
      logs.push(`Assigned to ${techName}`);
      await query(
        "INSERT INTO ticket_assignments (ticket_id, assigned_team_id, assigned_user_id, assigned_by_user_id) VALUES (?, ?, ?, ?)",
        [
          ticketId,
          assigned_team_id === undefined
            ? ticket.assigned_team_id || null
            : assigned_team_id || null,
          assigned_technician_id || null,
          user.id,
        ],
      );
    }

    if (
      assigned_team_id !== undefined &&
      assigned_team_id !== ticket.assigned_team_id
    ) {
      updates.push("assigned_team_id = ?");
      params.push(assigned_team_id || null);
      logs.push("Assigned team updated");
      if (assigned_technician_id === undefined)
        await query(
          "INSERT INTO ticket_assignments (ticket_id, assigned_team_id, assigned_user_id, assigned_by_user_id) VALUES (?, ?, ?, ?)",
          [
            ticketId,
            assigned_team_id || null,
            assigned_technician_id === undefined
              ? ticket.assigned_technician_id || null
              : assigned_technician_id || null,
            user.id,
          ],
        );
    }

    if (
      ticket.status === "new" &&
      (assigned_technician_id || assigned_team_id) &&
      !updates.includes("status = 'assigned'")
    ) {
      updates.push("status = 'assigned'");
    }

    if (updates.length > 0) {
      params.push(ticketId);
      await query(
        `UPDATE tickets SET ${updates.join(", ")} WHERE id = ?`,
        params,
      );
    }

    // Add internal note if provided
    if (internal_notes) {
      await query(
        `INSERT INTO ticket_messages (ticket_id, sender_user_id, sender_name, sender_role, message, is_internal)
         VALUES (?, ?, ?, ?, ?, 1)`,
        [ticketId, user.id, user.full_name, user.role, internal_notes.trim()],
      );
    }

    // Add activity log
    if (logs.length > 0) {
      await query(
        `INSERT INTO ticket_activity_logs (ticket_id, actor_user_id, actor_name, action_type, comment)
         VALUES (?, ?, ?, ?, ?)`,
        [ticketId, user.id, user.full_name, "TRIAGE", logs.join("; ")],
      );
    }

    if (assigned_technician_id || assigned_team_id) {
      const updatedTicket = {
        ...ticket,
        assigned_technician_id:
          assigned_technician_id === undefined
            ? ticket.assigned_technician_id
            : assigned_technician_id,
        assigned_team_id:
          assigned_team_id === undefined
            ? ticket.assigned_team_id
            : assigned_team_id,
        status:
          ticket.status === "new" && (assigned_technician_id || assigned_team_id)
            ? "assigned"
            : ticket.status,
        priority: priority || ticket.priority,
      };
      const staffEmails = await getAssignedStaffEmails(updatedTicket);
      if (staffEmails.length) {
        sendTicketNotification({
          to: staffEmails,
          subject: `Ticket Assigned: ${ticket.ticket_number}`,
          ticket: updatedTicket,
          extraMessage: "A ticket has been assigned to your ICT-MIS queue.",
        });
      }
      sendTicketNotification({
        to: ticket.requestor_email,
        subject: `Ticket Assignment Update: ${ticket.ticket_number}`,
        ticket: updatedTicket,
        extraMessage:
          "Your request has been assigned to the appropriate ICT-MIS support queue.",
      });
    }

    return res.json({
      success: true,
      message: "Ticket triaged successfully.",
    });
  } catch (error) {
    console.error("[Triage Error]:", error);
    return res
      .status(500)
      .json({ success: false, message: "Failed to triage ticket." });
  }
}

// 6. Update Status
async function updateTicketStatus(req, res) {
  try {
    const user = req.user;
    const { ticketId } = req.params;
    const { status, note } = req.body;

    const validStatuses = [
      "new",
      "assigned",
      "in_progress",
      "pending_user",
      "resolved",
      "closed",
    ];
    if (!validStatuses.includes(status)) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid ticket status." });
    }

    const [ticket] = await query("SELECT * FROM tickets WHERE id = ?", [
      ticketId,
    ]);
    if (!ticket) {
      return res
        .status(404)
        .json({ success: false, message: "Ticket not found." });
    }
    if (!(await canTechnicianAccessTicket(user, ticket))) {
      return res.status(403).json({
        success: false,
        message: "You can only update tickets assigned to you or still unassigned.",
      });
    }

    const now = new Date();
    const updates = ["status = ?"];
    const params = [status];

    if (status === "closed") {
      updates.push("closed_at = ?");
      params.push(now);
    }

    params.push(ticketId);
    await query(
      `UPDATE tickets SET ${updates.join(", ")} WHERE id = ?`,
      params,
    );
    await query(
      "INSERT INTO ticket_status_history (ticket_id, old_status, new_status, changed_by_user_id) VALUES (?, ?, ?, ?)",
      [ticketId, ticket.status, status, user ? user.id : null],
    );

    // Add activity log
    await query(
      `INSERT INTO ticket_activity_logs (ticket_id, actor_user_id, actor_name, action_type, old_value, new_value, comment)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        ticketId,
        user ? user.id : null,
        user ? user.full_name : "User",
        "STATUS_CHANGE",
        ticket.status,
        status,
        note || null,
      ],
    );

    // Send email notification on status change
    sendTicketNotification({
      to: ticket.requestor_email,
      subject: `Status Update: [${ticket.ticket_number}] is now ${status.replace("_", " ").toUpperCase()}`,
      ticket: { ...ticket, status },
      action: "status_change",
      extraMessage:
        note ||
        `The status of your ticket has been updated to ${status.replace("_", " ")}.`,
    });

    return res.json({
      success: true,
      message: `Ticket status updated to ${status}.`,
    });
  } catch (error) {
    console.error("[Status Update Error]:", error);
    return res
      .status(500)
      .json({ success: false, message: "Failed to update ticket status." });
  }
}

// 7. Post Message / Internal Note
async function postMessage(req, res) {
  try {
    const user = req.user || null;
    const { ticketId } = req.params;
    const { message, is_internal = false } = req.body;

    if (!message || !message.trim()) {
      return res
        .status(400)
        .json({ success: false, message: "Message cannot be empty." });
    }

    const [ticket] = await query(
      `SELECT t.*, COALESCE(tr.user_id, t.requestor_user_id) AS requestor_user_id,
              COALESCE(tr.email, t.requestor_email) AS requestor_email
       FROM tickets t
       LEFT JOIN ticket_requestors tr ON tr.ticket_id = t.id
       WHERE t.id = ?`,
      [ticketId],
    );
    if (!ticket) {
      return res
        .status(404)
        .json({ success: false, message: "Ticket not found." });
    }

    if (
      user?.role === "requestor" &&
      ticket.requestor_user_id !== user.id &&
      ticket.requestor_email !== user.email
    ) {
      return res
        .status(403)
        .json({ success: false, message: "You cannot reply to this ticket." });
    }
    if (user?.role === "encoder" && ticket.encoded_by_user_id !== user.id) {
      return res.status(403).json({
        success: false,
        message: "You can only update requests you encoded.",
      });
    }
    if (!(await canTechnicianAccessTicket(user, ticket))) {
      return res.status(403).json({
        success: false,
        message: "You can only reply to tickets assigned to you or still unassigned.",
      });
    }

    const isStaff =
      user && ["admin", "technician", "team_leader"].includes(user.role);
    const senderName = user
      ? user.full_name
      : ticket.requestor_name || "Requestor";
    const senderRole = user ? user.role : "requestor";
    const internalFlag =
      isStaff &&
      (is_internal === true || is_internal === "true" || is_internal === 1)
        ? 1
        : 0;

    const msgResult = await query(
      `INSERT INTO ticket_messages (ticket_id, sender_user_id, sender_name, sender_role, message, is_internal)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [
        ticketId,
        user ? user.id : null,
        senderName,
        senderRole,
        message.trim(),
        internalFlag,
      ],
    );

    const messageId = msgResult.insertId;

    // Handle attachments on reply
    if (req.files && req.files.length > 0) {
      for (const file of req.files) {
        await query(
          `INSERT INTO ticket_attachments (ticket_id, message_id, filename, original_name, file_size, mime_type, file_path)
           VALUES (?, ?, ?, ?, ?, ?, ?)`,
          [
            ticketId,
            messageId,
            file.filename,
            file.originalname,
            file.size,
            file.mimetype,
            `/uploads/${file.filename}`,
          ],
        );
      }
    }

    // If staff replied publicly and first response not yet logged, set sla_responded_at
    if (isStaff && !internalFlag && !ticket.sla_responded_at) {
      await query("UPDATE tickets SET sla_responded_at = ? WHERE id = ?", [
        new Date(),
        ticketId,
      ]);
    }

    // If requestor replied while ticket is pending_user, automatically revert to in_progress
    if (!isStaff && ticket.status === "pending_user") {
      await query("UPDATE tickets SET status = 'in_progress' WHERE id = ?", [
        ticketId,
      ]);
    }

    // Internal notes remain in the ticket only and never trigger email.
    if (!internalFlag) {
      if (isStaff) {
        sendTicketNotification({
          to: ticket.requestor_email,
          subject: `New Reply on Ticket ${ticket.ticket_number}`,
          ticket,
          action: "reply",
          extraMessage: `${senderName}: "${message.trim()}"`,
        });
      } else {
        const staffEmails = await getAssignedStaffEmails(ticket);
        if (staffEmails.length)
          sendTicketNotification({
            to: staffEmails,
            subject: `Requestor Reply: ${ticket.ticket_number}`,
            ticket,
            extraMessage: `${senderName}: "${message.trim()}"`,
          });
      }
    }

    return res.status(201).json({
      success: true,
      message: "Message posted successfully.",
      messageId,
    });
  } catch (error) {
    console.error("[Post Message Error]:", error);
    return res
      .status(500)
      .json({ success: false, message: "Failed to post message." });
  }
}

// 8. Resolve Ticket
async function resolveTicket(req, res) {
  try {
    const user = req.user;
    const { ticketId } = req.params;
    const { resolution_notes } = req.body;

    if (!resolution_notes || !resolution_notes.trim()) {
      return res
        .status(400)
        .json({ success: false, message: "Resolution notes are required." });
    }

    const [ticket] = await query("SELECT * FROM tickets WHERE id = ?", [
      ticketId,
    ]);
    if (!ticket) {
      return res
        .status(404)
        .json({ success: false, message: "Ticket not found." });
    }
    if (!(await canTechnicianAccessTicket(user, ticket))) {
      return res.status(403).json({
        success: false,
        message: "You can only resolve tickets assigned to you or still unassigned.",
      });
    }

    // Auto-close in X days (default 3)
    let autoCloseDays = 3;
    const settings = await query(
      "SELECT setting_value FROM system_settings WHERE setting_key = 'auto_close_days'",
    );
    if (settings.length > 0) {
      autoCloseDays = parseInt(settings[0].setting_value, 10) || 3;
    }

    const now = new Date();
    const autoCloseAt = new Date(
      now.getTime() + autoCloseDays * 24 * 3600 * 1000,
    );

    await query(
      `UPDATE tickets 
       SET status = 'resolved', resolution_notes = ?, resolution_date = ?, sla_resolved_at = ?, auto_close_at = ?
       WHERE id = ?`,
      [resolution_notes.trim(), now, now, autoCloseAt, ticketId],
    );

    // Log resolution message
    await query(
      `INSERT INTO ticket_messages (ticket_id, sender_user_id, sender_name, sender_role, message, is_internal)
       VALUES (?, ?, ?, ?, ?, 0)`,
      [
        ticketId,
        user.id,
        user.full_name,
        user.role,
        `[RESOLUTION]: ${resolution_notes.trim()}`,
      ],
    );

    // Log activity
    await query(
      `INSERT INTO ticket_activity_logs (ticket_id, actor_user_id, actor_name, action_type, old_value, new_value, comment)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        ticketId,
        user.id,
        user.full_name,
        "RESOLVED",
        ticket.status,
        "resolved",
        resolution_notes.trim(),
      ],
    );

    // Email requestor
    sendTicketNotification({
      to: ticket.requestor_email,
      subject: `Resolved: Ticket [${ticket.ticket_number}]`,
      ticket: { ...ticket, status: "resolved" },
      action: "resolved",
      extraMessage: `MIS Technician Resolution: ${resolution_notes.trim()}\n\nPlease verify if the issue is resolved. The ticket will automatically close in ${autoCloseDays} days if no response is received.`,
    });

    return res.json({
      success: true,
      message: "Ticket marked as resolved.",
    });
  } catch (error) {
    console.error("[Resolve Ticket Error]:", error);
    return res
      .status(500)
      .json({ success: false, message: "Failed to resolve ticket." });
  }
}

// 9. Confirm Resolution or Reopen (Requestor)
async function confirmResolution(req, res) {
  try {
    const user = req.user || null;
    const { ticketId } = req.params;
    const { action, rating, rating_feedback, comment } = req.body; // action = 'confirm' | 'reopen'

    const [ticket] = await query("SELECT * FROM tickets WHERE id = ?", [
      ticketId,
    ]);
    if (!ticket) {
      return res
        .status(404)
        .json({ success: false, message: "Ticket not found." });
    }

    if (
      user?.role === "requestor" &&
      ticket.requestor_user_id !== user.id &&
      ticket.requestor_email !== user.email
    ) {
      return res.status(403).json({
        success: false,
        message: "You cannot update this ticket.",
      });
    }
    if (user?.role === "encoder" && ticket.encoded_by_user_id !== user.id) {
      return res.status(403).json({
        success: false,
        message: "You can only update requests you encoded.",
      });
    }

    const now = new Date();
    const actorName = user ? user.full_name : ticket.requestor_name;

    if (action === "confirm") {
      await query(
        `UPDATE tickets 
         SET status = 'closed', closed_at = ?, rating = ?, rating_feedback = ?
         WHERE id = ?`,
        [now, rating || 5, rating_feedback || null, ticketId],
      );

      await query(
        `INSERT INTO ticket_activity_logs (ticket_id, actor_user_id, actor_name, action_type, old_value, new_value, comment)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
          ticketId,
          user ? user.id : null,
          actorName,
          "CONFIRMED_CLOSED",
          ticket.status,
          "closed",
          `Requestor confirmed resolution. Rating: ${rating || 5}/5. ${rating_feedback || ""}`,
        ],
      );

      return res.json({
        success: true,
        message: "Thank you! The ticket is now closed.",
      });
    } else if (action === "reopen") {
      await query(
        `UPDATE tickets 
         SET status = 'in_progress', auto_close_at = NULL
         WHERE id = ?`,
        [ticketId],
      );

      const reopenReason = comment || "Requestor reported the issue persists.";
      await query(
        `INSERT INTO ticket_messages (ticket_id, sender_user_id, sender_name, sender_role, message, is_internal)
         VALUES (?, ?, ?, ?, ?, 0)`,
        [
          ticketId,
          user ? user.id : null,
          actorName,
          "requestor",
          `[REOPENED TICKET]: ${reopenReason}`,
        ],
      );

      await query(
        `INSERT INTO ticket_activity_logs (ticket_id, actor_user_id, actor_name, action_type, old_value, new_value, comment)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
          ticketId,
          user ? user.id : null,
          actorName,
          "REOPENED",
          ticket.status,
          "in_progress",
          reopenReason,
        ],
      );

      return res.json({
        success: true,
        message:
          "Ticket has been reopened and returned to the technician queue.",
      });
    }

    return res.status(400).json({
      success: false,
      message: "Action must be 'confirm' or 'reopen'.",
    });
  } catch (error) {
    console.error("[Confirm Resolution Error]:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to process resolution response.",
    });
  }
}

module.exports = {
  createTicket,
  getTickets,
  getTicketByIdOrNumber,
  getGuestTicket,
  getGuestTicketByToken,
  postGuestReply,
  confirmGuestResolution,
  triageTicket,
  updateTicketStatus,
  postMessage,
  resolveTicket,
  confirmResolution,
  __test: { canTechnicianAccessTicket, ticketLookupForIdentifier },
  downloadAttachmentByFilename,
};
