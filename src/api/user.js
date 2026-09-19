import { request, USER_KEY } from './request'

function cacheUser(user) {
  if (!user || typeof user !== 'object') throw new Error('用户资料响应不完整')
  uni.setStorageSync(USER_KEY, user)
  return user
}

export async function getCurrentUser() {
  return cacheUser(await request({ url: '/api/v1/users/me' }))
}

export async function updateCurrentUser(data) {
  return cacheUser(await request({ url: '/api/v1/users/me', method: 'PATCH', data }))
}

export function getPreferences() {
  return request({ url: '/api/v1/users/me/preferences' })
}

export function updatePreferences(data) {
  return request({ url: '/api/v1/users/me/preferences', method: 'PATCH', data })
}
