const jwt = require('jsonwebtoken')
const { HttpError } = require('../utils/response')

function unauthorized() {
  return new HttpError(401, 'UNAUTHORIZED', '登录已失效，请重新登录')
}

function createAuthMiddleware(options = {}) {
  return function authenticate(req, res, next) {
    const match = /^Bearer\s+(\S+)$/i.exec(req.get('Authorization') || '')
    if (!match) return next(unauthorized())

    try {
      const config = options.tokenConfig || require('../config/tokens').getTokenConfig()
      const payload = jwt.verify(match[1], config.accessSecret, { algorithms: ['HS256'] })
      if (typeof payload.sub !== 'string' || !payload.sub) return next(unauthorized())
      req.userId = payload.sub
      next()
    } catch (_) {
      next(unauthorized())
    }
  }
}

module.exports = { createAuthMiddleware }
