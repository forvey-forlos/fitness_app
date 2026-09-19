const { Router } = require('express')
const { createAuthMiddleware } = require('../middlewares/auth')
const createBodyMeasurementsController = require('../controllers/bodyMeasurements')
const { validateCreate, validateUpdate, validateList, validateTrend } = require('../validators/bodyMeasurements')

function createBodyMeasurementsRoutes(service, authenticate = createAuthMiddleware()) {
  const router = Router()
  const controller = createBodyMeasurementsController(service)
  router.post('/measurements', authenticate, validateCreate, controller.create)
  router.get('/measurements', authenticate, validateList, controller.list)
  router.patch('/measurements/:id', authenticate, validateUpdate, controller.update)
  router.delete('/measurements/:id', authenticate, controller.remove)
  router.get('/trends/weight', authenticate, validateTrend, controller.weightTrend)
  return router
}

module.exports = createBodyMeasurementsRoutes
