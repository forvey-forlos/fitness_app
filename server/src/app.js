const express = require('express')
const cors = require('cors')
require('dotenv').config()

const pool = require('./config/db')

const app = express()

app.use(cors())
app.use(express.json())

app.get('/api/health', (req, res) => {
  res.json({
    ok: true,
    message: 'backend is running'
  })
})

app.get('/api/db-test', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT 1 AS result')

    res.json({
      ok: true,
      message: 'database connected',
      result: rows[0].result
    })
  } catch (error) {
    console.error(error)

    res.status(500).json({
      ok: false,
      message: 'database connection failed'
    })
  }
})

app.get('/api/training-plans', async (req, res) => {
  try {
    const [rows] = await pool.query(
      'SELECT * FROM training_plans ORDER BY id DESC'
    )

    res.json({
      ok: true,
      data: rows
    })
  } catch (error) {
    console.error(error)

    res.status(500).json({
      ok: false,
      message: 'failed to load training plans'
    })
  }
})

const PORT = process.env.PORT || 8080

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server is running on 0.0.0.0:${PORT}`)
})
