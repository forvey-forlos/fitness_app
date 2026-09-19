const { HttpError } = require('../utils/response')

const fields = ['height', 'weight', 'waist', 'chest', 'hip', 'shoulderWidth', 'thigh', 'upperArm', 'calf']
const ranges = {
  height: [30, 300],
  weight: [1, 500],
  waist: [1, 300],
  chest: [1, 300],
  hip: [1, 300],
  shoulderWidth: [1, 300],
  thigh: [1, 300],
  upperArm: [1, 300],
  calf: [1, 300]
}

function validatePutProfile(req, res, next) {
  const body = req.body
  const errors = []
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    errors.push({ field: 'body', message: '请求体必须是对象' })
  } else {
    for (const key of Object.keys(body)) {
      if (key !== 'version' && !fields.includes(key)) {
        errors.push({ field: key, message: '不支持的身体指标' })
      }
    }
    if (!Number.isInteger(body.version) || body.version < 0 || body.version > 4294967294) {
      errors.push({ field: 'version', message: '版本号必须是有效的非负整数' })
    }
    for (const field of fields) {
      const value = body[field]
      const [min, max] = ranges[field]
      if (!Object.hasOwn(body, field) ||
          (value !== null && (typeof value !== 'number' || !Number.isFinite(value) ||
            value < min || value > max || Math.abs(value * 100 - Math.round(value * 100)) > 1e-7))) {
        errors.push({ field, message: field + ' 必须为 null 或范围内最多两位小数的数字' })
      }
    }
  }
  if (errors.length) return next(new HttpError(400, 'VALIDATION_ERROR', '请求参数不合法', errors))
  req.validated = body
  next()
}

module.exports = { validatePutProfile, fields }
