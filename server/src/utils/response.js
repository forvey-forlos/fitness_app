class HttpError extends Error {
  constructor(status, code, message) {
    super(message)
    this.status = status
    this.code = code
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
