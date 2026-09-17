const { Router } = require('express')
const { createAuthMiddleware } = require('../middlewares/auth')
const createUsersController = require('../controllers/users')

function createUsersRoutes(service, authenticate = createAuthMiddleware()) {
  const router = Router()
  const controller = createUsersController(service)

  router.get('/me', authenticate, controller.me)

  return router
}

module.exports = createUsersRoutes
