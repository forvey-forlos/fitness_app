const pool = require('../config/db')

const columns = ['height', 'weight', 'waist', 'chest', 'hip', 'shoulder_width', 'thigh', 'upper_arm', 'calf']
const selectSql = [
  'SELECT user_id,', columns.join(', '), ', version,',
  "DATE_FORMAT(created_at, '%Y-%m-%dT%H:%i:%s.%fZ') AS created_at,",
  "DATE_FORMAT(updated_at, '%Y-%m-%dT%H:%i:%s.%fZ') AS updated_at",
  'FROM body_profiles WHERE user_id = ? LIMIT 1'
].join(' ')

async function findByUserId(userId) {
  const [rows] = await pool.execute(selectSql, [userId])
  return rows[0] || null
}

async function create(userId, values) {
  const [result] = await pool.execute(
    ['INSERT INTO body_profiles (user_id,', columns.join(', '), ', version, created_at, updated_at)',
      'VALUES (', Array(10).fill('?').join(', '), ', 1, UTC_TIMESTAMP(3), UTC_TIMESTAMP(3))'].join(' '),
    [userId, ...values]
  )
  return result.affectedRows > 0
}

async function update(userId, version, values) {
  const assignments = columns.map((column) => column + ' = ?').join(', ')
  const [result] = await pool.execute(
    ['UPDATE body_profiles SET', assignments,
      ', version = version + 1, updated_at = UTC_TIMESTAMP(3)',
      'WHERE user_id = ? AND version = ?'].join(' '),
    [...values, userId, version]
  )
  return result.affectedRows > 0
}

module.exports = { findByUserId, create, update }
