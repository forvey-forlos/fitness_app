import { request, withQuery } from './request'

/** 当前 server 已实现的测试列表接口：GET /api/v1/training-plans。 */
export function getTrainingPlans() {
  return request({ url: '/api/v1/training-plans' })
}

function datePath(date) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) throw new Error('date 必须是 YYYY-MM-DD')
  return `/api/v1/training-plans/${date}`
}

/** 某日计划草稿；当前前端按日期存储，不使用 /training-plans 列表接口。 */
export function getTrainingPlan(date) {
  return request({ url: datePath(date) })
}

export function saveTrainingPlan(date, plan) {
  return request({ url: datePath(date), method: 'PUT', data: plan })
}

export function completeTrainingPlan(date, payload, idempotencyKey) {
  return request({ url: `${datePath(date)}/complete`, method: 'POST', data: payload, idempotencyKey })
}

export function getTrainingRecords(query = {}) {
  return request({ url: withQuery('/api/v1/training-records', query) })
}

export function getTrainingRecord(id) {
  return request({ url: `/api/v1/training-records/${encodeURIComponent(id)}` })
}

export function updateTrainingRecord(id, data) {
  return request({ url: `/api/v1/training-records/${encodeURIComponent(id)}`, method: 'PATCH', data })
}

export function deleteTrainingRecord(id) {
  return request({ url: `/api/v1/training-records/${encodeURIComponent(id)}`, method: 'DELETE' })
}

export function getWeeklyTrainingStats({ weekStart, timezone = 'Asia/Shanghai' } = {}) {
  return request({ url: withQuery('/api/v1/training-stats/weekly', { weekStart, timezone }) })
}
