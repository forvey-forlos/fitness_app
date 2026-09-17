const pool = require('../config/db')

async function checkDatabase() {
  const [rows] = await pool.query('SELECT 1 AS result')
  return rows[0].result
}

module.exports = { checkDatabase }
