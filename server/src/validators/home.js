const { HttpError } = require('../utils/response')
const { validDate } = require('../utils/bodyTime')

function validateSummary(req, res, next) {
  const errors = []
  for (const key of Object.keys(req.query)) {
    if (!['date', 'timezone'].includes(key)) errors.push({ field: key, message: '不支持的查询参数' })
  }
  const { date, timezone } = req.query
  if (date !== undefined && !validDate(date)) errors.push({ field: 'date', message: '日期不合法' })
  if (timezone !== undefined && (typeof timezone !== 'string' || !timezone || timezone.length > 64)) {
    errors.push({ field: 'timezone', message: '时区参数不合法' })
  }
  if (errors.length) return next(new HttpError(400, 'VALIDATION_ERROR', '请求参数不合法', errors))
  req.validated = { date, timezone }
  next()
}

module.exports = { validateSummary }
