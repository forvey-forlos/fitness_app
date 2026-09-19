const { HttpError } = require('../utils/response')

const groupCategory = {
  chest: 'chest', back: 'back', shoulder: 'shoulder',
  biceps: 'arms', triceps: 'arms',
  legs: 'legs', glutes: 'legs', core: 'abs'
}
const categories = [...new Set(Object.values(groupCategory))]
const equipmentTypes = ['barbell', 'dumbbell', 'machine', 'cable', 'bodyweight', 'other']

function normalizeName(name) {
  return name.normalize('NFKC').trim().replace(/\s+/gu, ' ').toLowerCase()
}

function error(errors) {
  return new HttpError(400, 'VALIDATION_ERROR', '请求参数不合法', errors)
}

function validateName(value) {
  return typeof value === 'string' && value === value.trim() &&
    Array.from(value).length >= 1 && Array.from(value).length <= 40 &&
    !/[\p{Cc}\p{Cf}]/u.test(value) && normalizeName(value).length <= 80
}

function validateBody(req, res, next, patch = false) {
  const body = req.body
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return next(error([{ field: 'body', message: '请求体必须是对象' }]))
  }
  const errors = []
  const allowed = ['name', 'category', 'muscleGroup', 'equipment', ...(patch ? ['version'] : [])]
  for (const field of Object.keys(body)) {
    if (!allowed.includes(field)) errors.push({ field, message: '不允许修改此字段' })
  }
  if (patch && (!Number.isInteger(body.version) || body.version < 1 || body.version > 4294967294)) {
    errors.push({ field: 'version', message: '必须提供有效版本号' })
  }
  if (patch && !['name', 'category', 'muscleGroup', 'equipment']
    .some((field) => Object.hasOwn(body, field))) {
    errors.push({ field: 'body', message: '至少提供一个要修改的字段' })
  }
  for (const field of ['name', 'category', 'muscleGroup', 'equipment']) {
    if (patch && !Object.hasOwn(body, field)) continue
    const value = body[field]
    if (field === 'name' && !validateName(value)) {
      errors.push({ field, message: '动作名称须为 1–40 个字符，不能有首尾空格或控制字符' })
    }
    if (field === 'category' && !categories.includes(value)) {
      errors.push({ field, message: '训练部位不合法' })
    }
    if (field === 'muscleGroup' && !Object.hasOwn(groupCategory, value)) {
      errors.push({ field, message: '目标肌群不合法' })
    }
    if (field === 'equipment' && !equipmentTypes.includes(value)) {
      errors.push({ field, message: '器械类型不合法' })
    }
  }
  if (body.category && body.muscleGroup &&
      groupCategory[body.muscleGroup] !== body.category) {
    errors.push({ field: 'muscleGroup', message: '目标肌群与训练部位不匹配' })
  }
  if (!patch) {
    const key = req.get('Idempotency-Key')
    if (key !== undefined && !/^[\x21-\x7E]{1,128}$/.test(key)) {
      errors.push({ field: 'Idempotency-Key', message: '幂等键必须为 1–128 位可见 ASCII 字符' })
    }
  }
  if (errors.length) return next(error(errors))
  req.validated = { ...body }
  if (body.name !== undefined) req.validated.nameNormalized = normalizeName(body.name)
  if (!patch) req.validated.idempotencyKey = req.get('Idempotency-Key') || null
  next()
}

function validateCreate(req, res, next) { validateBody(req, res, next) }
function validateUpdate(req, res, next) { validateBody(req, res, next, true) }

function validateList(req, res, next) {
  const { category, muscleGroup, equipment, keyword, page = '1', pageSize = '20' } = req.query
  const errors = []
  for (const key of Object.keys(req.query)) {
    if (!['category', 'muscleGroup', 'equipment', 'keyword', 'page', 'pageSize'].includes(key)) {
      errors.push({ field: key, message: '不支持的查询参数' })
    }
  }
  if (category !== undefined && !categories.includes(category)) errors.push({ field: 'category', message: '训练部位不合法' })
  if (muscleGroup !== undefined && !Object.hasOwn(groupCategory, muscleGroup)) errors.push({ field: 'muscleGroup', message: '目标肌群不合法' })
  if (equipment !== undefined && !equipmentTypes.includes(equipment)) errors.push({ field: 'equipment', message: '器械类型不合法' })
  if (keyword !== undefined && (typeof keyword !== 'string' || keyword.trim().length < 1 || keyword.length > 40)) {
    errors.push({ field: 'keyword', message: '关键词长度须为 1–40 个字符' })
  }
  if (!/^[1-9]\d*$/.test(page) || Number(page) > 100000) errors.push({ field: 'page', message: '页码不合法' })
  if (!/^[1-9]\d*$/.test(pageSize) || Number(pageSize) > 100) errors.push({ field: 'pageSize', message: '每页条数须为 1–100' })
  if (errors.length) return next(error(errors))
  req.validated = {
    category, muscleGroup, equipment,
    keyword: keyword ? normalizeName(keyword) : undefined,
    page: Number(page), pageSize: Number(pageSize)
  }
  next()
}

module.exports = { validateCreate, validateUpdate, validateList, normalizeName, groupCategory }
