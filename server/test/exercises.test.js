const assert = require('node:assert/strict')
const { test } = require('node:test')
const { randomBytes, randomUUID } = require('node:crypto')
const jwt = require('jsonwebtoken')

const createApp = require('../src/app')
const { createAuthMiddleware } = require('../src/middlewares/auth')
const { createExercisesService } = require('../src/services/exercises')

const userA = '550e8400-e29b-41d4-a716-446655440001'
const userB = '550e8400-e29b-41d4-a716-446655440002'
const stamp = '2026-09-18T00:00:00.000000Z'

test('exercise catalog and custom actions enforce filters and ownership', async (t) => {
  const secret = randomBytes(48).toString('hex')
  const records = new Map()
  function add(record) {
    const row = {
      id: randomUUID(), owner_user_id: null,
      name: '杠铃平板卧推', name_normalized: '杠铃平板卧推',
      category: 'chest', muscle_group: 'chest', equipment: 'barbell',
      is_system: 1, version: 1, request_hash: null, idempotency_key: null,
      created_at: stamp, updated_at: stamp, deleted_at: null,
      ...record
    }
    records.set(row.id, row)
    return row
  }
  const system = add({})
  add({ name: '绳索弯举', name_normalized: '绳索弯举', category: 'arms',
    muscle_group: 'biceps', equipment: 'cable' })
  const own = add({ owner_user_id: userA, is_system: 0,
    name: '自定义推胸', name_normalized: '自定义推胸', equipment: 'machine' })
  const privateB = add({ owner_user_id: userB, is_system: 0,
    name: '私有卧推', name_normalized: '私有卧推', equipment: 'dumbbell' })
  const repository = {
    async findVisibleById(userId, id) {
      const row = records.get(id)
      return row && !row.deleted_at && (row.is_system || row.owner_user_id === userId)
        ? row : null
    },
    async findByNormalizedName(userId, category, normalized) {
      return [...records.values()].find((row) => !row.is_system && !row.deleted_at &&
        row.owner_user_id === userId && row.category === category &&
        row.name_normalized === normalized) || null
    },
    async findByIdempotencyKey(userId, key) {
      return [...records.values()].find((row) => !row.is_system &&
        row.owner_user_id === userId && row.idempotency_key === key) || null
    },
    async list(userId, filters) {
      const rows = [...records.values()].filter((row) =>
        !row.deleted_at && (row.is_system || row.owner_user_id === userId) &&
        (!filters.category || row.category === filters.category) &&
        (!filters.muscleGroup || row.muscle_group === filters.muscleGroup) &&
        (!filters.equipment || row.equipment === filters.equipment) &&
        (!filters.keyword || row.name_normalized.includes(filters.keyword)))
        .sort((a, b) => b.is_system - a.is_system ||
          a.category.localeCompare(b.category) ||
          a.name_normalized.localeCompare(b.name_normalized) ||
          a.id.localeCompare(b.id))
      return {
        total: rows.length,
        rows: rows.slice((filters.page - 1) * filters.pageSize, filters.page * filters.pageSize)
      }
    },
    async create(record) {
      if (record.idempotencyKey && await this.findByIdempotencyKey(record.ownerUserId, record.idempotencyKey)) {
        const error = new Error('duplicate')
        error.code = 'ER_DUP_ENTRY'
        throw error
      }
      add({
        id: record.id, owner_user_id: record.ownerUserId, is_system: 0,
        name: record.name, name_normalized: record.nameNormalized,
        category: record.category, muscle_group: record.muscleGroup,
        equipment: record.equipment,
        idempotency_key: record.idempotencyKey, request_hash: record.requestHash
      })
    },
    async update(userId, id, version, changes) {
      const row = records.get(id)
      if (!row || row.owner_user_id !== userId || row.is_system ||
          row.deleted_at || row.version !== version) return false
      for (const [key, column] of [
        ['name', 'name'], ['nameNormalized', 'name_normalized'],
        ['category', 'category'], ['muscleGroup', 'muscle_group'],
        ['equipment', 'equipment']
      ]) {
        if (changes[key] !== undefined) row[column] = changes[key]
      }
      row.version++
      return true
    },
    async softDelete(userId, id, version) {
      const row = records.get(id)
      if (!row || row.owner_user_id !== userId || row.is_system ||
          row.deleted_at || row.version !== version) return false
      row.deleted_at = stamp
      row.version++
      return true
    }
  }
  const usersRepository = {
    async findActiveById(id) { return [userA, userB].includes(id) ? { id } : null }
  }
  const app = createApp({
    authMiddleware: createAuthMiddleware({ tokenConfig: { accessSecret: secret } }),
    exercisesService: createExercisesService({ exercisesRepository: repository, usersRepository }),
    healthService: { checkDatabase: async () => 1 },
    trainingPlanService: { listPlans: async () => [] }
  })
  const server = await new Promise((resolve) => {
    const listener = app.listen(0, '127.0.0.1', () => resolve(listener))
  })
  t.after(() => new Promise((resolve, reject) =>
    server.close((error) => error ? reject(error) : resolve())))
  const base = 'http://127.0.0.1:' + server.address().port + '/api/v1/exercises'
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

  await t.test('all five endpoints require login', async () => {
    for (const [method, path, body] of [
      ['GET', ''], ['GET', '/' + system.id],
      ['POST', '', { name: '测试', category: 'chest', muscleGroup: 'chest', equipment: 'barbell' }],
      ['PATCH', '/' + own.id, { version: 1, name: '测试' }],
      ['DELETE', '/' + own.id]
    ]) {
      const response = await request(method, path, null, body)
      assert.equal(response.status, 401)
    }
  })

  await t.test('list includes system and own actions, not other users', async () => {
    const response = await request('GET', '', userA)
    assert.equal(response.status, 200)
    assert.equal(response.result.data.total, 3)
    assert.deepEqual(new Set(response.result.data.items.map((item) => item.id)),
      new Set([system.id, own.id, ...[...records.values()]
        .filter((row) => row.is_system && row.id !== system.id).map((row) => row.id)]))
    assert.equal(response.result.data.items.some((item) => item.id === privateB.id), false)
    const systemDetail = await request('GET', '/' + system.id, userA)
    assert.equal(systemDetail.result.data.isSystem, true)
    const privateDetail = await request('GET', '/' + privateB.id, userA)
    assert.equal(privateDetail.status, 404)
  })

  await t.test('category, muscle group, equipment and keyword filter results', async () => {
    const chest = await request('GET', '?category=chest&equipment=barbell', userA)
    assert.deepEqual(chest.result.data.items.map((item) => item.id), [system.id])
    const arms = await request('GET', '?muscleGroup=biceps&equipment=cable', userA)
    assert.equal(arms.result.data.total, 1)
    const search = await request('GET', '?keyword=%E5%8D%A7%E6%8E%A8', userA)
    assert.deepEqual(search.result.data.items.map((item) => item.id), [system.id])
    const paged = await request('GET', '?page=1&pageSize=1', userA)
    assert.equal(paged.result.data.hasMore, true)
  })

  let createdId
  await t.test('create enforces ownership, normalization, dedupe and idempotency', async () => {
    const body = {
      name: 'My Press', category: 'chest', muscleGroup: 'chest', equipment: 'dumbbell'
    }
    const forged = await request('POST', '', userA, {
      ...body, ownerUserId: userB, isSystem: true
    })
    assert.equal(forged.status, 400)
    const created = await request('POST', '', userA, body, 'create-my-press')
    assert.equal(created.status, 201)
    createdId = created.result.data.id
    assert.equal(records.get(createdId).owner_user_id, userA)
    assert.equal(records.get(createdId).is_system, 0)
    assert.equal(records.get(createdId).name_normalized, 'my press')
    const retry = await request('POST', '', userA, body, 'create-my-press')
    assert.equal(retry.status, 200)
    assert.equal(retry.result.data.id, createdId)
    const duplicate = await request('POST', '', userA, { ...body, name: 'MY PRESS' })
    assert.equal(duplicate.status, 409)
    assert.equal(duplicate.result.code, 'EXERCISE_ALREADY_EXISTS')
    const conflict = await request('POST', '', userA, { ...body, name: 'Other Press' }, 'create-my-press')
    assert.equal(conflict.status, 409)
  })

  await t.test('only the owner may edit, with optimistic version control', async () => {
    const deniedSystem = await request('PATCH', '/' + system.id, userA,
      { version: 1, name: '改系统动作' })
    assert.equal(deniedSystem.status, 403)
    const deniedOther = await request('PATCH', '/' + privateB.id, userA,
      { version: 1, name: '改别人动作' })
    assert.equal(deniedOther.status, 404)
    const updated = await request('PATCH', '/' + createdId, userA,
      { version: 1, name: 'My Press 2', equipment: 'machine' })
    assert.equal(updated.status, 200)
    assert.equal(updated.result.data.version, 2)
    assert.equal(updated.result.data.equipment, 'machine')
    const stale = await request('PATCH', '/' + createdId, userA,
      { version: 1, name: 'My Press 3' })
    assert.equal(stale.status, 409)
  })

  await t.test('delete is soft and removed action stays hidden', async () => {
    const deniedSystem = await request('DELETE', '/' + system.id, userA)
    assert.equal(deniedSystem.status, 403)
    const deniedOther = await request('DELETE', '/' + privateB.id, userA)
    assert.equal(deniedOther.status, 404)
    const deleted = await request('DELETE', '/' + createdId, userA)
    assert.equal(deleted.status, 200)
    assert.equal(records.get(createdId).deleted_at, stamp)
    const detail = await request('GET', '/' + createdId, userA)
    assert.equal(detail.status, 404)
    const list = await request('GET', '?keyword=My%20Press', userA)
    assert.equal(list.result.data.total, 0)
    const recreated = await request('POST', '', userA,
      { name: 'My Press 2', category: 'chest', muscleGroup: 'chest', equipment: 'machine' })
    assert.equal(recreated.status, 201)
    assert.notEqual(recreated.result.data.id, createdId)
  })
})
