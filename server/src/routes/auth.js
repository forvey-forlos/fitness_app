const { Router } = require('express')
const createAuthController = require('../controllers/auth')
const { validateRegister, validateLogin } = require('../validators/auth')

function createAuthRoutes(service) {
  const router = Router()
  const controller = createAuthController(service)

  router.post('/register', validateRegister, controller.register)
  router.post('/login', validateLogin, controller.login)

  return router
}

module.exports = createAuthRoutes
