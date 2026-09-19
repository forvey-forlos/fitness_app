import { request, withQuery } from './request'

/** 系统动作及当前用户自定义动作。query: category, muscleGroup, equipment, keyword, page, pageSize。 */
export function getExercises(query = {}) {
  return request({ url: withQuery('/api/v1/exercises', query) })
}

export function getExercise(id) {
  return request({ url: `/api/v1/exercises/${encodeURIComponent(id)}` })
}

/** data 只允许 name、category、muscleGroup、equipment。 */
export function createExercise(data, idempotencyKey) {
  return request({ url: '/api/v1/exercises', method: 'POST', data, idempotencyKey })
}

export function updateExercise(id, data) {
  return request({ url: `/api/v1/exercises/${encodeURIComponent(id)}`, method: 'PATCH', data })
}

export function deleteExercise(id) {
  return request({ url: `/api/v1/exercises/${encodeURIComponent(id)}`, method: 'DELETE' })
}
