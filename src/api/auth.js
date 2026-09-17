import { request, ACCESS_TOKEN_KEY } from './request'

export const REFRESH_TOKEN_KEY = 'fit_note_refresh_token'

export function register({ username, password, agreementVersion, privacyVersion, timezone = 'Asia/Shanghai' }) {
  return request({ url: '/api/v1/auth/register', method: 'POST', auth: false, data: { username, password, agreementVersion, privacyVersion, timezone } })
}

export function login({ username, password, deviceId, platform }) {
  return request({ url: '/api/v1/auth/login', method: 'POST', auth: false, data: { username, password, deviceId, platform } })
}

export function refreshToken(refreshTokenValue, deviceId) {
  return request({ url: '/api/v1/auth/refresh', method: 'POST', auth: false, data: { refreshToken: refreshTokenValue, deviceId } })
}

export function logout({ refreshToken: refreshTokenValue, allDevices = false } = {}) {
  return request({ url: '/api/v1/auth/logout', method: 'POST', data: { refreshToken: refreshTokenValue, allDevices } })
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

/** 仅保存令牌；绝不保存登录密码。 */
export function saveSession({ accessToken, refreshToken: refreshTokenValue }) {
  if (accessToken) uni.setStorageSync(ACCESS_TOKEN_KEY, accessToken)
  if (refreshTokenValue) uni.setStorageSync(REFRESH_TOKEN_KEY, refreshTokenValue)
}

export function clearSession() {
  uni.removeStorageSync(ACCESS_TOKEN_KEY)
  uni.removeStorageSync(REFRESH_TOKEN_KEY)
}
