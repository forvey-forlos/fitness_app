const { sendSuccess } = require('../utils/response')

function createAuthController(service) {
  return {
    async register(req, res) {
      const authService = service || require('../services/auth').createAuthService()
      const user = await authService.register(req.validated)
      sendSuccess(res, { user }, 201)
    }
  }
}

module.exports = createAuthController
