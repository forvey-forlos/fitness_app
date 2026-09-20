const { Router } = require('express')
const { createAuthMiddleware } = require('../middlewares/auth')
const createController = require('../controllers/wechatBindings')
const { validateWechatBinding } = require('../validators/wechatBindings')

module.exports = function createWechatBindingsRoutes(service, authenticate = createAuthMiddleware()) {
  const router = Router(), controller = createController(service)
  router.get('/me/identities/wechat', authenticate, controller.status)
  router.post('/me/identities/wechat', authenticate, validateWechatBinding, controller.bind)
  router.delete('/me/identities/wechat', authenticate, controller.unbind)
  return router
}
