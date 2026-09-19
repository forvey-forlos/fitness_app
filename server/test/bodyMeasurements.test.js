const assert = require('node:assert/strict')
const { test } = require('node:test')
const { randomBytes } = require('node:crypto')
const jwt = require('jsonwebtoken')

const createApp = require('../src/app')
const { createAuthMiddleware } = require('../src/middlewares/auth')
const { createBodyMeasurementsService } = require('../src/services/bodyMeasurements')
const { startOfLocalDate } = require('../src/utils/bodyTime')

const userA = '550e8400-e29b-41d4-a716-446655440001'
const userB = '550e8400-e29b-41d4-a716-446655440002'
const fields = {
  weight: 'weight', waist: 'waist', chest: 'chest', hip: 'hip',
  shoulderWidth: 'shoulder_width', thigh: 'thigh', upperArm: 'upper_arm', calf: 'calf'
}
const stamp = '2026-09-18T00:00:00.000000Z'

test('local-day conversion respects daylight-saving changes', () => {
  assert.equal(startOfLocalDate('2026-03-08', 'America/New_York'), '2026-03-08T05:00:00.000Z')
  assert.equal(startOfLocalDate('2026-03-09', 'America/New_York'), '2026-03-09T04:00:00.000Z')
})

test('measurement API enforces ownership, versions, idempotency and trends', async (t) => {
  const records = new Map()
  const secret = randomBytes(48).toString('hex')
  const usersRepository = {
    async findActiveById(id) {
      return [userA, userB].includes(id) ? { id, timezone: 'Asia/Shanghai' } : null
    }
  }
  const repository = {
    async findOwnedById(id, measurementId) {
      const row = records.get(measurementId)
      return row && row.user_id === id && !row.deleted_at ? row : null
    },
    async findByIdempotencyKey(id, key) {
      return [...records.values()].find((row) =>
        row.user_id === id && row.idempotency_key === key) || null
    },
    async create(record) {
      if (record.idempotencyKey && await this.findByIdempotencyKey(record.userId, record.idempotencyKey)) {
        const error = new Error('duplicate')
        error.code = 'ER_DUP_ENTRY'
        throw error
      }
      const row = {
        id: record.id, user_id: record.userId,
        measured_at: record.measuredAt.replace('.000Z', '.000000Z'),
        idempotency_key: record.idempotencyKey, request_hash: record.requestHash,
        version: 1, created_at: stamp, updated_at: stamp, deleted_at: null
      }
      for (const [key, column] of Object.entries(fields)) row[column] = record[key]
      records.set(row.id, row)
    },
    async list(id, { start, end, page, pageSize }) {
      const rows = [...records.values()].filter((row) =>
        row.user_id === id && !row.deleted_at &&
        (!start || row.measured_at >= start) && (!end || row.measured_at < end))
        .sort((a, b) => b.measured_at.localeCompare(a.measured_at) || b.id.localeCompare(a.id))
      return { rows: rows.slice((page - 1) * pageSize, page * pageSize), total: rows.length }
    },
    async update(id, measurementId, version, changes) {
      const row = await this.findOwnedById(id, measurementId)
      if (!row || row.version !== version) return false
      if (changes.measuredAt) row.measured_at = changes.measuredAt.replace('.000Z', '.000000Z')
      for (const [key, column] of Object.entries(fields)) {
        if (changes[key] !== undefined) row[column] = changes[key]
      }
      row.version++
      return true
    },
    async softDelete(id, measurementId, version) {
      const row = await this.findOwnedById(id, measurementId)
      if (!row || row.version !== version) return false
      row.deleted_at = stamp
      row.version++
      return true
    },
    async listWeights(id, start, end) {
      return [...records.values()].filter((row) =>
        row.user_id === id && !row.deleted_at && row.weight !== null &&
        row.measured_at >= start && row.measured_at < end)
        .sort((a, b) => a.measured_at.localeCompare(b.measured_at) || a.id.localeCompare(b.id))
    }
  }
  const app = createApp({
    authMiddleware: createAuthMiddleware({ tokenConfig: { accessSecret: secret } }),
    bodyMeasurementsService: createBodyMeasurementsService({
      bodyMeasurementsRepository: repository, usersRepository,
      now: () => new Date('2026-09-18T12:00:00.000Z')
    }),
    healthService: { checkDatabase: async () => 1 },
    trainingPlanService: { listPlans: async () => [] }
  })
  const server = await new Promise((resolve) => {
    const listener = app.listen(0, '127.0.0.1', () => resolve(listener))
  })
  t.after(() => new Promise((resolve, reject) =>
    server.close((error) => error ? reject(error) : resolve())))
  const base = 'http://127.0.0.1:' + server.address().port + '/api/v1/body'
  async function request(method, path, userId, body, key) {
    const response = await fetch(base + path, {
      method,
      headers: {
        ...(userId ? {
          Authorization: 'Bearer ' + jwt.sign({}, secret, {
            algorithm: 'HS256', subject: userId, expiresIn: 1800
          })
        } : {}),
        ...(body ? { 'Content-Type': 'application/json' } : {}),
        ...(key ? { 'Idempotency-Key': key } : {})
      },
      ...(body ? { body: JSON.stringify(body) } : {})
    })
    const result = await response.json()
    assert.equal(result.requestId, response.headers.get('x-request-id'))
    return { status: response.status, result }
  }
  let aprilId
  let newestId

  await t.test('all endpoints reject missing Access Token', async () => {
    for (const [method, path, body] of [
      ['POST', '/measurements', { measuredAt: '2026-09-18T00:00:00Z', weight: 70 }],
      ['GET', '/measurements'],
      ['PATCH', '/measurements/' + userA, { version: 1, weight: 70 }],
      ['DELETE', '/measurements/' + userA],
      ['GET', '/trends/weight?range=week']
    ]) {
      const { status, result } = await request(method, path, null, body)
      assert.equal(status, 401)
      assert.equal(result.code, 'UNAUTHORIZED')
    }
  })

  await t.test('create uses UUID; same timestamp can hold distinct records', async () => {
    const first = await request('POST', '/measurements', userA,
      { measuredAt: '2026-04-12T10:00:00.000Z', weight: 75 }, 'april')
    assert.equal(first.status, 201)
    assert.match(first.result.data.id, /^[0-9a-f-]{36}$/)
    aprilId = first.result.data.id
    const repeated = await request('POST', '/measurements', userA,
      { measuredAt: '2026-04-12T10:00:00.000Z', weight: 75 }, 'april')
    assert.equal(repeated.status, 200)
    assert.equal(repeated.result.data.id, aprilId)
    const conflict = await request('POST', '/measurements', userA,
      { measuredAt: '2026-04-12T10:00:00.000Z', weight: 76 }, 'april')
    assert.equal(conflict.status, 409)
    const second = await request('POST', '/measurements', userA,
      { measuredAt: '2026-04-12T10:00:00.000Z', waist: 80 })
    assert.equal(second.status, 201)
    assert.notEqual(second.result.data.id, aprilId)
  })

  await t.test('history is paginated, date-filtered, and isolated', async () => {
    for (const [measuredAt, weight] of [
      ['2026-08-05T00:00:00.000Z', 72],
      ['2026-09-15T00:00:00.000Z', 70],
      ['2026-09-18T00:00:00.000Z', 71]
    ]) {
      const created = await request('POST', '/measurements', userA, { measuredAt, weight })
      newestId = created.result.data.id
    }
    await request('POST', '/measurements', userB,
      { measuredAt: '2026-09-18T00:00:00.000Z', weight: 95 })
    const history = await request('GET',
      '/measurements?startDate=2026-09-01&endDate=2026-09-30&page=1&pageSize=1', userA)
    assert.equal(history.status, 200)
    assert.equal(history.result.data.total, 2)
    assert.equal(history.result.data.items.length, 1)
    assert.equal(history.result.data.hasMore, true)
    assert.equal(history.result.data.items[0].weight, 71)
    const other = await request('GET', '/measurements', userB)
    assert.equal(other.result.data.total, 1)
    assert.equal(other.result.data.items[0].weight, 95)
  })

  await t.test('owner can update and delete, another user cannot', async () => {
    const denied = await request('PATCH', '/measurements/' + newestId, userB,
      { version: 1, weight: 100 })
    assert.equal(denied.status, 404)
    const updated = await request('PATCH', '/measurements/' + newestId, userA,
      { version: 1, weight: 71.5 })
    assert.equal(updated.status, 200)
    assert.equal(updated.result.data.version, 2)
    assert.equal(updated.result.data.weight, 71.5)
    const stale = await request('PATCH', '/measurements/' + newestId, userA,
      { version: 1, weight: 72 })
    assert.equal(stale.status, 409)
    const deleteDenied = await request('DELETE', '/measurements/' + newestId, userB)
    assert.equal(deleteDenied.status, 404)
  })

  await t.test('invalid numbers and dates are rejected', async () => {
    for (const body of [
      { measuredAt: '2026-09-18T00:00:00Z', weight: -1 },
      { measuredAt: '2026-09-18T00:00:00Z', weight: 70.123 },
      { measuredAt: '2026-09-18', weight: 70 },
      { measuredAt: '2026-02-30T00:00:00Z', weight: 70 },
      { measuredAt: '2026-09-18T00:00:00Z', weight: '70' },
      { measuredAt: '2026-09-18T00:00:00Z', weight: null }
    ]) {
      const response = await request('POST', '/measurements', userA, body)
      assert.equal(response.status, 400)
      assert.equal(response.result.code, 'VALIDATION_ERROR')
    }
  })

  await t.test('weekly and monthly trends select the last measurement', async () => {
    const week = await request('GET', '/trends/weight?range=week', userA)
    assert.equal(week.status, 200)
    assert.deepEqual(week.result.data.points, [
      { date: '2026-09-15', value: 70 },
      { date: '2026-09-18', value: 71.5 }
    ])
    assert.equal(week.result.data.current, 71.5)
    assert.equal(week.result.data.change, 1.5)
    const month = await request('GET', '/trends/weight?range=month', userA)
    assert.deepEqual(month.result.data.points, [
      { date: '2026-04', value: 75 },
      { date: '2026-08', value: 72 },
      { date: '2026-09', value: 71.5 }
    ])
    assert.equal(month.result.data.change, -3.5)
  })

  await t.test('soft-deleted values disappear from history and trends', async () => {
    const deleted = await request('DELETE', '/measurements/' + newestId, userA)
    assert.equal(deleted.status, 200)
    assert.equal(records.get(newestId).deleted_at, stamp)
    const week = await request('GET', '/trends/weight?range=week', userA)
    assert.deepEqual(week.result.data.points, [{ date: '2026-09-15', value: 70 }])
    const month = await request('GET', '/trends/weight?range=month', userA)
    assert.equal(month.result.data.current, 70)
    const history = await request('GET', '/measurements?startDate=2026-09-01', userA)
    assert.equal(history.result.data.total, 1)
  })
})
