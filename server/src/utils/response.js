class HttpError extends Error {
  constructor(status, code, message, errors) {
    super(message)
    this.status = status
    this.code = code
    this.errors = errors
  }
}

function sendSuccess(res, data, status = 200) {
  return res.status(status).json({
    code: 0,
    message: 'ok',
    data,
    requestId: res.req.requestId
  })
}

module.exports = { HttpError, sendSuccess }
