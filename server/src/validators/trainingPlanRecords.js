const { HttpError } = require('../utils/response')
const { validDate } = require('../utils/bodyTime')

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

function invalid(errors) {
  return new HttpError(400, 'VALIDATION_ERROR', '请求参数不合法', errors)
}

function validOptionalInteger(value, min, max) {
  return value === null || (Number.isInteger(value) && value >= min && value <= max)
}

function validWeight(value) {
  return value === null || (typeof value === 'number' && Number.isFinite(value) &&
    value >= 0 && value <= 1000 &&
    Math.abs(value * 100 - Math.round(value * 100)) < 1e-7)
}

function validateWrite(req, res, next, update = false) {
  const body = req.body
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return next(invalid([{ field: 'body', message: '请求体必须是对象' }]))
  }
  const errors = []
  const allowed = ['planDate', 'name', 'durationMinutes', 'exercises', ...(update ? ['version'] : [])]
  for (const key of Object.keys(body)) {
    if (!allowed.includes(key)) errors.push({ field: key, message: '不允许此字段' })
  }
  if (!validDate(body.planDate)) errors.push({ field: 'planDate', message: '必须为有效的 YYYY-MM-DD 日期' })
  if (update && (!Number.isInteger(body.version) || body.version < 1 || body.version > 4294967294)) {
    errors.push({ field: 'version', message: '必须提供有效版本号' })
  }
  if (body.name !== undefined && body.name !== null && body.name !== '' &&
      (typeof body.name !== 'string' || body.name !== body.name.trim() ||
        Array.from(body.name).length > 100 || /[\p{Cc}\p{Cf}]/u.test(body.name))) {
    errors.push({ field: 'name', message: '名称须为不超过 100 字符的文本' })
  }
  if (body.durationMinutes !== undefined && body.durationMinutes !== null &&
      (!Number.isInteger(body.durationMinutes) ||
        body.durationMinutes < 1 || body.durationMinutes > 1440)) {
    errors.push({ field: 'durationMinutes', message: '预计时长须为 1–1440 分钟' })
  }
  if (!Array.isArray(body.exercises) || body.exercises.length > 100) {
    errors.push({ field: 'exercises', message: '动作列表须为不超过 100 项的数组' })
  } else {
    const orders = new Set()
    body.exercises.forEach((item, index) => {
      const prefix = 'exercises[' + index + ']'
      if (!item || typeof item !== 'object' || Array.isArray(item)) {
        errors.push({ field: prefix, message: '动作项必须是对象' })
        return
      }
      for (const key of Object.keys(item)) {
        if (!['exerciseId', 'sets', 'reps', 'weight', 'restSeconds', 'notes', 'sortOrder'].includes(key)) {
          errors.push({ field: prefix + '.' + key, message: '不支持的字段' })
        }
      }
      if (!uuidPattern.test(item.exerciseId || '')) errors.push({ field: prefix + '.exerciseId', message: '动作 ID 不合法' })
      if (!Number.isInteger(item.sortOrder) || item.sortOrder < 1 || item.sortOrder > 1000 ||
          orders.has(item.sortOrder)) {
        errors.push({ field: prefix + '.sortOrder', message: '排序号须为不重复的正整数' })
      }
      orders.add(item.sortOrder)
      for (const [key, min, max] of [
        ['sets', 1, 100], ['reps', 1, 1000], ['restSeconds', 0, 3600]
      ]) {
        if (item[key] !== undefined && !validOptionalInteger(item[key], min, max)) {
          errors.push({ field: prefix + '.' + key, message: '数值超出允许范围' })
        }
      }
      if (item.weight !== undefined && !validWeight(item.weight)) {
        errors.push({ field: prefix + '.weight', message: '重量须为 0–1000 kg，最多两位小数' })
      }
      if (item.notes !== undefined && item.notes !== null &&
          (typeof item.notes !== 'string' || item.notes.length > 1000 ||
            /[\p{Cc}\p{Cf}]/u.test(item.notes))) {
        errors.push({ field: prefix + '.notes', message: '备注须为不超过 1000 字符的文本或 null' })
      }
    })
  }
  if (!update) {
    const key = req.get('Idempotency-Key')
    if (key !== undefined && !/^[\x21-\x7E]{1,128}$/.test(key)) {
      errors.push({ field: 'Idempotency-Key', message: '幂等键须为 1–128 位可见 ASCII 字符' })
    }
  }
  if (errors.length) return next(invalid(errors))
  req.validated = {
    planDate: body.planDate,
    name: body.name || null,
    durationMinutes: body.durationMinutes ?? null,
    exercises: body.exercises.map((item) => ({
      exerciseId: item.exerciseId,
      sets: item.sets ?? null,
      reps: item.reps ?? null,
      weight: item.weight ?? null,
      restSeconds: item.restSeconds ?? null,
      notes: item.notes ?? null,
      sortOrder: item.sortOrder
    }))
  }
  if (update) req.validated.version = body.version
  else req.validated.idempotencyKey = req.get('Idempotency-Key') || null
  next()
}

function validateCreate(req, res, next) { validateWrite(req, res, next) }
function validateUpdate(req, res, next) { validateWrite(req, res, next, true) }

function validateList(req, res, next) {
  const { date, startDate, endDate, status, page = '1', pageSize = '20' } = req.query
  const errors = []
  for (const key of Object.keys(req.query)) {
    if (!['date', 'startDate', 'endDate', 'status', 'page', 'pageSize'].includes(key)) {
      errors.push({ field: key, message: '不支持的查询参数' })
    }
  }
  if (date !== undefined && !validDate(date)) errors.push({ field: 'date', message: '日期不合法' })
  if (startDate !== undefined && !validDate(startDate)) errors.push({ field: 'startDate', message: '日期不合法' })
  if (endDate !== undefined && !validDate(endDate)) errors.push({ field: 'endDate', message: '日期不合法' })
  if (date !== undefined && (startDate !== undefined || endDate !== undefined)) {
    errors.push({ field: 'date', message: 'date 不能与日期范围同时使用' })
  }
  if (validDate(startDate) && validDate(endDate) && startDate > endDate) {
    errors.push({ field: 'endDate', message: '结束日期不能早于开始日期' })
  }
  if (status !== undefined && !['draft', 'completed'].includes(status)) {
    errors.push({ field: 'status', message: '状态只支持 draft 或 completed' })
  }
  if (typeof page !== 'string' || !/^[1-9]\d*$/.test(page) || Number(page) > 100000) {
    errors.push({ field: 'page', message: '页码不合法' })
  }
  if (typeof pageSize !== 'string' || !/^[1-9]\d*$/.test(pageSize) || Number(pageSize) > 100) {
    errors.push({ field: 'pageSize', message: '每页条数须为 1–100' })
  }
  if (errors.length) return next(invalid(errors))
  req.validated = { date, startDate, endDate, status, page: Number(page), pageSize: Number(pageSize) }
  next()
}

module.exports = { validateCreate, validateUpdate, validateList }
