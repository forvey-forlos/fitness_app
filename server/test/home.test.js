const assert = require('node:assert/strict')
const { test } = require('node:test')
const { randomBytes } = require('node:crypto')
const jwt = require('jsonwebtoken')
const createApp = require('../src/app')
const { createAuthMiddleware } = require('../src/middlewares/auth')
const { createHomeService } = require('../src/services/home')

const userA = '550e8400-e29b-41d4-a716-446655440001'
const userB = '550e8400-e29b-41d4-a716-446655440002'
const planId = '550e8400-e29b-41d4-a716-446655440003'
const recordId = '550e8400-e29b-41d4-a716-446655440004'
const stamp = '2026-09-18T16:10:00.000000Z'

test('home summary aggregates only the authenticated user and uses their local date', async (t) => {
  const secret = randomBytes(48).toString('hex')
  const users = new Map([
    [userA, { id: userA, username: '甲', avatar_url: null, timezone: 'Asia/Shanghai' }],
    [userB, { id: userB, username: '乙', avatar_url: null, timezone: 'UTC' }]
  ])
  let profileExists = true
  let measurementExists = true
  let planExists = true
  let completionExists = true
  const scoped = []
  const profile = {
    height: '175.00', weight: '72.00', waist: null, chest: null, hip: null,
    shoulder_width: null, thigh: null, upper_arm: null, calf: null,
    version: 1, created_at: stamp, updated_at: stamp
  }
  const measurement = {
    id: recordId, measured_at: stamp, weight: '70.00', waist: null,
    chest: null, hip: null, shoulder_width: null, thigh: null,
    upper_arm: null, calf: null, version: 1, created_at: stamp, updated_at: stamp
  }
  const plan = {
    id: planId, plan_date: '2026-09-19', name: '胸部训练',
    duration_minutes: 40, status: 'draft', version: 2,
    created_at: stamp, updated_at: stamp, completed_at: null
  }
  const completion = { id: recordId, plan_date: '2026-09-19' }
  const service = createHomeService({
    now: () => new Date('2026-09-18T16:30:00.000Z'),
    usersRepository: { findActiveById: async (id) => users.get(id) || null },
    bodyProfilesRepository: {
      async findByUserId(id) { scoped.push(['profile', id]); return id === userA && profileExists ? profile : null }
    },
    bodyMeasurementsRepository: {
      async findLatestByUserId(id) { scoped.push(['latest', id]); return id === userA && measurementExists ? measurement : null },
      async listWeights(id) {
        scoped.push(['weights', id])
        return id === userA && measurementExists
          ? [{ weight: '71.00', measured_at: '2026-09-17T12:00:00.000Z' },
            { weight: '70.00', measured_at: stamp }] : []
      }
    },
    trainingPlansRepository: {
      async findByDate(id, date) {
        scoped.push(['plan', id, date])
        return id === userA && date === '2026-09-19' && planExists ? plan : null
      },
      async listExercises(id, idPlan) {
        scoped.push(['planExercises', id])
        return id === userA && idPlan === planId
          ? [{ id: 'item-1', exercise_id: 'exercise-1', sort_order: 1,
            sets: 4, reps: 10, weight: '40.00', rest_seconds: 60,
            notes: null, created_at: stamp, updated_at: stamp,
            exercise_name: '卧推', exercise_category: 'chest',
            exercise_muscle_group: 'chest', exercise_equipment: 'barbell',
            exercise_is_system: 1, exercise_deleted_at: null }] : []
      }
    },
    trainingSessionsRepository: {
      async listCompletedByPlanDateRange(id) {
        scoped.push(['week', id])
        return id === userA && completionExists ? [completion] : []
      },
      async listRecentPlanDates(id) {
        scoped.push(['streak', id])
        return id === userA && completionExists ? [completion] : []
      }
    },
    exercisesRepository: {
      async countVisibleByCategory(id) {
        scoped.push(['library', id])
        return id === userA ? [{ category: 'chest', system_count: 2, custom_count: 1 }]
          : [{ category: 'back', system_count: 2, custom_count: 0 }]
      }
    }
  })
  const app = createApp({
    homeService: service,
    authMiddleware: createAuthMiddleware({ tokenConfig: { accessSecret: secret } })
  })
  const server = await new Promise((resolve) => {
    const listener = app.listen(0, '127.0.0.1', () => resolve(listener))
  })
  t.after(() => new Promise((resolve, reject) =>
    server.close((error) => error ? reject(error) : resolve())))
  const base = 'http://127.0.0.1:' + server.address().port
  async function request(userId, suffix = '') {
    const response = await fetch(base + '/api/v1/home/summary' + suffix, {
      headers: userId
        ? { Authorization: 'Bearer ' + jwt.sign({ sub: userId }, secret, { expiresIn: '1h' }) }
        : {}
    })
    return { status: response.status, body: await response.json() }
  }

  await t.test('login is required and response has the common envelope', async () => {
    const denied = await request(null)
    assert.equal(denied.status, 401)
    assert.equal(typeof denied.body.requestId, 'string')
  })
  await t.test('full summary and timezone boundary select the next local date', async () => {
    const response = await request(userA)
    assert.equal(response.status, 200)
    assert.equal(response.body.code, 0)
    assert.equal(typeof response.body.requestId, 'string')
    const data = response.body.data
    assert.deepEqual(Object.keys(data.user).sort(), ['avatarUrl', 'id', 'timezone', 'username'])
    assert.equal(data.todayPlan.planDate, '2026-09-19')
    assert.equal(data.todayPlan.exercises.length, 1)
    assert.equal(data.body.profile.height, 175)
    assert.equal(data.body.latestMeasurement.weight, 70)
    assert.equal(data.body.bmi, 22.9)
    assert.equal(data.body.weightTrendSummary.change, -1)
    assert.equal(data.weekTraining.weekStart, '2026-09-14')
    assert.equal(data.weekTraining.days[5].date, '2026-09-19')
    assert.equal(data.weekTraining.completedCount, 1)
    assert.equal(data.weekTraining.currentStreak, 1)
    assert.equal(data.exerciseLibrary.systemCount, 2)
    assert.equal(data.exerciseLibrary.customCount, 1)
    assert.equal(data.actionLibrary.totalCount, 3)
    assert.equal(scoped.find((item) => item[0] === 'plan')[2], '2026-09-19')
  })
  await t.test('missing plan, body and completion yield null or empty data', async () => {
    planExists = false
    profileExists = false
    measurementExists = false
    completionExists = false
    const response = await request(userA)
    const data = response.body.data
    assert.equal(response.status, 200)
    assert.equal(data.todayPlan, null)
    assert.equal(data.body.profile, null)
    assert.equal(data.body.latestMeasurement, null)
    assert.equal(data.body.weight, null)
    assert.deepEqual(data.body.weightTrendSummary.points, [])
    assert.equal(data.weekTraining.completedCount, 0)
    assert.equal(data.weekTraining.currentStreak, 0)
    assert.equal(data.weekTraining.days.length, 7)
  })
  await t.test('user isolation and explicit date/timezone validation', async () => {
    const before = scoped.length
    const other = await request(userB)
    assert.equal(other.status, 200)
    assert.equal(other.body.data.user.username, '乙')
    assert.equal(other.body.data.todayPlan, null)
    assert.equal(other.body.data.body.profile, null)
    assert.ok(scoped.slice(before).every((entry) => entry[1] === userB))
    assert.equal((await request(userA, '?timezone=UTC')).status, 400)
    assert.equal((await request(userA, '?date=2026-02-30')).status, 400)
    const specified = await request(userA, '?date=2026-09-18&timezone=Asia/Shanghai')
    assert.equal(specified.status, 200)
    assert.equal(specified.body.data.todayPlan, null)
  })
})
