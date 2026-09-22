import { request, withQuery } from './request'

export function listTrainingPlans(query = {}) {
  return request({ url: withQuery('/api/v1/training-plans', query) })
}

/** 兼容旧数组消费方式；首页现在使用 /home/summary，不调用此 helper。 */
export async function getTrainingPlans(date) {
  const now = new Date()
  const selectedDate = date || [
    now.getFullYear(), String(now.getMonth() + 1).padStart(2, '0'),
    String(now.getDate()).padStart(2, '0')
  ].join('-')
  const result = await listTrainingPlans({ date: selectedDate })
  const items = Array.isArray(result) ? result : (result?.items || [])
  return items.map((plan) => ({
    ...plan, duration: plan.durationMinutes ?? plan.duration
  }))
}

export function getTrainingPlan(id) {
  return request({ url: `/api/v1/training-plans/${encodeURIComponent(id)}` })
}

export function createTrainingPlan(data, idempotencyKey) {
  return request({ url: '/api/v1/training-plans', method: 'POST', data, idempotencyKey })
}

export function updateTrainingPlan(id, data) {
  return request({ url: `/api/v1/training-plans/${encodeURIComponent(id)}`, method: 'PUT', data })
}

export function deleteTrainingPlan(id) {
  return request({ url: `/api/v1/training-plans/${encodeURIComponent(id)}`, method: 'DELETE' })
}

export function completeTrainingPlan(id, payload, idempotencyKey) {
  return request({ url: `/api/v1/training-plans/${encodeURIComponent(id)}/complete`, method: 'POST', data: payload, idempotencyKey })
}

export function listTrainingHistory(query = {}) {
  return request({ url: withQuery('/api/v1/training-history', query) })
}

export function getTrainingHistory(id) {
  return request({ url: `/api/v1/training-history/${encodeURIComponent(id)}` })
}

export function deleteTrainingHistory(id) {
  return request({ url: `/api/v1/training-history/${encodeURIComponent(id)}`, method: 'DELETE' })
}

export function getWeeklyTrainingStats(query = {}) {
  return request({ url: withQuery('/api/v1/training-stats/week', query) })
}

/** 旧调用名兼容；正式路径使用 /training-history。 */
export function getTrainingRecords(query = {}) {
  return listTrainingHistory(query)
}

export function getTrainingRecord(id) {
  return getTrainingHistory(id)
}
