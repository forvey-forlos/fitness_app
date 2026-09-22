-- MySQL 8.0. Run once after 015_add_dynamic_training_sets.sql.
-- Normalizes the system exercise catalog while preserving legacy columns for compatibility.
SET time_zone = '+00:00';

ALTER TABLE exercises
  ADD COLUMN catalog_key VARCHAR(80) CHARACTER SET ascii COLLATE ascii_bin NULL AFTER name_normalized,
  ADD COLUMN standard_name_en VARCHAR(120) NULL AFTER catalog_key,
  ADD COLUMN default_display_name_zh VARCHAR(80) NULL AFTER standard_name_en,
  ADD COLUMN default_display_name_normalized VARCHAR(80) COLLATE utf8mb4_bin NULL AFTER default_display_name_zh,
  ADD COLUMN movement_type VARCHAR(32) CHARACTER SET ascii COLLATE ascii_bin NULL AFTER equipment,
  ADD UNIQUE KEY uq_exercises_catalog_key (catalog_key);

UPDATE exercises
SET catalog_key = CASE name
      WHEN '杠铃平板卧推' THEN 'barbell_bench_press' WHEN '哑铃上斜卧推' THEN 'incline_dumbbell_bench_press'
      WHEN '蝴蝶机夹胸' THEN 'machine_chest_fly' WHEN '标准俯卧撑' THEN 'push_up'
      WHEN '杠铃俯身划船' THEN 'bent_over_barbell_row' WHEN '单臂哑铃划船' THEN 'single_arm_dumbbell_row'
      WHEN '高位下拉' THEN 'lat_pulldown' WHEN '引体向上' THEN 'pull_up'
      WHEN '杠铃推举' THEN 'barbell_overhead_press' WHEN '哑铃侧平举' THEN 'dumbbell_lateral_raise'
      WHEN '坐姿肩推机' THEN 'seated_machine_shoulder_press' WHEN '绳索面拉' THEN 'cable_face_pull'
      WHEN '杠铃弯举' THEN 'barbell_curl' WHEN '哑铃锤式弯举' THEN 'dumbbell_hammer_curl'
      WHEN '牧师凳弯举机' THEN 'machine_preacher_curl' WHEN '绳索弯举' THEN 'cable_curl'
      WHEN '窄握杠铃卧推' THEN 'close_grip_barbell_bench_press' WHEN '哑铃颈后臂屈伸' THEN 'dumbbell_overhead_triceps_extension'
      WHEN '绳索下压' THEN 'cable_triceps_pushdown' WHEN '双杠臂屈伸' THEN 'parallel_bar_dip'
      WHEN '杠铃深蹲' THEN 'barbell_back_squat' WHEN '哑铃箭步蹲' THEN 'dumbbell_lunge'
      WHEN '坐姿腿举' THEN 'seated_leg_press' WHEN '徒手深蹲' THEN 'bodyweight_squat'
      WHEN '杠铃臀推' THEN 'barbell_hip_thrust' WHEN '哑铃罗马尼亚硬拉' THEN 'dumbbell_romanian_deadlift'
      WHEN '绳索后踢腿' THEN 'cable_hip_extension' WHEN '臀桥' THEN 'glute_bridge'
      WHEN '平板支撑' THEN 'front_plank' WHEN '卷腹' THEN 'crunch'
      WHEN '绳索卷腹' THEN 'cable_crunch' WHEN '悬垂举腿' THEN 'hanging_leg_raise'
      ELSE catalog_key
    END,
    default_display_name_zh = name,
    default_display_name_normalized = name_normalized,
    standard_name_en = COALESCE(standard_name_en, name),
    movement_type = COALESCE(movement_type, 'strength')
WHERE is_system = 1 AND default_display_name_zh IS NULL;

CREATE TABLE muscles (
  id VARCHAR(64) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  standard_name_en VARCHAR(100) NOT NULL,
  default_display_name_zh VARCHAR(80) NOT NULL,
  body_part VARCHAR(32) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id),
  KEY idx_muscles_body_part (body_part)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE exercise_muscles (
  exercise_id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  muscle_id VARCHAR(64) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  role VARCHAR(16) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  sort_order SMALLINT UNSIGNED NOT NULL DEFAULT 0,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (exercise_id, muscle_id, role),
  KEY idx_exercise_muscles_muscle (muscle_id, role, exercise_id),
  CONSTRAINT fk_exercise_muscles_exercise FOREIGN KEY (exercise_id) REFERENCES exercises (id) ON DELETE CASCADE,
  CONSTRAINT fk_exercise_muscles_muscle FOREIGN KEY (muscle_id) REFERENCES muscles (id) ON DELETE RESTRICT,
  CONSTRAINT chk_exercise_muscles_role CHECK (role IN ('primary','secondary'))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE exercise_aliases (
  id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  exercise_id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  alias VARCHAR(120) NOT NULL,
  alias_normalized VARCHAR(120) COLLATE utf8mb4_bin NOT NULL,
  locale VARCHAR(16) CHARACTER SET ascii COLLATE ascii_bin NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id),
  UNIQUE KEY uq_exercise_alias (exercise_id, alias_normalized),
  KEY idx_exercise_alias_lookup (alias_normalized, exercise_id),
  CONSTRAINT fk_exercise_alias_exercise FOREIGN KEY (exercise_id) REFERENCES exercises (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE exercise_variants (
  id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  exercise_id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  variant_code VARCHAR(64) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  standard_name_en VARCHAR(120) NULL,
  default_display_name_zh VARCHAR(80) NOT NULL,
  primary_muscles JSON NULL,
  secondary_muscles JSON NULL,
  sort_order SMALLINT UNSIGNED NOT NULL DEFAULT 0,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  deleted_at DATETIME(3) NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uq_exercise_variant_code (exercise_id, variant_code),
  KEY idx_exercise_variants_active (exercise_id, deleted_at, sort_order),
  CONSTRAINT fk_exercise_variant_exercise FOREIGN KEY (exercise_id) REFERENCES exercises (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE user_exercise_preferences (
  user_id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  exercise_id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  display_name VARCHAR(80) NULL,
  display_name_normalized VARCHAR(80) COLLATE utf8mb4_bin NULL,
  version INT UNSIGNED NOT NULL DEFAULT 1,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  deleted_at DATETIME(3) NULL,
  PRIMARY KEY (user_id, exercise_id),
  KEY idx_user_exercise_preferences_active (user_id, deleted_at, updated_at),
  KEY idx_user_exercise_preferences_name (user_id, display_name_normalized),
  CONSTRAINT fk_user_exercise_preferences_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
  CONSTRAINT fk_user_exercise_preferences_exercise FOREIGN KEY (exercise_id) REFERENCES exercises (id) ON DELETE RESTRICT,
  CONSTRAINT chk_user_exercise_preferences_version CHECK (version >= 1)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

INSERT INTO muscles (id, standard_name_en, default_display_name_zh, body_part) VALUES
  ('pectoralis_major','Pectoralis Major','胸大肌','chest'),('pectoralis_minor','Pectoralis Minor','胸小肌','chest'),
  ('serratus_anterior','Serratus Anterior','前锯肌','chest'),('latissimus_dorsi','Latissimus Dorsi','背阔肌','back'),
  ('trapezius','Trapezius','斜方肌','back'),('rhomboids','Rhomboids','菱形肌','back'),
  ('erector_spinae','Erector Spinae','竖脊肌','back'),('teres_major','Teres Major','大圆肌','back'),
  ('anterior_deltoid','Anterior Deltoid','三角肌前束','shoulder'),('lateral_deltoid','Lateral Deltoid','三角肌中束','shoulder'),
  ('posterior_deltoid','Posterior Deltoid','三角肌后束','shoulder'),('rotator_cuff','Rotator Cuff','肩袖肌群','shoulder'),
  ('biceps','Biceps Brachii','肱二头肌','arms'),('triceps','Triceps Brachii','肱三头肌','arms'),
  ('brachialis','Brachialis','肱肌','arms'),('brachioradialis','Brachioradialis','肱桡肌','arms'),
  ('forearm_flexors','Forearm Flexors','前臂屈肌群','arms'),('forearm_extensors','Forearm Extensors','前臂伸肌群','arms'),
  ('quadriceps','Quadriceps','股四头肌','legs'),('hamstrings','Hamstrings','腘绳肌','legs'),
  ('adductors','Hip Adductors','内收肌群','legs'),('calves','Calf Complex','小腿肌群','legs'),
  ('tibialis_anterior','Tibialis Anterior','胫骨前肌','legs'),('gluteus_maximus','Gluteus Maximus','臀大肌','glutes'),
  ('gluteus_medius','Gluteus Medius','臀中肌','glutes'),('gluteus_minimus','Gluteus Minimus','臀小肌','glutes'),
  ('rectus_abdominis','Rectus Abdominis','腹直肌','core'),('transverse_abdominis','Transverse Abdominis','腹横肌','core'),
  ('obliques','Obliques','腹斜肌','core'),('multifidus','Multifidus','多裂肌','core'),
  ('cardiorespiratory','Cardiorespiratory System','心肺系统','cardio'),('full_body','Full Body','全身综合','full_body'),
  ('other','Other','其他','other')
ON DUPLICATE KEY UPDATE standard_name_en=VALUES(standard_name_en), default_display_name_zh=VALUES(default_display_name_zh), body_part=VALUES(body_part);

INSERT IGNORE INTO exercise_muscles (exercise_id, muscle_id, role, sort_order)
SELECT e.id, j.muscle_id, 'primary', j.ordinality
FROM exercises e
JOIN JSON_TABLE(COALESCE(e.primary_muscles, JSON_ARRAY()), '$[*]'
  COLUMNS (ordinality FOR ORDINALITY, muscle_id VARCHAR(64) PATH '$')) j
JOIN muscles m ON m.id = j.muscle_id
WHERE e.is_system = 1;

INSERT IGNORE INTO exercise_muscles (exercise_id, muscle_id, role, sort_order)
SELECT e.id, j.muscle_id, 'secondary', j.ordinality
FROM exercises e
JOIN JSON_TABLE(COALESCE(e.secondary_muscles, JSON_ARRAY()), '$[*]'
  COLUMNS (ordinality FOR ORDINALITY, muscle_id VARCHAR(64) PATH '$')) j
JOIN muscles m ON m.id = j.muscle_id
WHERE e.is_system = 1;

INSERT IGNORE INTO exercise_variants
  (id, exercise_id, variant_code, default_display_name_zh, primary_muscles, secondary_muscles, sort_order)
SELECT UUID(), e.id, j.variant_code, j.display_name, j.primary_muscles, j.secondary_muscles, j.ordinality
FROM exercises e
JOIN JSON_TABLE(COALESCE(e.variants, JSON_ARRAY()), '$[*]'
  COLUMNS (
    ordinality FOR ORDINALITY,
    variant_code VARCHAR(64) PATH '$.id',
    display_name VARCHAR(80) PATH '$.name',
    primary_muscles JSON PATH '$.primaryMuscles',
    secondary_muscles JSON PATH '$.secondaryMuscles'
  )) j
WHERE e.is_system = 1 AND j.variant_code IS NOT NULL AND j.display_name IS NOT NULL;

ALTER TABLE training_plan_exercises
  ADD COLUMN exercise_variant_id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NULL AFTER exercise_id,
  ADD KEY idx_training_plan_exercises_variant (exercise_variant_id),
  ADD CONSTRAINT fk_training_plan_exercises_variant FOREIGN KEY (exercise_variant_id) REFERENCES exercise_variants (id) ON DELETE RESTRICT;

ALTER TABLE training_session_exercises
  ADD COLUMN exercise_variant_id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NULL AFTER exercise_id,
  ADD COLUMN exercise_variant_name_snapshot VARCHAR(100) NULL AFTER exercise_name_snapshot,
  ADD COLUMN primary_muscles_snapshot JSON NULL AFTER equipment_snapshot,
  ADD COLUMN secondary_muscles_snapshot JSON NULL AFTER primary_muscles_snapshot,
  ADD KEY idx_training_session_exercises_variant (exercise_variant_id),
  ADD CONSTRAINT fk_training_session_exercises_variant FOREIGN KEY (exercise_variant_id) REFERENCES exercise_variants (id) ON DELETE SET NULL;

-- Existing user-created exercises remain untouched so old plan/history foreign keys remain valid.
-- The API stops creating or listing them as catalog entries after this migration.
