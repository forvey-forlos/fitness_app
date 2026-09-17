const { HttpError } = require('../utils/response')

const USERNAME_PATTERN = /^[A-Za-z\u3400-\u9FFF]+$/u
const PASSWORD_PATTERN = /^[\x21-\x7E]{8,16}$/

function normalizeUsername(username) {
  return username.replace(/[A-Z]/g, (letter) => letter.toLowerCase())
}

function isValidTimezone(timezone) {
  if (typeof timezone !== 'string' || timezone.length > 64) return false
  try {
    new Intl.DateTimeFormat('en-US', { timeZone: timezone })
    return true
  } catch {
    return false
  }
}

function validateRegister(req, res, next) {
  const body = req.body || {}
  const errors = []
  const { username, password } = body
  const timezone = body.timezone === undefined ? 'Asia/Shanghai' : body.timezone

  if (typeof username !== 'string' || !USERNAME_PATTERN.test(username) ||
      Buffer.byteLength(username, 'utf8') < 1 || Buffer.byteLength(username, 'utf8') > 15) {
    errors.push({ field: 'username', message: '用户名只能包含英文字母或中文，且不能超过 15 个 UTF-8 字节' })
  }

  if (typeof password !== 'string' || !PASSWORD_PATTERN.test(password)) {
    errors.push({ field: 'password', message: '密码必须为 8–16 位 ASCII 可见字符' })
  } else {
    const kinds = [/[0-9]/, /[A-Z]/, /[a-z]/, /[^A-Za-z0-9]/]
      .filter((pattern) => pattern.test(password)).length
    if (kinds < 2) {
      errors.push({ field: 'password', message: '密码必须至少包含数字、大写字母、小写字母、特殊字符中的两类' })
    }
  }

  if (!isValidTimezone(timezone)) {
    errors.push({ field: 'timezone', message: '时区不合法' })
  }

  if (errors.length > 0) {
    return next(new HttpError(400, 'VALIDATION_ERROR', '请求参数不合法', errors))
  }

  req.validated = { username, usernameNormalized: normalizeUsername(username), password, timezone }
  next()
}

module.exports = { validateRegister, normalizeUsername }
