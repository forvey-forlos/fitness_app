require('dotenv').config()

const createApp = require('./app')
const { getTokenConfig } = require('./config/tokens')

const port = process.env.PORT || 8080

getTokenConfig() // Fail startup if token signing is not configured safely.

createApp().listen(port, '0.0.0.0', () => {
  console.log(`Server is running on 0.0.0.0:${port}`)
})
