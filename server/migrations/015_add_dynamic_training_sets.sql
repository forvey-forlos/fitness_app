-- MySQL 8. Run once after 014_add_exercise_variants.sql.
-- Adds per-exercise recording methods and dynamic set rows to plans/history.
SET time_zone = '+00:00';

ALTER TABLE training_plan_exercises
  ADD COLUMN body_part VARCHAR(32) CHARACTER SET ascii COLLATE ascii_bin NULL AFTER actual_weight,
  ADD COLUMN record_methods JSON NULL AFTER body_part,
  ADD COLUMN target_metrics JSON NULL AFTER record_methods,
  ADD COLUMN actual_groups JSON NULL AFTER target_metrics;

UPDATE training_plan_exercises pe
JOIN exercises e ON e.id = pe.exercise_id
SET pe.body_part = COALESCE(
      JSON_UNQUOTE(JSON_EXTRACT(e.body_parts, '$[0]')),
      IF(e.category = 'abs', 'core', e.category)
    ),
    pe.record_methods = COALESCE(e.record_methods, JSON_ARRAY('weight', 'reps')),
    pe.target_metrics = JSON_OBJECT('weight', pe.weight, 'reps', pe.reps),
    pe.actual_groups = JSON_ARRAY(JSON_OBJECT('values', JSON_OBJECT(
      'weight', pe.actual_weight, 'reps', pe.actual_reps
    )))
WHERE pe.record_methods IS NULL;

ALTER TABLE training_session_exercises
  ADD COLUMN body_part_snapshot VARCHAR(32) CHARACTER SET ascii COLLATE ascii_bin NULL AFTER actual_weight,
  ADD COLUMN record_methods JSON NULL AFTER body_part_snapshot,
  ADD COLUMN target_metrics JSON NULL AFTER record_methods,
  ADD COLUMN actual_groups JSON NULL AFTER target_metrics;

UPDATE training_session_exercises se
SET se.body_part_snapshot = IF(se.category_snapshot = 'abs', 'core', se.category_snapshot),
    se.record_methods = JSON_ARRAY('weight', 'reps'),
    se.target_metrics = JSON_OBJECT('weight', se.weight, 'reps', se.reps),
    se.actual_groups = JSON_ARRAY(JSON_OBJECT('values', JSON_OBJECT(
      'weight', se.actual_weight, 'reps', se.actual_reps
    )))
WHERE se.record_methods IS NULL;

-- If these optional catalog actions exist in a deployment, give them the
-- requested running metric order. Custom actions can choose the same methods.
UPDATE exercises
SET record_methods = JSON_ARRAY('incline', 'duration', 'speed', 'distance'),
    updated_at = UTC_TIMESTAMP(3)
WHERE is_system = 1 AND name IN ('坡度跑', '跑步机坡度跑');

-- Verification:
-- SHOW COLUMNS FROM training_plan_exercises LIKE 'actual_groups';
-- SHOW COLUMNS FROM training_session_exercises LIKE 'actual_groups';
