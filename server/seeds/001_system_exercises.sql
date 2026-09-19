-- MySQL 8. Run after migrations/006_create_exercises.sql; safe to repeat.
-- category follows the six body parts; muscle_group gives finer targets.
SET time_zone = '+00:00';

INSERT INTO exercises
  (id, owner_user_id, name, name_normalized, category, muscle_group, equipment, is_system)
VALUES
  (UUID(), NULL, '杠铃平板卧推', '杠铃平板卧推', 'chest', 'chest', 'barbell', 1),
  (UUID(), NULL, '哑铃上斜卧推', '哑铃上斜卧推', 'chest', 'chest', 'dumbbell', 1),
  (UUID(), NULL, '蝴蝶机夹胸', '蝴蝶机夹胸', 'chest', 'chest', 'machine', 1),
  (UUID(), NULL, '标准俯卧撑', '标准俯卧撑', 'chest', 'chest', 'bodyweight', 1),

  (UUID(), NULL, '杠铃俯身划船', '杠铃俯身划船', 'back', 'back', 'barbell', 1),
  (UUID(), NULL, '单臂哑铃划船', '单臂哑铃划船', 'back', 'back', 'dumbbell', 1),
  (UUID(), NULL, '高位下拉', '高位下拉', 'back', 'back', 'machine', 1),
  (UUID(), NULL, '引体向上', '引体向上', 'back', 'back', 'bodyweight', 1),

  (UUID(), NULL, '杠铃推举', '杠铃推举', 'shoulder', 'shoulder', 'barbell', 1),
  (UUID(), NULL, '哑铃侧平举', '哑铃侧平举', 'shoulder', 'shoulder', 'dumbbell', 1),
  (UUID(), NULL, '坐姿肩推机', '坐姿肩推机', 'shoulder', 'shoulder', 'machine', 1),
  (UUID(), NULL, '绳索面拉', '绳索面拉', 'shoulder', 'shoulder', 'cable', 1),

  (UUID(), NULL, '杠铃弯举', '杠铃弯举', 'arms', 'biceps', 'barbell', 1),
  (UUID(), NULL, '哑铃锤式弯举', '哑铃锤式弯举', 'arms', 'biceps', 'dumbbell', 1),
  (UUID(), NULL, '牧师凳弯举机', '牧师凳弯举机', 'arms', 'biceps', 'machine', 1),
  (UUID(), NULL, '绳索弯举', '绳索弯举', 'arms', 'biceps', 'cable', 1),

  (UUID(), NULL, '窄握杠铃卧推', '窄握杠铃卧推', 'arms', 'triceps', 'barbell', 1),
  (UUID(), NULL, '哑铃颈后臂屈伸', '哑铃颈后臂屈伸', 'arms', 'triceps', 'dumbbell', 1),
  (UUID(), NULL, '绳索下压', '绳索下压', 'arms', 'triceps', 'cable', 1),
  (UUID(), NULL, '双杠臂屈伸', '双杠臂屈伸', 'arms', 'triceps', 'bodyweight', 1),

  (UUID(), NULL, '杠铃深蹲', '杠铃深蹲', 'legs', 'legs', 'barbell', 1),
  (UUID(), NULL, '哑铃箭步蹲', '哑铃箭步蹲', 'legs', 'legs', 'dumbbell', 1),
  (UUID(), NULL, '坐姿腿举', '坐姿腿举', 'legs', 'legs', 'machine', 1),
  (UUID(), NULL, '徒手深蹲', '徒手深蹲', 'legs', 'legs', 'bodyweight', 1),

  (UUID(), NULL, '杠铃臀推', '杠铃臀推', 'legs', 'glutes', 'barbell', 1),
  (UUID(), NULL, '哑铃罗马尼亚硬拉', '哑铃罗马尼亚硬拉', 'legs', 'glutes', 'dumbbell', 1),
  (UUID(), NULL, '绳索后踢腿', '绳索后踢腿', 'legs', 'glutes', 'cable', 1),
  (UUID(), NULL, '臀桥', '臀桥', 'legs', 'glutes', 'bodyweight', 1),

  (UUID(), NULL, '平板支撑', '平板支撑', 'abs', 'core', 'bodyweight', 1),
  (UUID(), NULL, '卷腹', '卷腹', 'abs', 'core', 'bodyweight', 1),
  (UUID(), NULL, '绳索卷腹', '绳索卷腹', 'abs', 'core', 'cable', 1),
  (UUID(), NULL, '悬垂举腿', '悬垂举腿', 'abs', 'core', 'bodyweight', 1)
ON DUPLICATE KEY UPDATE id = id;
