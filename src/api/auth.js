import { request, ACCESS_TOKEN_KEY, REFRESH_TOKEN_KEY, USER_KEY, clearAuthStorage, resetAuthRedirect } from './request'
import { getCurrentUser as fetchCurrentUser } from './user'

export { ACCESS_TOKEN_KEY, REFRESH_TOKEN_KEY, USER_KEY }

export function register({ username, password, agreementVersion, privacyVersion, timezone = 'Asia/Shanghai' }) {
  return request({ url: '/api/v1/auth/register', method: 'POST', auth: false, data: { username, password, agreementVersion, privacyVersion, timezone } })
}

export function login({ username, password, deviceId, platform }) {
  return request({ url: '/api/v1/auth/login', method: 'POST', auth: false, data: { username, password, deviceId, platform } })
}

export async function getCurrentUser() {
  const user = await fetchCurrentUser()
  uni.setStorageSync(USER_KEY, user)
  return user
}

export function refreshToken(refreshTokenValue, deviceId) {
  return request({ url: '/api/v1/auth/refresh', method: 'POST', auth: false, data: { refreshToken: refreshTokenValue, deviceId } })
}

export async function logout() {
  const token = uni.getStorageSync(REFRESH_TOKEN_KEY)
  try {
    if (token) await request({ url: '/api/v1/auth/logout', method: 'POST', auth: false, data: { refreshToken: token } })
  } finally {
    clearSession()
    uni.reLaunch({ url: '/pages/login/login' })
  }
}

export function getCurrentAgreements(locale = 'zh-CN') {
  return request({ url: `/api/v1/agreements/current?locale=${encodeURIComponent(locale)}`, auth: false })
}

export function requestPasswordReset(username) {
  return request({ url: '/api/v1/auth/password/forgot', method: 'POST', auth: false, data: { username } })
}

export function resetPassword(resetToken, newPassword) {
  return request({ url: '/api/v1/auth/password/reset', method: 'POST', auth: false, data: { resetToken, newPassword } })
}

/** 保存令牌和安全用户资料；绝不保存登录密码。 */
export function saveSession({ accessToken, refreshToken: refreshTokenValue, user }) {
  if (!accessToken || !refreshTokenValue || !user) throw new Error('登录响应缺少认证信息')
  clearAuthStorage()
  try {
    uni.setStorageSync(ACCESS_TOKEN_KEY, accessToken)
    uni.setStorageSync(REFRESH_TOKEN_KEY, refreshTokenValue)
    uni.setStorageSync(USER_KEY, user)
    resetAuthRedirect()
  } catch (error) {
    clearAuthStorage()
    throw error
  }
}

export function clearSession() {
  clearAuthStorage()
}
