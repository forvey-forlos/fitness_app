const pool = require('../config/db')

const selectColumns = [
  'id, owner_user_id, name, name_normalized, body_parts, record_methods,',
  'category, muscle_group, primary_muscles, secondary_muscles, variants, equipment, sort_order,',
  'is_system, version, request_hash, deleted_at,',
  "DATE_FORMAT(created_at, '%Y-%m-%dT%H:%i:%s.%fZ') AS created_at,",
  "DATE_FORMAT(updated_at, '%Y-%m-%dT%H:%i:%s.%fZ') AS updated_at"
].join(' ')

async function findVisibleById(userId, id) {
  const [rows] = await pool.execute(
    ['SELECT', selectColumns, 'FROM exercises WHERE id = ? AND deleted_at IS NULL',
      'AND ((is_system = 1 AND owner_user_id IS NULL)',
      'OR (is_system = 0 AND owner_user_id = ?)) LIMIT 1'].join(' '),
    [id, userId]
  )
  return rows[0] || null
}

async function findByNormalizedName(userId, category, normalized) {
  const [rows] = await pool.execute(
    ['SELECT id FROM exercises WHERE owner_user_id = ? AND is_system = 0',
      'AND category = ? AND name_normalized = ? AND deleted_at IS NULL LIMIT 1'].join(' '),
    [userId, category, normalized]
  )
  return rows[0] || null
}

async function findByIdempotencyKey(userId, key) {
  const [rows] = await pool.execute(
    ['SELECT', selectColumns,
      'FROM exercises WHERE owner_user_id = ? AND is_system = 0',
      'AND idempotency_key = ? LIMIT 1'].join(' '),
    [userId, key]
  )
  return rows[0] || null
}

async function list(userId, filters) {
  const conditions = [
    'deleted_at IS NULL',
    '((is_system = 1 AND owner_user_id IS NULL) OR (is_system = 0 AND owner_user_id = ?))'
  ]
  const params = [userId]
  for (const [key, column] of [
    ['category', 'category'], ['muscleGroup', 'muscle_group'], ['equipment', 'equipment']
  ]) {
    if (filters[key] !== undefined) {
      conditions.push(column + ' = ?')
      params.push(filters[key])
    }
  }
  if (filters.keyword !== undefined) {
    conditions.push('INSTR(name_normalized, ?) > 0')
    params.push(filters.keyword)
  }
  const where = 'WHERE ' + conditions.join(' AND ')
  const [countRows] = await pool.execute('SELECT COUNT(*) AS total FROM exercises ' + where, params)
  const [rows] = await pool.execute(
    ['SELECT', selectColumns, 'FROM exercises', where,
      "ORDER BY FIELD(category, 'shoulder', 'chest', 'back', 'arms', 'abs', 'legs'),",
      'is_system DESC, sort_order ASC, name_normalized ASC, id ASC',
      'LIMIT ? OFFSET ?'].join(' '),
    [...params, filters.pageSize, (filters.page - 1) * filters.pageSize]
  )
  return { rows, total: Number(countRows[0].total) }
}

async function countVisibleByCategory(userId) {
  const [rows] = await pool.execute(
    ['SELECT category,',
      'SUM(CASE WHEN is_system = 1 THEN 1 ELSE 0 END) AS system_count,',
      'SUM(CASE WHEN is_system = 0 THEN 1 ELSE 0 END) AS custom_count',
      'FROM exercises WHERE deleted_at IS NULL',
      'AND ((is_system = 1 AND owner_user_id IS NULL)',
      'OR (is_system = 0 AND owner_user_id = ?))',
      'GROUP BY category'].join(' '),
    [userId]
  )
  return rows
}

async function create(record) {
  await pool.execute(
    ['INSERT INTO exercises',
      '(id, owner_user_id, name, name_normalized, body_parts, record_methods,',
      'category, muscle_group, primary_muscles, secondary_muscles, variants, equipment, sort_order,',
      'is_system, idempotency_key, request_hash, version, created_at, updated_at)',
      'VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?, ?, 1, UTC_TIMESTAMP(3), UTC_TIMESTAMP(3))'].join(' '),
    [record.id, record.ownerUserId, record.name, record.nameNormalized,
      JSON.stringify(record.bodyParts), JSON.stringify(record.recordMethods),
      record.category, record.muscleGroup, JSON.stringify(record.primaryMuscles),
      JSON.stringify(record.secondaryMuscles), JSON.stringify(record.variants),
      record.equipment, record.sortOrder,
      record.idempotencyKey, record.requestHash]
  )
}

async function update(userId, id, version, changes) {
  const assignments = []
  const params = []
  for (const [key, column] of [
    ['name', 'name'], ['nameNormalized', 'name_normalized'],
    ['category', 'category'], ['muscleGroup', 'muscle_group'],
    ['equipment', 'equipment'], ['sortOrder', 'sort_order']
  ]) {
    if (changes[key] !== undefined) {
      assignments.push(column + ' = ?')
      params.push(changes[key])
    }
  }
  for (const [key, column] of [
    ['bodyParts', 'body_parts'], ['recordMethods', 'record_methods'],
    ['primaryMuscles', 'primary_muscles'], ['secondaryMuscles', 'secondary_muscles'],
    ['variants', 'variants']
  ]) {
    if (changes[key] !== undefined) {
      assignments.push(column + ' = ?')
      params.push(JSON.stringify(changes[key]))
    }
  }
  const [result] = await pool.execute(
    ['UPDATE exercises SET', assignments.join(', '),
      ', version = version + 1, updated_at = UTC_TIMESTAMP(3)',
      'WHERE id = ? AND owner_user_id = ? AND is_system = 0',
      'AND version = ? AND deleted_at IS NULL'].join(' '),
    [...params, id, userId, version]
  )
  return result.affectedRows > 0
}

async function softDelete(userId, id, version) {
  const [result] = await pool.execute(
    ['UPDATE exercises SET deleted_at = UTC_TIMESTAMP(3),',
      'updated_at = UTC_TIMESTAMP(3), version = version + 1',
      'WHERE id = ? AND owner_user_id = ? AND is_system = 0',
      'AND version = ? AND deleted_at IS NULL'].join(' '),
    [id, userId, version]
  )
  return result.affectedRows > 0
}

module.exports = {
  findVisibleById, findByNormalizedName, findByIdempotencyKey,
  list, countVisibleByCategory, create, update, softDelete
}
