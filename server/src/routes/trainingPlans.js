const { Router } = require('express')
const { createAuthMiddleware } = require('../middlewares/auth')
const createTrainingPlanController = require('../controllers/trainingPlans')
const { validateCreate, validateUpdate, validateList } = require('../validators/trainingPlanRecords')

function createTrainingPlanRoutes(service, authenticate = createAuthMiddleware()) {
  const controller = createTrainingPlanController(service)
  const v1 = Router()
  const legacy = Router()

  v1.get('/training-plans', authenticate, validateList, controller.list)
  v1.get('/training-plans/:id', authenticate, controller.get)
  v1.post('/training-plans', authenticate, validateCreate, controller.create)
  v1.put('/training-plans/:id', authenticate, validateUpdate, controller.update)
  v1.delete('/training-plans/:id', authenticate, controller.remove)

  // Keep the old path and response shape, but never expose an unscoped table query.
  legacy.get('/training-plans', authenticate, validateList, controller.legacyList)

  return { v1, legacy }
}

module.exports = createTrainingPlanRoutes
