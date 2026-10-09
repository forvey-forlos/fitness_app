const { HttpError } = require('../utils/response')
const { isValidDisplayName, isValidTimezone } = require('./auth')

function validateUpdateMe(req, res, next) {
  const body = req.body
  const allowed = ['displayName', 'username', 'timezone']
  const errors = []
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    errors.push({ field: 'body', message: '请求体必须是对象' })
  } else {
    for (const key of Object.keys(body)) {
      if (!allowed.includes(key)) errors.push({ field: key, message: '不允许修改此字段' })
    }
    if (!allowed.some((key) => Object.hasOwn(body, key))) {
      errors.push({ field: 'body', message: '至少提供一个可修改字段' })
    }
    const displayName = Object.hasOwn(body, 'displayName') ? body.displayName : body.username
    if ((Object.hasOwn(body, 'displayName') || Object.hasOwn(body, 'username')) && !isValidDisplayName(displayName)) {
      errors.push({ field: 'displayName', message: '昵称只能包含数字、英文或汉字，且不能超过 30 个字符' })
    }
    if (Object.hasOwn(body, 'timezone') && !isValidTimezone(body.timezone)) {
      errors.push({ field: 'timezone', message: '时区不合法' })
    }
  }
  if (errors.length) return next(new HttpError(400, 'VALIDATION_ERROR', '请求参数不合法', errors))
  req.validated = { ...body }
  if (Object.hasOwn(body, 'displayName') || Object.hasOwn(body, 'username')) {
    req.validated.displayName = Object.hasOwn(body, 'displayName') ? body.displayName : body.username
    delete req.validated.username
  }
  next()
}

module.exports = { validateUpdateMe }
