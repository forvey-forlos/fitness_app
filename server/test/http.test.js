const assert = require('node:assert/strict')
const { after, before, test } = require('node:test')
const { randomBytes } = require('node:crypto')
const jwt = require('jsonwebtoken')

const createApp = require('../src/app')
const { createAuthMiddleware } = require('../src/middlewares/auth')

const plans = [{ id: 1, name: '数据测试', duration: 99 }]
const secret = randomBytes(48).toString('hex')
const token = jwt.sign({}, secret, {
  algorithm: 'HS256', subject: '550e8400-e29b-41d4-a716-446655440001', expiresIn: 1800
})
const authMiddleware = createAuthMiddleware({ tokenConfig: { accessSecret: secret } })
const page = { items: plans, page: 1, pageSize: 20, total: 1, hasMore: false }
const app = createApp({
  authMiddleware,
  healthService: { checkDatabase: async () => 1 },
  trainingPlanService: { list: async () => page }
})

let server
let baseUrl

before(async () => {
  server = await new Promise((resolve) => {
    const listener = app.listen(0, '127.0.0.1', () => resolve(listener))
  })
  baseUrl = `http://127.0.0.1:${server.address().port}`
})

after(async () => {
  await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()))
})

test('v1 endpoints return the common envelope and request ID', async () => {
  for (const [path, data] of [
    ['/api/v1/health', { message: 'backend is running' }],
    ['/api/v1/db-test', { message: 'database connected', result: 1 }],
    ['/api/v1/training-plans', page]
  ]) {
    const response = await fetch(`${baseUrl}${path}`, {
      headers: { Authorization: `Bearer ${token}` }
    })
    const body = await response.json()

    assert.equal(response.status, 200)
    assert.equal(body.code, 0)
    assert.equal(body.message, 'ok')
    assert.deepEqual(body.data, data)
    assert.match(body.requestId, /^req_[0-9a-f-]{36}$/)
    assert.equal(response.headers.get('x-request-id'), body.requestId)
  }
})

test('legacy endpoints retain the current frontend response shape', async () => {
  const expected = [
    ['/api/health', { ok: true, message: 'backend is running' }],
    ['/api/db-test', { ok: true, message: 'database connected', result: 1 }],
    ['/api/training-plans', { ok: true, data: plans }]
  ]

  for (const [path, body] of expected) {
    const response = await fetch(`${baseUrl}${path}`, {
      headers: { Authorization: `Bearer ${token}` }
    })
    assert.equal(response.status, 200)
    assert.deepEqual(await response.json(), body)
    assert.match(response.headers.get('x-request-id'), /^req_/)
  }
})

test('formal and legacy plan lists both reject missing Access Token', async () => {
  for (const path of ['/api/v1/training-plans', '/api/training-plans']) {
    const response = await fetch(`${baseUrl}${path}`)
    assert.equal(response.status, 401)
    assert.equal((await response.json()).code, 'UNAUTHORIZED')
  }
})

test('unknown routes and invalid JSON use the common error response', async () => {
  const missing = await fetch(`${baseUrl}/api/v1/missing`)
  const missingBody = await missing.json()
  assert.equal(missing.status, 404)
  assert.equal(missingBody.code, 'NOT_FOUND')
  assert.equal(missingBody.data, null)
  assert.equal(missingBody.requestId, missing.headers.get('x-request-id'))

  const invalid = await fetch(`${baseUrl}/api/v1/health`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: '{'
  })
  const invalidBody = await invalid.json()
  assert.equal(invalid.status, 400)
  assert.equal(invalidBody.code, 'VALIDATION_ERROR')
  assert.equal(invalidBody.requestId, invalid.headers.get('x-request-id'))
})

test('database failures are sanitized on both v1 and legacy routes', async () => {
  const failingApp = createApp({
    authMiddleware,
    healthService: { checkDatabase: async () => { throw new Error('private database detail') } },
    trainingPlanService: { list: async () => { throw new Error('private database detail') } }
  })
  const listener = await new Promise((resolve) => {
    const running = failingApp.listen(0, '127.0.0.1', () => resolve(running))
  })

  try {
    const url = `http://127.0.0.1:${listener.address().port}`
    const v1 = await fetch(`${url}/api/v1/db-test`)
    const v1Body = await v1.json()
    assert.equal(v1.status, 500)
    assert.equal(v1Body.code, 'INTERNAL_ERROR')
    assert.equal(v1Body.message, '服务端异常')
    assert.equal(v1Body.requestId, v1.headers.get('x-request-id'))

    const legacy = await fetch(`${url}/api/training-plans`, {
      headers: { Authorization: `Bearer ${token}` }
    })
    assert.equal(legacy.status, 500)
    assert.deepEqual(await legacy.json(), { ok: false, message: 'failed to load training plans' })
  } finally {
    await new Promise((resolve, reject) => listener.close((error) => error ? reject(error) : resolve()))
  }
})
