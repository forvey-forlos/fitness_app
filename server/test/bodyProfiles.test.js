const assert = require('node:assert/strict')
const { test } = require('node:test')
const { randomBytes } = require('node:crypto')
const jwt = require('jsonwebtoken')

const createApp = require('../src/app')
const { createAuthMiddleware } = require('../src/middlewares/auth')
const { createUsersService } = require('../src/services/users')
const { createBodyProfilesService } = require('../src/services/bodyProfiles')

const idA = '550e8400-e29b-41d4-a716-446655440001'
const idB = '550e8400-e29b-41d4-a716-446655440002'
const keys = ['height', 'weight', 'waist', 'chest', 'hip', 'shoulderWidth', 'thigh', 'upperArm', 'calf']
const columns = ['height', 'weight', 'waist', 'chest', 'hip', 'shoulder_width', 'thigh', 'upper_arm', 'calf']
const date = '2026-09-18T00:00:00.000000Z'

test('profile endpoints enforce auth, validation, version, and user isolation', async (t) => {
  const secret = randomBytes(48).toString('hex')
  const users = new Map([
    [idA, { id: idA, display_name: 'Alice', account_code: '12345678', avatar_url: null, timezone: 'Asia/Shanghai' }],
    [idB, { id: idB, display_name: 'Bob', account_code: '87654321', avatar_url: null, timezone: 'Asia/Shanghai' }]
  ])
  const profiles = new Map()
  const usersRepository = {
    async findActiveById(id) { return users.get(id) || null },
    async findByNormalizedUsername(name) {
      return [...users.values()].find((user) => user.username_normalized === name) || null
    },
    async updateProfile(id, changes) {
      const user = users.get(id)
      if (!user) return false
      if (changes.displayName !== undefined) user.display_name = changes.displayName
      if (changes.avatarUrl !== undefined) user.avatar_url = changes.avatarUrl
      if (changes.timezone !== undefined) user.timezone = changes.timezone
      return true
    }
  }
  const bodyProfilesRepository = {
    async findByUserId(id) { return profiles.get(id) || null },
    async create(id, values) {
      if (profiles.has(id)) {
        const error = new Error('duplicate')
        error.code = 'ER_DUP_ENTRY'
        throw error
      }
      const row = { user_id: id, version: 1, created_at: date, updated_at: date }
      columns.forEach((column, index) => { row[column] = values[index] })
      profiles.set(id, row)
      return true
    },
    async update(id, version, values) {
      const row = profiles.get(id)
      if (!row || row.version !== version) return false
      columns.forEach((column, index) => { row[column] = values[index] })
      row.version++
      return true
    }
  }
  const app = createApp({
    authMiddleware: createAuthMiddleware({ tokenConfig: { accessSecret: secret } }),
    userService: createUsersService({ usersRepository }),
    bodyProfilesService: createBodyProfilesService({ usersRepository, bodyProfilesRepository }),
    healthService: { checkDatabase: async () => 1 },
    trainingPlanService: { listPlans: async () => [] }
  })
  const server = await new Promise((resolve) => {
    const listener = app.listen(0, '127.0.0.1', () => resolve(listener))
  })
  t.after(() => new Promise((resolve, reject) =>
    server.close((error) => error ? reject(error) : resolve())))
  const baseUrl = 'http://127.0.0.1:' + server.address().port
  const token = (id) => jwt.sign({}, secret, { algorithm: 'HS256', subject: id, expiresIn: 1800 })
  async function request(method, path, id, body) {
    const response = await fetch(baseUrl + path, {
      method,
      headers: {
        ...(id ? { Authorization: 'Bearer ' + token(id) } : {}),
        ...(body ? { 'Content-Type': 'application/json' } : {})
      },
      ...(body ? { body: JSON.stringify(body) } : {})
    })
    const result = await response.json()
    assert.equal(result.requestId, response.headers.get('x-request-id'))
    return { status: response.status, result }
  }
  const path = '/api/v1/body/profile'
  const values = {
    height: 175, weight: 70.5, waist: 80, chest: 96, hip: null,
    shoulderWidth: 45, thigh: 52, upperArm: 32, calf: 36
  }

  await t.test('unauthenticated reads and writes are rejected', async () => {
    for (const [method, route, body] of [
      ['GET', path], ['PUT', path, { version: 0, ...values }],
      ['GET', '/api/v1/users/me'], ['PATCH', '/api/v1/users/me', { timezone: 'UTC' }]
    ]) {
      const result = await request(method, route, null, body)
      assert.equal(result.status, 401)
      assert.equal(result.result.code, 'UNAUTHORIZED')
    }
  })

  await t.test('empty profile returns null metrics and version zero', async () => {
    const { status, result } = await request('GET', path, idA)
    assert.equal(status, 200)
    assert.equal(result.data.version, 0)
    for (const key of keys) assert.equal(result.data[key], null)
    assert.equal(result.data.bmi, null)
  })

  await t.test('first create persists only the requesting user profile', async () => {
    const { status, result } = await request('PUT', path, idA, { version: 0, ...values })
    assert.equal(status, 200)
    assert.equal(result.data.version, 1)
    assert.equal(result.data.weight, 70.5)
    assert.equal(result.data.bmi, 23)
    assert.equal(profiles.size, 1)
    assert.equal(profiles.get(idA).user_id, idA)
    assert.equal(profiles.has(idB), false)
  })

  await t.test('update replaces values and increments version', async () => {
    const { status, result } = await request('PUT', path, idA, {
      version: 1, ...values, weight: 71.25, hip: 94
    })
    assert.equal(status, 200)
    assert.equal(result.data.version, 2)
    assert.equal(result.data.weight, 71.25)
    assert.equal(result.data.hip, 94)
    const stale = await request('PUT', path, idA, { version: 1, ...values })
    assert.equal(stale.status, 409)
    assert.equal(stale.result.code, 'VERSION_CONFLICT')
  })

  await t.test('invalid numbers, missing fields and unknown fields are rejected', async () => {
    for (const input of [
      { version: 2, ...values, weight: -1 },
      { version: 2, ...values, height: 170.123 },
      { version: 2, ...values, waist: '80' },
      { version: 2, height: 170 },
      { version: 2, ...values, userId: idB }
    ]) {
      const { status, result } = await request('PUT', path, idA, input)
      assert.equal(status, 400)
      assert.equal(result.code, 'VALIDATION_ERROR')
    }
    assert.equal(profiles.get(idA).version, 2)
  })

  await t.test('another user cannot read or replace the first profile', async () => {
    const empty = await request('GET', path, idB)
    assert.equal(empty.result.data.version, 0)
    const stale = await request('PUT', path, idB, { version: 2, ...values })
    assert.equal(stale.status, 409)
    const created = await request('PUT', path, idB, { version: 0, ...values, weight: 90 })
    assert.equal(created.result.data.weight, 90)
    assert.equal(profiles.get(idA).weight, 71.25)
  })

  await t.test('profile changes display name and permits duplicate nicknames', async () => {
    const updated = await request('PATCH', '/api/v1/users/me', idA, {
      username: 'NEWName', avatarUrl: 'https://example.com/a.png', timezone: 'UTC'
    })
    assert.equal(updated.status, 200)
    assert.equal(updated.result.data.username, 'NEWName')
    assert.equal(updated.result.data.displayName, 'NEWName')
    assert.equal(JSON.stringify(updated.result).includes('password_hash'), false)
    const duplicate = await request('PATCH', '/api/v1/users/me', idB, { username: 'newNAME' })
    assert.equal(duplicate.status, 200)
    assert.equal(duplicate.result.data.displayName, 'newNAME')
    const invalid = await request('PATCH', '/api/v1/users/me', idA, { timezone: 'not-a-zone' })
    assert.equal(invalid.status, 400)
  })
})
