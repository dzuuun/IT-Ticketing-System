async function normalizeLegacyData(pool) {
  // Preserve the numeric portion while bringing existing records in line with
  // the ICT-MIS ticket identifier used by new requests.
  await pool.query(
    `UPDATE tickets legacy
     LEFT JOIN tickets current
       ON current.ticket_number = CONCAT('ICT-', legacy.ticket_number)
     SET legacy.ticket_number = CONCAT('ICT-', legacy.ticket_number)
     WHERE legacy.ticket_number LIKE 'MIS-%' AND current.id IS NULL`,
  );

  await pool.query(
    `INSERT IGNORE INTO team_memberships (team_id, user_id, membership_role, is_active)
     SELECT team_id, id, IF(role = 'team_leader', 'leader', 'member'), is_active
     FROM users WHERE team_id IS NOT NULL`,
  );

  await pool.query(
    `INSERT IGNORE INTO ticket_requestors
       (ticket_id, user_id, full_name, email, department_id,
        department_name_snapshot, location_office, created_at)
     SELECT t.id, t.requestor_user_id, t.requestor_name, t.requestor_email,
            NULL, t.requestor_department,
            t.location_office, t.created_at
     FROM tickets t LEFT JOIN users u ON u.id = t.requestor_user_id`,
  );

  const [tickets] = await pool.query(
    `SELECT t.id, t.custom_fields
     FROM tickets t
     WHERE t.custom_fields IS NOT NULL
       AND NOT EXISTS (SELECT 1 FROM ticket_custom_field_values value WHERE value.ticket_id = t.id)`,
  );

  for (const ticket of tickets) {
    let fields = ticket.custom_fields;
    if (typeof fields === "string") {
      try {
        fields = JSON.parse(fields);
      } catch {
        fields = {};
      }
    }
    if (!fields || Array.isArray(fields) || typeof fields !== "object")
      continue;

    for (const [key, value] of Object.entries(fields)) {
      await pool.query(
        `INSERT INTO ticket_custom_field_values (ticket_id, field_key, field_value)
         VALUES (?, ?, ?)
         ON DUPLICATE KEY UPDATE field_value = VALUES(field_value)`,
        [
          ticket.id,
          key,
          value == null
            ? null
            : typeof value === "string"
              ? value
              : JSON.stringify(value),
        ],
      );
    }
  }

  const [subcategories] = await pool.query(
    `SELECT s.id, s.form_schema
     FROM subcategories s
     WHERE s.form_schema IS NOT NULL
       AND NOT EXISTS (SELECT 1 FROM service_form_fields field WHERE field.subcategory_id = s.id)`,
  );

  for (const subcategory of subcategories) {
    let fields = subcategory.form_schema;
    if (typeof fields === "string") {
      try {
        fields = JSON.parse(fields);
      } catch {
        fields = [];
      }
    }
    if (!Array.isArray(fields)) continue;

    for (const [fieldIndex, field] of fields.entries()) {
      if (!field?.id || !field?.label) continue;
      if (
        field.type === "tel" ||
        ["phone", "phone_sms", "contact_number", "mobile_number"].includes(
          String(field.id).toLowerCase(),
        )
      ) {
        continue;
      }
      const [result] = await pool.query(
        `INSERT INTO service_form_fields
           (subcategory_id, field_key, label, input_type, placeholder, is_required, display_order)
         VALUES (?, ?, ?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE
           label = VALUES(label), input_type = VALUES(input_type),
           placeholder = VALUES(placeholder), is_required = VALUES(is_required),
           display_order = VALUES(display_order)`,
        [
          subcategory.id,
          field.id,
          field.label,
          field.type || "text",
          field.placeholder || null,
          field.required ? 1 : 0,
          fieldIndex,
        ],
      );
      let fieldId = result.insertId;
      if (!fieldId) {
        const [existing] = await pool.query(
          "SELECT id FROM service_form_fields WHERE subcategory_id = ? AND field_key = ?",
          [subcategory.id, field.id],
        );
        fieldId = existing[0]?.id;
      }
      if (!fieldId || !Array.isArray(field.options)) continue;
      for (const [optionIndex, option] of field.options.entries()) {
        const value = typeof option === "object" ? option.value : option;
        const label =
          typeof option === "object" ? option.label || option.value : option;
        if (value == null) continue;
        await pool.query(
          `INSERT INTO service_form_field_options (field_id, option_value, option_label, display_order)
           VALUES (?, ?, ?, ?)
           ON DUPLICATE KEY UPDATE option_label = VALUES(option_label), display_order = VALUES(display_order)`,
          [fieldId, String(value), String(label), optionIndex],
        );
      }
    }
  }
}

module.exports = { normalizeLegacyData };
