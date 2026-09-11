/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!50503 SET NAMES utf8mb4 */;
/*!40103 SET @OLD_TIME_ZONE=@@TIME_ZONE */;
/*!40103 SET TIME_ZONE='+00:00' */;
/*!40014 SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0 */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;

CREATE DATABASE IF NOT EXISTS `ndmu_ticketing`
  CHARACTER SET utf8
  COLLATE utf8_general_ci;
USE `ndmu_ticketing`;

-- Complete fresh-install schema. The changes formerly maintained as
-- migrations 001 through 017 are represented here.

DROP TABLE IF EXISTS `announcements`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `announcements` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `title` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `content` text COLLATE utf8mb4_unicode_ci NOT NULL,
  `severity` enum('info','warning','urgent') COLLATE utf8mb4_unicode_ci DEFAULT 'info',
  `is_active` tinyint(1) DEFAULT 1,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `expires_at` datetime DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `categories`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `categories` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `name` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `description` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `icon` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT 'help_outline',
  `is_active` tinyint(1) NOT NULL DEFAULT 1,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `name` (`name`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `locations`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `locations` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `name` varchar(180) COLLATE utf8mb4_unicode_ci NOT NULL,
  `code` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `type` enum('college','office','unit','other') COLLATE utf8mb4_unicode_ci DEFAULT 'office',
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `is_active` tinyint(1) NOT NULL DEFAULT 1,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_locations_code` (`code`),
  UNIQUE KEY `uq_locations_name` (`name`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `knowledge_base`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `knowledge_base` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `title` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `slug` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `category` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `summary` varchar(500) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `content` text COLLATE utf8mb4_unicode_ci NOT NULL,
  `author_id` int(11) DEFAULT NULL,
  `views` int(11) DEFAULT 0,
  `helpful_count` int(11) DEFAULT 0,
  `is_published` tinyint(1) DEFAULT 1,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `slug` (`slug`),
  KEY `author_id` (`author_id`),
  CONSTRAINT `knowledge_base_ibfk_1` FOREIGN KEY (`author_id`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `refresh_tokens`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `refresh_tokens` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `user_id` int(11) NOT NULL,
  `token_hash` char(64) COLLATE utf8mb4_unicode_ci NOT NULL,
  `expires_at` datetime NOT NULL,
  `revoked_at` datetime DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `last_used_at` datetime DEFAULT NULL,
  `user_agent` varchar(512) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `ip_address` varchar(64) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `token_hash` (`token_hash`),
  KEY `idx_refresh_tokens_user_active` (`user_id`,`revoked_at`,`expires_at`),
  CONSTRAINT `fk_refresh_tokens_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `service_form_field_options`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `service_form_field_options` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `field_id` int(11) NOT NULL,
  `option_value` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `option_label` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `display_order` int(11) NOT NULL DEFAULT 0,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_service_field_option` (`field_id`,`option_value`),
  CONSTRAINT `fk_service_field_options_field` FOREIGN KEY (`field_id`) REFERENCES `service_form_fields` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `service_form_fields`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `service_form_fields` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `subcategory_id` int(11) NOT NULL,
  `field_key` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `label` varchar(180) COLLATE utf8mb4_unicode_ci NOT NULL,
  `input_type` varchar(40) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'text',
  `placeholder` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `is_required` tinyint(1) NOT NULL DEFAULT 0,
  `is_active` tinyint(1) NOT NULL DEFAULT 1,
  `display_order` int(11) NOT NULL DEFAULT 0,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_service_field_key` (`subcategory_id`,`field_key`),
  CONSTRAINT `fk_service_fields_subcategory` FOREIGN KEY (`subcategory_id`) REFERENCES `subcategories` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `subcategories`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `subcategories` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `category_id` int(11) NOT NULL,
  `name` varchar(150) COLLATE utf8mb4_unicode_ci NOT NULL,
  `description` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `default_type` enum('service_request','incident') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'service_request',
  `default_priority` enum('low','medium','high','urgent','critical') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'medium',
  `form_schema` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`form_schema`)),
  `is_active` tinyint(1) NOT NULL DEFAULT 1,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `category_id` (`category_id`),
  CONSTRAINT `subcategories_ibfk_1` FOREIGN KEY (`category_id`) REFERENCES `categories` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `system_settings`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `system_settings` (
  `setting_key` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `setting_value` text COLLATE utf8mb4_unicode_ci NOT NULL,
  `description` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`setting_key`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `team_memberships`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `team_memberships` (
  `team_id` int(11) NOT NULL,
  `user_id` int(11) NOT NULL,
  `membership_role` enum('member','leader') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'member',
  `is_active` tinyint(1) NOT NULL DEFAULT 1,
  `joined_at` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`team_id`,`user_id`),
  KEY `idx_team_memberships_user` (`user_id`,`is_active`),
  CONSTRAINT `fk_team_memberships_team` FOREIGN KEY (`team_id`) REFERENCES `teams` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_team_memberships_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `teams`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `teams` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `name` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `description` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `is_active` tinyint(1) NOT NULL DEFAULT 1,
  PRIMARY KEY (`id`),
  UNIQUE KEY `name` (`name`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `ticket_activity_logs`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `ticket_activity_logs` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `ticket_id` int(11) NOT NULL,
  `actor_user_id` int(11) DEFAULT NULL,
  `actor_name` varchar(150) COLLATE utf8mb4_unicode_ci NOT NULL,
  `action_type` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `old_value` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `new_value` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `comment` text COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `ticket_id` (`ticket_id`),
  KEY `actor_user_id` (`actor_user_id`),
  CONSTRAINT `ticket_activity_logs_ibfk_1` FOREIGN KEY (`ticket_id`) REFERENCES `tickets` (`id`) ON DELETE CASCADE,
  CONSTRAINT `ticket_activity_logs_ibfk_2` FOREIGN KEY (`actor_user_id`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `ticket_assignments`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `ticket_assignments` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `ticket_id` int(11) NOT NULL,
  `assigned_team_id` int(11) DEFAULT NULL,
  `assigned_user_id` int(11) DEFAULT NULL,
  `assigned_by_user_id` int(11) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `idx_ticket_assignments_ticket` (`ticket_id`,`created_at`),
  KEY `assigned_team_id` (`assigned_team_id`),
  KEY `assigned_user_id` (`assigned_user_id`),
  KEY `assigned_by_user_id` (`assigned_by_user_id`),
  CONSTRAINT `ticket_assignments_ibfk_1` FOREIGN KEY (`ticket_id`) REFERENCES `tickets` (`id`) ON DELETE CASCADE,
  CONSTRAINT `ticket_assignments_ibfk_2` FOREIGN KEY (`assigned_team_id`) REFERENCES `teams` (`id`) ON DELETE SET NULL,
  CONSTRAINT `ticket_assignments_ibfk_3` FOREIGN KEY (`assigned_user_id`) REFERENCES `users` (`id`) ON DELETE SET NULL,
  CONSTRAINT `ticket_assignments_ibfk_4` FOREIGN KEY (`assigned_by_user_id`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `ticket_attachments`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `ticket_attachments` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `ticket_id` int(11) NOT NULL,
  `message_id` int(11) DEFAULT NULL,
  `filename` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `original_name` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `file_size` int(11) NOT NULL,
  `mime_type` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `file_path` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `ticket_id` (`ticket_id`),
  KEY `message_id` (`message_id`),
  CONSTRAINT `ticket_attachments_ibfk_1` FOREIGN KEY (`ticket_id`) REFERENCES `tickets` (`id`) ON DELETE CASCADE,
  CONSTRAINT `ticket_attachments_ibfk_2` FOREIGN KEY (`message_id`) REFERENCES `ticket_messages` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `ticket_custom_field_values`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `ticket_custom_field_values` (
  `ticket_id` int(11) NOT NULL,
  `field_key` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `field_value` text COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  PRIMARY KEY (`ticket_id`,`field_key`),
  CONSTRAINT `fk_ticket_custom_values_ticket` FOREIGN KEY (`ticket_id`) REFERENCES `tickets` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `ticket_messages`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `ticket_messages` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `ticket_id` int(11) NOT NULL,
  `sender_user_id` int(11) DEFAULT NULL,
  `sender_name` varchar(150) COLLATE utf8mb4_unicode_ci NOT NULL,
  `sender_role` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'requestor',
  `message` text COLLATE utf8mb4_unicode_ci NOT NULL,
  `is_internal` tinyint(1) NOT NULL DEFAULT 0,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `sender_user_id` (`sender_user_id`),
  KEY `idx_ticket_msg` (`ticket_id`,`is_internal`),
  CONSTRAINT `ticket_messages_ibfk_1` FOREIGN KEY (`ticket_id`) REFERENCES `tickets` (`id`) ON DELETE CASCADE,
  CONSTRAINT `ticket_messages_ibfk_2` FOREIGN KEY (`sender_user_id`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `ticket_priority_history`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `ticket_priority_history` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `ticket_id` int(11) NOT NULL,
  `old_priority` varchar(50) DEFAULT NULL,
  `new_priority` varchar(50) NOT NULL,
  `changed_by_user_id` int(11) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `idx_ticket_priority_history_ticket` (`ticket_id`,`created_at`),
  KEY `changed_by_user_id` (`changed_by_user_id`),
  CONSTRAINT `ticket_priority_history_ibfk_1` FOREIGN KEY (`ticket_id`) REFERENCES `tickets` (`id`) ON DELETE CASCADE,
  CONSTRAINT `ticket_priority_history_ibfk_2` FOREIGN KEY (`changed_by_user_id`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `ticket_requestors`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `ticket_requestors` (
  `ticket_id` int(11) NOT NULL,
  `user_id` int(11) DEFAULT NULL,
  `full_name` varchar(150) COLLATE utf8mb4_unicode_ci NOT NULL,
  `email` varchar(150) COLLATE utf8mb4_unicode_ci NOT NULL,
  `department_id` int(11) DEFAULT NULL,
  `department_name_snapshot` varchar(150) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `location_office` varchar(150) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`ticket_id`),
  KEY `idx_ticket_requestors_user` (`user_id`),
  KEY `idx_ticket_requestors_email` (`email`),
  KEY `idx_ticket_requestors_department` (`department_id`),
  CONSTRAINT `fk_ticket_requestors_location` FOREIGN KEY (`department_id`) REFERENCES `locations` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_ticket_requestors_ticket` FOREIGN KEY (`ticket_id`) REFERENCES `tickets` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_ticket_requestors_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `ticket_sequences`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `ticket_sequences` (
  `sequence_year` int(11) NOT NULL,
  `last_number` int(11) NOT NULL DEFAULT 0,
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`sequence_year`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `ticket_status_history`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `ticket_status_history` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `ticket_id` int(11) NOT NULL,
  `old_status` varchar(50) DEFAULT NULL,
  `new_status` varchar(50) NOT NULL,
  `changed_by_user_id` int(11) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `idx_ticket_status_history_ticket` (`ticket_id`,`created_at`),
  KEY `changed_by_user_id` (`changed_by_user_id`),
  CONSTRAINT `ticket_status_history_ibfk_1` FOREIGN KEY (`ticket_id`) REFERENCES `tickets` (`id`) ON DELETE CASCADE,
  CONSTRAINT `ticket_status_history_ibfk_2` FOREIGN KEY (`changed_by_user_id`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `tickets`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `tickets` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `ticket_number` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `tracking_code` varchar(64) COLLATE utf8mb4_unicode_ci NOT NULL,
  `ticket_type` enum('service_request','incident') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'service_request',
  `title` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `description` text COLLATE utf8mb4_unicode_ci NOT NULL,
  `category_id` int(11) DEFAULT NULL,
  `subcategory_id` int(11) DEFAULT NULL,
  `priority` enum('low','medium','high','urgent','critical') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'medium',
  `status` enum('new','assigned','in_progress','pending_user','resolved','closed') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'new',
  `custom_fields` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`custom_fields`)),
  `requestor_user_id` int(11) DEFAULT NULL,
  `encoded_by_user_id` int(11) DEFAULT NULL,
  `requestor_name` varchar(150) COLLATE utf8mb4_unicode_ci NOT NULL,
  `requestor_email` varchar(150) COLLATE utf8mb4_unicode_ci NOT NULL,
  `requestor_id_number` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `requestor_department` varchar(150) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `location_office` varchar(150) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `assigned_team_id` int(11) DEFAULT NULL,
  `assigned_technician_id` int(11) DEFAULT NULL,
  `resolution_notes` text COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `resolution_date` datetime DEFAULT NULL,
  `sla_due_response` datetime DEFAULT NULL,
  `sla_due_resolution` datetime DEFAULT NULL,
  `sla_responded_at` datetime DEFAULT NULL,
  `sla_resolved_at` datetime DEFAULT NULL,
  `rating` int(11) DEFAULT NULL,
  `rating_feedback` text COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `closed_at` datetime DEFAULT NULL,
  `auto_close_at` datetime DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `guest_token_hash` char(64) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `ticket_number` (`ticket_number`),
  UNIQUE KEY `tracking_code` (`tracking_code`),
  UNIQUE KEY `guest_token_hash` (`guest_token_hash`),
  KEY `category_id` (`category_id`),
  KEY `subcategory_id` (`subcategory_id`),
  KEY `requestor_user_id` (`requestor_user_id`),
  KEY `idx_tickets_encoded_by` (`encoded_by_user_id`),
  KEY `assigned_team_id` (`assigned_team_id`),
  KEY `idx_ticket_number` (`ticket_number`),
  KEY `idx_status` (`status`),
  KEY `idx_priority` (`priority`),
  KEY `idx_assigned_tech` (`assigned_technician_id`),
  KEY `idx_requestor_email` (`requestor_email`),
  CONSTRAINT `tickets_ibfk_1` FOREIGN KEY (`category_id`) REFERENCES `categories` (`id`) ON DELETE SET NULL,
  CONSTRAINT `tickets_ibfk_2` FOREIGN KEY (`subcategory_id`) REFERENCES `subcategories` (`id`) ON DELETE SET NULL,
  CONSTRAINT `tickets_ibfk_3` FOREIGN KEY (`requestor_user_id`) REFERENCES `users` (`id`) ON DELETE SET NULL,
  CONSTRAINT `tickets_ibfk_4` FOREIGN KEY (`assigned_team_id`) REFERENCES `teams` (`id`) ON DELETE SET NULL,
  CONSTRAINT `tickets_ibfk_5` FOREIGN KEY (`assigned_technician_id`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `users`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `users` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `google_id` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `email` varchar(150) COLLATE utf8mb4_unicode_ci NOT NULL,
  `password_hash` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `full_name` varchar(150) COLLATE utf8mb4_unicode_ci NOT NULL,
  `last_name` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `first_name` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `middle_name` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `id_number` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `role` enum('admin','team_leader','technician','encoder','requestor') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'requestor',
  `team_id` int(11) DEFAULT NULL,
  `avatar_url` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `is_active` tinyint(1) NOT NULL DEFAULT 1,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `email` (`email`),
  UNIQUE KEY `google_id` (`google_id`),
  KEY `team_id` (`team_id`),
  CONSTRAINT `users_ibfk_2` FOREIGN KEY (`team_id`) REFERENCES `teams` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `asset_maintenance_template_activities`;
DROP TABLE IF EXISTS `asset_maintenance_templates`;
DROP TABLE IF EXISTS `asset_maintenance_activities`;
DROP TABLE IF EXISTS `asset_maintenance_logs`;
DROP TABLE IF EXISTS `assets`;
DROP TABLE IF EXISTS `asset_categories`;
CREATE TABLE `asset_categories` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `name` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `is_active` tinyint(1) NOT NULL DEFAULT 1,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_asset_categories_name` (`name`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
INSERT INTO `asset_categories` (`name`) VALUES ('Other'), ('Computer');
CREATE TABLE `asset_maintenance_templates` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `name` varchar(150) COLLATE utf8mb4_unicode_ci NOT NULL,
  `category_id` int(11) DEFAULT NULL,
  `description` varchar(500) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `is_active` tinyint(1) NOT NULL DEFAULT 1,
  `created_by_user_id` int(11) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_asset_maintenance_template_name` (`name`),
  KEY `idx_asset_maintenance_template_category` (`category_id`),
  CONSTRAINT `fk_asset_maintenance_template_category` FOREIGN KEY (`category_id`) REFERENCES `asset_categories` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_asset_maintenance_template_created_by` FOREIGN KEY (`created_by_user_id`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
CREATE TABLE `asset_maintenance_template_activities` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `template_id` int(11) NOT NULL,
  `activity_text` varchar(500) COLLATE utf8mb4_unicode_ci NOT NULL,
  `display_order` int(11) NOT NULL DEFAULT 0,
  PRIMARY KEY (`id`),
  KEY `idx_asset_maintenance_template_activity` (`template_id`,`display_order`),
  CONSTRAINT `fk_asset_maintenance_template_activity_template` FOREIGN KEY (`template_id`) REFERENCES `asset_maintenance_templates` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
INSERT INTO `asset_maintenance_templates` (`name`, `category_id`, `description`) VALUES
  ('Standard computer preventive maintenance', (SELECT `id` FROM `asset_categories` WHERE `name` = 'Computer' LIMIT 1), 'Default annual checklist for workstations and computers.'),
  ('Standard NAS preventive maintenance', NULL, NULL),
  ('Standard Server preventive maintenance', (SELECT `id` FROM `asset_categories` WHERE `name` = 'Other' LIMIT 1), NULL);
INSERT INTO `asset_maintenance_template_activities` (`template_id`, `activity_text`, `display_order`)
SELECT `id`, 'Check computer and remove dust and other particles', 0 FROM `asset_maintenance_templates` WHERE `name` = 'Standard computer preventive maintenance'
UNION ALL SELECT `id`, 'Check display monitor and accessories for defects, replace if defective', 1 FROM `asset_maintenance_templates` WHERE `name` = 'Standard computer preventive maintenance'
UNION ALL SELECT `id`, 'Check internal hardware components for defects, replace if defective', 2 FROM `asset_maintenance_templates` WHERE `name` = 'Standard computer preventive maintenance'
UNION ALL SELECT `id`, 'Check external hardware components for defects, replace if defective', 3 FROM `asset_maintenance_templates` WHERE `name` = 'Standard computer preventive maintenance'
UNION ALL SELECT `id`, 'Check power supply, fans, and cables for defects, replace if defective', 4 FROM `asset_maintenance_templates` WHERE `name` = 'Standard computer preventive maintenance'
UNION ALL SELECT `id`, 'Check POST and event logs for errors', 5 FROM `asset_maintenance_templates` WHERE `name` = 'Standard computer preventive maintenance'
UNION ALL SELECT `id`, 'Clear old POST and event logs for baselining', 6 FROM `asset_maintenance_templates` WHERE `name` = 'Standard computer preventive maintenance'
UNION ALL SELECT `id`, 'Check available disk space', 7 FROM `asset_maintenance_templates` WHERE `name` = 'Standard computer preventive maintenance'
UNION ALL SELECT `id`, 'Perform disk integrity check', 8 FROM `asset_maintenance_templates` WHERE `name` = 'Standard computer preventive maintenance'
UNION ALL SELECT `id`, 'Perform disk cleanup (System, old and unused applications)', 9 FROM `asset_maintenance_templates` WHERE `name` = 'Standard computer preventive maintenance'
UNION ALL SELECT `id`, 'Perform system scanning', 10 FROM `asset_maintenance_templates` WHERE `name` = 'Standard computer preventive maintenance'
UNION ALL SELECT `id`, 'Perform malware scanning', 11 FROM `asset_maintenance_templates` WHERE `name` = 'Standard computer preventive maintenance'
UNION ALL SELECT `id`, 'Update operating system and applications', 12 FROM `asset_maintenance_templates` WHERE `name` = 'Standard computer preventive maintenance'
UNION ALL SELECT `id`, 'Check hardware Acquisition details (5-year replacement policy)', 13 FROM `asset_maintenance_templates` WHERE `name` = 'Standard computer preventive maintenance'
UNION ALL SELECT `id`, 'Check equipment and remove dust and other particle', 0 FROM `asset_maintenance_templates` WHERE `name` = 'Standard NAS preventive maintenance'
UNION ALL SELECT `id`, 'Check external hardware components for defects, replace if defective', 1 FROM `asset_maintenance_templates` WHERE `name` = 'Standard NAS preventive maintenance'
UNION ALL SELECT `id`, 'Check power supply cable, fans, and network cable for defects, replace if defective', 2 FROM `asset_maintenance_templates` WHERE `name` = 'Standard NAS preventive maintenance'
UNION ALL SELECT `id`, 'Check the available storage space, perform storage cleanup if necessary', 3 FROM `asset_maintenance_templates` WHERE `name` = 'Standard NAS preventive maintenance'
UNION ALL SELECT `id`, 'Check hardware acquisition details (5-year replacement policy)', 4 FROM `asset_maintenance_templates` WHERE `name` = 'Standard NAS preventive maintenance'
UNION ALL SELECT `id`, 'Check server and remove dust and other particle', 0 FROM `asset_maintenance_templates` WHERE `name` = 'Standard Server preventive maintenance'
UNION ALL SELECT `id`, 'Check internal hardware components for defects, replace if defective', 1 FROM `asset_maintenance_templates` WHERE `name` = 'Standard Server preventive maintenance'
UNION ALL SELECT `id`, 'Check external hardware components for defects, replace if defective', 2 FROM `asset_maintenance_templates` WHERE `name` = 'Standard Server preventive maintenance'
UNION ALL SELECT `id`, 'check power supply, fans, and cable for defects. replace if necessary', 3 FROM `asset_maintenance_templates` WHERE `name` = 'Standard Server preventive maintenance'
UNION ALL SELECT `id`, 'Check POST and event logs for errors', 4 FROM `asset_maintenance_templates` WHERE `name` = 'Standard Server preventive maintenance'
UNION ALL SELECT `id`, 'Clear old POST and event logs for baselining', 5 FROM `asset_maintenance_templates` WHERE `name` = 'Standard Server preventive maintenance'
UNION ALL SELECT `id`, 'Check the available disk space and perform disk integrity check and clean-up', 6 FROM `asset_maintenance_templates` WHERE `name` = 'Standard Server preventive maintenance'
UNION ALL SELECT `id`, 'Perform disk clean up (old and unused applications, files, and logs)', 7 FROM `asset_maintenance_templates` WHERE `name` = 'Standard Server preventive maintenance'
UNION ALL SELECT `id`, 'Perform system and security check for potential vulnerability (system scanning, malware, and others)', 8 FROM `asset_maintenance_templates` WHERE `name` = 'Standard Server preventive maintenance'
UNION ALL SELECT `id`, 'Perform System, application, and security updates', 9 FROM `asset_maintenance_templates` WHERE `name` = 'Standard Server preventive maintenance'
UNION ALL SELECT `id`, 'Check service status for errors', 10 FROM `asset_maintenance_templates` WHERE `name` = 'Standard Server preventive maintenance'
UNION ALL SELECT `id`, 'Check server configurations (http,dns, dhcp, nat forwarding, access rules, cache, etc.)', 11 FROM `asset_maintenance_templates` WHERE `name` = 'Standard Server preventive maintenance'
UNION ALL SELECT `id`, 'Check hardware acquisition details (5-year replacement policy)', 12 FROM `asset_maintenance_templates` WHERE `name` = 'Standard Server preventive maintenance';
CREATE TABLE `assets` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `asset_tag` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `name` varchar(180) COLLATE utf8mb4_unicode_ci NOT NULL,
  `category` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'Other',
  `brand` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `model` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `serial_number` varchar(150) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `status` enum('available','assigned','in_maintenance','retired','lost') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'available',
  `department_id` int(11) DEFAULT NULL,
  `category_id` int(11) DEFAULT NULL,
  `location_id` int(11) DEFAULT NULL,
  `maintenance_template_id` int(11) DEFAULT NULL,
  `purchase_date` date DEFAULT NULL,
  `warranty_end` date DEFAULT NULL,
  `notes` text COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `is_active` tinyint(1) NOT NULL DEFAULT 1,
  `created_by_user_id` int(11) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_assets_asset_tag` (`asset_tag`),
  UNIQUE KEY `uq_assets_serial_number` (`serial_number`),
  KEY `idx_assets_status_active` (`status`,`is_active`),
  KEY `idx_assets_department` (`department_id`),
  CONSTRAINT `fk_assets_department` FOREIGN KEY (`department_id`) REFERENCES `locations` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_assets_category` FOREIGN KEY (`category_id`) REFERENCES `asset_categories` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_assets_location` FOREIGN KEY (`location_id`) REFERENCES `locations` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_assets_maintenance_template` FOREIGN KEY (`maintenance_template_id`) REFERENCES `asset_maintenance_templates` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_assets_created_by` FOREIGN KEY (`created_by_user_id`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
CREATE TABLE `asset_maintenance_logs` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `asset_id` int(11) NOT NULL,
  `maintenance_type` enum('inspection','preventive','repair','upgrade','other') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'inspection',
  `academic_year` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `maintenance_frequency` enum('monthly','quarterly','semi_annual','annual','as_needed') COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `maintenance_template_id` int(11) DEFAULT NULL,
  `description` text COLLATE utf8mb4_unicode_ci NOT NULL,
  `performed_at` date NOT NULL,
  `performed_by_user_id` int(11) DEFAULT NULL,
  `cost` decimal(12,2) DEFAULT NULL,
  `next_due_date` date DEFAULT NULL,
  `created_by_user_id` int(11) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `idx_asset_maintenance_asset_date` (`asset_id`,`performed_at`),
  CONSTRAINT `fk_asset_maintenance_asset` FOREIGN KEY (`asset_id`) REFERENCES `assets` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_asset_maintenance_template` FOREIGN KEY (`maintenance_template_id`) REFERENCES `asset_maintenance_templates` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_asset_maintenance_performed_by` FOREIGN KEY (`performed_by_user_id`) REFERENCES `users` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_asset_maintenance_created_by` FOREIGN KEY (`created_by_user_id`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
CREATE TABLE `asset_maintenance_activities` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `maintenance_log_id` bigint(20) unsigned NOT NULL,
  `activity_text` varchar(500) COLLATE utf8mb4_unicode_ci NOT NULL,
  `is_completed` tinyint(1) NOT NULL DEFAULT 0,
  `remarks` varchar(500) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `display_order` int(11) NOT NULL DEFAULT 0,
  PRIMARY KEY (`id`),
  KEY `idx_asset_maintenance_activities_log` (`maintenance_log_id`,`display_order`),
  CONSTRAINT `fk_asset_maintenance_activity_log` FOREIGN KEY (`maintenance_log_id`) REFERENCES `asset_maintenance_logs` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Default configuration data. No user accounts or demo tickets are seeded.
INSERT INTO `locations` (`name`, `code`, `type`) VALUES
  ('Management Information Systems (MIS)', 'MIS', 'office'),
  ('College of Computer Studies', 'CCS', 'college'),
  ('College of Engineering', 'COE', 'college'),
  ('College of Business Administration', 'CBA', 'college'),
  ('College of Education', 'CED', 'college'),
  ('College of Arts and Sciences', 'CAS', 'college'),
  ('College of Health Sciences', 'CHS', 'college'),
  ('Integrated Basic Education Department', 'IBED', 'college'),
  ('Office of the University President', 'OP', 'office'),
  ('Office of the Registrar', 'REG', 'office'),
  ('Finance & Accounting Office', 'FAO', 'office'),
  ('Human Resource Development Office', 'HRDO', 'office'),
  ('University Library', 'LIB', 'unit'),
  ('Physical Plant & General Services', 'PPGS', 'office');

-- Locations replace the former Departments administration module. New rooms,
-- buildings, and offices are added through the Locations page or a submitted
-- service request.

INSERT INTO `teams` (`name`, `description`) VALUES
  ('Network & Infrastructure Team', 'Campus Wi-Fi, LAN, fiber backbone, routers, and switches'),
  ('Systems & Web Applications Team', 'EIS, Schoology LMS, SATP, SMS, and database operations'),
  ('Hardware & Desktop Support Team', 'Workstations, laptops, printers, scanners, and OS maintenance'),
  ('User Accounts & Access Support', 'Google Workspace, password resets, role permissions, and onboarding');

-- Service catalog copied from the original NDMU MIS IT Ticketing SQL export.
-- IDs are deliberate: the catalog is inserted into this fresh setup database before tickets exist.
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

INSERT INTO `subcategories` (`id`, `category_id`, `name`, `description`, `default_type`, `default_priority`, `form_schema`) VALUES
  (1, 1, 'Institutional Email Account', 'Provision new @ndmu.edu.ph Google Workspace account', 'service_request', 'medium', '[{\"id\":\"employee_id\",\"label\":\"Employee / Student ID Number\",\"type\":\"text\",\"required\":true,\"placeholder\":\"e.g. EMP-2026-0012 or STU-2024-0089\"},{\"id\":\"full_name\",\"label\":\"Full Legal Name\",\"type\":\"text\",\"required\":true,\"placeholder\":\"First Name, Middle Name, Last Name\"},{\"id\":\"department\",\"label\":\"College / Department / Office\",\"type\":\"text\",\"required\":true},{\"id\":\"backup_email\",\"label\":\"Personal Recovery Email\",\"type\":\"email\",\"required\":true,\"placeholder\":\"name@gmail.com\"}]'),
  (2, 1, 'Schoology Account Setup', 'Schoology LMS instructor profile and course enrollment', 'service_request', 'medium', '[{\"id\":\"employee_id\",\"label\":\"Employee / Faculty ID\",\"type\":\"text\",\"required\":true},{\"id\":\"full_name\",\"label\":\"Faculty Name\",\"type\":\"text\",\"required\":true},{\"id\":\"college_dept\",\"label\":\"College / Academic Department\",\"type\":\"text\",\"required\":true},{\"id\":\"subjects_handled\",\"label\":\"Subjects / Course Codes Handled\",\"type\":\"textarea\",\"required\":true,\"placeholder\":\"e.g. CS101, IT202, Web Development 1\"},{\"id\":\"institutional_email\",\"label\":\"Institutional Email (@ndmu.edu.ph)\",\"type\":\"email\",\"required\":true}]'),
  (3, 1, 'EIS Faculty/Student Portal Access', 'Access to EIS Grading, Student, or Department modules', 'service_request', 'medium', '[{\"id\":\"id_number\",\"label\":\"ID Number\",\"type\":\"text\",\"required\":true},{\"id\":\"role_type\",\"label\":\"Portal Type\",\"type\":\"select\",\"options\":[\"Faculty Grading Portal\",\"Student Portal\",\"Registrar / Admin Module\",\"Dean / Dept Head Review\"],\"required\":true},{\"id\":\"department\",\"label\":\"College / Office\",\"type\":\"text\",\"required\":true},{\"id\":\"justification\",\"label\":\"Access Justification / Remarks\",\"type\":\"textarea\",\"required\":false}]'),
  (4, 1, 'Password Reset Request', 'Reset password for Google Email, Schoology, or EIS', 'service_request', 'high', '[{\"id\":\"account_type\",\"label\":\"System / Account\",\"type\":\"select\",\"options\":[\"Google Institutional Email\",\"Schoology LMS\",\"EIS Portal\",\"Windows Workstation\"],\"required\":true},{\"id\":\"username_email\",\"label\":\"Username or Email Address\",\"type\":\"text\",\"required\":true},{\"id\":\"verification_id\",\"label\":\"University ID Number\",\"type\":\"text\",\"required\":true}]'),
  (5, 2, 'Campus Wi-Fi Connectivity Issue', 'Troubleshoot NDMU-Student or NDMU-Faculty Wi-Fi issues', 'incident', 'high', '[{\"id\":\"building\",\"label\":\"Building Name\",\"type\":\"select\",\"options\":[\"Main Building\",\"CCS Building\",\"Engineering Building\",\"Gymnasium\",\"Student Center\",\"Library\",\"IBED Complex\",\"Administration Building\"],\"required\":true},{\"id\":\"room_office\",\"label\":\"Room / Floor / Area\",\"type\":\"text\",\"required\":true,\"placeholder\":\"e.g. 2nd Floor Hallway / Room 204\"},{\"id\":\"device_type\",\"label\":\"Device Encountering Issue\",\"type\":\"select\",\"options\":[\"Laptop (Windows/Mac)\",\"Mobile Phone (Android/iOS)\",\"Tablet\",\"Other\"],\"required\":true},{\"id\":\"ssid_network\",\"label\":\"Wi-Fi Network Name (SSID)\",\"type\":\"select\",\"options\":[\"NDMU-Faculty\",\"NDMU-Student\",\"NDMU-Guest\",\"Other\"],\"required\":true},{\"id\":\"error_symptom\",\"label\":\"Symptom\",\"type\":\"select\",\"options\":[\"Cannot connect / Invalid password\",\"Connected but No Internet\",\"Weak Signal / Dropping\",\"Slow speed\"],\"required\":true}]'),
  (6, 2, 'LAN Cable / Office Wallport Issue', 'Damaged network cable or dead Ethernet wall jack', 'incident', 'medium', '[{\"id\":\"building\",\"label\":\"Building\",\"type\":\"text\",\"required\":true},{\"id\":\"room_office\",\"label\":\"Room / Office\",\"type\":\"text\",\"required\":true},{\"id\":\"port_number\",\"label\":\"Wallport Number (if labeled)\",\"type\":\"text\",\"required\":false},{\"id\":\"description\",\"label\":\"Problem Details\",\"type\":\"textarea\",\"required\":true}]'),
  (7, 3, 'Desktop PC Malfunction', 'Hardware diagnosis for laboratory or office PC', 'incident', 'medium', '[{\"id\":\"asset_tag\",\"label\":\"Equipment Asset Tag / Serial No.\",\"type\":\"text\",\"required\":false,\"placeholder\":\"e.g. NDMU-PC-2024-045\"},{\"id\":\"location\",\"label\":\"Building & Room\",\"type\":\"text\",\"required\":true},{\"id\":\"symptoms\",\"label\":\"Hardware Symptom\",\"type\":\"select\",\"options\":[\"No power / Will not turn on\",\"Beeping / Blue screen\",\"Overheating / Loud fan\",\"Monitor display blank\",\"Keyboard / Mouse unresponsive\"],\"required\":true},{\"id\":\"description\",\"label\":\"Additional Observations\",\"type\":\"textarea\",\"required\":true}]'),
  (8, 4, 'Software Installation Request', 'Install educational or productivity software', 'service_request', 'low', '[{\"id\":\"software_name\",\"label\":\"Software / Program Requested\",\"type\":\"text\",\"required\":true,\"placeholder\":\"e.g. SPSS, AutoCAD, Visual Studio Code, Zoom\"},{\"id\":\"location_pc\",\"label\":\"Laboratory / Office Computer Location\",\"type\":\"text\",\"required\":true},{\"id\":\"academic_purpose\",\"label\":\"Academic or Office Purpose\",\"type\":\"textarea\",\"required\":true}]'),
  (9, 5, 'Classroom Projector / Smart TV Setup', 'AV equipment preparation for class lectures or academic events', 'service_request', 'medium', '[{\"id\":\"venue\",\"label\":\"Classroom / Venue\",\"type\":\"text\",\"required\":true,\"placeholder\":\"e.g. CCS Lab 3, Engineering Amphitheater\"},{\"id\":\"date_time\",\"label\":\"Date & Time Needed\",\"type\":\"text\",\"required\":true,\"placeholder\":\"e.g. Monday Sept 8, 8:00 AM - 11:00 AM\"},{\"id\":\"equipment_list\",\"label\":\"Equipment Needed\",\"type\":\"select\",\"options\":[\"LCD Projector & Screen\",\"HDMI / VGA Cable Adapter\",\"Wireless Microphones & Speaker\",\"Full Event Audio-Visual Setup\"],\"required\":true}]');

INSERT INTO `knowledge_base` (`title`, `slug`, `category`, `summary`, `content`, `is_published`) VALUES
  ('How to Connect to NDMU Campus Wi-Fi (Students & Faculty)', 'how-to-connect-ndmu-wifi', 'Network', 'Instructions for connecting laptops, Android, and iOS devices to NDMU Wi-Fi.', 'Select NDMU-Student or NDMU-Faculty, then sign in with your institutional email and password. Submit a Network ticket if you need assistance.', 1),
  ('Step-by-Step Guide: Resetting Your Institutional Google Password', 'reset-institutional-google-password', 'Accounts & Access', 'How to recover an @ndmu.edu.ph Google Workspace password.', 'Use Google account recovery first. If recovery is unavailable, submit a Password Reset Request through the service desk.', 1),
  ('Accessing Schoology LMS for Academic Year 2026-2027', 'accessing-schoology-lms-guide', 'Software & Systems', 'Log in to Schoology with NDMU Google Single Sign-On.', 'Open Schoology, choose Google sign-in, and select your NDMU institutional account. Submit a Schoology Account Setup ticket if courses are missing.', 1);

/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;
