-- MySQL 8. Run once after 017_create_training_templates.sql, after a verified backup.
-- Existing target_metrics/sets and immutable session values remain untouched.
ALTER TABLE training_plan_exercises
  ADD COLUMN planned_groups JSON NULL AFTER target_metrics;

ALTER TABLE training_session_exercises
  ADD COLUMN planned_groups JSON NULL AFTER target_metrics;

-- NULL means legacy data. Readers synthesize one group with set_count=sets.
