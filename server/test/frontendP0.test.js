const assert = require('node:assert/strict')
const { readFileSync } = require('node:fs')
const path = require('node:path')
const { test } = require('node:test')

function moduleUrl(source) {
  return 'data:text/javascript;base64,' + Buffer.from(source).toString('base64')
}

test('training create adapter returns the plan object from unified response data', async () => {
  const filename = path.resolve(__dirname, '../../src/api/training.js')
  const source = readFileSync(filename, 'utf8').replace(
    "import { request, withQuery } from './request'",
    "const request = globalThis.__p0Request; const withQuery = (url) => url"
  )
  const plan = {
    id: '550e8400-e29b-41d4-a716-446655440001', version: 1,
    status: 'draft', exercises: [{ exerciseId: 'exercise-1' }],
    planDate: '2026-09-19', name: '胸部训练'
  }
  globalThis.__p0Request = async (options) => {
    assert.equal(options.url, '/api/v1/training-plans')
    assert.equal(options.method, 'POST')
    return plan
  }
  try {
    const api = await import(moduleUrl(source))
    assert.equal(await api.createTrainingPlan({ planDate: plan.planDate, exercises: [] }, 'key-1'), plan)
  } finally {
    delete globalThis.__p0Request
  }
})

test('training page applies a validated direct plan and keeps edit/complete identifiers', () => {
  const source = readFileSync(path.resolve(__dirname, '../../src/pages/training-plan/training-plan.vue'), 'utf8')
  assert.match(source, /applyPlan\(requirePlanResponse\(saved\)\)/)
  for (const field of ['plan.id', 'plan.version', 'plan.status', 'plan.exercises', 'plan.planDate', 'plan.name']) {
    assert.ok(source.includes(field), `missing plan contract check: ${field}`)
  }
  assert.match(source, /updateTrainingPlan\(currentPlan\.value\.id,\{\.\.\.data,version:currentPlan\.value\.version\}\)/)
  assert.match(source, /completeTrainingPlan\(plan\.id,/)
})

test('current-user GET and PATCH cache the safe user returned by the server', async () => {
  const filename = path.resolve(__dirname, '../../src/api/user.js')
  const source = readFileSync(filename, 'utf8').replace(
    "import { request, USER_KEY } from './request'",
    "const request = globalThis.__userRequest; const USER_KEY = 'fit_note_auth_user'"
  )
  const storage = new Map()
  global.uni = { setStorageSync: (key, value) => storage.set(key, value) }
  let username = 'before'
  globalThis.__userRequest = async ({ method }) => ({
    id: 'user-1', username: method === 'PATCH' ? 'after' : username,
    avatarUrl: null, timezone: 'Asia/Shanghai'
  })
  try {
    const api = await import(moduleUrl(source))
    await api.getCurrentUser()
    assert.equal(storage.get('fit_note_auth_user').username, 'before')
    const updated = await api.updateCurrentUser({ username: 'after' })
    assert.equal(updated.username, 'after')
    assert.equal(storage.get('fit_note_auth_user').username, 'after')
  } finally {
    delete globalThis.__userRequest
    delete global.uni
  }
})

test('profile page uses real user APIs and the shared logout flow', () => {
  const source = readFileSync(path.resolve(__dirname, '../../src/pages/profile/profile.vue'), 'utf8')
  assert.match(source, /getCurrentUser\(\)/)
  assert.match(source, /updateCurrentUser\(/)
  assert.match(source, /await logout\(\)/)
  assert.doesNotMatch(source, /uni\.request\(/)
})
