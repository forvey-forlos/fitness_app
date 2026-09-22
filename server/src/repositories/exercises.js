const pool = require('../config/db')

const selectColumns = [
  'e.id, e.owner_user_id, e.name, e.name_normalized, e.standard_name_en,',
  'e.default_display_name_zh, e.default_display_name_normalized, e.body_parts, e.record_methods,',
  'e.category, e.muscle_group, e.primary_muscles, e.secondary_muscles, e.equipment,',
  'e.movement_type, e.sort_order, e.is_system, e.version, e.deleted_at,',
  'p.display_name AS personal_display_name, p.version AS preference_version,',
  'CASE WHEN p.user_id IS NULL THEN 0 ELSE 1 END AS in_library,',
  'COALESCE(NULLIF(p.display_name,\'\'), e.default_display_name_zh, e.name) AS resolved_name,',
  '(SELECT JSON_ARRAYAGG(a.alias) FROM exercise_aliases a WHERE a.exercise_id=e.id) AS aliases,',
  `(SELECT JSON_ARRAYAGG(JSON_OBJECT('id',v.id,'code',v.variant_code,
    'name',v.default_display_name_zh,'standardName',v.standard_name_en,
    'primaryMuscles',v.primary_muscles,'secondaryMuscles',v.secondary_muscles))
    FROM exercise_variants v WHERE v.exercise_id=e.id AND v.deleted_at IS NULL) AS normalized_variants,`,
  "DATE_FORMAT(e.created_at, '%Y-%m-%dT%H:%i:%s.%fZ') AS created_at,",
  "DATE_FORMAT(e.updated_at, '%Y-%m-%dT%H:%i:%s.%fZ') AS updated_at"
].join(' ')

function joins() {
  return 'LEFT JOIN user_exercise_preferences p ON p.exercise_id=e.id AND p.user_id=? AND p.deleted_at IS NULL'
}

async function findVisibleById(userId, id) {
  const [rows] = await pool.execute(
    ['SELECT', selectColumns, 'FROM exercises e', joins(),
      'WHERE e.id=? AND e.deleted_at IS NULL AND ((e.is_system=1 AND e.owner_user_id IS NULL)',
      'OR (e.is_system=0 AND e.owner_user_id=?)) LIMIT 1'].join(' '),
    [userId, id, userId]
  )
  return rows[0] || null
}

async function list(userId, filters) {
  const conditions = ['e.deleted_at IS NULL', 'e.is_system=1', 'e.owner_user_id IS NULL']
  const params = [userId]
  if (filters.scope === 'library') conditions.push('p.user_id IS NOT NULL')
  if (filters.category !== undefined) { conditions.push('e.category=?'); params.push(filters.category) }
  if (filters.muscleGroup !== undefined) {
    conditions.push('(e.muscle_group=? OR EXISTS (SELECT 1 FROM exercise_muscles em WHERE em.exercise_id=e.id AND em.muscle_id=?))')
    params.push(filters.muscleGroup, filters.muscleGroup)
  }
  if (filters.equipment !== undefined) { conditions.push('e.equipment=?'); params.push(filters.equipment) }
  if (filters.keyword !== undefined) {
    conditions.push(`(INSTR(e.name_normalized,?)>0 OR INSTR(e.default_display_name_normalized,?)>0
      OR INSTR(LOWER(e.standard_name_en),?)>0 OR INSTR(COALESCE(p.display_name_normalized,''),?)>0
      OR EXISTS (SELECT 1 FROM exercise_aliases a WHERE a.exercise_id=e.id AND INSTR(a.alias_normalized,?)>0))`)
    params.push(filters.keyword, filters.keyword, filters.keyword, filters.keyword, filters.keyword)
  }
  const from = ['FROM exercises e', joins()].join(' ')
  const where = 'WHERE ' + conditions.join(' AND ')
  const [countRows] = await pool.execute(`SELECT COUNT(*) AS total ${from} ${where}`, params)
  const [rows] = await pool.execute(
    ['SELECT', selectColumns, from, where,
      "ORDER BY FIELD(e.category,'shoulder','chest','back','arms','abs','legs'),",
      'e.sort_order ASC, e.default_display_name_normalized ASC, e.id ASC LIMIT ? OFFSET ?'].join(' '),
    [...params, filters.pageSize, (filters.page - 1) * filters.pageSize]
  )
  return { rows, total: Number(countRows[0].total) }
}

async function addToLibrary(userId, exerciseId) {
  await pool.execute(
    `INSERT INTO user_exercise_preferences (user_id,exercise_id,version,created_at,updated_at,deleted_at)
     SELECT ?,e.id,1,UTC_TIMESTAMP(3),UTC_TIMESTAMP(3),NULL FROM exercises e
     WHERE e.id=? AND e.is_system=1 AND e.owner_user_id IS NULL AND e.deleted_at IS NULL
     ON DUPLICATE KEY UPDATE  deleted_at=NULL,version=user_exercise_preferences.version+1,updated_at=UTC_TIMESTAMP(3)`,
    [userId, exerciseId]
  )
}

async function findVariant(exerciseId, variantId) {
  const [rows] = await pool.execute(
    `SELECT id,exercise_id,variant_code,standard_name_en,default_display_name_zh,
       primary_muscles,secondary_muscles
     FROM exercise_variants WHERE id=? AND exercise_id=? AND deleted_at IS NULL LIMIT 1`,
    [variantId, exerciseId]
  )
  return rows[0] || null
}

async function updatePreference(userId, exerciseId, version, displayName, displayNameNormalized) {
  const [result] = await pool.execute(
    `UPDATE user_exercise_preferences SET display_name=?,display_name_normalized=?,
       version=version+1,updated_at=UTC_TIMESTAMP(3)
     WHERE user_id=? AND exercise_id=? AND version=? AND deleted_at IS NULL`,
    [displayName, displayNameNormalized, userId, exerciseId, version]
  )
  return result.affectedRows === 1
}

async function removeFromLibrary(userId, exerciseId) {
  const [result] = await pool.execute(
    `UPDATE user_exercise_preferences SET deleted_at=UTC_TIMESTAMP(3),version=version+1,updated_at=UTC_TIMESTAMP(3)
     WHERE user_id=? AND exercise_id=? AND deleted_at IS NULL`, [userId, exerciseId]
  )
  return result.affectedRows === 1
}

async function countVisibleByCategory(userId) {
  const [rows] = await pool.execute(
    `SELECT e.category,COUNT(*) AS system_count,
       SUM(CASE WHEN p.user_id IS NULL THEN 0 ELSE 1 END) AS selected_count
     FROM exercises e LEFT JOIN user_exercise_preferences p
       ON p.exercise_id=e.id AND p.user_id=? AND p.deleted_at IS NULL
     WHERE e.deleted_at IS NULL AND e.is_system=1 AND e.owner_user_id IS NULL GROUP BY e.category`, [userId]
  )
  return rows
}

module.exports = { findVisibleById, findVariant, list, addToLibrary, updatePreference, removeFromLibrary, countVisibleByCategory }
