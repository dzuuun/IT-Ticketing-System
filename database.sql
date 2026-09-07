-- ==========================================================
-- NDMU MIS IT Ticketing System Database Dump
-- Notre Dame of Marbel University
-- Compatible with MySQL 5.7+, MySQL 8.0+, MariaDB, and phpMyAdmin Import
-- ==========================================================

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";
SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

-- --------------------------------------------------------
-- Database Creation & Selection
-- --------------------------------------------------------
CREATE DATABASE IF NOT EXISTS `ndmu_ticketing` DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE `ndmu_ticketing`;

-- --------------------------------------------------------
-- Table structure for table `departments`
-- --------------------------------------------------------
DROP TABLE IF EXISTS `departments`;
CREATE TABLE IF NOT EXISTS `departments` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `name` VARCHAR(150) NOT NULL,
  `code` VARCHAR(50) NOT NULL UNIQUE,
  `type` ENUM('college', 'office', 'unit', 'other') DEFAULT 'office',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------
-- Dumping data for table `departments`
-- --------------------------------------------------------
INSERT INTO `departments` (`id`, `name`, `code`, `type`) VALUES
(1, 'Management Information Systems (MIS)', 'MIS', 'office'),
(2, 'College of Computer Studies', 'CCS', 'college'),
(3, 'College of Engineering', 'COE', 'college'),
(4, 'College of Business Administration', 'CBA', 'college'),
(5, 'College of Education', 'CED', 'college'),
(6, 'College of Arts and Sciences', 'CAS', 'college'),
(7, 'College of Health Sciences', 'CHS', 'college'),
(8, 'Integrated Basic Education Department', 'IBED', 'college'),
(9, 'Office of the University President', 'OP', 'office'),
(10, 'Office of the Registrar', 'REG', 'office'),
(11, 'Finance & Accounting Office', 'FAO', 'office'),
(12, 'Human Resource Development Office', 'HRDO', 'office'),
(13, 'University Library', 'LIB', 'unit'),
(14, 'Physical Plant & General Services', 'PPGS', 'office');

-- --------------------------------------------------------
-- Table structure for table `teams`
-- --------------------------------------------------------
DROP TABLE IF EXISTS `teams`;
CREATE TABLE IF NOT EXISTS `teams` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `name` VARCHAR(100) NOT NULL UNIQUE,
  `description` VARCHAR(255) NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------
-- Dumping data for table `teams`
-- --------------------------------------------------------
INSERT INTO `teams` (`id`, `name`, `description`) VALUES
(1, 'Network & Infrastructure Team', 'Campus Wi-Fi, LAN, fiber backbone, routers, and switches'),
(2, 'Systems & Web Applications Team', 'EIS, Schoology LMS, SATP, SMS, and database operations'),
(3, 'Hardware & Desktop Support Team', 'Workstations, laptops, printers, scanners, and OS maintenance'),
(4, 'User Accounts & Access Support', 'Google Workspace, password resets, role permissions, and onboarding');

-- --------------------------------------------------------
-- Table structure for table `users`
-- --------------------------------------------------------
DROP TABLE IF EXISTS `users`;
CREATE TABLE IF NOT EXISTS `users` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `google_id` VARCHAR(255) NULL UNIQUE,
  `email` VARCHAR(150) NOT NULL UNIQUE,
  `password_hash` VARCHAR(255) NULL,
  `full_name` VARCHAR(150) NOT NULL,
  `id_number` VARCHAR(50) NULL,
  `role` ENUM('admin', 'team_leader', 'technician', 'requestor') NOT NULL DEFAULT 'requestor',
  `department_id` INT NULL,
  `department_name` VARCHAR(150) NULL,
  `team_id` INT NULL,
  `phone` VARCHAR(30) NULL,
  `avatar_url` VARCHAR(255) NULL,
  `is_active` TINYINT(1) NOT NULL DEFAULT 1,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (`department_id`) REFERENCES `departments`(`id`) ON DELETE SET NULL,
  FOREIGN KEY (`team_id`) REFERENCES `teams`(`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------
-- Dumping data for table `users`
-- Passwords:
-- admin@ndmu.edu.ph       -> admin123
-- lead.network@ndmu.edu.ph -> lead123
-- tech1@ndmu.edu.ph       -> tech123
-- tech2@ndmu.edu.ph       -> tech123
-- faculty@ndmu.edu.ph     -> user123
-- student@ndmu.edu.ph     -> user123
-- --------------------------------------------------------
INSERT INTO `users` (`id`, `email`, `password_hash`, `full_name`, `id_number`, `role`, `department_id`, `department_name`, `team_id`, `phone`) VALUES
(1, 'admin@ndmu.edu.ph', '$2a$10$Dw/kUZN3wPsWeBWWqdfBeuFOJcZN5GFxH9WXGfFAzyrelf3tPM2YS', 'Engr. Nelson Tan (MIS Director)', 'EMP-00101', 'admin', 1, 'Management Information Systems (MIS)', NULL, '09171234567'),
(2, 'lead.network@ndmu.edu.ph', '$2a$10$ll9O0VH6mJw930Yf8h1oaeDxs4U2m8Tc2dpw7urppMWv2nEvezZR6', 'Engr. Roberto Gomez (Network Team Lead)', 'EMP-00105', 'team_leader', 1, 'Management Information Systems (MIS)', 1, '09175551234'),
(3, 'tech1@ndmu.edu.ph', '$2a$10$x0Z9jvSWSihS5na38s4v6ON6U.Q4KRTB2jDXNBEIAg4uNrZixkrqe', 'Mark Dela Cruz (Network Specialist)', 'EMP-00102', 'technician', 1, 'Management Information Systems (MIS)', 1, '09187654321'),
(4, 'tech2@ndmu.edu.ph', '$2a$10$x0Z9jvSWSihS5na38s4v6ON6U.Q4KRTB2jDXNBEIAg4uNrZixkrqe', 'Sarah Santos (Hardware & Systems Tech)', 'EMP-00103', 'technician', 1, 'Management Information Systems (MIS)', 3, '09191122334'),
(5, 'faculty@ndmu.edu.ph', '$2a$10$a2WX1.xLip4B02Kv.m/bTOU.ZjY1eoWbfHhfp5w5F3F86BncLtiFK', 'Prof. Juan Luna (CCS Faculty)', 'EMP-00204', 'requestor', 2, 'College of Computer Studies', NULL, '09205556677'),
(6, 'student@ndmu.edu.ph', '$2a$10$a2WX1.xLip4B02Kv.m/bTOU.ZjY1eoWbfHhfp5w5F3F86BncLtiFK', 'Maria Clara (BSIT Student)', 'STU-2024-0089', 'requestor', 2, 'College of Computer Studies', NULL, '09223334455');

-- --------------------------------------------------------
-- Table structure for table `categories`
-- --------------------------------------------------------
DROP TABLE IF EXISTS `categories`;
CREATE TABLE IF NOT EXISTS `categories` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `name` VARCHAR(100) NOT NULL UNIQUE,
  `description` VARCHAR(255) NULL,
  `icon` VARCHAR(50) DEFAULT 'help_outline',
  `is_active` TINYINT(1) NOT NULL DEFAULT 1,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------
-- Dumping data for table `categories`
-- --------------------------------------------------------
INSERT INTO `categories` (`id`, `name`, `description`, `icon`) VALUES
(1, 'Accounts & Access', 'Institutional email, Schoology, EIS, SATP, password reset', 'account_circle'),
(2, 'Network', 'Wi-Fi, LAN, internet, access points', 'wifi'),
(3, 'Hardware & Devices', 'Desktop, laptop, printer, scanner', 'computer'),
(4, 'Software & Systems', 'Installation, licensing, application problems, EIS, Schoology', 'code'),
(5, 'Multimedia & AV Support', 'Projector, display, AV equipment in auditoriums and classrooms', 'videocam'),
(6, 'Server & Infrastructure', 'Server, VM, database, and cloud service issues', 'storage'),
(7, 'Printing & Scanning', 'Printer setup, toner replenishment, printing errors', 'print'),
(8, 'Data & Academic Reports', 'Reports, exports, data corrections', 'table_chart'),
(9, 'Other MIS Assistance', 'General IT and hardware inquiries', 'help_outline');

-- --------------------------------------------------------
-- Table structure for table `subcategories` (Service Catalog Items)
-- --------------------------------------------------------
DROP TABLE IF EXISTS `subcategories`;
CREATE TABLE IF NOT EXISTS `subcategories` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `category_id` INT NOT NULL,
  `name` VARCHAR(150) NOT NULL,
  `description` VARCHAR(255) NULL,
  `default_type` ENUM('service_request', 'incident') NOT NULL DEFAULT 'service_request',
  `default_priority` ENUM('low', 'medium', 'high', 'urgent', 'critical') NOT NULL DEFAULT 'medium',
  `form_schema` JSON NULL,
  `is_active` TINYINT(1) NOT NULL DEFAULT 1,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`category_id`) REFERENCES `categories`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------
-- Dumping data for table `subcategories`
-- --------------------------------------------------------
INSERT INTO `subcategories` (`id`, `category_id`, `name`, `description`, `default_type`, `default_priority`, `form_schema`) VALUES
(1, 1, 'Institutional Email Account', 'Provision new @ndmu.edu.ph Google Workspace account', 'service_request', 'medium', '[{\"id\":\"employee_id\",\"label\":\"Employee / Student ID Number\",\"type\":\"text\",\"required\":true,\"placeholder\":\"e.g. EMP-2026-0012 or STU-2024-0089\"},{\"id\":\"full_name\",\"label\":\"Full Legal Name\",\"type\":\"text\",\"required\":true,\"placeholder\":\"First Name, Middle Name, Last Name\"},{\"id\":\"department\",\"label\":\"College / Department / Office\",\"type\":\"text\",\"required\":true},{\"id\":\"backup_email\",\"label\":\"Personal Recovery Email\",\"type\":\"email\",\"required\":true,\"placeholder\":\"name@gmail.com\"},{\"id\":\"contact_number\",\"label\":\"Active Contact Number\",\"type\":\"tel\",\"required\":true}]'),
(2, 1, 'Schoology Account Setup', 'Schoology LMS instructor profile and course enrollment', 'service_request', 'medium', '[{\"id\":\"employee_id\",\"label\":\"Employee / Faculty ID\",\"type\":\"text\",\"required\":true},{\"id\":\"full_name\",\"label\":\"Faculty Name\",\"type\":\"text\",\"required\":true},{\"id\":\"college_dept\",\"label\":\"College / Academic Department\",\"type\":\"text\",\"required\":true},{\"id\":\"subjects_handled\",\"label\":\"Subjects / Course Codes Handled\",\"type\":\"textarea\",\"required\":true,\"placeholder\":\"e.g. CS101, IT202, Web Development 1\"},{\"id\":\"institutional_email\",\"label\":\"Institutional Email (@ndmu.edu.ph)\",\"type\":\"email\",\"required\":true}]'),
(3, 1, 'EIS Faculty/Student Portal Access', 'Access to EIS Grading, Student, or Department modules', 'service_request', 'medium', '[{\"id\":\"id_number\",\"label\":\"ID Number\",\"type\":\"text\",\"required\":true},{\"id\":\"role_type\",\"label\":\"Portal Type\",\"type\":\"select\",\"options\":[\"Faculty Grading Portal\",\"Student Portal\",\"Registrar / Admin Module\",\"Dean / Dept Head Review\"],\"required\":true},{\"id\":\"department\",\"label\":\"College / Office\",\"type\":\"text\",\"required\":true},{\"id\":\"justification\",\"label\":\"Access Justification / Remarks\",\"type\":\"textarea\",\"required\":false}]'),
(4, 1, 'Password Reset Request', 'Reset password for Google Email, Schoology, or EIS', 'service_request', 'high', '[{\"id\":\"account_type\",\"label\":\"System / Account\",\"type\":\"select\",\"options\":[\"Google Institutional Email\",\"Schoology LMS\",\"EIS Portal\",\"Windows Workstation\"],\"required\":true},{\"id\":\"username_email\",\"label\":\"Username or Email Address\",\"type\":\"text\",\"required\":true},{\"id\":\"verification_id\",\"label\":\"University ID Number\",\"type\":\"text\",\"required\":true},{\"id\":\"phone_sms\",\"label\":\"Mobile Number for Temporary Password\",\"type\":\"tel\",\"required\":true}]'),
(5, 2, 'Campus Wi-Fi Connectivity Issue', 'Troubleshoot NDMU-Student or NDMU-Faculty Wi-Fi issues', 'incident', 'high', '[{\"id\":\"building\",\"label\":\"Building Name\",\"type\":\"select\",\"options\":[\"Main Building\",\"CCS Building\",\"Engineering Building\",\"Gymnasium\",\"Student Center\",\"Library\",\"IBED Complex\",\"Administration Building\"],\"required\":true},{\"id\":\"room_office\",\"label\":\"Room / Floor / Area\",\"type\":\"text\",\"required\":true,\"placeholder\":\"e.g. 2nd Floor Hallway / Room 204\"},{\"id\":\"device_type\",\"label\":\"Device Encountering Issue\",\"type\":\"select\",\"options\":[\"Laptop (Windows/Mac)\",\"Mobile Phone (Android/iOS)\",\"Tablet\",\"Other\"],\"required\":true},{\"id\":\"ssid_network\",\"label\":\"Wi-Fi Network Name (SSID)\",\"type\":\"select\",\"options\":[\"NDMU-Faculty\",\"NDMU-Student\",\"NDMU-Guest\",\"Other\"],\"required\":true},{\"id\":\"error_symptom\",\"label\":\"Symptom\",\"type\":\"select\",\"options\":[\"Cannot connect / Invalid password\",\"Connected but No Internet\",\"Weak Signal / Dropping\",\"Slow speed\"],\"required\":true}]'),
(6, 2, 'LAN Cable / Office Wallport Issue', 'Damaged network cable or dead Ethernet wall jack', 'incident', 'medium', '[{\"id\":\"building\",\"label\":\"Building\",\"type\":\"text\",\"required\":true},{\"id\":\"room_office\",\"label\":\"Room / Office\",\"type\":\"text\",\"required\":true},{\"id\":\"port_number\",\"label\":\"Wallport Number (if labeled)\",\"type\":\"text\",\"required\":false},{\"id\":\"description\",\"label\":\"Problem Details\",\"type\":\"textarea\",\"required\":true}]'),
(7, 3, 'Desktop PC Malfunction', 'Hardware diagnosis for laboratory or office PC', 'incident', 'medium', '[{\"id\":\"asset_tag\",\"label\":\"Equipment Asset Tag / Serial No.\",\"type\":\"text\",\"required\":false,\"placeholder\":\"e.g. NDMU-PC-2024-045\"},{\"id\":\"location\",\"label\":\"Building & Room\",\"type\":\"text\",\"required\":true},{\"id\":\"symptoms\",\"label\":\"Hardware Symptom\",\"type\":\"select\",\"options\":[\"No power / Will not turn on\",\"Beeping / Blue screen\",\"Overheating / Loud fan\",\"Monitor display blank\",\"Keyboard / Mouse unresponsive\"],\"required\":true},{\"id\":\"description\",\"label\":\"Additional Observations\",\"type\":\"textarea\",\"required\":true}]'),
(8, 4, 'Software Installation Request', 'Install educational or productivity software', 'service_request', 'low', '[{\"id\":\"software_name\",\"label\":\"Software / Program Requested\",\"type\":\"text\",\"required\":true,\"placeholder\":\"e.g. SPSS, AutoCAD, Visual Studio Code, Zoom\"},{\"id\":\"location_pc\",\"label\":\"Laboratory / Office Computer Location\",\"type\":\"text\",\"required\":true},{\"id\":\"academic_purpose\",\"label\":\"Academic or Office Purpose\",\"type\":\"textarea\",\"required\":true}]'),
(9, 5, 'Classroom Projector / Smart TV Setup', 'AV equipment preparation for class lectures or academic events', 'service_request', 'medium', '[{\"id\":\"venue\",\"label\":\"Classroom / Venue\",\"type\":\"text\",\"required\":true,\"placeholder\":\"e.g. CCS Lab 3, Engineering Amphitheater\"},{\"id\":\"date_time\",\"label\":\"Date & Time Needed\",\"type\":\"text\",\"required\":true,\"placeholder\":\"e.g. Monday Sept 8, 8:00 AM - 11:00 AM\"},{\"id\":\"equipment_list\",\"label\":\"Equipment Needed\",\"type\":\"select\",\"options\":[\"LCD Projector & Screen\",\"HDMI / VGA Cable Adapter\",\"Wireless Microphones & Speaker\",\"Full Event Audio-Visual Setup\"],\"required\":true}]');

-- --------------------------------------------------------
-- Table structure for table `tickets`
-- --------------------------------------------------------
DROP TABLE IF EXISTS `tickets`;
CREATE TABLE IF NOT EXISTS `tickets` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `ticket_number` VARCHAR(50) NOT NULL UNIQUE,
  `tracking_code` VARCHAR(64) NOT NULL UNIQUE,
  `ticket_type` ENUM('service_request', 'incident') NOT NULL DEFAULT 'service_request',
  `title` VARCHAR(255) NOT NULL,
  `description` TEXT NOT NULL,
  `category_id` INT NULL,
  `subcategory_id` INT NULL,
  `priority` ENUM('low', 'medium', 'high', 'urgent', 'critical') NOT NULL DEFAULT 'medium',
  `status` ENUM('new', 'assigned', 'in_progress', 'pending_user', 'resolved', 'closed') NOT NULL DEFAULT 'new',
  `custom_fields` JSON NULL,
  `requestor_user_id` INT NULL,
  `requestor_name` VARCHAR(150) NOT NULL,
  `requestor_email` VARCHAR(150) NOT NULL,
  `requestor_id_number` VARCHAR(50) NULL,
  `requestor_phone` VARCHAR(50) NULL,
  `requestor_department` VARCHAR(150) NULL,
  `location_office` VARCHAR(150) NULL,
  `assigned_team_id` INT NULL,
  `assigned_technician_id` INT NULL,
  `resolution_notes` TEXT NULL,
  `resolution_date` DATETIME NULL,
  `sla_due_response` DATETIME NULL,
  `sla_due_resolution` DATETIME NULL,
  `sla_responded_at` DATETIME NULL,
  `sla_resolved_at` DATETIME NULL,
  `rating` INT NULL,
  `rating_feedback` TEXT NULL,
  `closed_at` DATETIME NULL,
  `auto_close_at` DATETIME NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (`category_id`) REFERENCES `categories`(`id`) ON DELETE SET NULL,
  FOREIGN KEY (`subcategory_id`) REFERENCES `subcategories`(`id`) ON DELETE SET NULL,
  FOREIGN KEY (`requestor_user_id`) REFERENCES `users`(`id`) ON DELETE SET NULL,
  FOREIGN KEY (`assigned_team_id`) REFERENCES `teams`(`id`) ON DELETE SET NULL,
  FOREIGN KEY (`assigned_technician_id`) REFERENCES `users`(`id`) ON DELETE SET NULL,
  INDEX `idx_ticket_number` (`ticket_number`),
  INDEX `idx_status` (`status`),
  INDEX `idx_priority` (`priority`),
  INDEX `idx_assigned_tech` (`assigned_technician_id`),
  INDEX `idx_requestor_email` (`requestor_email`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------
-- Dumping data for table `tickets`
-- --------------------------------------------------------
INSERT INTO `tickets` (`id`, `ticket_number`, `tracking_code`, `ticket_type`, `title`, `description`, `category_id`, `subcategory_id`, `priority`, `status`, `custom_fields`, `requestor_user_id`, `requestor_name`, `requestor_email`, `requestor_id_number`, `requestor_department`, `location_office`, `assigned_team_id`, `assigned_technician_id`, `sla_due_response`, `sla_due_resolution`, `sla_responded_at`) VALUES
(1, 'MIS-2026-000124', 'NDMU-TRK-100124', 'incident', 'Wi-Fi Access Point offline in CCS Building 2nd Floor', 'Students and faculty cannot connect to NDMU-Student Wi-Fi near Room 204.', 2, 5, 'high', 'new', '{\"building\": \"CCS Building\", \"room_office\": \"Room 204\", \"device_type\": \"Laptop\", \"ssid_network\": \"NDMU-Student\", \"error_symptom\": \"No Internet / Signal Dropping\"}', 5, 'Juan Dela Cruz', 'j.delacruz@ndmu.edu.ph', 'EMP-00204', 'College of Computer Studies', 'CCS Building Room 204', 1, NULL, DATE_ADD(NOW(), INTERVAL 4 HOUR), DATE_ADD(NOW(), INTERVAL 12 HOUR), NULL),
(2, 'MIS-2026-000123', 'NDMU-TRK-100123', 'service_request', 'Schoology Account Setup for 3 New CAS Instructors', 'Please create Schoology course instructor profiles for 3 newly hired General Education instructors.', 1, 2, 'medium', 'assigned', '{\"employee_id\": \"EMP-00310\", \"college_dept\": \"College of Arts and Sciences\", \"subjects_handled\": \"GE 101, GE 104, Ethics\", \"institutional_email\": \"cas.sec@ndmu.edu.ph\"}', NULL, 'CAS Department Secretary', 'cas.sec@ndmu.edu.ph', 'EMP-00301', 'College of Arts and Sciences', 'CAS Dean Office', 4, 4, DATE_ADD(NOW(), INTERVAL 8 HOUR), DATE_ADD(NOW(), INTERVAL 24 HOUR), DATE_SUB(NOW(), INTERVAL 1 HOUR)),
(3, 'MIS-2026-000122', 'NDMU-TRK-100122', 'incident', 'EIS Faculty Grading Portal Error during Grade Finalization', 'Faculty gets "Database Lock Timeout" when saving section grades for CS201.', 1, 3, 'high', 'in_progress', '{\"affected_system\": \"EIS Enterprise Portal\", \"error_message\": \"Database Lock Timeout 504\", \"scope_affected\": \"Entire College / Department\"}', NULL, 'Jane Santos', 'jane.santos@ndmu.edu.ph', 'EMP-00215', 'College of Computer Studies', 'CCS Faculty Room', 2, 3, DATE_SUB(NOW(), INTERVAL 2 HOUR), DATE_ADD(NOW(), INTERVAL 6 HOUR), DATE_SUB(NOW(), INTERVAL 3 HOUR));

-- --------------------------------------------------------
-- Table structure for table `ticket_messages`
-- --------------------------------------------------------
DROP TABLE IF EXISTS `ticket_messages`;
CREATE TABLE IF NOT EXISTS `ticket_messages` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `ticket_id` INT NOT NULL,
  `sender_user_id` INT NULL,
  `sender_name` VARCHAR(150) NOT NULL,
  `sender_role` VARCHAR(50) NOT NULL DEFAULT 'requestor',
  `message` TEXT NOT NULL,
  `is_internal` TINYINT(1) NOT NULL DEFAULT 0,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`ticket_id`) REFERENCES `tickets`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`sender_user_id`) REFERENCES `users`(`id`) ON DELETE SET NULL,
  INDEX `idx_ticket_msg` (`ticket_id`, `is_internal`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------
-- Dumping data for table `ticket_messages`
-- --------------------------------------------------------
INSERT INTO `ticket_messages` (`id`, `ticket_id`, `sender_user_id`, `sender_name`, `sender_role`, `message`, `is_internal`) VALUES
(1, 1, 5, 'Juan Dela Cruz', 'requestor', 'Students and faculty cannot connect to NDMU-Student Wi-Fi near Room 204.', 0),
(2, 2, NULL, 'CAS Department Secretary', 'requestor', 'Please create Schoology course instructor profiles for 3 newly hired General Education instructors.', 0),
(3, 2, 4, 'Sarah Santos (Hardware & Systems Tech)', 'technician', 'Request acknowledged. Reviewing faculty masterlist from HRDO.', 0),
(4, 3, NULL, 'Jane Santos', 'requestor', 'Faculty gets "Database Lock Timeout" when saving section grades for CS201.', 0),
(5, 3, 3, 'Mark Dela Cruz (Network Specialist)', 'technician', 'Inspecting database session connection pool on main EIS node.', 1);

-- --------------------------------------------------------
-- Table structure for table `ticket_attachments`
-- --------------------------------------------------------
DROP TABLE IF EXISTS `ticket_attachments`;
CREATE TABLE IF NOT EXISTS `ticket_attachments` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `ticket_id` INT NOT NULL,
  `message_id` INT NULL,
  `filename` VARCHAR(255) NOT NULL,
  `original_name` VARCHAR(255) NOT NULL,
  `file_size` INT NOT NULL,
  `mime_type` VARCHAR(100) NOT NULL,
  `file_path` VARCHAR(255) NOT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`ticket_id`) REFERENCES `tickets`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`message_id`) REFERENCES `ticket_messages`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------
-- Table structure for table `ticket_activity_logs`
-- --------------------------------------------------------
DROP TABLE IF EXISTS `ticket_activity_logs`;
CREATE TABLE IF NOT EXISTS `ticket_activity_logs` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `ticket_id` INT NOT NULL,
  `actor_user_id` INT NULL,
  `actor_name` VARCHAR(150) NOT NULL,
  `action_type` VARCHAR(50) NOT NULL,
  `old_value` VARCHAR(255) NULL,
  `new_value` VARCHAR(255) NULL,
  `comment` TEXT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`ticket_id`) REFERENCES `tickets`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`actor_user_id`) REFERENCES `users`(`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------
-- Dumping data for table `ticket_activity_logs`
-- --------------------------------------------------------
INSERT INTO `ticket_activity_logs` (`id`, `ticket_id`, `actor_user_id`, `actor_name`, `action_type`, `comment`) VALUES
(1, 1, 5, 'Juan Dela Cruz', 'CREATED', 'Submitted via NDMU Service Desk'),
(2, 2, NULL, 'CAS Department Secretary', 'CREATED', 'Submitted via NDMU Service Desk'),
(3, 3, NULL, 'Jane Santos', 'CREATED', 'Submitted via NDMU Service Desk');

-- --------------------------------------------------------
-- Table structure for table `knowledge_base`
-- --------------------------------------------------------
DROP TABLE IF EXISTS `knowledge_base`;
CREATE TABLE IF NOT EXISTS `knowledge_base` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `title` VARCHAR(255) NOT NULL,
  `slug` VARCHAR(255) NOT NULL UNIQUE,
  `category` VARCHAR(100) NOT NULL,
  `summary` VARCHAR(500) NULL,
  `content` TEXT NOT NULL,
  `author_id` INT NULL,
  `views` INT DEFAULT 0,
  `helpful_count` INT DEFAULT 0,
  `is_published` TINYINT(1) DEFAULT 1,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (`author_id`) REFERENCES `users`(`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------
-- Dumping data for table `knowledge_base`
-- --------------------------------------------------------
INSERT INTO `knowledge_base` (`id`, `title`, `slug`, `category`, `summary`, `content`, `views`, `helpful_count`, `is_published`) VALUES
(1, 'How to Connect to NDMU Campus Wi-Fi (Students & Faculty)', 'how-to-connect-ndmu-wifi', 'Network', 'Instructions for connecting your laptops, Android, and iOS devices to NDMU-Student and NDMU-Faculty Wi-Fi networks.', '### Connecting to NDMU Campus Wi-Fi\n1. Turn on Wi-Fi on your device.\n2. Select **NDMU-Student** (for students) or **NDMU-Faculty** (for employees).\n3. In the authentication prompt, enter:\n   - **EAP Method**: PEAP\n   - **Phase 2 Authentication**: MSCHAPV2\n   - **CA Certificate**: Do not validate / Trust\n   - **Identity**: Your institutional email (e.g. `j.luna@ndmu.edu.ph`)\n   - **Password**: Your NDMU account password\n4. Tap **Connect**.\n\nIf you receive a certificate warning, accept and proceed. For guest access, please request a guest voucher from your event organizer.', 45, 12, 1),
(2, 'Step-by-Step Guide: Resetting Your Institutional Google Password', 'reset-institutional-google-password', 'Accounts & Access', 'How to reset or recover your @ndmu.edu.ph Google Workspace account password.', '### Institutional Email Password Reset\nIf you have forgotten your password or are locked out:\n1. Visit accounts.google.com.\n2. Enter your full NDMU email address (`username@ndmu.edu.ph`).\n3. Click **\"Forgot Password?\"**.\n4. If you linked a recovery phone or secondary email, Google will send a 6-digit verification code.\n5. If recovery is not configured, submit a **Password Reset Request** ticket through this MIS Service Desk. An MIS technician will generate a temporary password and send it via SMS.', 28, 9, 1),
(3, 'Accessing Schoology LMS for Academic Year 2026-2027', 'accessing-schoology-lms-guide', 'Software & Systems', 'Log in to Schoology using Single Sign-On (SSO) with your NDMU Google credentials.', '### Schoology LMS Login Procedure\nNDMU uses Google SSO for Schoology.\n1. Open your browser and navigate to **schoology.ndmu.edu.ph**.\n2. Click **\"Log in through Google\"**.\n3. Choose your `@ndmu.edu.ph` account.\n4. If your courses do not appear after 24 hours of enrollment confirmation, submit a **Schoology Account Setup** ticket to MIS.', 35, 14, 1);

-- --------------------------------------------------------
-- Table structure for table `announcements`
-- --------------------------------------------------------
DROP TABLE IF EXISTS `announcements`;
CREATE TABLE IF NOT EXISTS `announcements` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `title` VARCHAR(255) NOT NULL,
  `content` TEXT NOT NULL,
  `severity` ENUM('info', 'warning', 'urgent') DEFAULT 'info',
  `is_active` TINYINT(1) DEFAULT 1,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `expires_at` DATETIME NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------
-- Dumping data for table `announcements`
-- --------------------------------------------------------
INSERT INTO `announcements` (`id`, `title`, `content`, `severity`, `is_active`) VALUES
(1, 'Scheduled Maintenance: Campus Core Switch Firmware Upgrade', 'MIS will perform routine core switch firmware updates this Saturday from 10:00 PM to 2:00 AM. Intermittent wired & Wi-Fi outages may occur during this maintenance window.', 'warning', 1),
(2, 'EIS Faculty Grading Portal is Now Open for Midterm Encoding', 'Faculty members can now access the EIS Portal to encode Midterm grades. For password or access assistance, submit an Accounts ticket.', 'info', 1);

-- --------------------------------------------------------
-- Table structure for table `system_settings`
-- --------------------------------------------------------
DROP TABLE IF EXISTS `system_settings`;
CREATE TABLE IF NOT EXISTS `system_settings` (
  `setting_key` VARCHAR(100) PRIMARY KEY,
  `setting_value` TEXT NOT NULL,
  `description` VARCHAR(255) NULL,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------
-- Dumping data for table `system_settings`
-- --------------------------------------------------------
INSERT INTO `system_settings` (`setting_key`, `setting_value`, `description`) VALUES
('auto_close_days', '3', 'Days after resolution before auto-closing'),
('sla_critical_hours', '4', 'Resolution SLA for Critical incidents'),
('sla_high_hours', '12', 'Resolution SLA for High priority tickets'),
('sla_medium_hours', '24', 'Resolution SLA for Medium priority tickets'),
('sla_low_hours', '72', 'Resolution SLA for Low priority tickets'),
('school_name', 'Notre Dame of Marbel University', 'Institution name'),
('mis_contact_email', 'mis@ndmu.edu.ph', 'Official MIS email');

SET FOREIGN_KEY_CHECKS = 1;
COMMIT;
