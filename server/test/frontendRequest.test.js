const assert = require('node:assert/strict')
const { readFileSync } = require('node:fs')
const path = require('node:path')
const { test } = require('node:test')

const storage = new Map()
const redirects = []
let handler
global.uni = {
  getStorageSync: (key) => storage.get(key) || '',
  setStorageSync: (key, value) => storage.set(key, value),
  removeStorageSync: (key) => storage.delete(key),
  reLaunch: (options) => redirects.push(options.url),
  request: (options) => queueMicrotask(() => handler(options))
}

const filename = path.resolve(__dirname, '../../src/api/request.js')
const source = readFileSync(filename, 'utf8').replace(
  'import.meta.env.VITE_API_BASE_URL', JSON.stringify('https://api.example.test')
)
const moduleUrl = `data:text/javascript;base64,${Buffer.from(source).toString('base64')}`

test('two concurrent 401 responses use one refresh and retry both original requests', async () => {
  const api = await import(moduleUrl)
  storage.set(api.ACCESS_TOKEN_KEY, 'old-access')
  storage.set(api.REFRESH_TOKEN_KEY, 'old-refresh')
  storage.set(api.USER_KEY, { id: 'u1' })
  let refreshCount = 0
  let oldCount = 0
  let retryCount = 0

  handler = (options) => {
    if (options.url.endsWith('/api/v1/auth/refresh')) {
      refreshCount += 1
      assert.equal(options.data.refreshToken, 'old-refresh')
      setTimeout(() => options.success({
        statusCode: 200,
        data: { code: 0, data: { accessToken: 'new-access', refreshToken: 'new-refresh' } }
      }), 10)
      return
    }
    if (options.header.Authorization === 'Bearer old-access') {
      oldCount += 1
      options.success({ statusCode: 401, data: { code: 'UNAUTHORIZED', message: 'expired' } })
      return
    }
    assert.equal(options.header.Authorization, 'Bearer new-access')
    retryCount += 1
    options.success({ statusCode: 200, data: { code: 0, data: { id: 'u1' } } })
  }

  const [first, second] = await Promise.all([
    api.request({ url: '/api/v1/users/me' }),
    api.request({ url: '/api/v1/users/me' })
  ])
  assert.deepEqual(first, { id: 'u1' })
  assert.deepEqual(second, { id: 'u1' })
  assert.equal(refreshCount, 1)
  assert.equal(oldCount, 2)
  assert.equal(retryCount, 2)
  assert.equal(storage.get(api.ACCESS_TOKEN_KEY), 'new-access')
  assert.equal(storage.get(api.REFRESH_TOKEN_KEY), 'new-refresh')
  assert.equal(redirects.length, 0)
})

test('refresh failure clears the entire session and redirects to login', async () => {
  const api = await import(moduleUrl)
  storage.set(api.ACCESS_TOKEN_KEY, 'expired-access')
  storage.set(api.REFRESH_TOKEN_KEY, 'reused-refresh')
  storage.set(api.USER_KEY, { id: 'u1' })
  handler = (options) => {
    if (options.url.endsWith('/api/v1/auth/refresh')) {
      options.success({ statusCode: 401, data: { code: 'TOKEN_REUSED', message: 'reused' } })
    } else {
      options.success({ statusCode: 401, data: { code: 'UNAUTHORIZED', message: 'expired' } })
    }
  }

  await assert.rejects(api.request({ url: '/api/v1/users/me' }))
  assert.equal(storage.has(api.ACCESS_TOKEN_KEY), false)
  assert.equal(storage.has(api.REFRESH_TOKEN_KEY), false)
  assert.equal(storage.has(api.USER_KEY), false)
  assert.deepEqual(redirects, ['/pages/login/login'])
})
