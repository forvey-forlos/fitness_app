-- MySQL 8.0. Run once after 012_decouple_account_code_and_display_name.sql.
-- Adds multi-value exercise metadata while preserving category/muscle_group
-- for compatibility with existing training plans and history snapshots.
SET time_zone = '+00:00';

ALTER TABLE exercises
  ADD COLUMN body_parts JSON NULL AFTER name_normalized,
  ADD COLUMN record_methods JSON NULL AFTER body_parts,
  ADD COLUMN primary_muscles JSON NULL AFTER muscle_group,
  ADD COLUMN secondary_muscles JSON NULL AFTER primary_muscles,
  ADD COLUMN sort_order INT UNSIGNED NOT NULL DEFAULT 0 AFTER equipment;

UPDATE exercises
SET
  body_parts = JSON_ARRAY(
    CASE category
      WHEN 'abs' THEN 'core'
      ELSE category
    END
  ),
  record_methods = JSON_ARRAY('weight', 'reps'),
  primary_muscles = JSON_ARRAY(
    CASE muscle_group
      WHEN 'chest' THEN 'pectoralis_major'
      WHEN 'back' THEN 'latissimus_dorsi'
      WHEN 'shoulder' THEN 'anterior_deltoid'
      WHEN 'legs' THEN 'quadriceps'
      WHEN 'glutes' THEN 'gluteus_maximus'
      WHEN 'core' THEN 'rectus_abdominis'
      ELSE muscle_group
    END
  ),
  secondary_muscles = JSON_ARRAY()
WHERE body_parts IS NULL;

-- Keep the JSON columns nullable for repeatable compatibility with the
-- existing 001_system_exercises.sql seed. The API always validates and writes
-- arrays for new user-owned actions; legacy/seed rows are normalized on read.

CREATE INDEX idx_exercises_owner_sort
  ON exercises (owner_user_id, deleted_at, sort_order, name_normalized);

-- Verification:
-- SELECT id,name,body_parts,record_methods,primary_muscles,secondary_muscles,
--        equipment,sort_order
-- FROM exercises ORDER BY is_system DESC,name LIMIT 20;
