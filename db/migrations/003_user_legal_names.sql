ALTER TABLE users ADD COLUMN IF NOT EXISTS last_name VARCHAR(100) NULL AFTER full_name;
ALTER TABLE users ADD COLUMN IF NOT EXISTS first_name VARCHAR(100) NULL AFTER last_name;
ALTER TABLE users ADD COLUMN IF NOT EXISTS middle_name VARCHAR(100) NULL AFTER first_name;

UPDATE users
SET first_name = COALESCE(first_name, full_name), last_name = COALESCE(last_name, ''), middle_name = COALESCE(middle_name, '')
WHERE first_name IS NULL OR last_name IS NULL;
