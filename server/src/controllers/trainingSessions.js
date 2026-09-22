const { sendSuccess } = require('../utils/response')

function createTrainingSessionsController(service) {
  function sessions() {
    return service || require('../services/trainingSessions').createTrainingSessionsService()
  }
  return {
    async complete(req, res) {
      sendSuccess(res, await sessions().complete(req.userId, req.params.id, req.validated))
    },
    async list(req, res) {
      sendSuccess(res, await sessions().list(req.userId, req.validated))
    },
    async get(req, res) {
      sendSuccess(res, await sessions().get(req.userId, req.params.id))
    },
    async remove(req, res) {
      sendSuccess(res, await sessions().remove(req.userId, req.params.id))
    },
    async weekly(req, res) {
      sendSuccess(res, await sessions().weekly(req.userId, req.validated.weekStart, req.validated.timezone))
    }
  }
}

module.exports = createTrainingSessionsController
