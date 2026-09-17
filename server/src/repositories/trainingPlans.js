const pool = require('../config/db')

async function findAll() {
  const [rows] = await pool.query('SELECT * FROM training_plans ORDER BY id DESC')
  return rows
}

module.exports = { findAll }
