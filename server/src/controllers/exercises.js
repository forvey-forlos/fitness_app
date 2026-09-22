const { sendSuccess } = require('../utils/response')

function createExercisesController(service) {
  return {
    async list(req, res) {
      const exercises = service || require('../services/exercises').createExercisesService()
      sendSuccess(res, await exercises.list(req.userId, req.validated))
    },
    async get(req, res) {
      const exercises = service || require('../services/exercises').createExercisesService()
      sendSuccess(res, await exercises.get(req.userId, req.params.id))
    },
    async create(req, res) {
      const exercises = service || require('../services/exercises').createExercisesService()
      const result = await exercises.create(req.userId, req.validated)
      sendSuccess(res, result.exercise, result.created ? 201 : 200)
    },
    async addToLibrary(req, res) {
      const exercises = service || require('../services/exercises').createExercisesService()
      sendSuccess(res, await exercises.addToLibrary(req.userId, req.params.id), 201)
    },
    async update(req, res) {
      const exercises = service || require('../services/exercises').createExercisesService()
      sendSuccess(res, await exercises.update(req.userId, req.params.id, req.validated))
    },
    async remove(req, res) {
      const exercises = service || require('../services/exercises').createExercisesService()
      sendSuccess(res, await exercises.remove(req.userId, req.params.id))
    }
  }
}

module.exports = createExercisesController
