import { request } from './request'

export function getCurrentUser() {
  return request({ url: '/api/v1/users/me' })
}

export function updateCurrentUser(data) {
  return request({ url: '/api/v1/users/me', method: 'PATCH', data })
}

export function getPreferences() {
  return request({ url: '/api/v1/users/me/preferences' })
}

export function updatePreferences(data) {
  return request({ url: '/api/v1/users/me/preferences', method: 'PATCH', data })
}
