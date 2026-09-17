const assert = require('node:assert/strict')
const { after, before, test } = require('node:test')
const { randomBytes } = require('node:crypto')
const jwt = require('jsonwebtoken')

const createApp = require('../src/app')
const { createAuthMiddleware } = require('../src/middlewares/auth')
const { createUsersService } = require('../src/services/users')

const userId = '550e8400-e29b-41d4-a716-446655440000'
const secret = randomBytes(48).toString('hex')
let active = true
let lookedUpId
const usersRepository = {
  async findActiveById(id) {
    lookedUpId = id
    return active ? {
      id, username: 'Fit健身', avatar_url: null, timezone: 'Asia/Shanghai',
      password_hash: 'must-not-leak', token_hash: 'must-not-leak'
    } : null
  }
}
const app = createApp({
  authMiddleware: createAuthMiddleware({ tokenConfig: { accessSecret: secret } }),
  userService: createUsersService({ usersRepository }),
  healthService: { checkDatabase: async () => 1 },
  trainingPlanService: { listPlans: async () => [] }
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

function accessToken(options = {}) {
  return jwt.sign({}, secret, {
    algorithm: 'HS256', subject: userId, expiresIn: options.expiresIn ?? 1800
  })
}

async function me(token) {
  const response = await fetch(`${baseUrl}/api/v1/users/me`, {
    headers: token === undefined ? {} : { Authorization: `Bearer ${token}` }
  })
  return { response, body: await response.json() }
}

test('valid Access Token identifies the current user without sensitive fields', async () => {
  const { response, body } = await me(accessToken())
  assert.equal(response.status, 200)
  assert.equal(body.code, 0)
  assert.equal(body.requestId, response.headers.get('x-request-id'))
  assert.equal(lookedUpId, userId)
  assert.deepEqual(body.data, {
    id: userId, username: 'Fit健身', avatarUrl: null, timezone: 'Asia/Shanghai'
  })
  assert.equal(JSON.stringify(body).includes('password_hash'), false)
  assert.equal(JSON.stringify(body).includes('token_hash'), false)
})

test('missing, malformed, and expired Access Tokens return unified 401', async () => {
  for (const token of [undefined, 'invalid-token', accessToken({ expiresIn: -1 })]) {
    const { response, body } = await me(token)
    assert.equal(response.status, 401)
    assert.equal(body.code, 'UNAUTHORIZED')
    assert.equal(body.data, null)
    assert.equal(body.requestId, response.headers.get('x-request-id'))
  }
})

test('a deactivated or deleted user cannot use an otherwise valid token', async () => {
  active = false
  const { response, body } = await me(accessToken())
  active = true
  assert.equal(response.status, 401)
  assert.equal(body.code, 'UNAUTHORIZED')
})
