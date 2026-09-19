const { Router } = require('express')
const { createAuthMiddleware } = require('../middlewares/auth')
const createController = require('../controllers/trainingSessions')
const { validateId, validateComplete, validateList, validateWeek } = require('../validators/trainingSessions')

function createTrainingSessionsRoutes(service, authenticate = createAuthMiddleware()) {
  const router = Router()
  const controller = createController(service)
  router.post('/training-plans/:id/complete', authenticate, validateId, validateComplete, controller.complete)
  router.get('/training-history', authenticate, validateList, controller.list)
  router.get('/training-history/:id', authenticate, validateId, controller.get)
  router.get('/training-stats/week', authenticate, validateWeek, controller.weekly)
  router.get('/training-records', authenticate, validateList, controller.list)
  router.get('/training-records/:id', authenticate, validateId, controller.get)
  router.get('/training-stats/weekly', authenticate, validateWeek, controller.weekly)
  return router
}

module.exports = createTrainingSessionsRoutes
