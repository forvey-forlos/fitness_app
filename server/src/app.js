const express = require('express')
const cors = require('cors')

const createRoutes = require('./routes')
const requestId = require('./middlewares/requestId')
const notFound = require('./middlewares/notFound')
const errorHandler = require('./middlewares/errorHandler')

function createApp(services = {}) {
  const app = express()

  app.use(requestId)
  app.use(cors())
  app.use(express.json())
  app.use(createRoutes(services))
  app.use(notFound)
  app.use(errorHandler)

  return app
}

module.exports = createApp
