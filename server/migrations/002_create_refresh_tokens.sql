-- MySQL 8. The token_hash column stores only a 32-byte SHA-256 digest.
-- Rotate in one transaction: mark the old row rotated, then insert its successor.
SET time_zone = '+00:00';

CREATE TABLE refresh_tokens (
  id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  user_id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  token_hash BINARY(32) NOT NULL,
  rotated_from_token_id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NULL,
  device_id VARCHAR(128) NULL,
  platform VARCHAR(16) CHARACTER SET ascii COLLATE ascii_bin NULL,
  expires_at DATETIME(3) NOT NULL,
  rotated_at DATETIME(3) NULL,
  revoked_at DATETIME(3) NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id),
  UNIQUE KEY uq_refresh_tokens_token_hash (token_hash),
  UNIQUE KEY uq_refresh_tokens_rotated_from (rotated_from_token_id),
  KEY idx_refresh_tokens_user_state (user_id, revoked_at, expires_at),
  KEY idx_refresh_tokens_expires_at (expires_at),
  CONSTRAINT fk_refresh_tokens_user FOREIGN KEY (user_id)
    REFERENCES users (id) ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT fk_refresh_tokens_previous FOREIGN KEY (rotated_from_token_id)
    REFERENCES refresh_tokens (id) ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT chk_refresh_tokens_expiry CHECK (expires_at > created_at)
) ENGINE = InnoDB
  DEFAULT CHARACTER SET = utf8mb4
  COLLATE = utf8mb4_0900_ai_ci;
