const assert = require('node:assert/strict')
const { test } = require('node:test')
const { randomBytes, randomUUID } = require('node:crypto')
const jwt = require('jsonwebtoken')

const createApp = require('../src/app')
const { createAuthMiddleware } = require('../src/middlewares/auth')
const { createTrainingPlansService } = require('../src/services/trainingPlans')
const { createTrainingPlansRepository } = require('../src/repositories/trainingPlans')

const userA = '550e8400-e29b-41d4-a716-446655440001'
const userB = '550e8400-e29b-41d4-a716-446655440002'
const stamp = '2026-09-18T00:00:00.000000Z'

test('training plan API creates, filters, updates and isolates draft plans', async (t) => {
  const secret = randomBytes(48).toString('hex')
  const chestId = randomUUID()
  const absId = randomUUID()
  const privateId = randomUUID()
  const exercises = new Map([
    [chestId, {
      id: chestId, name: '杠铃平板卧推', category: 'chest',
      muscle_group: 'chest', equipment: 'barbell', is_system: 1,
      owner_user_id: null, deleted_at: null
    }],
    [absId, {
      id: absId, name: '卷腹', category: 'abs',
      muscle_group: 'core', equipment: 'bodyweight', is_system: 1,
      owner_user_id: null, deleted_at: null
    }],
    [privateId, {
      id: privateId, name: '别人的自定义动作', category: 'arms',
      muscle_group: 'biceps', equipment: 'dumbbell', is_system: 0,
      owner_user_id: userB, deleted_at: null
    }]
  ])
  const plans = new Map()
  const planItems = new Map()
  const repository = {
    async findOwnedById(userId, id) {
      const row = plans.get(id)
      return row && row.user_id === userId && !row.deleted_at ? row : null
    },
    async findByIdempotencyKey(userId, key) {
      return [...plans.values()].find((row) =>
        row.user_id === userId && row.idempotency_key === key) || null
    },
    async list(userId, filters) {
      const rows = [...plans.values()].filter((row) =>
        row.user_id === userId && !row.deleted_at &&
        (!filters.date || row.plan_date === filters.date) &&
        (!filters.startDate || row.plan_date >= filters.startDate) &&
        (!filters.endDate || row.plan_date <= filters.endDate) &&
        (!filters.status || row.status === filters.status))
        .sort((a, b) => b.plan_date.localeCompare(a.plan_date) || b.id.localeCompare(a.id))
      return {
        total: rows.length,
        rows: rows.slice((filters.page - 1) * filters.pageSize, filters.page * filters.pageSize)
      }
    },
    async listExercises(userId, planId) {
      const plan = await this.findOwnedById(userId, planId)
      if (!plan) return []
      return (planItems.get(planId) || []).filter((item) => !item.deleted_at)
        .sort((a, b) => a.sort_order - b.sort_order)
        .map((item) => {
          const exercise = exercises.get(item.exercise_id)
          return {
            ...item, exercise_name: exercise.name, exercise_category: exercise.category,
            exercise_muscle_group: exercise.muscle_group,
            exercise_equipment: exercise.equipment,
            exercise_is_system: exercise.is_system,
            exercise_deleted_at: exercise.deleted_at
          }
        })
    },
    async create(record, items) {
      if ([...plans.values()].some((row) =>
        row.user_id === record.userId && row.plan_date === record.planDate && !row.deleted_at)) {
        const error = new Error('duplicate date')
        error.code = 'ER_DUP_ENTRY'
        throw error
      }
      plans.set(record.id, {
        id: record.id, user_id: record.userId, plan_date: record.planDate,
        name: record.name, duration_minutes: record.durationMinutes,
        status: 'draft', version: 1, idempotency_key: record.idempotencyKey,
        request_hash: record.requestHash, created_at: stamp, updated_at: stamp,
        deleted_at: null
      })
      planItems.set(record.id, items.map((item) => ({
        id: item.id, exercise_id: item.exerciseId, sort_order: item.sortOrder,
        sets: item.sets, reps: item.reps, weight: item.weight,
        actual_sets: item.actual?.sets ?? null, actual_reps: item.actual?.reps ?? null,
        actual_weight: item.actual?.kg ?? null,
        rest_seconds: item.restSeconds, notes: item.notes,
        created_at: stamp, updated_at: stamp, deleted_at: null
      })))
      return true
    },
    async update(userId, id, version, record, items) {
      const row = await this.findOwnedById(userId, id)
      if (!row || row.version !== version || row.status !== 'draft') return false
      if ([...plans.values()].some((other) =>
        other.id !== id && other.user_id === userId &&
        other.plan_date === record.planDate && !other.deleted_at)) {
        const error = new Error('duplicate date')
        error.code = 'ER_DUP_ENTRY'
        throw error
      }
      row.plan_date = record.planDate
      row.name = record.name
      row.duration_minutes = record.durationMinutes
      row.version++
      for (const item of planItems.get(id) || []) item.deleted_at = stamp
      planItems.get(id).push(...items.map((item) => ({
        id: item.id, exercise_id: item.exerciseId, sort_order: item.sortOrder,
        sets: item.sets, reps: item.reps, weight: item.weight,
        actual_sets: item.actual?.sets ?? null, actual_reps: item.actual?.reps ?? null,
        actual_weight: item.actual?.kg ?? null,
        rest_seconds: item.restSeconds, notes: item.notes,
        created_at: stamp, updated_at: stamp, deleted_at: null
      })))
      return true
    },
    async softDelete(userId, id, version) {
      const row = await this.findOwnedById(userId, id)
      if (!row || row.version !== version) return false
      row.deleted_at = stamp
      row.version++
      for (const item of planItems.get(id) || []) item.deleted_at = stamp
      return true
    }
  }
  const usersRepository = {
    async findActiveById(id) { return [userA, userB].includes(id) ? { id } : null }
  }
  const exercisesRepository = {
    async findVisibleById(userId, id) {
      const row = exercises.get(id)
      return row && !row.deleted_at && (row.is_system || row.owner_user_id === userId)
        ? row : null
    }
  }
  const app = createApp({
    authMiddleware: createAuthMiddleware({ tokenConfig: { accessSecret: secret } }),
    trainingPlanService: createTrainingPlansService({
      trainingPlansRepository: repository, usersRepository, exercisesRepository
    }),
    healthService: { checkDatabase: async () => 1 }
  })
  const server = await new Promise((resolve) => {
    const listener = app.listen(0, '127.0.0.1', () => resolve(listener))
  })
  t.after(() => new Promise((resolve, reject) =>
    server.close((error) => error ? reject(error) : resolve())))
  const base = 'http://127.0.0.1:' + server.address().port + '/api/v1/training-plans'
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
  const chest = {
    exerciseId: chestId, sortOrder: 1,
    sets: 3, reps: 10, weight: 40, restSeconds: 90, notes: '热身后开始'
  }
  const abs = {
    exerciseId: absId, sortOrder: 2,
    sets: 3, reps: 15, weight: 0, restSeconds: 60, notes: null
  }
  let planId

  await t.test('all five formal endpoints reject missing token', async () => {
    for (const [method, path, body] of [
      ['GET', ''], ['GET', '/' + randomUUID()],
      ['POST', '', { planDate: '2026-09-18', exercises: [] }],
      ['PUT', '/' + randomUUID(), { planDate: '2026-09-18', version: 1, exercises: [] }],
      ['DELETE', '/' + randomUUID()]
    ]) {
      const response = await request(method, path, null, body)
      assert.equal(response.status, 401)
    }
  })

  await t.test('create multiple actions and generate a name', async () => {
    const created = await request('POST', '', userA,
      { planDate: '2026-09-18', exercises: [chest, abs] }, 'plan-2026-09-18')
    assert.equal(created.status, 201)
    planId = created.result.data.id
    assert.match(planId, /^[0-9a-f-]{36}$/)
    assert.equal(created.result.data.name, '胸腹训练')
    assert.equal(created.result.data.durationMinutes, 20)
    assert.equal(created.result.data.status, 'draft')
    assert.equal(created.result.data.exercises.length, 2)
    assert.equal(created.result.data.exercises[0].exercise.name, '杠铃平板卧推')
    const retry = await request('POST', '', userA,
      { planDate: '2026-09-18', exercises: [chest, abs] }, 'plan-2026-09-18')
    assert.equal(retry.status, 200)
    assert.equal(retry.result.data.id, planId)
    const duplicate = await request('POST', '', userA,
      { planDate: '2026-09-18', exercises: [] })
    assert.equal(duplicate.status, 409)
    assert.equal(duplicate.result.code, 'PLAN_DATE_CONFLICT')
  })

  await t.test('query by date and detail stay within the current user', async () => {
    const byDate = await request('GET', '?date=2026-09-18', userA)
    assert.equal(byDate.status, 200)
    assert.equal(byDate.result.data.total, 1)
    assert.equal(byDate.result.data.items[0].exercises.length, 2)
    const detail = await request('GET', '/' + planId, userA)
    assert.equal(detail.result.data.id, planId)
    assert.equal(detail.result.data.exercises[1].exercise.category, 'abs')
    const privateRead = await request('GET', '/' + planId, userB)
    assert.equal(privateRead.status, 404)
    const otherDate = await request('GET', '?date=2026-09-18', userB)
    assert.equal(otherDate.result.data.total, 0)
  })

  await t.test('invalid and private exercises are rejected without creating plans', async () => {
    for (const exerciseId of [privateId, randomUUID()]) {
      const failed = await request('POST', '', userA, {
        planDate: '2026-09-19',
        exercises: [{ exerciseId, sortOrder: 1 }]
      })
      assert.equal(failed.status, 422)
      assert.equal(failed.result.code, 'EXERCISE_UNAVAILABLE')
    }
    assert.equal(plans.size, 1)
    const forged = await request('POST', '', userA, {
      userId: userB, planDate: '2026-09-19', exercises: []
    })
    assert.equal(forged.status, 400)
  })

  await t.test('invalid plan numbers, status writes and duplicate order are rejected', async () => {
    for (const body of [
      { planDate: '2026-09-19', exercises: [{ ...chest, sets: 0 }] },
      { planDate: '2026-09-19', exercises: [{ ...chest, weight: -1 }] },
      { planDate: '2026-09-19', exercises: [chest, { ...abs, sortOrder: 1 }] },
      { planDate: '2026-09-19', status: 'completed', exercises: [] },
      { planDate: '2026-02-30', exercises: [] }
    ]) {
      const response = await request('POST', '', userA, body)
      assert.equal(response.status, 400)
      assert.equal(response.result.code, 'VALIDATION_ERROR')
    }
    const invalidFilter = await request('GET', '?status=planned', userA)
    assert.equal(invalidFilter.status, 400)
    assert.equal(plans.size, 1)
  })

  await t.test('PUT replaces actions and enforces version', async () => {
    const denied = await request('PUT', '/' + planId, userB, {
      version: 1, planDate: '2026-09-18', exercises: []
    })
    assert.equal(denied.status, 404)
    const updated = await request('PUT', '/' + planId, userA, {
      version: 1, planDate: '2026-09-18', name: '我的今日计划',
      durationMinutes: 35, exercises: [{...abs,actual:{kg:12.5,reps:8,sets:4}}]
    })
    assert.equal(updated.status, 200)
    assert.equal(updated.result.data.version, 2)
    assert.equal(updated.result.data.name, '我的今日计划')
    assert.equal(updated.result.data.exercises.length, 1)
    assert.deepEqual(updated.result.data.exercises[0].actual,{kg:12.5,reps:8,sets:4})
    assert.equal(planItems.get(planId).filter((item) => !item.deleted_at).length, 1)
    const stale = await request('PUT', '/' + planId, userA, {
      version: 1, planDate: '2026-09-18', exercises: []
    })
    assert.equal(stale.status, 409)
    assert.equal(stale.result.code, 'PLAN_VERSION_CONFLICT')
  })

  await t.test('list supports range, status and pagination', async () => {
    const empty = await request('POST', '', userA,
      { planDate: '2026-09-20', exercises: [] })
    assert.equal(empty.status, 201)
    assert.equal(empty.result.data.name, '今日训练')
    const list = await request('GET',
      '?startDate=2026-09-18&endDate=2026-09-20&status=draft&page=1&pageSize=1', userA)
    assert.equal(list.result.data.total, 2)
    assert.equal(list.result.data.hasMore, true)
    assert.equal(list.result.data.items[0].planDate, '2026-09-20')
  })

  await t.test('DELETE soft-deletes only owned plan and hides its exercises', async () => {
    const denied = await request('DELETE', '/' + planId, userB)
    assert.equal(denied.status, 404)
    const deleted = await request('DELETE', '/' + planId, userA)
    assert.equal(deleted.status, 200)
    assert.equal(plans.get(planId).deleted_at, stamp)
    assert.equal(planItems.get(planId).every((item) => item.deleted_at), true)
    const missing = await request('GET', '/' + planId, userA)
    assert.equal(missing.status, 404)
    const byDate = await request('GET', '?date=2026-09-18', userA)
    assert.equal(byDate.result.data.total, 0)
  })
})

test('repository rolls back parent insert when a child insert fails', async () => {
  const events = []
  const connection = {
    async beginTransaction() { events.push('begin') },
    async execute(sql) {
      if (sql.includes('INSERT INTO training_plans')) {
        events.push('parent')
        return [{ affectedRows: 1 }]
      }
      if (sql.includes('INSERT INTO training_plan_exercises')) {
        events.push('child-failed')
        throw new Error('simulated child failure')
      }
      throw new Error('unexpected SQL')
    },
    async commit() { events.push('commit') },
    async rollback() { events.push('rollback') },
    release() { events.push('release') }
  }
  const repository = createTrainingPlansRepository({
    async getConnection() { return connection }
  })
  await assert.rejects(
    repository.create({
      id: randomUUID(), userId: userA, planDate: '2026-09-18',
      name: '测试计划', durationMinutes: 20,
      idempotencyKey: null, requestHash: null
    }, [{
      id: randomUUID(), exerciseId: randomUUID(), sortOrder: 1,
      sets: 3, reps: 10, weight: 20, restSeconds: 60, notes: null
    }]),
    /simulated child failure/
  )
  assert.deepEqual(events, ['begin', 'parent', 'child-failed', 'rollback', 'release'])
})
