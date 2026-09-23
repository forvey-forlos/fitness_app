const assert = require('node:assert/strict')
const { test } = require('node:test')
const { randomBytes, randomUUID } = require('node:crypto')
const jwt = require('jsonwebtoken')
const createApp = require('../src/app')
const { createAuthMiddleware } = require('../src/middlewares/auth')
const { createTrainingSessionsService } = require('../src/services/trainingSessions')
const { createTrainingSessionsRepository } = require('../src/repositories/trainingSessions')

const userA = '550e8400-e29b-41d4-a716-446655440001'
const userB = '550e8400-e29b-41d4-a716-446655440002'
const planId = '550e8400-e29b-41d4-a716-446655440003'
const deletedPlanId = '550e8400-e29b-41d4-a716-446655440004'
const exerciseId = '550e8400-e29b-41d4-a716-446655440005'

test('completion, immutable snapshots, idempotency, isolation, history and timezone weekly stats', async (t) => {
  const secret = randomBytes(48).toString('hex')
  const plans = new Map([
    [planId, { id: planId, user_id: userA, name: '胸部训练', plan_date: '2026-09-18',
      duration_minutes: 40, status: 'draft', version: 2, deleted_at: null }],
    [deletedPlanId, { id: deletedPlanId, user_id: userA, name: '已删除',
      plan_date: '2026-09-17', duration_minutes: 30, status: 'draft', version: 1,
      deleted_at: '2026-09-17T00:00:00.000Z' }]
  ])
  const source = [{ exercise_id: exerciseId, exercise_name: '杠铃卧推',
    category: 'chest', muscle_group: 'chest', equipment: 'barbell',
    sort_order: 1, sets: 4, reps: 10, weight: '40.00', rest_seconds: 60, notes: null }]
  const records = new Map()
  const children = new Map()
  let failChild = false
  const repository = {
    async findByKey(userId, key) {
      const row = [...records.values()].find((r) => r.user_id === userId && r.key === key)
      return row ? { id: row.id, training_plan_id: row.training_plan_id, request_hash: row.request_hash } : null
    },
    async withTransaction(callback) {
      const beforePlans = structuredClone([...plans])
      const beforeRecords = structuredClone([...records])
      const beforeChildren = structuredClone([...children])
      try {
        return await callback({
          async findByPlan(userId, id) {
            const row = [...records.values()].find((r) => r.user_id === userId && r.training_plan_id === id)
            return row ? { id: row.id, training_plan_id: id, idempotency_key: row.key, request_hash: row.request_hash } : null
          },
          async lockPlan(userId, id) {
            const p = plans.get(id)
            return p && p.user_id === userId ? p : null
          },
          async listPlanExercises(userId, id) {
            const p = plans.get(id)
            return p && p.user_id === userId ? source.map((item) => ({ ...item })) : []
          },
          async insertSession(r) {
            records.set(r.id, {
              id: r.id, user_id: r.userId, training_plan_id: r.planId,
              plan_date: r.planDate, plan_name_snapshot: r.name,
              duration_minutes: r.durationMinutes, plan_version: r.planVersion,
              started_at: null, completed_at: r.completedAt.replace(' ', 'T') + 'Z',
              created_at: '2026-09-18T00:00:00.000Z',
              key: r.key, request_hash: r.hash, version: 1
            })
          },
          async insertExercises(id, items) {
            if (failChild) throw new Error('child insert failed')
            children.set(id, items.map((item) => ({
              id: item.id, exercise_id: item.exercise_id,
              exercise_name_snapshot: item.exercise_name,
              category_snapshot: item.category,
              muscle_group_snapshot: item.muscle_group,
              equipment_snapshot: item.equipment,
              sort_order: item.sort_order, sets: item.sets, reps: item.reps,
              weight: item.weight, actual_sets: item.actual_sets,
              actual_reps: item.actual_reps, actual_weight: item.actual_weight,
              rest_seconds: item.rest_seconds, notes: item.notes
            })))
          },
          async markCompleted(userId, id, version) {
            const p = plans.get(id)
            if (!p || p.user_id !== userId || p.version !== version) return false
            p.status = 'completed'
            p.version++
            return true
          }
        })
      } catch (error) {
        plans.clear(); for (const [k, v] of beforePlans) plans.set(k, v)
        records.clear(); for (const [k, v] of beforeRecords) records.set(k, v)
        children.clear(); for (const [k, v] of beforeChildren) children.set(k, v)
        throw error
      }
    },
    async findOwnedById(userId, id) {
      const row = records.get(id)
      return row && row.user_id === userId && !row.deleted_at ? row : null
    },
    async listExercises(userId, id) {
      const row = records.get(id)
      return row && row.user_id === userId && !row.deleted_at ? children.get(id) || [] : []
    },
    async list(userId, filters) {
      const rows = [...records.values()].filter((r) => r.user_id === userId && !r.deleted_at &&
        (!filters.startUtc || r.completed_at >= filters.startUtc.replace(' ', 'T') + 'Z') &&
        (!filters.endUtc || r.completed_at < filters.endUtc.replace(' ', 'T') + 'Z'))
        .sort((a, b) => b.completed_at.localeCompare(a.completed_at))
      return { total: rows.length, rows: rows.slice((filters.page - 1) * filters.pageSize, filters.page * filters.pageSize) }
    },
    async listCompletedByPlanDateRange(userId, start, end) {
      return [...records.values()].filter((r) => r.user_id === userId && !r.deleted_at &&
        r.plan_date >= start && r.plan_date < end)
        .map((r) => ({ id: r.id, plan_date: r.plan_date }))
    },
    async listRecentPlanDates(userId, beforeDate, cursor, limit) {
      return [...records.values()].filter((r) => r.user_id === userId && !r.deleted_at &&
        r.plan_date < beforeDate)
        .sort((a, b) => b.plan_date.localeCompare(a.plan_date)||b.id.localeCompare(a.id))
        .slice(0, limit).map((r) => ({ id: r.id, plan_date: r.plan_date }))
    },
    async softDelete(userId, id) {
      const row = records.get(id)
      if (!row || row.user_id !== userId || row.deleted_at) return false
      row.deleted_at = '2026-09-19T01:00:00.000Z'
      row.version += 1
      return true
    }
  }
  const service = createTrainingSessionsService({
    trainingSessionsRepository: repository,
    usersRepository: { findActiveById: async (id) =>
      [userA, userB].includes(id) ? { id, timezone: 'Asia/Shanghai' } : null },
    now: () => new Date('2026-09-18T16:30:00.000Z')
  })
  const app = createApp({
    authMiddleware: createAuthMiddleware({ tokenConfig: { accessSecret: secret } }),
    trainingSessionsService: service
  })
  const server = await new Promise((resolve) => {
    const listener = app.listen(0, '127.0.0.1', () => resolve(listener))
  })
  t.after(() => new Promise((resolve, reject) =>
    server.close((error) => error ? reject(error) : resolve())))
  const base = 'http://127.0.0.1:' + server.address().port + '/api/v1'
  async function request(method, path, userId, body, key) {
    if (method === 'POST' && path.includes('/complete') && body && body.exercises === undefined) {
      body = { ...body, exercises: [{ exerciseId, actual: { kg: 42.5, reps: 9, sets: 4 } }] }
    }
    const response = await fetch(base + path, {
      method,
      headers: {
        ...(userId ? { Authorization: 'Bearer ' + jwt.sign({ sub: userId }, secret, { expiresIn: '1h' }) } : {}),
        ...(body ? { 'Content-Type': 'application/json' } : {}),
        ...(key ? { 'Idempotency-Key': key } : {})
      },
      ...(body ? { body: JSON.stringify(body) } : {})
    })
    return { status: response.status, body: await response.json() }
  }
  const completePath = '/training-plans/' + planId + '/complete'
  await t.test('auth, ownership, deletion, validation and rollback', async () => {
    assert.equal((await request('POST', completePath, null, { version: 2 }, 'k1')).status, 401)
    assert.equal((await request('POST', completePath, userB, { version: 2 }, 'k1')).status, 404)
    assert.equal((await request('POST', '/training-plans/' + deletedPlanId + '/complete', userA, { version: 1 }, 'k2')).status, 404)
    assert.equal((await request('POST', completePath, userA, { version: 2 })).status, 400)
    assert.equal((await request('POST', completePath, userA, { version: 1 }, 'k1')).status, 409)
    failChild = true
    assert.equal((await request('POST', completePath, userA, { version: 2 }, 'k1')).status, 500)
    failChild = false
    assert.equal(records.size, 0)
    assert.equal(plans.get(planId).status, 'draft')
  })
  let recordId
  await t.test('completion and idempotent retries', async () => {
    const first = await request('POST', completePath, userA, {
      version: 2, completedAt: '2026-09-18T16:10:00.000Z'
    }, 'finish-1')
    assert.equal(first.status, 200)
    assert.equal(first.body.data.plan.version, 3)
    recordId = first.body.data.trainingRecord.id
    assert.equal(first.body.data.trainingRecord.exercises[0].exerciseNameSnapshot, '杠铃卧推')
    assert.deepEqual(first.body.data.trainingRecord.exercises[0].target, { kg: 40, reps: 10, sets: 4 })
    assert.deepEqual(first.body.data.trainingRecord.exercises[0].actual, { kg: 42.5, reps: 9, sets: 4 })
    const retry = await request('POST', completePath, userA, {
      version: 2, completedAt: '2026-09-18T16:10:00.000Z'
    }, 'finish-1')
    assert.equal(retry.status, 200)
    assert.equal(retry.body.data.trainingRecord.id, recordId)
    assert.equal(retry.body.data.plan.version, 3)
    assert.equal(records.size, 1)
    assert.equal((await request('POST', completePath, userA, {
      version: 2, completedAt: '2026-09-18T16:20:00.000Z'
    }, 'finish-1')).body.code, 'IDEMPOTENCY_CONFLICT')
    assert.equal((await request('POST', completePath, userA, { version: 3 }, 'finish-2')).body.code, 'TRAINING_ALREADY_COMPLETED')
    assert.equal(records.size, 1)
  })
  await t.test('history is immutable, private and paginated', async () => {
    plans.get(planId).name = '后来改名'
    source[0].exercise_name = '后来改动作'
    const detail = await request('GET', '/training-history/' + recordId, userA)
    assert.equal(detail.body.data.planNameSnapshot, '胸部训练')
    assert.equal(detail.body.data.exercises[0].exerciseNameSnapshot, '杠铃卧推')
    assert.equal((await request('GET', '/training-history/' + recordId, userB)).status, 404)
    const list = await request('GET', '/training-history?startDate=2026-09-19&endDate=2026-09-19&limit=1', userA)
    assert.equal(list.body.data.total, 1)
    assert.equal(list.body.data.items[0].id, recordId)
    assert.equal((await request('GET', '/training-history', userB)).body.data.total, 0)
  })
  await t.test('week highlights the plan date and counts a day once', async () => {
    const secondId = randomUUID()
    records.set(secondId, {
      ...records.get(recordId), id: secondId, key: 'another-plan',
      training_plan_id: randomUUID(), completed_at: '2026-09-18T17:00:00.000Z'
    })
    const week = await request('GET', '/training-stats/week', userA)
    assert.equal(week.body.data.weekStart, '2026-09-14')
    assert.equal(week.body.data.days.length, 7)
    assert.equal(week.body.data.completedCount, 1)
    assert.equal(week.body.data.days[4].date, '2026-09-18')
    assert.equal(week.body.data.days[4].recordId, recordId)
    assert.equal((await request('GET', '/training-stats/week', userB)).body.data.completedCount, 0)
    assert.equal((await request('GET', '/training-stats/weekly?weekStart=2026-09-14&timezone=Asia/Shanghai', userA)).status, 200)
    assert.equal((await request('GET', '/training-stats/weekly?timezone=UTC', userA)).status, 400)
  })
  await t.test('history deletion is soft, private, and excluded from reads', async () => {
    assert.equal((await request('DELETE', '/training-history/' + recordId, userB)).status, 404)
    const removed = await request('DELETE', '/training-history/' + recordId, userA)
    assert.equal(removed.status, 200)
    assert.equal(removed.body.data.deleted, true)
    assert.equal((await request('GET', '/training-history/' + recordId, userA)).status, 404)
    const list = await request('GET', '/training-history', userA)
    assert.equal(list.body.data.items.some((item) => item.id === recordId), false)
  })
})

test('session repository rolls back if an exercise snapshot write fails', async () => {
  let rolledBack = false
  let committed = false
  const connection = {
    async beginTransaction() {},
    async commit() { committed = true },
    async rollback() { rolledBack = true },
    release() {},
    async execute(sql) {
      if (sql.includes('INSERT INTO training_session_exercises')) throw new Error('snapshot insert failed')
      return [{ affectedRows: 1 }]
    }
  }
  const repository = createTrainingSessionsRepository({ getConnection: async () => connection })
  await assert.rejects(repository.withTransaction(async (tx) => {
    await tx.insertSession({
      id: randomUUID(), userId: userA, planId, planDate: '2026-09-18',
      name: '训练', startedAt: null, completedAt: '2026-09-18 00:00:00.000',
      durationMinutes: 30, planVersion: 2, key: 'retry-1', hash: 'x'.repeat(64)
    })
    await tx.insertExercises(randomUUID(), [{
      id: randomUUID(), exercise_id: exerciseId, exercise_name: '动作',
      category: 'chest', muscle_group: 'chest', equipment: 'barbell',
      sort_order: 1, sets: 1, actual_sets: 2, reps: 1, actual_reps: 2,
      weight: '1.00', actual_weight: 2, rest_seconds: 0, notes: null
    }])
  }), /snapshot insert failed/)
  assert.equal(rolledBack, true)
  assert.equal(committed, false)
})
