CREATE TABLE `bundles` (
  `bundle_id` INT NOT NULL AUTO_INCREMENT,
  `bundle_name` VARCHAR(150) NOT NULL,
  `description` TEXT NULL DEFAULT NULL,
  `price` DECIMAL(10,2) NULL DEFAULT NULL,
  `pricing_type` ENUM('Fixed', 'Manual') NOT NULL DEFAULT 'Fixed',
  `is_active` TINYINT(1) NOT NULL DEFAULT 1,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`bundle_id`),
  UNIQUE KEY `uq_bundles_bundle_name` (`bundle_name`)
) ENGINE=InnoDB;

CREATE TABLE `features` (
  `feature_id` INT NOT NULL AUTO_INCREMENT,
  `feature_name` VARCHAR(150) NOT NULL,
  `category` VARCHAR(100) NOT NULL,
  `description` TEXT NULL DEFAULT NULL,
  `price` DECIMAL(10,2) NOT NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`feature_id`),
  UNIQUE KEY `uq_features_feature_name` (`feature_name`),
  KEY `idx_features_category` (`category`)
) ENGINE=InnoDB;

CREATE TABLE `bundle_features` (
  `bundle_feature_id` INT NOT NULL AUTO_INCREMENT,
  `bundle_id` INT NOT NULL,
  `feature_id` INT NOT NULL,
  PRIMARY KEY (`bundle_feature_id`),
  UNIQUE KEY `uq_bundle_features_bundle_feature` (`bundle_id`, `feature_id`),
  KEY `idx_bundle_features_feature_id` (`feature_id`),
  CONSTRAINT `fk_bundle_features_bundle` FOREIGN KEY (`bundle_id`)
    REFERENCES `bundles` (`bundle_id`) ON DELETE CASCADE,
  CONSTRAINT `fk_bundle_features_feature` FOREIGN KEY (`feature_id`)
    REFERENCES `features` (`feature_id`) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE `quotations` (
  `quotation_id` INT NOT NULL AUTO_INCREMENT,
  `client_id` INT NOT NULL,
  `bundle_id` INT NULL DEFAULT NULL,
  `quotation_type` ENUM('Fixed', 'Manual') NOT NULL,
  `subtotal` DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  `discount` DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  `tax` DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  `grand_total` DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  `status` ENUM('Pending', 'Approved', 'Rejected', 'Expired') NOT NULL DEFAULT 'Pending',
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`quotation_id`),
  KEY `idx_quotations_client_id` (`client_id`),
  KEY `idx_quotations_bundle_id` (`bundle_id`),
  KEY `idx_quotations_status` (`status`),
  CONSTRAINT `fk_quotations_client` FOREIGN KEY (`client_id`)
    REFERENCES `users` (`user_id`) ON DELETE CASCADE,
  CONSTRAINT `fk_quotations_bundle` FOREIGN KEY (`bundle_id`)
    REFERENCES `bundles` (`bundle_id`) ON DELETE SET NULL
) ENGINE=InnoDB;

CREATE TABLE `quotation_items` (
  `quotation_item_id` INT NOT NULL AUTO_INCREMENT,
  `quotation_id` INT NOT NULL,
  `feature_id` INT NULL DEFAULT NULL,
  `item_name` VARCHAR(150) NOT NULL,
  `quantity` INT NOT NULL DEFAULT 1,
  `unit_price` DECIMAL(10,2) NOT NULL,
  `subtotal` DECIMAL(10,2) NOT NULL,
  PRIMARY KEY (`quotation_item_id`),
  KEY `idx_quotation_items_quotation_id` (`quotation_id`),
  KEY `idx_quotation_items_feature_id` (`feature_id`),
  CONSTRAINT `fk_quotation_items_quotation` FOREIGN KEY (`quotation_id`)
    REFERENCES `quotations` (`quotation_id`) ON DELETE CASCADE,
  CONSTRAINT `fk_quotation_items_feature` FOREIGN KEY (`feature_id`)
    REFERENCES `features` (`feature_id`) ON DELETE SET NULL
) ENGINE=InnoDB;
