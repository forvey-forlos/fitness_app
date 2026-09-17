const { Router } = require('express')
const createAuthController = require('../controllers/auth')
const { validateRegister } = require('../validators/auth')

function createAuthRoutes(service) {
  const router = Router()
  const controller = createAuthController(service)

  router.post('/register', validateRegister, controller.register)

  return router
}

module.exports = createAuthRoutes
