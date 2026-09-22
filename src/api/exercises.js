import { request, withQuery } from './request'

/** scope=catalog 返回系统目录；scope=library 返回用户已加入的系统动作。 */
export function getExercises(query = {}) {
  return request({ url: withQuery('/api/v1/exercises', query) })
}

export function getExercise(id) {
  return request({ url: `/api/v1/exercises/${encodeURIComponent(id)}` })
}

export function updateExercise(id, data) {
  return request({ url: `/api/v1/exercises/${encodeURIComponent(id)}`, method: 'PATCH', data })
}

export function addExerciseToLibrary(id) {
  return request({ url: `/api/v1/exercises/${encodeURIComponent(id)}/library`, method: 'POST' })
}

export function deleteExercise(id) {
  return request({ url: `/api/v1/exercises/${encodeURIComponent(id)}`, method: 'DELETE' })
}
