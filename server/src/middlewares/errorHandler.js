const { HttpError } = require('../utils/response')

function errorHandler(error, req, res, next) {
  if (res.headersSent) return next(error)

  let status = 500
  let code = 'INTERNAL_ERROR'
  let message = '服务端异常'

  if (error instanceof HttpError) {
    status = error.status
    code = error.code
    message = error.message
  } else if (error.status === 400 && error.type === 'entity.parse.failed') {
    status = 400
    code = 'VALIDATION_ERROR'
    message = '请求 JSON 格式不合法'
  }

  if (status >= 500) {
    console.error(`[${req.requestId}] ${req.method} ${req.path}: ${code}`)
  }

  res.status(status).json({ code, message, data: null, requestId: req.requestId })
}

module.exports = errorHandler
