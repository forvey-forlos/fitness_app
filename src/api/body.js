import { request, withQuery } from './request'

export function getBodyProfile() {
  return request({ url: '/api/v1/body/profile' })
}

export function updateBodyProfile(data) {
  return request({ url: '/api/v1/body/profile', method: 'PUT', data })
}

export function createMeasurement(data, idempotencyKey) {
  return request({ url: '/api/v1/body/measurements', method: 'POST', data, idempotencyKey })
}

/** query: startDate, endDate, page, pageSize */
export function getMeasurements(query = {}) {
  return request({ url: withQuery('/api/v1/body/measurements', query) })
}

export function updateMeasurement(id, data) {
  return request({ url: `/api/v1/body/measurements/${encodeURIComponent(id)}`, method: 'PATCH', data })
}

export function deleteMeasurement(id) {
  return request({ url: `/api/v1/body/measurements/${encodeURIComponent(id)}`, method: 'DELETE' })
}

export function getWeightTrend(range = 'week') {
  return request({ url: withQuery('/api/v1/body/trends/weight', { range }) })
}
