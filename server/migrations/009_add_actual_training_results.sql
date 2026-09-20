-- MySQL 8. Run once after 008_create_training_sessions.sql.
-- Existing sets/reps/weight columns remain the plan target values.
-- Draft actual values live on plan exercises; completion freezes them into session snapshots.
ALTER TABLE training_plan_exercises
  ADD COLUMN actual_sets SMALLINT UNSIGNED NULL AFTER sets,
  ADD COLUMN actual_reps SMALLINT UNSIGNED NULL AFTER reps,
  ADD COLUMN actual_weight DECIMAL(7,2) NULL COMMENT 'kg' AFTER weight,
  ADD CONSTRAINT chk_training_plan_actual_sets
    CHECK (actual_sets IS NULL OR actual_sets BETWEEN 1 AND 100),
  ADD CONSTRAINT chk_training_plan_actual_reps
    CHECK (actual_reps IS NULL OR actual_reps BETWEEN 1 AND 1000),
  ADD CONSTRAINT chk_training_plan_actual_weight
    CHECK (actual_weight IS NULL OR actual_weight BETWEEN 0 AND 1000);

ALTER TABLE training_session_exercises
  ADD COLUMN actual_sets SMALLINT UNSIGNED NULL AFTER sets,
  ADD COLUMN actual_reps SMALLINT UNSIGNED NULL AFTER reps,
  ADD COLUMN actual_weight DECIMAL(7,2) NULL COMMENT 'kg' AFTER weight,
  ADD CONSTRAINT chk_training_session_actual_sets
    CHECK (actual_sets IS NULL OR actual_sets BETWEEN 1 AND 100),
  ADD CONSTRAINT chk_training_session_actual_reps
    CHECK (actual_reps IS NULL OR actual_reps BETWEEN 1 AND 1000),
  ADD CONSTRAINT chk_training_session_actual_weight
    CHECK (actual_weight IS NULL OR actual_weight BETWEEN 0 AND 1000);
