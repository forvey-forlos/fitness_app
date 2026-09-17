const { HttpError } = require('../utils/response')

function notFound(req, res, next) {
  next(new HttpError(404, 'NOT_FOUND', '接口不存在'))
}

module.exports = notFound
