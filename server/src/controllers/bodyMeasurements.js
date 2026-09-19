const { sendSuccess } = require('../utils/response')

function createBodyMeasurementsController(service) {
  return {
    async create(req, res) {
      const measurements = service || require('../services/bodyMeasurements').createBodyMeasurementsService()
      const result = await measurements.create(req.userId, req.validated)
      sendSuccess(res, result.measurement, result.created ? 201 : 200)
    },
    async list(req, res) {
      const measurements = service || require('../services/bodyMeasurements').createBodyMeasurementsService()
      sendSuccess(res, await measurements.list(req.userId, req.validated))
    },
    async update(req, res) {
      const measurements = service || require('../services/bodyMeasurements').createBodyMeasurementsService()
      sendSuccess(res, await measurements.update(req.userId, req.params.id, req.validated))
    },
    async remove(req, res) {
      const measurements = service || require('../services/bodyMeasurements').createBodyMeasurementsService()
      sendSuccess(res, await measurements.remove(req.userId, req.params.id))
    },
    async weightTrend(req, res) {
      const measurements = service || require('../services/bodyMeasurements').createBodyMeasurementsService()
      sendSuccess(res, await measurements.weightTrend(req.userId, req.validated.range))
    }
  }
}

module.exports = createBodyMeasurementsController
