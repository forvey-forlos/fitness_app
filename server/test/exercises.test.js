const assert = require('node:assert/strict')
const { test } = require('node:test')
const jwt = require('jsonwebtoken')
const { randomBytes } = require('node:crypto')

const createApp = require('../src/app')
const { createAuthMiddleware } = require('../src/middlewares/auth')
const { createExercisesService } = require('../src/services/exercises')

const userA = '550e8400-e29b-41d4-a716-446655440001'
const userB = '550e8400-e29b-41d4-a716-446655440002'
const stamp = '2026-09-18T00:00:00.000000Z'

function systemExercise(overrides = {}) {
  return {
    id: '660e8400-e29b-41d4-a716-446655440001',
    owner_user_id: null,
    name: '杠铃平板卧推',
    name_normalized: '杠铃平板卧推',
    standard_name_en: 'Barbell Bench Press',
    default_display_name_zh: '杠铃卧推',
    default_display_name_normalized: '杠铃卧推',
    category: 'chest',
    muscle_group: 'pectoralis_major',
    equipment: 'barbell',
    movement_type: 'strength',
    body_parts: JSON.stringify(['chest']),
    record_methods: JSON.stringify(['weight', 'reps']),
    primary_muscles: JSON.stringify(['pectoralis_major']),
    secondary_muscles: JSON.stringify(['triceps', 'anterior_deltoid']),
    variants: JSON.stringify([]),
    aliases: JSON.stringify(['卧推', 'Bench Press']),
    normalized_variants: JSON.stringify([
      { id: '770e8400-e29b-41d4-a716-446655440001', name: '宽握', code: 'wide_grip', sortOrder: 10 }
    ]),
    sort_order: 10,
    is_system: 1,
    created_at: stamp,
    updated_at: stamp,
    deleted_at: null,
    ...overrides
  }
}

test('system exercise catalog and user preferences enforce identity and ownership', async (t) => {
  const secret = randomBytes(48).toString('hex')
  const records = new Map()
  const bench = systemExercise()
  const pulldown = systemExercise({
    id: '660e8400-e29b-41d4-a716-446655440002',
    name: '高位下拉',
    name_normalized: '高位下拉',
    standard_name_en: 'Lat Pulldown',
    default_display_name_zh: '高位下拉',
    default_display_name_normalized: '高位下拉',
    category: 'back',
    muscle_group: 'latissimus_dorsi',
    equipment: 'cable',
    body_parts: JSON.stringify(['back']),
    primary_muscles: JSON.stringify(['latissimus_dorsi']),
    secondary_muscles: JSON.stringify(['biceps']),
    aliases: JSON.stringify(['拉背', '下拉', 'Lat Pulldown']),
    normalized_variants: JSON.stringify([
      { id: '770e8400-e29b-41d4-a716-446655440002', name: '中立握', code: 'neutral_grip', sortOrder: 10 }
    ])
  })
  records.set(bench.id, bench)
  records.set(pulldown.id, pulldown)
  const preferences = new Map()
  const preferenceKey = (userId, exerciseId) => userId + ':' + exerciseId

  function visibleRow(userId, row) {
    if (!row || row.deleted_at || !row.is_system) return null
    const preference = preferences.get(preferenceKey(userId, row.id))
    const active = preference && !preference.deleted_at
    return {
      ...row,
      resolved_name: active && preference.display_name
        ? preference.display_name : row.default_display_name_zh,
      personal_display_name: active ? preference.display_name : null,
      preference_version: active ? preference.version : 0,
      in_library: active ? 1 : 0
    }
  }

  const repository = {
    async findVisibleById(userId, id) {
      return visibleRow(userId, records.get(id))
    },
    async list(userId, filters) {
      let rows = [...records.values()].map((row) => visibleRow(userId, row)).filter(Boolean)
      if (filters.scope === 'library') rows = rows.filter((row) => row.in_library)
      if (filters.category) rows = rows.filter((row) => row.category === filters.category)
      if (filters.muscleGroup) {
        rows = rows.filter((row) => row.muscle_group === filters.muscleGroup ||
          JSON.parse(row.primary_muscles).includes(filters.muscleGroup) ||
          JSON.parse(row.secondary_muscles).includes(filters.muscleGroup))
      }
      if (filters.equipment) rows = rows.filter((row) => row.equipment === filters.equipment)
      if (filters.keyword) {
        rows = rows.filter((row) => [
          row.name_normalized,
          row.standard_name_en.toLowerCase(),
          row.default_display_name_normalized,
          row.personal_display_name?.toLowerCase(),
          ...JSON.parse(row.aliases).map((alias) => alias.toLowerCase())
        ].filter(Boolean).some((value) => value.includes(filters.keyword)))
      }
      rows.sort((a, b) => a.sort_order - b.sort_order || a.id.localeCompare(b.id))
      return {
        total: rows.length,
        rows: rows.slice((filters.page - 1) * filters.pageSize, filters.page * filters.pageSize)
      }
    },
    async addToLibrary(userId, exerciseId) {
      const key = preferenceKey(userId, exerciseId)
      const current = preferences.get(key)
      preferences.set(key, {
        user_id: userId,
        exercise_id: exerciseId,
        display_name: current?.display_name || null,
        version: current ? current.version + 1 : 1,
        deleted_at: null
      })
    },
    async updatePreference(userId, exerciseId, version, displayName) {
      const key = preferenceKey(userId, exerciseId)
      const current = preferences.get(key)
      if (!current || current.deleted_at || current.version !== version) return false
      current.display_name = displayName
      current.version += 1
      return true
    },
    async removeFromLibrary(userId, exerciseId) {
      const current = preferences.get(preferenceKey(userId, exerciseId))
      if (!current || current.deleted_at) return false
      current.deleted_at = stamp
      current.version += 1
      return true
    },
    async findVariant(exerciseId, variantId) {
      const row = records.get(exerciseId)
      const variant = row && JSON.parse(row.normalized_variants).find((item) => item.id === variantId)
      return variant || null
    }
  }

  const usersRepository = {
    async findActiveById(id) {
      return [userA, userB].includes(id) ? { id } : null
    }
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
  async function request(method, path, userId, body) {
    const response = await fetch(base + path, {
      method,
      headers: {
        ...(userId ? {
          Authorization: 'Bearer ' + jwt.sign({}, secret, {
            algorithm: 'HS256', subject: userId, expiresIn: 1800
          })
        } : {}),
        ...(body !== undefined ? { 'Content-Type': 'application/json' } : {})
      },
      ...(body !== undefined ? { body: JSON.stringify(body) } : {})
    })
    const result = await response.json()
    assert.equal(result.requestId, response.headers.get('x-request-id'))
    return { status: response.status, result }
  }

  await t.test('all catalog and preference endpoints require login', async () => {
    for (const [method, path, body] of [
      ['GET', ''],
      ['GET', '/' + bench.id],
      ['POST', ''],
      ['POST', '/' + bench.id + '/library'],
      ['PATCH', '/' + bench.id, { displayName: '我的卧推', version: 1 }],
      ['DELETE', '/' + bench.id]
    ]) {
      const response = await request(method, path, null, body)
      assert.equal(response.status, 401)
    }
  })

  await t.test('catalog contains only main system exercises and personal library starts empty', async () => {
    const catalog = await request('GET', '', userA)
    assert.equal(catalog.status, 200)
    assert.equal(catalog.result.data.total, 2)
    assert.equal(catalog.result.data.items.every((item) => item.isSystem), true)
    assert.equal(catalog.result.data.items.every((item) => !item.inLibrary), true)
    assert.equal(catalog.result.data.items[0].variants.length, 1)

    const library = await request('GET', '?scope=library', userA)
    assert.equal(library.status, 200)
    assert.equal(library.result.data.total, 0)
  })

  await t.test('search matches standard name, default name, alias and personal name', async () => {
    for (const keyword of ['Lat%20Pulldown', '%E9%AB%98%E4%BD%8D%E4%B8%8B%E6%8B%89', '%E6%8B%89%E8%83%8C']) {
      const response = await request('GET', '?keyword=' + keyword, userA)
      assert.deepEqual(response.result.data.items.map((item) => item.id), [pulldown.id])
    }

    await request('POST', '/' + pulldown.id + '/library', userA)
    await request('PATCH', '/' + pulldown.id, userA, { displayName: '我的下拉', version: 1 })
    const personal = await request('GET', '?keyword=%E6%88%91%E7%9A%84%E4%B8%8B%E6%8B%89', userA)
    assert.deepEqual(personal.result.data.items.map((item) => item.id), [pulldown.id])
    assert.equal(personal.result.data.items[0].name, '我的下拉')
    assert.equal(personal.result.data.items[0].standardName, 'Lat Pulldown')
  })

  await t.test('creating a completely new exercise is disabled', async () => {
    const response = await request('POST', '', userA, {
      name: '用户伪造动作',
      ownerUserId: userA,
      isSystem: true
    })
    assert.equal(response.status, 405)
    assert.equal(response.result.code, 'CUSTOM_EXERCISES_DISABLED')
  })

  await t.test('adding and renaming affect only the current user preference', async () => {
    const added = await request('POST', '/' + bench.id + '/library', userA)
    assert.equal(added.status, 201)
    assert.equal(added.result.data.id, bench.id)
    assert.equal(added.result.data.inLibrary, true)
    assert.equal(added.result.data.version, 1)

    const renamed = await request('PATCH', '/' + bench.id, userA, {
      displayName: '胸日卧推',
      version: 1
    })
    assert.equal(renamed.status, 200)
    assert.equal(renamed.result.data.name, '胸日卧推')
    assert.equal(renamed.result.data.standardName, 'Barbell Bench Press')
    assert.deepEqual(renamed.result.data.recordMethods, ['weight', 'reps'])
    assert.equal(renamed.result.data.version, 2)

    const otherUser = await request('GET', '/' + bench.id, userB)
    assert.equal(otherUser.result.data.name, '杠铃卧推')
    assert.equal(otherUser.result.data.personalDisplayName, null)

    const systemMutation = await request('PATCH', '/' + bench.id, userA, {
      displayName: '违规修改',
      equipment: 'machine',
      version: 2
    })
    assert.equal(systemMutation.status, 400)

    const stale = await request('PATCH', '/' + bench.id, userA, {
      displayName: '旧版本覆盖',
      version: 1
    })
    assert.equal(stale.status, 409)
    assert.equal(stale.result.code, 'VERSION_CONFLICT')
  })

  await t.test('removing from library does not delete the system exercise', async () => {
    const removed = await request('DELETE', '/' + bench.id, userA)
    assert.equal(removed.status, 200)
    assert.deepEqual(removed.result.data, { id: bench.id, deleted: true })

    const library = await request('GET', '?scope=library', userA)
    assert.equal(library.result.data.items.some((item) => item.id === bench.id), false)

    const catalogDetail = await request('GET', '/' + bench.id, userA)
    assert.equal(catalogDetail.status, 200)
    assert.equal(catalogDetail.result.data.id, bench.id)
    assert.equal(catalogDetail.result.data.inLibrary, false)
    assert.equal(catalogDetail.result.data.name, '杠铃卧推')

    const secondRemove = await request('DELETE', '/' + bench.id, userA)
    assert.equal(secondRemove.status, 404)
  })
})
