const { Router } = require('express')
const { createAuthMiddleware } = require('../middlewares/auth')
const createUsersController = require('../controllers/users')
const { validateUpdateMe } = require('../validators/users')

function createUsersRoutes(service, authenticate = createAuthMiddleware()) {
  const router = Router()
  const controller = createUsersController(service)

  router.get('/me', authenticate, controller.me)
  router.patch('/me', authenticate, validateUpdateMe, controller.updateMe)

  return router
}

module.exports = createUsersRoutes
