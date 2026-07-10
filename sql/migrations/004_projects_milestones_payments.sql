ALTER TABLE `quotations` ADD COLUMN `approved_at` TIMESTAMP NULL DEFAULT NULL AFTER `created_at`;

CREATE TABLE `projects` (
  `project_id` INT NOT NULL AUTO_INCREMENT,
  `quotation_id` INT NOT NULL,
  `project_name` VARCHAR(150) NOT NULL,
  `overall_progress` DECIMAL(5,2) NOT NULL DEFAULT 0.00,
  `status` ENUM('Not Started', 'In Progress', 'On Hold', 'Completed', 'Cancelled') NOT NULL DEFAULT 'Not Started',
  `start_date` DATE NOT NULL,
  `expected_end_date` DATE NULL DEFAULT NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`project_id`),
  UNIQUE KEY `uq_projects_quotation_id` (`quotation_id`),
  KEY `idx_projects_status` (`status`),
  CONSTRAINT `fk_projects_quotation` FOREIGN KEY (`quotation_id`)
    REFERENCES `quotations` (`quotation_id`) ON DELETE RESTRICT,
  CONSTRAINT `chk_projects_overall_progress` CHECK (`overall_progress` BETWEEN 0 AND 100)
) ENGINE=InnoDB;

CREATE TABLE `project_updates` (
  `update_id` INT NOT NULL AUTO_INCREMENT,
  `project_id` INT NOT NULL,
  `title` VARCHAR(150) NOT NULL,
  `description` TEXT NULL DEFAULT NULL,
  `progress` DECIMAL(5,2) NOT NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`update_id`),
  KEY `idx_project_updates_project_id` (`project_id`),
  CONSTRAINT `fk_project_updates_project` FOREIGN KEY (`project_id`)
    REFERENCES `projects` (`project_id`) ON DELETE CASCADE,
  CONSTRAINT `chk_project_updates_progress` CHECK (`progress` BETWEEN 0 AND 100)
) ENGINE=InnoDB;

CREATE TABLE `project_milestones` (
  `milestone_id` INT NOT NULL AUTO_INCREMENT,
  `project_id` INT NOT NULL,
  `title` VARCHAR(150) NOT NULL,
  `required_progress_percentage` DECIMAL(5,2) NOT NULL DEFAULT 0.00,
  `amount` DECIMAL(10,2) NOT NULL,
  `status` ENUM('Pending', 'Paid') NOT NULL DEFAULT 'Pending',
  `due_date` DATE NULL DEFAULT NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`milestone_id`),
  KEY `idx_project_milestones_project_id` (`project_id`),
  KEY `idx_project_milestones_status` (`status`),
  CONSTRAINT `fk_project_milestones_project` FOREIGN KEY (`project_id`)
    REFERENCES `projects` (`project_id`) ON DELETE RESTRICT,
  CONSTRAINT `chk_project_milestones_progress` CHECK (`required_progress_percentage` BETWEEN 0 AND 100)
) ENGINE=InnoDB;

CREATE TABLE `payment_methods` (
  `method_id` INT NOT NULL AUTO_INCREMENT,
  `method_name` VARCHAR(150) NOT NULL,
  `method_type` ENUM('manual', 'paymongo', 'stripe') NOT NULL DEFAULT 'manual',
  `account_name` VARCHAR(150) NULL DEFAULT NULL,
  `account_number` VARCHAR(100) NULL DEFAULT NULL,
  `qr_code_url` VARCHAR(512) NULL DEFAULT NULL,
  `is_active` TINYINT(1) NOT NULL DEFAULT 1,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`method_id`),
  UNIQUE KEY `uq_payment_methods_method_name` (`method_name`)
) ENGINE=InnoDB;

CREATE TABLE `payments` (
  `payment_id` INT NOT NULL AUTO_INCREMENT,
  `milestone_id` INT NOT NULL,
  `method_id` INT NOT NULL,
  `amount_paid` DECIMAL(10,2) NOT NULL,
  `reference_number` VARCHAR(150) NOT NULL,
  `payment_date` DATE NOT NULL,
  `proof_image_url` VARCHAR(512) NULL DEFAULT NULL,
  `payment_status` ENUM('Pending', 'Verified', 'Rejected') NOT NULL DEFAULT 'Pending',
  `gateway_reference` VARCHAR(255) NULL DEFAULT NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`payment_id`),
  KEY `idx_payments_milestone_id` (`milestone_id`),
  KEY `idx_payments_milestone_status` (`milestone_id`, `payment_status`),
  KEY `idx_payments_method_id` (`method_id`),
  KEY `idx_payments_status` (`payment_status`),
  CONSTRAINT `fk_payments_milestone` FOREIGN KEY (`milestone_id`)
    REFERENCES `project_milestones` (`milestone_id`) ON DELETE RESTRICT,
  CONSTRAINT `fk_payments_method` FOREIGN KEY (`method_id`)
    REFERENCES `payment_methods` (`method_id`) ON DELETE RESTRICT
) ENGINE=InnoDB;
