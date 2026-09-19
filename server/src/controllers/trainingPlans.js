const { sendSuccess } = require('../utils/response')

function createTrainingPlanController(service) {
  function plans() {
    return service || require('../services/trainingPlans').createTrainingPlansService()
  }
  return {
    async list(req, res) {
      sendSuccess(res, await plans().list(req.userId, req.validated))
    },
    async get(req, res) {
      sendSuccess(res, await plans().get(req.userId, req.params.id))
    },
    async create(req, res) {
      const result = await plans().create(req.userId, req.validated)
      sendSuccess(res, result.plan, result.created ? 201 : 200)
    },
    async update(req, res) {
      sendSuccess(res, await plans().update(req.userId, req.params.id, req.validated))
    },
    async remove(req, res) {
      sendSuccess(res, await plans().remove(req.userId, req.params.id))
    },
    async legacyList(req, res) {
      try {
        const result = await plans().list(req.userId, req.validated)
        res.json({ ok: true, data: result.items })
      } catch (_) {
        res.status(500).json({ ok: false, message: 'failed to load training plans' })
      }
    }
  }
}

module.exports = createTrainingPlanController
