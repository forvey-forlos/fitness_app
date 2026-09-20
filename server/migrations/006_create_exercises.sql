-- MySQL 8. Run after 005, then apply seeds/001_system_exercises.sql.
SET time_zone = '+00:00';

CREATE TABLE exercises (
  id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  owner_user_id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NULL,
  name VARCHAR(80) NOT NULL,
  name_normalized VARCHAR(80) COLLATE utf8mb4_bin NOT NULL,
  category VARCHAR(16) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  muscle_group VARCHAR(32) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  equipment VARCHAR(16) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  is_system TINYINT(1) NOT NULL DEFAULT 0,
  version INT UNSIGNED NOT NULL DEFAULT 1,
  idempotency_key VARCHAR(128) CHARACTER SET ascii COLLATE ascii_bin NULL,
  request_hash CHAR(64) CHARACTER SET ascii COLLATE ascii_bin NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  deleted_at DATETIME(3) NULL,
  owner_scope CHAR(36) CHARACTER SET ascii COLLATE ascii_bin
    GENERATED ALWAYS AS (COALESCE(owner_user_id, '00000000-0000-0000-0000-000000000000')) STORED,
  active_key TINYINT
    GENERATED ALWAYS AS (IF(deleted_at IS NULL, 1, NULL)) STORED,
  PRIMARY KEY (id),
  UNIQUE KEY uq_exercises_active_name (owner_scope, category, name_normalized, active_key),
  UNIQUE KEY uq_exercises_user_idempotency (owner_user_id, idempotency_key),
  KEY idx_exercises_owner_active (owner_user_id, deleted_at, category),
  KEY idx_exercises_system_filters (is_system, deleted_at, category, muscle_group, equipment),
  KEY idx_exercises_name_normalized (name_normalized),
  CONSTRAINT fk_exercises_owner FOREIGN KEY (owner_user_id)
    REFERENCES users (id) ON DELETE RESTRICT,
  CONSTRAINT chk_exercises_ownership CHECK (
    (is_system = 1 AND owner_user_id IS NULL) OR
    (is_system = 0 AND owner_user_id IS NOT NULL)
  ),
  CONSTRAINT chk_exercises_name_length CHECK (CHAR_LENGTH(name) BETWEEN 1 AND 40),
  CONSTRAINT chk_exercises_version CHECK (version >= 1)
) ENGINE = InnoDB
  DEFAULT CHARACTER SET = utf8mb4
  COLLATE = utf8mb4_0900_ai_ci;
