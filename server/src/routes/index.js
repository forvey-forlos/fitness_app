const { Router } = require('express')
const createHealthRoutes = require('./health')
const createTrainingPlanRoutes = require('./trainingPlans')
const createAuthRoutes = require('./auth')
const createUsersRoutes = require('./users')
const createBodyProfilesRoutes = require('./bodyProfiles')
const createBodyMeasurementsRoutes = require('./bodyMeasurements')
const createExercisesRoutes = require('./exercises')
const createTrainingSessionsRoutes = require('./trainingSessions')
const createHomeRoutes = require('./home')
const createWechatAuthRoutes = require('./wechatAuth')
const createAvatarRoutes = require('./avatars')
const createWechatBindingsRoutes = require('./wechatBindings')

function createRoutes(services) {
  const router = Router()
  const healthRoutes = createHealthRoutes(services.healthService)
  const trainingPlanRoutes = createTrainingPlanRoutes(services.trainingPlanService, services.authMiddleware)
  const authRoutes = createAuthRoutes(services.authService)
  const usersRoutes = createUsersRoutes(services.userService, services.authMiddleware)
  const bodyRoutes = createBodyProfilesRoutes(services.bodyProfilesService, services.authMiddleware)
  const bodyMeasurementRoutes = createBodyMeasurementsRoutes(services.bodyMeasurementsService, services.authMiddleware)
  const exerciseRoutes = createExercisesRoutes(services.exercisesService, services.authMiddleware)
  const trainingSessionsRoutes = createTrainingSessionsRoutes(services.trainingSessionsService, services.authMiddleware)
  const homeRoutes = createHomeRoutes(services.homeService, services.authMiddleware)
  const wechatAuthRoutes = createWechatAuthRoutes(services.wechatAuthService)
  const avatarRoutes = createAvatarRoutes(services.avatarService, services.authMiddleware)
  const wechatBindingsRoutes = createWechatBindingsRoutes(services.wechatBindingsService, services.authMiddleware)

  router.use('/api/v1/auth', authRoutes)
  router.use('/api/v1/auth', wechatAuthRoutes)
  router.use('/api/v1/users', usersRoutes)
  router.use('/api/v1/users', wechatBindingsRoutes)
  router.use('/api/v1/body', bodyRoutes)
  router.use('/api/v1/body', bodyMeasurementRoutes)
  router.use('/api/v1/exercises', exerciseRoutes)
  router.use('/api/v1/home', homeRoutes)
  router.use('/api/v1', avatarRoutes)
  router.use('/api/v1', healthRoutes.v1, trainingPlanRoutes.v1, trainingSessionsRoutes)

  // Temporary aliases for the existing frontend. Remove after it adopts /api/v1.
  router.use('/api', healthRoutes.legacy, trainingPlanRoutes.legacy)

  return router
}

module.exports = createRoutes
