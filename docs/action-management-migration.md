# 动作管理多维数据迁移

本次动作管理升级将系统动作作为可选目录，将用户选取或创建的动作作为可编辑动作。旧训练计划继续通过 `category`、`muscle_group` 和动作 ID 兼容，不删除历史动作。

## 执行顺序

1. 备份正式数据库。
2. 先执行 SQL 迁移，再部署本次后端代码。
3. 不要在未执行迁移时启动新版后端；新版仓储会读取新增列。

```bash
mysql -h "$DB_HOST" -P "$DB_PORT" -u "$DB_USER" -p "$DB_NAME" < server/migrations/013_expand_exercise_metadata.sql
mysql -h "$DB_HOST" -P "$DB_PORT" -u "$DB_USER" -p "$DB_NAME" < server/migrations/014_add_exercise_variants.sql
```

本项目不会自动执行这条 SQL。

## 新增字段

| 字段 | 类型 | 用途 |
|---|---|---|
| `body_parts` | JSON | 多个训练部位 |
| `record_methods` | JSON | 重量、次数、距离、持续时间、坡度、角度等记录方式 |
| `primary_muscles` | JSON | 主要训练肌群 |
| `secondary_muscles` | JSON | 辅助训练肌群 |
| `sort_order` | INT UNSIGNED | 预留的服务端排序值 |
| `variants` | JSON | 动作变式及每个变式对应的主要、辅助肌群 |

迁移会将旧数据回填为数组。旧 `abs` 映射为 `core`，旧单肌群会映射为新的细分肌群；原有字段继续保留作为训练计划兼容字段。

## 验证

```sql
SHOW COLUMNS FROM exercises;
SHOW INDEX FROM exercises;

SELECT
  id,
  name,
  body_parts,
  record_methods,
  primary_muscles,
  secondary_muscles,
  equipment,
  sort_order,
  variants
FROM exercises
ORDER BY is_system DESC, name
LIMIT 20;
```

预期：旧动作的四个 JSON 字段均已回填；用户新建动作由 API 写入完整数组。

## 兼容说明

- 系统 seed 动作不会出现在用户的“全部动作”中，只出现在“从动作目录选取”弹层。
- 用户选取目录动作后，后端创建一份属于该用户的可编辑动作。
- 删除用户动作仍为软删除，不影响已完成训练中的动作快照。
- JSON 列保留可空是为了兼容旧 seed 的重复执行；API 对新建和修改请求仍执行严格数组校验。
