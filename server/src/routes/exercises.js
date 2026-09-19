const { Router } = require('express')
const { createAuthMiddleware } = require('../middlewares/auth')
const createExercisesController = require('../controllers/exercises')
const { validateCreate, validateUpdate, validateList } = require('../validators/exercises')

function createExercisesRoutes(service, authenticate = createAuthMiddleware()) {
  const router = Router()
  const controller = createExercisesController(service)
  router.get('/', authenticate, validateList, controller.list)
  router.get('/:id', authenticate, controller.get)
  router.post('/', authenticate, validateCreate, controller.create)
  router.patch('/:id', authenticate, validateUpdate, controller.update)
  router.delete('/:id', authenticate, controller.remove)
  return router
}

module.exports = createExercisesRoutes
