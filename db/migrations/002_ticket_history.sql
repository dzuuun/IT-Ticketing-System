ALTER TABLE tickets ADD COLUMN IF NOT EXISTS guest_token_hash CHAR(64) NULL UNIQUE;

CREATE TABLE IF NOT EXISTS ticket_status_history (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  ticket_id INT NOT NULL,
  old_status VARCHAR(50) NULL,
  new_status VARCHAR(50) NOT NULL,
  changed_by_user_id INT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_ticket_status_history_ticket (ticket_id, created_at),
  FOREIGN KEY (ticket_id) REFERENCES tickets(id) ON DELETE CASCADE,
  FOREIGN KEY (changed_by_user_id) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS ticket_priority_history (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  ticket_id INT NOT NULL,
  old_priority VARCHAR(50) NULL,
  new_priority VARCHAR(50) NOT NULL,
  changed_by_user_id INT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_ticket_priority_history_ticket (ticket_id, created_at),
  FOREIGN KEY (ticket_id) REFERENCES tickets(id) ON DELETE CASCADE,
  FOREIGN KEY (changed_by_user_id) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
