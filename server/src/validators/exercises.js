const { HttpError } = require('../utils/response')
const { equipmentTypes } = require('../constants/exerciseMetadata')

const categories = ['chest','back','shoulder','arms','abs','legs','cardio','full_body','other']
function normalizeName(name) { return name.normalize('NFKC').trim().replace(/\s+/gu, ' ').toLowerCase() }
function error(errors) { return new HttpError(400, 'VALIDATION_ERROR', '请求参数不合法', errors) }
function validName(value) { return typeof value === 'string' && value === value.trim() && Array.from(value).length >= 1 && Array.from(value).length <= 40 && !/[\p{Cc}\p{Cf}]/u.test(value) }

function validateUpdate(req, res, next) {
  const body = req.body, errors = []
  if (!body || typeof body !== 'object' || Array.isArray(body)) return next(error([{ field: 'body', message: '请求体必须是对象' }]))
  for (const key of Object.keys(body)) if (!['displayName','version'].includes(key)) errors.push({ field: key, message: '系统动作本体不可修改' })
  if (!Number.isInteger(body.version) || body.version < 1 || body.version > 4294967294) errors.push({ field: 'version', message: '必须提供有效版本号' })
  if (body.displayName !== null && !validName(body.displayName)) errors.push({ field: 'displayName', message: '个人显示名称须为 1–40 个字符，或传 null 恢复默认名称' })
  if (errors.length) return next(error(errors))
  req.validated = { version: body.version, displayName: body.displayName,
    displayNameNormalized: body.displayName === null ? null : normalizeName(body.displayName) }
  next()
}

function validateCreate(req, res, next) { req.validated = {}; next() }

function validateList(req, res, next) {
  const { scope = 'catalog', category, muscleGroup, equipment, keyword, page = '1', pageSize = '20' } = req.query
  const errors = []
  for (const key of Object.keys(req.query)) if (!['scope','category','muscleGroup','equipment','keyword','page','pageSize'].includes(key)) errors.push({ field: key, message: '不支持的查询参数' })
  if (!['catalog','library'].includes(scope)) errors.push({ field: 'scope', message: 'scope 只支持 catalog 或 library' })
  if (category !== undefined && !categories.includes(category)) errors.push({ field: 'category', message: '训练部位不合法' })
  if (muscleGroup !== undefined && (typeof muscleGroup !== 'string' || !/^[a-z0-9_]{1,64}$/.test(muscleGroup))) errors.push({ field: 'muscleGroup', message: '肌群不合法' })
  if (equipment !== undefined && !equipmentTypes.includes(equipment)) errors.push({ field: 'equipment', message: '器械类型不合法' })
  if (keyword !== undefined && (typeof keyword !== 'string' || keyword.trim().length < 1 || keyword.length > 80)) errors.push({ field: 'keyword', message: '关键词长度须为 1–80 个字符' })
  if (!/^[1-9]\d*$/.test(page) || Number(page) > 100000) errors.push({ field: 'page', message: '页码不合法' })
  if (!/^[1-9]\d*$/.test(pageSize) || Number(pageSize) > 100) errors.push({ field: 'pageSize', message: '每页条数须为 1–100' })
  if (errors.length) return next(error(errors))
  req.validated = { scope, category, muscleGroup, equipment,
    keyword: keyword ? normalizeName(keyword) : undefined, page: Number(page), pageSize: Number(pageSize) }
  next()
}

module.exports = { validateCreate, validateUpdate, validateList, normalizeName }
