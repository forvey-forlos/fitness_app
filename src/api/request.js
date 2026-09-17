/** 所有业务接口共用此入口；域名配置在项目根目录的 .env.local。 */
export const BASE_URL = String(import.meta.env.VITE_API_BASE_URL || '').replace(/\/+$/, '')
export const ACCESS_TOKEN_KEY = 'fit_note_access_token'
export const REFRESH_TOKEN_KEY = 'fit_note_refresh_token'
export const USER_KEY = 'fit_note_auth_user'
let refreshPromise = null
let redirectingToLogin = false

export function clearAuthStorage() {
  uni.removeStorageSync(ACCESS_TOKEN_KEY)
  uni.removeStorageSync(REFRESH_TOKEN_KEY)
  uni.removeStorageSync(USER_KEY)
}

export function resetAuthRedirect() {
  redirectingToLogin = false
}

function invalidateSession(expectedToken) {
  const current = uni.getStorageSync(ACCESS_TOKEN_KEY)
  if (current && current !== expectedToken) return
  clearAuthStorage()
  if (!redirectingToLogin) {
    redirectingToLogin = true
    uni.reLaunch({ url: '/pages/login/login' })
  }
}

function joinUrl(path) {
  if (!BASE_URL) {
    throw new Error('尚未配置 API 地址：请在项目根目录 .env.local 设置 VITE_API_BASE_URL')
  }
  if (!/^https?:\/\//i.test(BASE_URL)) {
    throw new Error('VITE_API_BASE_URL 必须是 http(s) 地址')
  }
  if (!path || !path.startsWith('/')) {
    throw new Error('接口路径必须以 / 开头')
  }
  return `${BASE_URL}${path}`
}

/** 将 query 中的 null / undefined / 空字符串排除，保留 0 和 false。 */
export function withQuery(path, query = {}) {
  const entries = Object.entries(query).filter(([, value]) => value !== null && value !== undefined && value !== '')
  if (!entries.length) return path
  const params = entries.map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(value)}`).join('&')
  return `${path}${path.includes('?') ? '&' : '?'}${params}`
}

/**
 * 返回业务响应的 data，失败时抛出带 statusCode/code/requestId 的 Error。
 * 不在这里自动跳转或弹 Toast，避免影响各页面自己的交互流程。
 */
function isAuthenticationFailure(response) {
  return response.statusCode === 401 &&
    ['UNAUTHORIZED', 'TOKEN_EXPIRED'].includes(response.data?.code)
}

async function renewSession() {
  if (refreshPromise) return refreshPromise

  const oldRefreshToken = uni.getStorageSync(REFRESH_TOKEN_KEY)
  if (!oldRefreshToken) throw new Error('登录已失效，请重新登录')

  refreshPromise = (async () => {
    const result = await sendRequest({
      url: '/api/v1/auth/refresh', method: 'POST', auth: false,
      data: { refreshToken: oldRefreshToken }
    }, true)
    if (!result?.accessToken || !result?.refreshToken) {
      throw new Error('刷新令牌响应不完整')
    }
    if (uni.getStorageSync(REFRESH_TOKEN_KEY) !== oldRefreshToken) {
      throw new Error('登录状态已变更')
    }
    try {
      uni.setStorageSync(ACCESS_TOKEN_KEY, result.accessToken)
      uni.setStorageSync(REFRESH_TOKEN_KEY, result.refreshToken)
    } catch (error) {
      clearAuthStorage()
      throw error
    }
    return result
  })()

  try {
    return await refreshPromise
  } finally {
    refreshPromise = null
  }
}

async function sendRequest({ url, method = 'GET', data, header = {}, auth = true, timeout = 15000, idempotencyKey } = {}, retried = false) {
  let fullUrl
  try {
    fullUrl = joinUrl(url)
  } catch (error) {
    throw error
  }

  const token = auth ? uni.getStorageSync(ACCESS_TOKEN_KEY) : ''
  const headers = {
    'Content-Type': 'application/json',
    'X-Timezone': 'Asia/Shanghai',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(idempotencyKey ? { 'Idempotency-Key': idempotencyKey } : {}),
    ...header,
  }

  const response = await new Promise((resolve, reject) => {
    uni.request({
      url: fullUrl,
      method,
      data,
      header: headers,
      timeout,
      success: resolve,
      fail(cause) {
        const error = new Error(cause?.errMsg || '网络连接失败，请稍后重试')
        error.code = 'NETWORK_ERROR'
        reject(error)
      },
    })
  })

  const body = response.data
  const ok = response.statusCode >= 200 && response.statusCode < 300
  if (ok && (body?.code === 0 || body?.code === '0')) return body.data

  const error = new Error(body?.message || (ok ? '接口响应格式不符合约定' : `请求失败（${response.statusCode}）`))
  error.statusCode = response.statusCode
  error.code = body?.code || 'API_ERROR'
  error.errors = body?.errors || []
  error.requestId = body?.requestId || ''

  if (auth && token && isAuthenticationFailure(response)) {
    if (retried) {
      invalidateSession(token)
      throw error
    }
    try {
      const currentToken = uni.getStorageSync(ACCESS_TOKEN_KEY)
      if (currentToken === token) await renewSession()
      else if (!currentToken) throw error
      return await sendRequest({ url, method, data, header, auth, timeout, idempotencyKey }, true)
    } catch (refreshError) {
      invalidateSession(token)
      throw refreshError
    }
  }
  throw error
}

export function request(options = {}) {
  return sendRequest(options)
}
