require('dotenv').config()

const createApp = require('./app')

const port = process.env.PORT || 8080

createApp().listen(port, '0.0.0.0', () => {
  console.log(`Server is running on 0.0.0.0:${port}`)
})
