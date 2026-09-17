const { Router } = require('express')
const createTrainingPlanController = require('../controllers/trainingPlans')

function createTrainingPlanRoutes(service) {
  const controller = createTrainingPlanController(service)
  const v1 = Router()
  const legacy = Router()

  // This is only the existing test list endpoint, not the future per-date plan API.
  v1.get('/training-plans', controller.list)
  legacy.get('/training-plans', controller.legacyList)

  return { v1, legacy }
}

module.exports = createTrainingPlanRoutes
