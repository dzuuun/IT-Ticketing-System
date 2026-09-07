-- Normalize relationships without destroying legacy operational data.

-- Resolve department references that were previously stored only by name.
UPDATE users u
JOIN departments d ON LOWER(TRIM(d.name)) = LOWER(TRIM(u.department_name))
SET u.department_id = d.id
WHERE u.department_id IS NULL AND u.department_name IS NOT NULL;

-- Users may participate in more than one ICT-MIS team.
CREATE TABLE IF NOT EXISTS team_memberships (
  team_id INT NOT NULL,
  user_id INT NOT NULL,
  membership_role ENUM('member', 'leader') NOT NULL DEFAULT 'member',
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  joined_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (team_id, user_id),
  INDEX idx_team_memberships_user (user_id, is_active),
  CONSTRAINT fk_team_memberships_team FOREIGN KEY (team_id) REFERENCES teams(id) ON DELETE CASCADE,
  CONSTRAINT fk_team_memberships_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO team_memberships (team_id, user_id, membership_role, is_active)
SELECT team_id, id, IF(role = 'team_leader', 'leader', 'member'), is_active
FROM users
WHERE team_id IS NOT NULL
ON DUPLICATE KEY UPDATE
  membership_role = VALUES(membership_role),
  is_active = VALUES(is_active);

-- Requestor/contact information is a one-to-one ticket snapshot. This supports
-- guests while preserving historical contact data when an account later changes.
CREATE TABLE IF NOT EXISTS ticket_requestors (
  ticket_id INT NOT NULL PRIMARY KEY,
  user_id INT NULL,
  full_name VARCHAR(150) NOT NULL,
  email VARCHAR(150) NOT NULL,
  phone VARCHAR(50) NULL,
  department_id INT NULL,
  department_name_snapshot VARCHAR(150) NULL,
  location_office VARCHAR(150) NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_ticket_requestors_user (user_id),
  INDEX idx_ticket_requestors_email (email),
  INDEX idx_ticket_requestors_department (department_id),
  CONSTRAINT fk_ticket_requestors_ticket FOREIGN KEY (ticket_id) REFERENCES tickets(id) ON DELETE CASCADE,
  CONSTRAINT fk_ticket_requestors_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
  CONSTRAINT fk_ticket_requestors_department FOREIGN KEY (department_id) REFERENCES departments(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT IGNORE INTO ticket_requestors (
  ticket_id, user_id, full_name, email, phone, department_id,
  department_name_snapshot, location_office, created_at
)
SELECT
  t.id, t.requestor_user_id, t.requestor_name, t.requestor_email,
  t.requestor_phone, u.department_id, t.requestor_department,
  t.location_office, t.created_at
FROM tickets t
LEFT JOIN users u ON u.id = t.requestor_user_id;

-- Store submitted service-form values atomically instead of as one JSON document.
CREATE TABLE IF NOT EXISTS ticket_custom_field_values (
  ticket_id INT NOT NULL,
  field_key VARCHAR(100) NOT NULL,
  field_value TEXT NULL,
  PRIMARY KEY (ticket_id, field_key),
  CONSTRAINT fk_ticket_custom_values_ticket FOREIGN KEY (ticket_id) REFERENCES tickets(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Normalize reusable service-catalog form definitions and their choices.
CREATE TABLE IF NOT EXISTS service_form_fields (
  id INT AUTO_INCREMENT PRIMARY KEY,
  subcategory_id INT NOT NULL,
  field_key VARCHAR(100) NOT NULL,
  label VARCHAR(180) NOT NULL,
  input_type VARCHAR(40) NOT NULL DEFAULT 'text',
  placeholder VARCHAR(255) NULL,
  is_required TINYINT(1) NOT NULL DEFAULT 0,
  display_order INT NOT NULL DEFAULT 0,
  UNIQUE KEY uq_service_field_key (subcategory_id, field_key),
  CONSTRAINT fk_service_fields_subcategory FOREIGN KEY (subcategory_id) REFERENCES subcategories(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS service_form_field_options (
  id INT AUTO_INCREMENT PRIMARY KEY,
  field_id INT NOT NULL,
  option_value VARCHAR(255) NOT NULL,
  option_label VARCHAR(255) NOT NULL,
  display_order INT NOT NULL DEFAULT 0,
  UNIQUE KEY uq_service_field_option (field_id, option_value),
  CONSTRAINT fk_service_field_options_field FOREIGN KEY (field_id) REFERENCES service_form_fields(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
