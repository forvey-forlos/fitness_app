-- MySQL 8.0. Run after migration 016. Safe to repeat.
-- Terminology is normalized for this product using ACE/ExRx as catalog references
-- and conservative, commonly accepted primary/secondary muscle relationships.
SET time_zone = '+00:00';

UPDATE exercises SET
  default_display_name_zh = name,
  default_display_name_normalized = name_normalized,
  standard_name_en = CASE catalog_key
    WHEN 'barbell_bench_press' THEN 'Barbell Bench Press' WHEN 'incline_dumbbell_bench_press' THEN 'Incline Dumbbell Bench Press'
    WHEN 'machine_chest_fly' THEN 'Machine Chest Fly' WHEN 'push_up' THEN 'Push-Up'
    WHEN 'bent_over_barbell_row' THEN 'Bent-Over Barbell Row' WHEN 'single_arm_dumbbell_row' THEN 'Single-Arm Dumbbell Row'
    WHEN 'lat_pulldown' THEN 'Lat Pulldown' WHEN 'pull_up' THEN 'Pull-Up'
    WHEN 'barbell_overhead_press' THEN 'Barbell Overhead Press' WHEN 'dumbbell_lateral_raise' THEN 'Dumbbell Lateral Raise'
    WHEN 'seated_machine_shoulder_press' THEN 'Seated Machine Shoulder Press' WHEN 'cable_face_pull' THEN 'Cable Face Pull'
    WHEN 'barbell_curl' THEN 'Barbell Curl' WHEN 'dumbbell_hammer_curl' THEN 'Dumbbell Hammer Curl'
    WHEN 'machine_preacher_curl' THEN 'Machine Preacher Curl' WHEN 'cable_curl' THEN 'Cable Curl'
    WHEN 'close_grip_barbell_bench_press' THEN 'Close-Grip Barbell Bench Press' WHEN 'dumbbell_overhead_triceps_extension' THEN 'Dumbbell Overhead Triceps Extension'
    WHEN 'cable_triceps_pushdown' THEN 'Cable Triceps Pushdown' WHEN 'parallel_bar_dip' THEN 'Parallel Bar Dip'
    WHEN 'barbell_back_squat' THEN 'Barbell Back Squat' WHEN 'dumbbell_lunge' THEN 'Dumbbell Lunge'
    WHEN 'seated_leg_press' THEN 'Seated Leg Press' WHEN 'bodyweight_squat' THEN 'Bodyweight Squat'
    WHEN 'barbell_hip_thrust' THEN 'Barbell Hip Thrust' WHEN 'dumbbell_romanian_deadlift' THEN 'Dumbbell Romanian Deadlift'
    WHEN 'cable_hip_extension' THEN 'Cable Hip Extension' WHEN 'glute_bridge' THEN 'Glute Bridge'
    WHEN 'front_plank' THEN 'Front Plank' WHEN 'crunch' THEN 'Crunch'
    WHEN 'cable_crunch' THEN 'Cable Crunch' WHEN 'hanging_leg_raise' THEN 'Hanging Leg Raise'
    ELSE COALESCE(standard_name_en, name)
  END,
  movement_type = CASE WHEN catalog_key = 'front_plank' THEN 'isometric' ELSE 'strength' END,
  record_methods = CASE
    WHEN catalog_key = 'front_plank' THEN JSON_ARRAY('duration')
    WHEN catalog_key IN ('push_up','pull_up','parallel_bar_dip','bodyweight_squat','crunch','hanging_leg_raise') THEN JSON_ARRAY('reps')
    ELSE JSON_ARRAY('weight','reps')
  END
WHERE is_system = 1 AND deleted_at IS NULL;

INSERT INTO exercises
  (id, owner_user_id, name, name_normalized, catalog_key, standard_name_en, default_display_name_zh,
   default_display_name_normalized, body_parts, record_methods, category, muscle_group,
   primary_muscles, secondary_muscles, variants, equipment, movement_type, sort_order, is_system)
VALUES
  ('10000000-0000-4000-8000-000000000033',NULL,'传统硬拉','传统硬拉','conventional_deadlift','Conventional Deadlift','传统硬拉','传统硬拉',
   JSON_ARRAY('back','legs','glutes'),JSON_ARRAY('weight','reps'),'back','back',JSON_ARRAY('gluteus_maximus','hamstrings','erector_spinae'),JSON_ARRAY('quadriceps','trapezius'),JSON_ARRAY(),'barbell','strength',330,1),
  ('10000000-0000-4000-8000-000000000034',NULL,'坐姿划船','坐姿划船','seated_cable_row','Seated Cable Row','坐姿划船','坐姿划船',
   JSON_ARRAY('back'),JSON_ARRAY('weight','reps'),'back','back',JSON_ARRAY('latissimus_dorsi','rhomboids'),JSON_ARRAY('trapezius','biceps'),JSON_ARRAY(),'cable','strength',340,1),
  ('10000000-0000-4000-8000-000000000035',NULL,'腿屈伸','腿屈伸','leg_extension','Leg Extension','腿屈伸','腿屈伸',
   JSON_ARRAY('legs'),JSON_ARRAY('weight','reps'),'legs','legs',JSON_ARRAY('quadriceps'),JSON_ARRAY(),JSON_ARRAY(),'machine','strength',350,1),
  ('10000000-0000-4000-8000-000000000036',NULL,'俯卧腿弯举','俯卧腿弯举','lying_leg_curl','Lying Leg Curl','俯卧腿弯举','俯卧腿弯举',
   JSON_ARRAY('legs'),JSON_ARRAY('weight','reps'),'legs','legs',JSON_ARRAY('hamstrings'),JSON_ARRAY('calves'),JSON_ARRAY(),'machine','strength',360,1),
  ('10000000-0000-4000-8000-000000000037',NULL,'站姿提踵','站姿提踵','standing_calf_raise','Standing Calf Raise','站姿提踵','站姿提踵',
   JSON_ARRAY('legs'),JSON_ARRAY('weight','reps'),'legs','legs',JSON_ARRAY('calves'),JSON_ARRAY(),JSON_ARRAY(),'machine','strength',370,1),
  ('10000000-0000-4000-8000-000000000038',NULL,'跑步机跑步','跑步机跑步','treadmill_running','Treadmill Running','跑步机跑步','跑步机跑步',
   JSON_ARRAY('cardio'),JSON_ARRAY('duration','distance'),'legs','legs',JSON_ARRAY('cardiorespiratory'),JSON_ARRAY('quadriceps','hamstrings','calves'),JSON_ARRAY(),'cardio_machine','cardio',380,1),
  ('10000000-0000-4000-8000-000000000039',NULL,'动感单车','动感单车','stationary_cycling','Stationary Cycling','动感单车','动感单车',
   JSON_ARRAY('cardio'),JSON_ARRAY('duration','distance'),'legs','legs',JSON_ARRAY('cardiorespiratory'),JSON_ARRAY('quadriceps','gluteus_maximus','calves'),JSON_ARRAY(),'cardio_machine','cardio',390,1),
  ('10000000-0000-4000-8000-000000000040',NULL,'波比跳','波比跳','burpee','Burpee','波比跳','波比跳',
   JSON_ARRAY('full_body','cardio'),JSON_ARRAY('reps'),'legs','legs',JSON_ARRAY('full_body'),JSON_ARRAY('cardiorespiratory'),JSON_ARRAY(),'bodyweight','conditioning',400,1)
ON DUPLICATE KEY UPDATE
  standard_name_en=VALUES(standard_name_en), default_display_name_zh=VALUES(default_display_name_zh),
  catalog_key=VALUES(catalog_key),
  default_display_name_normalized=VALUES(default_display_name_normalized), body_parts=VALUES(body_parts),
  record_methods=VALUES(record_methods), primary_muscles=VALUES(primary_muscles), secondary_muscles=VALUES(secondary_muscles),
  equipment=VALUES(equipment), movement_type=VALUES(movement_type), sort_order=VALUES(sort_order), is_system=1, deleted_at=NULL;

INSERT INTO exercise_aliases (id, exercise_id, alias, alias_normalized, locale)
SELECT UUID(), e.id, a.alias, a.alias_normalized, a.locale
FROM exercises e
JOIN (
  SELECT 'lat_pulldown' exercise_key,'拉背' alias,'拉背' alias_normalized,'zh-CN' locale UNION ALL
  SELECT 'lat_pulldown','下拉','下拉','zh-CN' UNION ALL SELECT 'lat_pulldown','Lat Pulldown','lat pulldown','en' UNION ALL
  SELECT 'barbell_bench_press','卧推','卧推','zh-CN' UNION ALL SELECT 'barbell_bench_press','Bench Press','bench press','en' UNION ALL
  SELECT 'barbell_back_squat','深蹲','深蹲','zh-CN' UNION ALL SELECT 'barbell_back_squat','Back Squat','back squat','en' UNION ALL
  SELECT 'conventional_deadlift','硬拉','硬拉','zh-CN' UNION ALL SELECT 'conventional_deadlift','Deadlift','deadlift','en' UNION ALL
  SELECT 'front_plank','平板','平板','zh-CN' UNION ALL SELECT 'front_plank','Plank','plank','en' UNION ALL
  SELECT 'treadmill_running','跑步','跑步','zh-CN' UNION ALL SELECT 'treadmill_running','Treadmill Run','treadmill run','en' UNION ALL
  SELECT 'seated_cable_row','划船','划船','zh-CN' UNION ALL SELECT 'seated_cable_row','Cable Row','cable row','en' UNION ALL
  SELECT 'barbell_hip_thrust','臀推','臀推','zh-CN' UNION ALL SELECT 'barbell_hip_thrust','Hip Thrust','hip thrust','en'
) a ON a.exercise_key = e.catalog_key
WHERE e.is_system = 1
ON DUPLICATE KEY UPDATE alias=VALUES(alias), locale=VALUES(locale);

DELETE em FROM exercise_muscles em JOIN exercises e ON e.id=em.exercise_id WHERE e.is_system=1;
INSERT IGNORE INTO exercise_muscles (exercise_id, muscle_id, role, sort_order)
SELECT e.id,j.muscle_id,'primary',j.ordinality FROM exercises e
JOIN JSON_TABLE(COALESCE(e.primary_muscles,JSON_ARRAY()),'$[*]' COLUMNS(ordinality FOR ORDINALITY,muscle_id VARCHAR(64) PATH '$')) j
JOIN muscles m ON m.id=j.muscle_id WHERE e.is_system=1 AND e.deleted_at IS NULL;
INSERT IGNORE INTO exercise_muscles (exercise_id, muscle_id, role, sort_order)
SELECT e.id,j.muscle_id,'secondary',j.ordinality FROM exercises e
JOIN JSON_TABLE(COALESCE(e.secondary_muscles,JSON_ARRAY()),'$[*]' COLUMNS(ordinality FOR ORDINALITY,muscle_id VARCHAR(64) PATH '$')) j
JOIN muscles m ON m.id=j.muscle_id WHERE e.is_system=1 AND e.deleted_at IS NULL;
