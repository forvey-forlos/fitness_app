# 系统动作目录标准化迁移

本次升级把 `exercises` 明确为平台维护的系统动作目录。用户不再复制或创建动作本体，只在 `user_exercise_preferences` 中保存“已加入个人库”和个人显示名称。训练计划、训练快照及未来肌群统计始终通过不可变的 `exercise_id` 关联。

## 执行顺序

先备份数据库，在非生产库验证，再按顺序执行尚未执行的脚本。MySQL DDL 会隐式提交，因此不要把这些命令视为一个可整体回滚的事务。

```bash
mysql -h "$DB_HOST" -P "$DB_PORT" -u "$DB_USER" -p "$DB_NAME" < server/migrations/013_expand_exercise_metadata.sql
mysql -h "$DB_HOST" -P "$DB_PORT" -u "$DB_USER" -p "$DB_NAME" < server/migrations/014_add_exercise_variants.sql
mysql -h "$DB_HOST" -P "$DB_PORT" -u "$DB_USER" -p "$DB_NAME" < server/migrations/015_add_dynamic_training_sets.sql
mysql -h "$DB_HOST" -P "$DB_PORT" -u "$DB_USER" -p "$DB_NAME" < server/migrations/016_normalize_exercise_catalog.sql
mysql -h "$DB_HOST" -P "$DB_PORT" -u "$DB_USER" -p "$DB_NAME" < server/seeds/002_standard_exercise_catalog.sql
```

`016` 是一次性 migration，不可重复执行；`002` seed 可以重复执行。新版后端必须在 `016` 和 `002` 成功后部署。

## 数据关系

| 表/字段 | 用途 |
|---|---|
| `exercises` | 系统主动作及标准英文名、默认中文显示名、器械、动作类型和默认记录指标 |
| `exercise_aliases` | 仅用于搜索，不作为关联键 |
| `exercise_variants` | 主动作下的握法、姿态等变式；主列表不展开 |
| `muscles` | 标准肌群字典 |
| `exercise_muscles` | `exercise_id` 到主要/辅助肌群的多对多关系 |
| `user_exercise_preferences` | 用户个人库成员关系、个人显示名及乐观锁版本 |
| `training_plan_exercises.exercise_variant_id` | 当前计划选择的变式 |
| `training_plan_exercises.record_methods` | 当前计划覆盖的记录指标；为空时使用系统默认 |
| `training_session_exercises` | 保留 `exercise_id`，并冻结名称、变式、肌群、记录指标和每组实际数据快照 |

`record_methods` 是 JSON 指标数组，不是不可扩展的组合字符串。当前支持：
`weight`、`reps`、`duration`、`distance`、`speed`、`incline`、`assistance_weight`、`rir`、`rpe`、`angle`、`other`。

已有用户自定义动作行不会被删除，以保证旧计划和历史外键有效；新版 API 不再创建或列出这些行为新的目录动作。

## 验证

```sql
SHOW TABLES;
SHOW CREATE TABLE exercise_aliases;
SHOW CREATE TABLE exercise_variants;
SHOW CREATE TABLE muscles;
SHOW CREATE TABLE exercise_muscles;
SHOW CREATE TABLE user_exercise_preferences;
SHOW COLUMNS FROM training_plan_exercises LIKE 'exercise_variant_id';
SHOW COLUMNS FROM training_session_exercises LIKE 'exercise_variant_name_snapshot';

SELECT COUNT(*) AS system_exercises
FROM exercises
WHERE is_system = 1 AND owner_user_id IS NULL AND deleted_at IS NULL;

SELECT e.id, e.standard_name_en, e.default_display_name_zh,
       e.record_methods, COUNT(DISTINCT a.id) AS alias_count,
       COUNT(DISTINCT v.id) AS variant_count
FROM exercises e
LEFT JOIN exercise_aliases a ON a.exercise_id = e.id
LEFT JOIN exercise_variants v ON v.exercise_id = e.id AND v.deleted_at IS NULL
WHERE e.is_system = 1 AND e.deleted_at IS NULL
GROUP BY e.id, e.standard_name_en, e.default_display_name_zh, e.record_methods
ORDER BY e.sort_order, e.default_display_name_zh;
```

预期：

- 系统目录至少包含原 32 个动作及新增的常用动作；
- `高位下拉` 可以通过“高位下拉 / 下拉 / 拉背 / Lat Pulldown”检索为同一个 `exercise_id`；
- 用户改名只更新 `user_exercise_preferences.display_name`；
- 删除个人动作只软删除偏好，不删除系统动作；
- 已完成历史仍展示完成当时的名称、变式和实际组数据。
