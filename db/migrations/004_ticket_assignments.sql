CREATE TABLE IF NOT EXISTS ticket_assignments (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  ticket_id INT NOT NULL,
  assigned_team_id INT NULL,
  assigned_user_id INT NULL,
  assigned_by_user_id INT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_ticket_assignments_ticket (ticket_id, created_at),
  FOREIGN KEY (ticket_id) REFERENCES tickets(id) ON DELETE CASCADE,
  FOREIGN KEY (assigned_team_id) REFERENCES teams(id) ON DELETE SET NULL,
  FOREIGN KEY (assigned_user_id) REFERENCES users(id) ON DELETE SET NULL,
  FOREIGN KEY (assigned_by_user_id) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
