const { sendSuccess } = require('../utils/response')

function createBodyProfilesController(service) {
  return {
    async get(req, res) {
      const bodyService = service || require('../services/bodyProfiles').createBodyProfilesService()
      sendSuccess(res, await bodyService.getProfile(req.userId))
    },
    async put(req, res) {
      const bodyService = service || require('../services/bodyProfiles').createBodyProfilesService()
      sendSuccess(res, await bodyService.putProfile(req.userId, req.validated))
    }
  }
}

module.exports = createBodyProfilesController
