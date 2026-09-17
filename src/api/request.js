/** 所有业务接口共用此入口；域名配置在项目根目录的 .env.local。 */
export const BASE_URL = String(import.meta.env.VITE_API_BASE_URL || '').replace(/\/+$/, '')
export const ACCESS_TOKEN_KEY = 'fit_note_access_token'

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
export function request({ url, method = 'GET', data, header = {}, auth = true, timeout = 15000, idempotencyKey } = {}) {
  let fullUrl
  try {
    fullUrl = joinUrl(url)
  } catch (error) {
    return Promise.reject(error)
  }

  const token = auth ? uni.getStorageSync(ACCESS_TOKEN_KEY) : ''
  const headers = {
    'Content-Type': 'application/json',
    'X-Timezone': 'Asia/Shanghai',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(idempotencyKey ? { 'Idempotency-Key': idempotencyKey } : {}),
    ...header,
  }

  return new Promise((resolve, reject) => {
    uni.request({
      url: fullUrl,
      method,
      data,
      header: headers,
      timeout,
      success(response) {
        const body = response.data
        const ok = response.statusCode >= 200 && response.statusCode < 300
        if (ok && (body?.code === 0 || body?.code === '0')) {
          resolve(body.data)
          return
        }
        const error = new Error(body?.message || (ok ? '接口响应格式不符合约定' : `请求失败（${response.statusCode}）`))
        error.statusCode = response.statusCode
        error.code = body?.code || 'API_ERROR'
        error.errors = body?.errors || []
        error.requestId = body?.requestId || ''
        reject(error)
      },
      fail(cause) {
        const error = new Error(cause?.errMsg || '网络连接失败，请稍后重试')
        error.code = 'NETWORK_ERROR'
        reject(error)
      },
    })
  })
}
