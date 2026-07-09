ALTER TABLE `users` DROP INDEX `email`;
ALTER TABLE `users` DROP COLUMN `email`;
ALTER TABLE `users` DROP COLUMN `password_hash`;

CREATE TABLE `refresh_tokens` (
  `id` CHAR(36) NOT NULL,
  `user_id` INT NOT NULL,
  `token_hash` CHAR(64) NOT NULL,
  `expires_at` TIMESTAMP NOT NULL,
  `revoked_at` TIMESTAMP NULL DEFAULT NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_refresh_tokens_token_hash` (`token_hash`),
  KEY `idx_refresh_tokens_user_id_revoked` (`user_id`, `revoked_at`),
  CONSTRAINT `fk_refresh_tokens_user` FOREIGN KEY (`user_id`)
    REFERENCES `users` (`user_id`) ON DELETE CASCADE
) ENGINE=InnoDB;
