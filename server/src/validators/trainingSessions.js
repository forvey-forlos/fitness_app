const { HttpError } = require('../utils/response')
const { validDate } = require('../utils/bodyTime')

const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

function fail(errors) { return new HttpError(400, 'VALIDATION_ERROR', '请求参数不合法', errors) }
function timestamp(value) {
  return typeof value === 'string' &&
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?(?:Z|[+-]\d{2}:\d{2})$/.test(value) &&
    !Number.isNaN(Date.parse(value))
}
function validateId(req, res, next) {
  if (!uuid.test(req.params.id || '')) return next(fail([{ field: 'id', message: 'ID 不合法' }]))
  next()
}
function validateComplete(req, res, next) {
  const body = req.body
  const errors = []
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return next(fail([{ field: 'body', message: '请求体必须是对象' }]))
  }
  for (const key of Object.keys(body)) {
    if (!['version', 'startedAt', 'completedAt', 'exercises'].includes(key)) errors.push({ field: key, message: '不支持的字段' })
  }
  if (!Number.isInteger(body.version) || body.version < 1 || body.version > 4294967294) {
    errors.push({ field: 'version', message: '必须提供有效版本号' })
  }
  for (const key of ['startedAt', 'completedAt']) {
    if (body[key] !== undefined && !timestamp(body[key])) errors.push({ field: key, message: '必须为带时区的 ISO 时间' })
  }
  if (timestamp(body.startedAt) && timestamp(body.completedAt) && Date.parse(body.startedAt) > Date.parse(body.completedAt)) {
    errors.push({ field: 'startedAt', message: '开始时间不能晚于完成时间' })
  }
  if (!Array.isArray(body.exercises) || !body.exercises.length) {
    errors.push({ field: 'exercises', message: '必须提供至少一个动作的实际完成数据' })
  } else {
    const seen = new Set()
    body.exercises.forEach((item, index) => {
      const field = `exercises[${index}]`
      if (!item || typeof item !== 'object' || Array.isArray(item)) {
        errors.push({ field, message: '必须是对象' }); return
      }
      for (const key of Object.keys(item)) {
        if (!['exerciseId', 'actual'].includes(key)) errors.push({ field: `${field}.${key}`, message: '不支持的字段' })
      }
      if (!uuid.test(item.exerciseId || '')) errors.push({ field: `${field}.exerciseId`, message: 'ID 不合法' })
      else if (seen.has(item.exerciseId)) errors.push({ field: `${field}.exerciseId`, message: '动作不能重复' })
      else seen.add(item.exerciseId)
      const actual = item.actual
      if (!actual || typeof actual !== 'object' || Array.isArray(actual)) {
        errors.push({ field: `${field}.actual`, message: '必须提供实际数据' }); return
      }
      for (const key of Object.keys(actual)) {
        if (!['kg', 'reps', 'sets'].includes(key)) errors.push({ field: `${field}.actual.${key}`, message: '不支持的字段' })
      }
      if (typeof actual.kg !== 'number' || !Number.isFinite(actual.kg) || actual.kg < 0 || actual.kg > 1000) {
        errors.push({ field: `${field}.actual.kg`, message: '必须为 0–1000 的数字' })
      }
      if (!Number.isInteger(actual.reps) || actual.reps < 1 || actual.reps > 1000) {
        errors.push({ field: `${field}.actual.reps`, message: '必须为 1–1000 的整数' })
      }
      if (!Number.isInteger(actual.sets) || actual.sets < 1 || actual.sets > 100) {
        errors.push({ field: `${field}.actual.sets`, message: '必须为 1–100 的整数' })
      }
    })
  }
  const key = req.get('Idempotency-Key')
  if (!key || !/^[\x21-\x7E]{1,128}$/.test(key)) errors.push({ field: 'Idempotency-Key', message: '须提供 1–128 位可见 ASCII 幂等键' })
  if (errors.length) return next(fail(errors))
  req.validated = {
    version: body.version, idempotencyKey: key,
    startedAt: body.startedAt ? new Date(body.startedAt).toISOString() : null,
    completedAt: body.completedAt ? new Date(body.completedAt).toISOString() : null,
    exercises: Array.isArray(body.exercises) ? body.exercises.map((item) => ({
      exerciseId: item.exerciseId,
      actual: { kg: item.actual.kg, reps: item.actual.reps, sets: item.actual.sets }
    })) : []
  }
  next()
}
function validateList(req, res, next) {
  const errors = []
  for (const key of Object.keys(req.query)) {
    if (!['startDate', 'endDate', 'from', 'to', 'page', 'pageSize', 'limit'].includes(key)) errors.push({ field: key, message: '不支持的查询参数' })
  }
  if (req.query.startDate !== undefined && req.query.from !== undefined) errors.push({ field: 'startDate', message: '不能与 from 同时使用' })
  if (req.query.endDate !== undefined && req.query.to !== undefined) errors.push({ field: 'endDate', message: '不能与 to 同时使用' })
  if (req.query.pageSize !== undefined && req.query.limit !== undefined) errors.push({ field: 'limit', message: '不能与 pageSize 同时使用' })
  const startDate = req.query.startDate ?? req.query.from
  const endDate = req.query.endDate ?? req.query.to
  const page = req.query.page ?? '1'
  const pageSize = req.query.pageSize ?? req.query.limit ?? '20'
  if (startDate !== undefined && !validDate(startDate)) errors.push({ field: 'startDate', message: '日期不合法' })
  if (endDate !== undefined && !validDate(endDate)) errors.push({ field: 'endDate', message: '日期不合法' })
  if (validDate(startDate) && validDate(endDate) && startDate > endDate) errors.push({ field: 'endDate', message: '结束日期不能早于开始日期' })
  if (typeof page !== 'string' || !/^[1-9]\d*$/.test(page) || Number(page) > 100000) errors.push({ field: 'page', message: '页码不合法' })
  if (typeof pageSize !== 'string' || !/^[1-9]\d*$/.test(pageSize) || Number(pageSize) > 100) errors.push({ field: 'pageSize', message: '每页条数须为 1–100' })
  if (errors.length) return next(fail(errors))
  req.validated = { startDate, endDate, page: Number(page), pageSize: Number(pageSize) }
  next()
}
function validateWeek(req, res, next) {
  const errors = []
  for (const key of Object.keys(req.query)) {
    if (!['weekStart', 'timezone'].includes(key)) errors.push({ field: key, message: '不支持的查询参数' })
  }
  const weekStart = req.query.weekStart
  const timezone = req.query.timezone
  if (weekStart !== undefined && (!validDate(weekStart) || new Date(weekStart + 'T00:00:00Z').getUTCDay() !== 1)) {
    errors.push({ field: 'weekStart', message: '必须是有效的周一日期' })
  }
  if (timezone !== undefined && (typeof timezone !== 'string' || timezone.length > 64)) {
    errors.push({ field: 'timezone', message: '时区参数不合法' })
  }
  if (errors.length) return next(fail(errors))
  req.validated = { weekStart, timezone }
  next()
}
module.exports = { validateId, validateComplete, validateList, validateWeek }
