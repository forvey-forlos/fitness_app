const { HttpError } = require('../utils/response')
const { validDate } = require('../utils/bodyTime')

const metrics = ['weight', 'waist', 'chest', 'hip', 'shoulderWidth', 'thigh', 'upperArm', 'calf']
const timestampPattern = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})(?:\.(\d{1,3}))?(Z|([+-])(\d{2}):(\d{2}))$/

function validTimestamp(value) {
  if (typeof value !== 'string') return false
  const match = timestampPattern.exec(value)
  if (!match) return false
  const instant = new Date(value)
  if (Number.isNaN(instant.getTime())) return false
  const offset = match[8] === 'Z' ? 0 :
    (match[9] === '+' ? 1 : -1) * (Number(match[10]) * 60 + Number(match[11]))
  const wall = new Date(instant.getTime() + offset * 60000)
  return wall.getUTCFullYear() === Number(match[1]) &&
    wall.getUTCMonth() + 1 === Number(match[2]) &&
    wall.getUTCDate() === Number(match[3]) &&
    wall.getUTCHours() === Number(match[4]) &&
    wall.getUTCMinutes() === Number(match[5]) &&
    wall.getUTCSeconds() === Number(match[6]) &&
    wall.getUTCMilliseconds() === Number((match[7] || '').padEnd(3, '0') || 0)
}

function validationError(errors) {
  return new HttpError(400, 'VALIDATION_ERROR', '请求参数不合法', errors)
}

function validateMeasurementBody(req, res, next, patch = false) {
  const body = req.body
  const errors = []
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return next(validationError([{ field: 'body', message: '请求体必须是对象' }]))
  }
  const allowed = ['measuredAt', ...metrics, ...(patch ? ['version'] : [])]
  for (const key of Object.keys(body)) {
    if (!allowed.includes(key)) errors.push({ field: key, message: '不支持的字段' })
  }
  if (!patch || Object.hasOwn(body, 'measuredAt')) {
    if (!validTimestamp(body.measuredAt)) {
      errors.push({ field: 'measuredAt', message: '必须是带时区的 ISO 8601 时间，精确到毫秒' })
    }
  }
  if (patch && (!Number.isInteger(body.version) || body.version < 1 || body.version > 4294967294)) {
    errors.push({ field: 'version', message: '必须提供有效版本号' })
  }
  if (patch && !['measuredAt', ...metrics].some((key) => Object.hasOwn(body, key))) {
    errors.push({ field: 'body', message: '至少提供一个要修改的字段' })
  }
  if (!patch && !metrics.some((key) => body[key] !== undefined && body[key] !== null)) {
    errors.push({ field: 'body', message: '至少提供一项身体数值' })
  }
  for (const key of metrics) {
    if (body[key] === undefined) continue
    const value = body[key]
    const min = 1
    const max = key === 'weight' ? 500 : 300
    if (value !== null && (typeof value !== 'number' || !Number.isFinite(value) ||
        value < min || value > max || Math.abs(value * 100 - Math.round(value * 100)) > 1e-7)) {
      errors.push({ field: key, message: '必须为 null 或范围内最多两位小数的数字' })
    }
  }
  if (!patch) {
    const key = req.get('Idempotency-Key')
    if (key !== undefined && !/^[\x21-\x7E]{1,128}$/.test(key)) {
      errors.push({ field: 'Idempotency-Key', message: '幂等键必须为 1–128 位可见 ASCII 字符' })
    }
  }
  if (errors.length) return next(validationError(errors))
  req.validated = { ...body }
  if (body.measuredAt) req.validated.measuredAt = new Date(body.measuredAt).toISOString()
  if (!patch) {
    for (const key of metrics) req.validated[key] = body[key] === undefined ? null : body[key]
    req.validated.idempotencyKey = req.get('Idempotency-Key') || null
  }
  next()
}

function validateCreate(req, res, next) { validateMeasurementBody(req, res, next) }
function validateUpdate(req, res, next) { validateMeasurementBody(req, res, next, true) }

function validateList(req, res, next) {
  const { startDate, endDate, page = '1', pageSize = '20' } = req.query
  const errors = []
  for (const key of Object.keys(req.query)) {
    if (!['startDate', 'endDate', 'page', 'pageSize'].includes(key)) {
      errors.push({ field: key, message: '不支持的查询参数' })
    }
  }
  if (startDate !== undefined && !validDate(startDate)) errors.push({ field: 'startDate', message: '必须为有效的 YYYY-MM-DD' })
  if (endDate !== undefined && !validDate(endDate)) errors.push({ field: 'endDate', message: '必须为有效的 YYYY-MM-DD' })
  if (validDate(startDate) && validDate(endDate) && startDate > endDate) {
    errors.push({ field: 'endDate', message: '结束日期不能早于开始日期' })
  }
  if (!/^[1-9]\d*$/.test(page) || Number(page) > 100000) errors.push({ field: 'page', message: '页码不合法' })
  if (!/^[1-9]\d*$/.test(pageSize) || Number(pageSize) > 100) errors.push({ field: 'pageSize', message: '每页条数必须为 1–100' })
  if (errors.length) return next(validationError(errors))
  req.validated = { startDate, endDate, page: Number(page), pageSize: Number(pageSize) }
  next()
}

function validateTrend(req, res, next) {
  if (!['week', 'month'].includes(req.query.range) || Object.keys(req.query).some((key) => key !== 'range')) {
    return next(validationError([{ field: 'range', message: '只支持 week 或 month' }]))
  }
  req.validated = { range: req.query.range }
  next()
}

module.exports = { validateCreate, validateUpdate, validateList, validateTrend, metrics }
