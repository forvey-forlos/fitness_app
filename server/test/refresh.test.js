const assert = require('node:assert/strict')
const { after, before, test } = require('node:test')
const { randomBytes, randomUUID } = require('node:crypto')
const jwt = require('jsonwebtoken')

const createApp = require('../src/app')
const { createAuthService } = require('../src/services/auth')
const { createRefreshTokensRepository } = require('../src/repositories/refreshTokens')
const { createRefreshToken, hashRefreshToken } = require('../src/utils/tokens')

const userId = randomUUID()
const secret = randomBytes(48).toString('hex')
const oldToken = createRefreshToken()
const records = new Map()
const oldId = randomUUID()
records.set(hashRefreshToken(oldToken).toString('hex'), {
  id: oldId, user_id: userId, device_id: 'device-1', platform: 'h5',
  rotated_at: null, revoked_at: null, expired: 0,
  user_status: 'active', user_deleted_at: null
})

const fakeRepository = {
  async withLockedToken(tokenHash, callback) {
    const working = new Map([...records].map(([key, value]) => [key, { ...value }]))
    const key = tokenHash.toString('hex')
    const transaction = {
      token: working.get(key) || null,
      async markRotated(id) {
        const row = working.get(key)
        if (!row || row.id !== id || row.rotated_at) return false
        row.rotated_at = new Date()
        return true
      },
      async insertSuccessor(token, previousId) {
        working.set(token.tokenHash.toString('hex'), {
          id: token.id, user_id: token.userId, device_id: token.deviceId,
          platform: token.platform, expiresAt: token.expiresAt,
          rotated_from_token_id: previousId, rotated_at: null, revoked_at: null,
          expired: 0, user_status: 'active', user_deleted_at: null
        })
      }
    }
    const result = await callback(transaction)
    records.clear()
    for (const [recordKey, value] of working) records.set(recordKey, value)
    return result
  },
  async revokeByHash(tokenHash) {
    const row = records.get(tokenHash.toString('hex'))
    if (row && !row.revoked_at) row.revoked_at = new Date()
  }
}
const app = createApp({
  authService: createAuthService({
    usersRepository: {}, refreshTokensRepository: fakeRepository,
    tokenConfig: { accessSecret: secret, accessTtl: 1800, refreshTtl: 2592000 }
  }),
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

async function post(path, body) {
  const response = await fetch(`${baseUrl}/api/v1/auth/${path}`, {
    method: 'POST', headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body)
  })
  return { status: response.status, body: await response.json() }
}

test('refresh rotates the token and issues a new JWT', async () => {
  const result = await post('refresh', { refreshToken: oldToken, deviceId: 'device-1' })
  assert.equal(result.status, 200)
  assert.equal(result.body.code, 0)
  assert.equal(result.body.data.accessTokenExpiresIn, 1800)
  assert.equal(result.body.data.refreshTokenExpiresIn, 2592000)
  assert.notEqual(result.body.data.refreshToken, oldToken)
  assert.equal(jwt.verify(result.body.data.accessToken, secret, { algorithms: ['HS256'] }).sub, userId)
  assert.ok(records.get(hashRefreshToken(oldToken).toString('hex')).rotated_at)
  const successor = records.get(hashRefreshToken(result.body.data.refreshToken).toString('hex'))
  assert.equal(successor.rotated_from_token_id, oldId)
  assert.equal(successor.rotated_at, null)
  assert.equal(successor.revoked_at, null)
  assert.equal(JSON.stringify(result.body).includes('token_hash'), false)
})

test('a rotated token cannot be used again', async () => {
  const result = await post('refresh', { refreshToken: oldToken })
  assert.equal(result.status, 401)
  assert.equal(result.body.code, 'TOKEN_REUSED')
  assert.equal(records.size, 2)
})

test('expired, revoked, and unknown tokens are rejected', async () => {
  const cases = [
    { state: { expired: 1 }, code: 'TOKEN_EXPIRED' },
    { state: { revoked_at: new Date() }, code: 'UNAUTHORIZED' }
  ]
  for (const { state, code } of cases) {
    const token = createRefreshToken()
    records.set(hashRefreshToken(token).toString('hex'), {
      id: randomUUID(), user_id: userId, device_id: null, platform: null,
      rotated_at: null, revoked_at: null, expired: 0,
      user_status: 'active', user_deleted_at: null, ...state
    })
    const result = await post('refresh', { refreshToken: token })
    assert.equal(result.status, 401)
    assert.equal(result.body.code, code)
  }
  const unknown = await post('refresh', { refreshToken: createRefreshToken() })
  assert.equal(unknown.status, 401)
  assert.equal(unknown.body.code, 'UNAUTHORIZED')
})

test('logout revokes the current refresh token', async () => {
  const token = createRefreshToken()
  const key = hashRefreshToken(token).toString('hex')
  records.set(key, {
    id: randomUUID(), user_id: userId, device_id: null, platform: 'h5',
    rotated_at: null, revoked_at: null, expired: 0,
    user_status: 'active', user_deleted_at: null
  })
  const logout = await post('logout', { refreshToken: token })
  assert.equal(logout.status, 200)
  assert.equal(logout.body.code, 0)
  assert.equal(logout.body.data, null)
  assert.ok(records.get(key).revoked_at)
  const retry = await post('refresh', { refreshToken: token })
  assert.equal(retry.status, 401)
})

test('repository commits both rotation writes or rolls back together', async () => {
  const steps = []
  const connection = {
    beginTransaction: async () => { steps.push('begin') },
    execute: async (sql) => {
      if (sql.includes('FOR UPDATE')) { steps.push('lock'); return [[{ id: oldId }]] }
      if (sql.includes('SET rotated_at')) { steps.push('rotate'); return [{ affectedRows: 1 }] }
      if (sql.includes('INSERT INTO refresh_tokens')) { steps.push('insert'); return [{}] }
      throw new Error('unexpected SQL')
    },
    commit: async () => { steps.push('commit') },
    rollback: async () => { steps.push('rollback') },
    release: () => { steps.push('release') }
  }
  const repository = createRefreshTokensRepository({ getConnection: async () => connection })
  const successor = {
    id: randomUUID(), userId, tokenHash: hashRefreshToken(createRefreshToken()),
    deviceId: null, platform: null, expiresAt: new Date(Date.now() + 60000)
  }
  await repository.withLockedToken(hashRefreshToken(oldToken), async (transaction) => {
    assert.equal(await transaction.markRotated(oldId), true)
    await transaction.insertSuccessor(successor, oldId)
  })
  assert.deepEqual(steps, ['begin', 'lock', 'rotate', 'insert', 'commit', 'release'])

  steps.length = 0
  await assert.rejects(repository.withLockedToken(hashRefreshToken(oldToken), async (transaction) => {
    await transaction.markRotated(oldId)
    throw new Error('insert failed')
  }))
  assert.deepEqual(steps, ['begin', 'lock', 'rotate', 'rollback', 'release'])
})
