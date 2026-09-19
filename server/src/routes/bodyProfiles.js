const { Router } = require('express')
const { createAuthMiddleware } = require('../middlewares/auth')
const createBodyProfilesController = require('../controllers/bodyProfiles')
const { validatePutProfile } = require('../validators/body')

function createBodyProfilesRoutes(service, authenticate = createAuthMiddleware()) {
  const router = Router()
  const controller = createBodyProfilesController(service)
  router.get('/profile', authenticate, controller.get)
  router.put('/profile', authenticate, validatePutProfile, controller.put)
  return router
}

module.exports = createBodyProfilesRoutes
