const { sendSuccess } = require('../utils/response')

function createHomeController(service) {
  function home() {
    return service || require('../services/home').createHomeService()
  }
  return {
    async summary(req, res) {
      sendSuccess(res, await home().summary(req.userId, req.validated))
    }
  }
}

module.exports = createHomeController
