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

module.exports = { findByNormalizedUsername, create, findForLogin, findActiveById }
