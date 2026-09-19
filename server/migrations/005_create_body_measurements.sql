-- MySQL 8. Run after 004. Times are stored as UTC DATETIME(3).
SET time_zone = '+00:00';

CREATE TABLE body_measurements (
  id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  user_id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  measured_at DATETIME(3) NOT NULL,
  weight DECIMAL(6,2) NULL COMMENT 'kg',
  waist DECIMAL(6,2) NULL COMMENT 'cm',
  chest DECIMAL(6,2) NULL COMMENT 'cm',
  hip DECIMAL(6,2) NULL COMMENT 'cm',
  shoulder_width DECIMAL(6,2) NULL COMMENT 'cm',
  thigh DECIMAL(6,2) NULL COMMENT 'cm',
  upper_arm DECIMAL(6,2) NULL COMMENT 'cm',
  calf DECIMAL(6,2) NULL COMMENT 'cm',
  version INT UNSIGNED NOT NULL DEFAULT 1,
  idempotency_key VARCHAR(128) CHARACTER SET ascii COLLATE ascii_bin NULL,
  request_hash CHAR(64) CHARACTER SET ascii COLLATE ascii_bin NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  deleted_at DATETIME(3) NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uq_body_measurements_user_idempotency (user_id, idempotency_key),
  KEY idx_body_measurements_user_time (user_id, measured_at DESC, id DESC),
  KEY idx_body_measurements_user_active_time (user_id, deleted_at, measured_at DESC, id DESC),
  CONSTRAINT fk_body_measurements_user FOREIGN KEY (user_id)
    REFERENCES users (id) ON DELETE CASCADE,
  CONSTRAINT chk_body_measurements_version CHECK (version >= 1)
) ENGINE = InnoDB
  DEFAULT CHARACTER SET = utf8mb4
  COLLATE = utf8mb4_0900_ai_ci;
