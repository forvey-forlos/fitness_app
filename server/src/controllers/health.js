const { sendSuccess } = require('../utils/response')

function createHealthController(service) {
  service = service || require('../services/health')
  return {
    health(req, res) {
      sendSuccess(res, { message: 'backend is running' })
    },

    async database(req, res) {
      const result = await service.checkDatabase()
      sendSuccess(res, { message: 'database connected', result })
    },

    legacyHealth(req, res) {
      res.json({ ok: true, message: 'backend is running' })
    },

    async legacyDatabase(req, res) {
      try {
        const result = await service.checkDatabase()
        res.json({ ok: true, message: 'database connected', result })
      } catch (error) {
        res.status(500).json({ ok: false, message: 'database connection failed' })
      }
    }
  }
}

module.exports = createHealthController
