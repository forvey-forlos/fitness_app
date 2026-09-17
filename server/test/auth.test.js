const assert = require('node:assert/strict')
const { after, before, test } = require('node:test')
const bcrypt = require('bcryptjs')

const createApp = require('../src/app')
const { createAuthService } = require('../src/services/auth')

const users = new Map()
const usersRepository = {
  async findByNormalizedUsername(normalized) {
    return users.get(normalized) || null
  },
  async create(user) {
    users.set(user.usernameNormalized, user)
  }
}

const app = createApp({
  authService: createAuthService({ usersRepository }),
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

async function register(payload) {
  const response = await fetch(`${baseUrl}/api/v1/auth/register`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(payload)
  })
  return { response, body: await response.json() }
}

test('registration stores only a bcrypt hash and returns safe user fields', async () => {
  const password = 'Fit@2026ab'
  const { response, body } = await register({ username: 'Fit健身', password })

  assert.equal(response.status, 201)
  assert.equal(body.code, 0)
  assert.equal(body.message, 'ok')
  assert.equal(body.requestId, response.headers.get('x-request-id'))
  assert.match(body.data.user.id, /^[0-9a-f]{8}(-[0-9a-f]{4}){3}-[0-9a-f]{12}$/)
  assert.deepEqual({ ...body.data.user, id: undefined }, {
    id: undefined,
    username: 'Fit健身',
    avatarUrl: null,
    timezone: 'Asia/Shanghai',
    status: 'active'
  })

  const saved = users.get('fit健身')
  assert.equal(saved.usernameNormalized, 'fit健身')
  assert.notEqual(saved.passwordHash, password)
  assert.match(saved.passwordHash, /^\$2[aby]\$12\$/)
  assert.equal(await bcrypt.compare(password, saved.passwordHash), true)
  assert.equal(JSON.stringify(body).includes('password'), false)
})

test('duplicate username is case-insensitive and returns a business error', async () => {
  const { response, body } = await register({ username: 'FIT健身', password: 'Fit@2026ab' })

  assert.equal(response.status, 409)
  assert.equal(body.code, 'USERNAME_ALREADY_EXISTS')
  assert.equal(body.data, null)
  assert.equal(body.requestId, response.headers.get('x-request-id'))
  assert.equal(users.size, 1)
})

test('invalid fields use the unified validation error and do not insert a user', async () => {
  const { response, body } = await register({ username: '中'.repeat(31), password: 'alllowercase' })

  assert.equal(response.status, 400)
  assert.equal(body.code, 'VALIDATION_ERROR')
  assert.equal(body.data, null)
  assert.equal(body.requestId, response.headers.get('x-request-id'))
  assert.deepEqual(body.errors.map((error) => error.field), ['username', 'password'])
  assert.equal(users.size, 1)
})

test('registration accepts digits, English, Han characters and exactly 30 characters', async () => {
  for (const username of ['Fit2026健身', '中'.repeat(30), 'A'.repeat(29) + '9']) {
    const { response, body } = await register({ username, password: 'Fit@2026ab' })
    assert.equal(response.status, 201)
    assert.equal(body.data.user.username, username)
    assert.equal(users.has(username.replace(/[A-Z]/g, (letter) => letter.toLowerCase())), true)
  }
})

test('registration rejects 31 characters and disallowed symbols', async () => {
  for (const username of ['A'.repeat(31), '中'.repeat(31), 'Fit_2026', 'Fit 2026']) {
    const { response, body } = await register({ username, password: 'Fit@2026ab' })
    assert.equal(response.status, 400)
    assert.equal(body.code, 'VALIDATION_ERROR')
    assert.equal(body.errors[0].field, 'username')
  }
})

test('a database uniqueness race also maps to the username conflict', async () => {
  const raceService = createAuthService({
    usersRepository: {
      findByNormalizedUsername: async () => null,
      create: async () => {
        const error = new Error('duplicate')
        error.code = 'ER_DUP_ENTRY'
        error.sqlMessage = "Duplicate entry for key 'uq_users_username_normalized'"
        throw error
      }
    }
  })

  await assert.rejects(
    raceService.register({
      username: 'Race', usernameNormalized: 'race',
      password: 'Fit@2026ab', timezone: 'Asia/Shanghai'
    }),
    { status: 409, code: 'USERNAME_ALREADY_EXISTS' }
  )
})
