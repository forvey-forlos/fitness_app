const { Router } = require('express')
const createHealthRoutes = require('./health')
const createTrainingPlanRoutes = require('./trainingPlans')
const createAuthRoutes = require('./auth')
const createUsersRoutes = require('./users')

function createRoutes(services) {
  const router = Router()
  const healthRoutes = createHealthRoutes(services.healthService)
  const trainingPlanRoutes = createTrainingPlanRoutes(services.trainingPlanService)
  const authRoutes = createAuthRoutes(services.authService)
  const usersRoutes = createUsersRoutes(services.userService, services.authMiddleware)

  router.use('/api/v1/auth', authRoutes)
  router.use('/api/v1/users', usersRoutes)
  router.use('/api/v1', healthRoutes.v1, trainingPlanRoutes.v1)

  // Temporary aliases for the existing frontend. Remove after it adopts /api/v1.
  router.use('/api', healthRoutes.legacy, trainingPlanRoutes.legacy)

  return router
}

module.exports = createRoutes
