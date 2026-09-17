-- MySQL 8. Run before 002_create_refresh_tokens.sql.
-- The application supplies UUID strings; this migration does not generate IDs.
SET time_zone = '+00:00';

CREATE TABLE users (
  id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  username VARCHAR(64) NOT NULL,
  username_normalized VARCHAR(64) COLLATE utf8mb4_bin NOT NULL,
  password_hash VARCHAR(255) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  avatar_url VARCHAR(2048) NULL,
  timezone VARCHAR(64) NOT NULL DEFAULT 'Asia/Shanghai',
  status VARCHAR(16) CHARACTER SET ascii COLLATE ascii_bin NOT NULL DEFAULT 'active',
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  deleted_at DATETIME(3) NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uq_users_username_normalized (username_normalized),
  KEY idx_users_status (status),
  CONSTRAINT chk_users_username_bytes CHECK (OCTET_LENGTH(username) BETWEEN 1 AND 15)
) ENGINE = InnoDB
  DEFAULT CHARACTER SET = utf8mb4
  COLLATE = utf8mb4_0900_ai_ci;
