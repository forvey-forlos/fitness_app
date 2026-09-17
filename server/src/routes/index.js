const { Router } = require('express')
const createHealthRoutes = require('./health')
const createTrainingPlanRoutes = require('./trainingPlans')

function createRoutes(services) {
  const router = Router()
  const healthRoutes = createHealthRoutes(services.healthService)
  const trainingPlanRoutes = createTrainingPlanRoutes(services.trainingPlanService)

  router.use('/api/v1', healthRoutes.v1, trainingPlanRoutes.v1)

  // Temporary aliases for the existing frontend. Remove after it adopts /api/v1.
  router.use('/api', healthRoutes.legacy, trainingPlanRoutes.legacy)

  return router
}

module.exports = createRoutes
