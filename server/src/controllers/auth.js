const { sendSuccess } = require('../utils/response')

function createAuthController(service) {
  return {
    async register(req, res) {
      const authService = service || require('../services/auth').createAuthService()
      const user = await authService.register(req.validated)
      sendSuccess(res, { user }, 201)
    },

    async login(req, res) {
      const authService = service || require('../services/auth').createAuthService()
      const result = await authService.login(req.validated)
      sendSuccess(res, result)
    },

    async refresh(req, res) {
      const authService = service || require('../services/auth').createAuthService()
      const result = await authService.refresh(req.validated)
      sendSuccess(res, result)
    },

    async logout(req, res) {
      const authService = service || require('../services/auth').createAuthService()
      await authService.logout(req.validated)
      sendSuccess(res, null)
    }
  }
}

module.exports = createAuthController
