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

module.exports = { findByNormalizedUsername, create }
