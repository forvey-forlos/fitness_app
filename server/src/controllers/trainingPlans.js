const { sendSuccess } = require('../utils/response')

function createTrainingPlanController(service) {
  service = service || require('../services/trainingPlans')
  return {
    async list(req, res) {
      const plans = await service.listPlans()
      sendSuccess(res, plans)
    },

    async legacyList(req, res) {
      try {
        const plans = await service.listPlans()
        res.json({ ok: true, data: plans })
      } catch (error) {
        res.status(500).json({ ok: false, message: 'failed to load training plans' })
      }
    }
  }
}

module.exports = createTrainingPlanController
