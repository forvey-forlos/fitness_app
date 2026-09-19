const { Router } = require('express')
const { createAuthMiddleware } = require('../middlewares/auth')
const createController = require('../controllers/home')
const { validateSummary } = require('../validators/home')

function createHomeRoutes(service, authenticate = createAuthMiddleware()) {
  const router = Router()
  router.get('/summary', authenticate, validateSummary, createController(service).summary)
  return router
}

module.exports = createHomeRoutes
