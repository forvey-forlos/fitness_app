-- MySQL 8. Run once after 007_create_training_plans.sql. All timestamps are UTC.
SET time_zone = '+00:00';

ALTER TABLE training_plans
  ADD COLUMN completed_at DATETIME(3) NULL AFTER updated_at,
  ADD KEY idx_training_plans_user_completed (user_id, completed_at);

CREATE TABLE training_sessions (
  id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  user_id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  training_plan_id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NULL,
  plan_date DATE NOT NULL,
  plan_name_snapshot VARCHAR(100) NOT NULL,
  started_at DATETIME(3) NULL,
  completed_at DATETIME(3) NOT NULL,
  duration_minutes SMALLINT UNSIGNED NOT NULL,
  plan_version INT UNSIGNED NOT NULL,
  idempotency_key VARCHAR(128) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  request_hash CHAR(64) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  version INT UNSIGNED NOT NULL DEFAULT 1,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  deleted_at DATETIME(3) NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uq_training_sessions_plan (training_plan_id),
  UNIQUE KEY uq_training_sessions_user_key (user_id, idempotency_key),
  KEY idx_training_sessions_user_completed (user_id, deleted_at, completed_at DESC, id DESC),
  KEY idx_training_sessions_user_date (user_id, plan_date),
  CONSTRAINT fk_training_sessions_user FOREIGN KEY (user_id)
    REFERENCES users (id) ON DELETE CASCADE,
  CONSTRAINT fk_training_sessions_plan FOREIGN KEY (training_plan_id)
    REFERENCES training_plans (id) ON DELETE SET NULL,
  CONSTRAINT chk_training_sessions_duration CHECK (duration_minutes BETWEEN 1 AND 1440),
  CONSTRAINT chk_training_sessions_plan_version CHECK (plan_version >= 1),
  CONSTRAINT chk_training_sessions_version CHECK (version >= 1)
) ENGINE = InnoDB DEFAULT CHARACTER SET = utf8mb4 COLLATE = utf8mb4_0900_ai_ci;

CREATE TABLE training_session_exercises (
  id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  session_id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  exercise_id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NULL,
  exercise_name_snapshot VARCHAR(100) NOT NULL,
  category_snapshot VARCHAR(32) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  muscle_group_snapshot VARCHAR(32) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  equipment_snapshot VARCHAR(32) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  sort_order SMALLINT UNSIGNED NOT NULL,
  sets SMALLINT UNSIGNED NULL,
  reps SMALLINT UNSIGNED NULL,
  weight DECIMAL(7,2) NULL COMMENT 'kg',
  rest_seconds SMALLINT UNSIGNED NULL,
  notes VARCHAR(1000) NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id),
  UNIQUE KEY uq_training_session_exercises_order (session_id, sort_order),
  KEY idx_training_session_exercises_exercise (exercise_id),
  CONSTRAINT fk_training_session_exercises_session FOREIGN KEY (session_id)
    REFERENCES training_sessions (id) ON DELETE CASCADE,
  CONSTRAINT fk_training_session_exercises_exercise FOREIGN KEY (exercise_id)
    REFERENCES exercises (id) ON DELETE SET NULL
) ENGINE = InnoDB DEFAULT CHARACTER SET = utf8mb4 COLLATE = utf8mb4_0900_ai_ci;
