const assert = require('node:assert/strict')
const { after, before, test } = require('node:test')
const { createHash, randomBytes } = require('node:crypto')
const bcrypt = require('bcryptjs')
const jwt = require('jsonwebtoken')

const createApp = require('../src/app')
const { createAuthService } = require('../src/services/auth')
const { createRefreshTokensRepository } = require('../src/repositories/refreshTokens')

const password = 'Fit@2026ab'
const userId = '550e8400-e29b-41d4-a716-446655440000'
const testSecret = randomBytes(48).toString('hex')
const tokenConfig = { accessSecret: testSecret, accessTtl: 1800, refreshTtl: 2592000 }
const savedTokens = []
let currentUser
let lookedUpAccountCode
let server
let baseUrl

const usersRepository = {
  async findForLogin(accountCode) {
    lookedUpAccountCode = accountCode
    return currentUser
  }
}
const refreshTokensRepository = {
  async create(token) {
    savedTokens.push(token)
  }
}
const app = createApp({
  authService: createAuthService({ usersRepository, refreshTokensRepository, tokenConfig }),
  healthService: { checkDatabase: async () => 1 },
  trainingPlanService: { listPlans: async () => [] }
})

before(async () => {
  currentUser = {
    id: userId,
    display_name: 'Fit健身', account_code: '12345678',
    password_hash: await bcrypt.hash(password, 12),
    avatar_url: null,
    timezone: 'Asia/Shanghai',
    status: 'active',
    deleted_at: null
  }
  server = await new Promise((resolve) => {
    const listener = app.listen(0, '127.0.0.1', () => resolve(listener))
  })
  baseUrl = `http://127.0.0.1:${server.address().port}`
})

after(async () => {
  await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()))
})

async function login(payload) {
  const response = await fetch(`${baseUrl}/api/v1/auth/login`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(payload)
  })
  return { response, body: await response.json() }
}

test('valid login returns a signed JWT and an opaque refresh token', async () => {
  const { response, body } = await login({
    accountCode: '12345678', password, deviceId: 'device-123', platform: 'mp-weixin'
  })

  assert.equal(response.status, 200)
  assert.equal(body.code, 0)
  assert.equal(body.requestId, response.headers.get('x-request-id'))
  assert.equal(lookedUpAccountCode, '12345678')
  assert.deepEqual(body.data.user, {
    id: userId, username: 'Fit健身', displayName: 'Fit健身', accountCode: '12345678', avatarUrl: null, timezone: 'Asia/Shanghai'
  })
  assert.equal(body.data.accessTokenExpiresIn, 1800)
  assert.equal(body.data.refreshTokenExpiresIn, 2592000)
  assert.match(body.data.refreshToken, /^[A-Za-z0-9_-]{64}$/)
  assert.equal(JSON.stringify(body).includes('password_hash'), false)
  assert.equal(JSON.stringify(body).includes('token_hash'), false)

  const decoded = jwt.verify(body.data.accessToken, testSecret, { algorithms: ['HS256'] })
  assert.equal(decoded.sub, userId)
  assert.equal(decoded.exp - decoded.iat, 1800)
  assert.equal(typeof decoded.jti, 'string')

  assert.equal(savedTokens.length, 1)
  const stored = savedTokens[0]
  assert.match(stored.id, /^[0-9a-f]{8}(-[0-9a-f]{4}){3}-[0-9a-f]{12}$/)
  assert.equal(stored.userId, userId)
  assert.equal(stored.deviceId, 'device-123')
  assert.equal(stored.platform, 'mp-weixin')
  assert.equal(Buffer.isBuffer(stored.tokenHash), true)
  assert.equal(stored.tokenHash.length, 32)
  assert.deepEqual(stored.tokenHash,
    createHash('sha256').update(body.data.refreshToken).digest())
  assert.ok(Math.abs(stored.expiresAt.getTime() - (Date.now() + 2592000 * 1000)) < 5000)
})

test('unknown user and wrong password have the same public error', async () => {
  const activeUser = currentUser
  currentUser = null
  const unknown = await login({ accountCode: '87654321', password })
  currentUser = activeUser
  const wrong = await login({ accountCode: '12345678', password: 'Wrong@2026' })

  for (const result of [unknown, wrong]) {
    assert.equal(result.response.status, 401)
    assert.equal(result.body.code, 'INVALID_CREDENTIALS')
    assert.equal(result.body.data, null)
    assert.equal(result.body.requestId, result.response.headers.get('x-request-id'))
  }
  assert.equal(unknown.body.message, wrong.body.message)
  assert.equal(savedTokens.length, 1)
})

test('invalid login parameters are rejected before user lookup', async () => {
  lookedUpAccountCode = null
  const { response, body } = await login({
    accountCode: 'bad-code', password: 'short', deviceId: 'device with spaces', platform: 'unknown'
  })

  assert.equal(response.status, 400)
  assert.equal(body.code, 'VALIDATION_ERROR')
  assert.deepEqual(body.errors.map((error) => error.field),
    ['accountCode', 'password', 'deviceId', 'platform'])
  assert.equal(lookedUpAccountCode, null)
  assert.equal(savedTokens.length, 1)
})

test('disabled and soft-deleted users cannot log in', async () => {
  const activeUser = currentUser
  for (const changed of [
    { ...activeUser, status: 'disabled' },
    { ...activeUser, deleted_at: new Date() }
  ]) {
    currentUser = changed
    const { response, body } = await login({ accountCode: '12345678', password })
    assert.equal(response.status, 401)
    assert.equal(body.code, 'INVALID_CREDENTIALS')
  }
  currentUser = activeUser
  assert.equal(savedTokens.length, 1)
})

test('refresh-token repository inserts only a digest and null rotation state', async () => {
  let executed
  const repository = createRefreshTokensRepository({
    async execute(sql, parameters) { executed = { sql, parameters } }
  })
  const token = savedTokens[0]
  await repository.create(token)

  assert.match(executed.sql, /INSERT INTO refresh_tokens/)
  assert.match(executed.sql, /VALUES \(\?, \?, \?, \?, \?, \?, NULL, NULL, NULL, UTC_TIMESTAMP\(3\)\)/)
  assert.equal(executed.parameters[0], token.id)
  assert.equal(executed.parameters[1], userId)
  assert.deepEqual(executed.parameters[2], token.tokenHash)
  assert.equal(executed.parameters[3], 'device-123')
  assert.equal(executed.parameters[4], 'mp-weixin')
  assert.match(executed.parameters[5], /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}\.\d{3}$/)
  assert.equal(executed.parameters.includes(password), false)
})

test('login accepts the eight-digit account boundary', async () => {
  const { response } = await login({ accountCode: '99999999', password })
  assert.equal(response.status, 200)
  assert.equal(lookedUpAccountCode, '99999999')
})
