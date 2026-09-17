import { request, withQuery } from './request'

/** 系统只读目录，用于“从动作库添加”。 */
export function getExerciseCatalog(query = {}) {
  return request({ url: withQuery('/api/v1/exercise-catalog', query) })
}

/** 当前用户的动作库。query 可传 bodyPart、includeArchived。 */
export function getExercises(query = {}) {
  return request({ url: withQuery('/api/v1/exercises', query) })
}

/** 目录动作：{ catalogExerciseId }；自定义：{ bodyPart, name, equipment, source:'custom' }。 */
export function createExercise(data) {
  return request({ url: '/api/v1/exercises', method: 'POST', data })
}

export function updateExercise(id, data) {
  return request({ url: `/api/v1/exercises/${encodeURIComponent(id)}`, method: 'PATCH', data })
}

export function deleteExercise(id) {
  return request({ url: `/api/v1/exercises/${encodeURIComponent(id)}`, method: 'DELETE' })
}
