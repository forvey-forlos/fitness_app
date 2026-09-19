-- MySQL 8. Run after 006_create_exercises.sql.
-- Inspect any pre-existing training_plans table before applying; this file does not alter it.
SET time_zone = '+00:00';

CREATE TABLE training_plans (
  id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  user_id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  plan_date DATE NOT NULL,
  name VARCHAR(100) NOT NULL,
  duration_minutes SMALLINT UNSIGNED NOT NULL,
  status VARCHAR(16) CHARACTER SET ascii COLLATE ascii_bin NOT NULL DEFAULT 'draft',
  version INT UNSIGNED NOT NULL DEFAULT 1,
  idempotency_key VARCHAR(128) CHARACTER SET ascii COLLATE ascii_bin NULL,
  request_hash CHAR(64) CHARACTER SET ascii COLLATE ascii_bin NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  deleted_at DATETIME(3) NULL,
  active_key TINYINT GENERATED ALWAYS AS (IF(deleted_at IS NULL, 1, NULL)) STORED,
  PRIMARY KEY (id),
  UNIQUE KEY uq_training_plans_active_date (user_id, plan_date, active_key),
  UNIQUE KEY uq_training_plans_user_idempotency (user_id, idempotency_key),
  KEY idx_training_plans_user_date (user_id, deleted_at, plan_date DESC),
  KEY idx_training_plans_user_status_date (user_id, deleted_at, status, plan_date DESC),
  CONSTRAINT fk_training_plans_user FOREIGN KEY (user_id)
    REFERENCES users (id) ON DELETE CASCADE,
  CONSTRAINT chk_training_plans_status CHECK (status IN ('draft', 'completed')),
  CONSTRAINT chk_training_plans_duration CHECK (duration_minutes BETWEEN 1 AND 1440),
  CONSTRAINT chk_training_plans_version CHECK (version >= 1)
) ENGINE = InnoDB
  DEFAULT CHARACTER SET = utf8mb4
  COLLATE = utf8mb4_0900_ai_ci;

CREATE TABLE training_plan_exercises (
  id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  training_plan_id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  exercise_id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  sort_order SMALLINT UNSIGNED NOT NULL,
  sets SMALLINT UNSIGNED NULL,
  reps SMALLINT UNSIGNED NULL,
  weight DECIMAL(7,2) NULL COMMENT 'kg',
  rest_seconds SMALLINT UNSIGNED NULL,
  notes VARCHAR(1000) NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  deleted_at DATETIME(3) NULL,
  active_key TINYINT GENERATED ALWAYS AS (IF(deleted_at IS NULL, 1, NULL)) STORED,
  PRIMARY KEY (id),
  UNIQUE KEY uq_training_plan_exercises_active_order
    (training_plan_id, sort_order, active_key),
  KEY idx_training_plan_exercises_plan (training_plan_id, deleted_at, sort_order),
  KEY idx_training_plan_exercises_exercise (exercise_id),
  CONSTRAINT fk_training_plan_exercises_plan FOREIGN KEY (training_plan_id)
    REFERENCES training_plans (id) ON DELETE CASCADE,
  CONSTRAINT fk_training_plan_exercises_exercise FOREIGN KEY (exercise_id)
    REFERENCES exercises (id) ON DELETE RESTRICT,
  CONSTRAINT chk_training_plan_exercises_sort CHECK (sort_order >= 1),
  CONSTRAINT chk_training_plan_exercises_sets CHECK (sets IS NULL OR sets BETWEEN 1 AND 100),
  CONSTRAINT chk_training_plan_exercises_reps CHECK (reps IS NULL OR reps BETWEEN 1 AND 1000),
  CONSTRAINT chk_training_plan_exercises_weight CHECK (weight IS NULL OR weight BETWEEN 0 AND 1000),
  CONSTRAINT chk_training_plan_exercises_rest CHECK (rest_seconds IS NULL OR rest_seconds <= 3600)
) ENGINE = InnoDB
  DEFAULT CHARACTER SET = utf8mb4
  COLLATE = utf8mb4_0900_ai_ci;
