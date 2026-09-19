const pool = require('../config/db')
const { sqlUtc } = require('../utils/bodyTime')

const columns = [
  ['weight', 'weight'], ['waist', 'waist'], ['chest', 'chest'],
  ['hip', 'hip'], ['shoulderWidth', 'shoulder_width'], ['thigh', 'thigh'],
  ['upperArm', 'upper_arm'], ['calf', 'calf']
]
const selectColumns = [
  'id, user_id,', columns.map(([, column]) => column).join(', '), ', version, request_hash,',
  "DATE_FORMAT(measured_at, '%Y-%m-%dT%H:%i:%s.%fZ') AS measured_at,",
  "DATE_FORMAT(created_at, '%Y-%m-%dT%H:%i:%s.%fZ') AS created_at,",
  "DATE_FORMAT(updated_at, '%Y-%m-%dT%H:%i:%s.%fZ') AS updated_at,",
  'deleted_at'
].join(' ')

async function findOwnedById(userId, id) {
  const [rows] = await pool.execute(
    ['SELECT', selectColumns, 'FROM body_measurements',
      'WHERE user_id = ? AND id = ? AND deleted_at IS NULL LIMIT 1'].join(' '),
    [userId, id]
  )
  return rows[0] || null
}

async function findLatestByUserId(userId) {
  const [rows] = await pool.execute(
    ['SELECT', selectColumns, 'FROM body_measurements',
      'WHERE user_id = ? AND deleted_at IS NULL',
      'ORDER BY measured_at DESC, id DESC LIMIT 1'].join(' '),
    [userId]
  )
  return rows[0] || null
}

async function findByIdempotencyKey(userId, key) {
  const [rows] = await pool.execute(
    ['SELECT', selectColumns, 'FROM body_measurements',
      'WHERE user_id = ? AND idempotency_key = ? LIMIT 1'].join(' '),
    [userId, key]
  )
  return rows[0] || null
}

async function create(record) {
  const names = ['id', 'user_id', 'measured_at', ...columns.map(([, column]) => column),
    'idempotency_key', 'request_hash', 'version', 'created_at', 'updated_at']
  const placeholders = [Array(13).fill('?').join(', '), '1', 'UTC_TIMESTAMP(3)', 'UTC_TIMESTAMP(3)']
  await pool.execute(
    ['INSERT INTO body_measurements (', names.join(', '), ') VALUES (',
      placeholders.join(', '), ')'].join(' '),
    [record.id, record.userId, sqlUtc(record.measuredAt),
      ...columns.map(([key]) => record[key]), record.idempotencyKey, record.requestHash]
  )
}

function filterSql(userId, start, end) {
  const conditions = ['user_id = ?', 'deleted_at IS NULL']
  const params = [userId]
  if (start) {
    conditions.push('measured_at >= ?')
    params.push(sqlUtc(start))
  }
  if (end) {
    conditions.push('measured_at < ?')
    params.push(sqlUtc(end))
  }
  return { where: 'WHERE ' + conditions.join(' AND '), params }
}

async function list(userId, { start, end, page, pageSize }) {
  const { where, params } = filterSql(userId, start, end)
  const [countRows] = await pool.execute(
    'SELECT COUNT(*) AS total FROM body_measurements ' + where, params
  )
  const [rows] = await pool.execute(
    ['SELECT', selectColumns, 'FROM body_measurements', where,
      'ORDER BY measured_at DESC, id DESC LIMIT ? OFFSET ?'].join(' '),
    [...params, pageSize, (page - 1) * pageSize]
  )
  return { rows, total: Number(countRows[0].total) }
}

async function update(userId, id, version, changes) {
  const assignments = []
  const params = []
  if (changes.measuredAt !== undefined) {
    assignments.push('measured_at = ?')
    params.push(sqlUtc(changes.measuredAt))
  }
  for (const [key, column] of columns) {
    if (changes[key] !== undefined) {
      assignments.push(column + ' = ?')
      params.push(changes[key])
    }
  }
  const [result] = await pool.execute(
    ['UPDATE body_measurements SET', assignments.join(', '),
      ', version = version + 1, updated_at = UTC_TIMESTAMP(3)',
      'WHERE user_id = ? AND id = ? AND version = ? AND deleted_at IS NULL'].join(' '),
    [...params, userId, id, version]
  )
  return result.affectedRows > 0
}

async function softDelete(userId, id, version) {
  const [result] = await pool.execute(
    ['UPDATE body_measurements SET deleted_at = UTC_TIMESTAMP(3),',
      'updated_at = UTC_TIMESTAMP(3), version = version + 1',
      'WHERE user_id = ? AND id = ? AND version = ? AND deleted_at IS NULL'].join(' '),
    [userId, id, version]
  )
  return result.affectedRows > 0
}

async function listWeights(userId, start, end) {
  const [rows] = await pool.execute(
    ["SELECT id, weight, DATE_FORMAT(measured_at, '%Y-%m-%dT%H:%i:%s.%fZ') AS measured_at",
      'FROM body_measurements',
      'WHERE user_id = ? AND deleted_at IS NULL AND weight IS NOT NULL',
      'AND measured_at >= ? AND measured_at < ?',
      'ORDER BY measured_at ASC, id ASC'].join(' '),
    [userId, sqlUtc(start), sqlUtc(end)]
  )
  return rows
}

module.exports = {
  findOwnedById, findLatestByUserId, findByIdempotencyKey,
  create, list, update, softDelete, listWeights
}
