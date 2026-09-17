const { Router } = require('express')
const createAuthController = require('../controllers/auth')
const { validateRegister, validateLogin, validateRefresh, validateLogout } = require('../validators/auth')

function createAuthRoutes(service) {
  const router = Router()
  const controller = createAuthController(service)

  router.post('/register', validateRegister, controller.register)
  router.post('/login', validateLogin, controller.login)
  router.post('/refresh', validateRefresh, controller.refresh)
  router.post('/logout', validateLogout, controller.logout)

  return router
}

module.exports = createAuthRoutes
