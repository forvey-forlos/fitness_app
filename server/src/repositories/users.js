const pool = require('../config/db')

async function findByNormalizedUsername(usernameNormalized) {
  const [rows] = await pool.execute(
    'SELECT id FROM users WHERE username_normalized = ? LIMIT 1',
    [usernameNormalized]
  )
  return rows[0] || null
}

async function create(user) {
  await pool.execute(
    `INSERT INTO users
      (id, username, username_normalized, password_hash, timezone, status)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [user.id, user.username, user.usernameNormalized, user.passwordHash,
      user.timezone, user.status]
  )
}

async function findForLogin(usernameNormalized) {
  const [rows] = await pool.execute(
    `SELECT id, username, password_hash, avatar_url, timezone, status, deleted_at
     FROM users WHERE username_normalized = ? LIMIT 1`,
    [usernameNormalized]
  )
  return rows[0] || null
}

async function findActiveById(id) {
  const [rows] = await pool.execute(
    `SELECT id, username, avatar_url, timezone
     FROM users WHERE id = ? AND status = 'active' AND deleted_at IS NULL LIMIT 1`,
    [id]
  )
  return rows[0] || null
}

async function updateProfile(id, changes) {
  const sets = []
  const values = []
  if (changes.username !== undefined) {
    sets.push('username = ?', 'username_normalized = ?')
    values.push(changes.username, changes.usernameNormalized)
  }
  if (changes.avatarUrl !== undefined) {
    sets.push('avatar_url = ?')
    values.push(changes.avatarUrl)
  }
  if (changes.timezone !== undefined) {
    sets.push('timezone = ?')
    values.push(changes.timezone)
  }
  values.push(id)
  const [result] = await pool.execute(
    ['UPDATE users SET', sets.join(', '), ', updated_at = UTC_TIMESTAMP(3)',
      "WHERE id = ? AND status = 'active' AND deleted_at IS NULL"].join(' '),
    values
  )
  return result.affectedRows > 0
}

module.exports = { findByNormalizedUsername, create, findForLogin, findActiveById, updateProfile }
