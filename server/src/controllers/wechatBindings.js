const { sendSuccess } = require('../utils/response')

module.exports = function createWechatBindingsController(service) {
  const getService = () => service || require('../services/wechatBindings').createWechatBindingsService()
  return {
    async status(req, res) { sendSuccess(res, await getService().status(req.userId)) },
    async bind(req, res) { sendSuccess(res, await getService().bind(req.userId, req.validated)) },
    async unbind(req, res) { sendSuccess(res, await getService().unbind(req.userId)) }
  }
}
