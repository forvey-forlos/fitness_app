const assert = require('node:assert/strict')
const { after, before, test } = require('node:test')
const bcrypt = require('bcryptjs')

const createApp = require('../src/app')
const { createAuthService } = require('../src/services/auth')

const users = new Map()
let nextCode = 12000000
const usersRepository = {
  async create(user) {
    if (users.has(user.accountCode)) {
      const error = new Error("Duplicate entry for key 'uq_users_account_code'")
      error.code = 'ER_DUP_ENTRY'; error.sqlMessage = error.message; throw error
    }
    users.set(user.accountCode, { ...user })
  }
}
const accountCodes = {
  createAccountCode: () => String(nextCode++),
  createInternalUsername: (id) => `u${id.replace(/-/g, '').slice(0, 29)}`
}
const app = createApp({
  authService: createAuthService({ usersRepository, accountCodes }),
  healthService: { checkDatabase: async () => 1 }, trainingPlanService: { listPlans: async () => [] }
})
let server, baseUrl
before(async () => { server = await new Promise(resolve => { const value = app.listen(0, '127.0.0.1', () => resolve(value)) }); baseUrl = `http://127.0.0.1:${server.address().port}` })
after(async () => new Promise((resolve, reject) => server.close(error => error ? reject(error) : resolve())))
async function register(payload) { const response = await fetch(`${baseUrl}/api/v1/auth/register`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(payload) }); return { response, body: await response.json() } }

test('registration generates a unique account code and stores only a bcrypt hash', async () => {
  const password = 'Fit@2026ab'
  const { response, body } = await register({ displayName: 'Fit健身', password })
  assert.equal(response.status, 201)
  assert.equal(body.code, 0)
  assert.match(body.data.user.id, /^[0-9a-f]{8}(-[0-9a-f]{4}){3}-[0-9a-f]{12}$/)
  assert.equal(body.data.user.displayName, 'Fit健身')
  assert.equal(body.data.user.username, 'Fit健身')
  assert.match(body.data.user.accountCode, /^[1-9]\d{7}$/)
  const saved = users.get(body.data.user.accountCode)
  assert.notEqual(saved.passwordHash, password)
  assert.equal(await bcrypt.compare(password, saved.passwordHash), true)
  assert.match(saved.username, /^u[0-9a-f]{29}$/)
  assert.equal(JSON.stringify(body).includes('passwordHash'), false)
})

test('duplicate display names are allowed and receive different accounts', async () => {
  const first = await register({ displayName: '同名用户', password: 'Fit@2026ab' })
  const second = await register({ displayName: '同名用户', password: 'Fit@2026ab' })
  assert.equal(first.response.status, 201); assert.equal(second.response.status, 201)
  assert.notEqual(first.body.data.user.accountCode, second.body.data.user.accountCode)
})

test('invalid display name and password use the unified validation error', async () => {
  const { response, body } = await register({ displayName: '中'.repeat(31), password: 'alllowercase' })
  assert.equal(response.status, 400); assert.equal(body.code, 'VALIDATION_ERROR')
  assert.deepEqual(body.errors.map(error => error.field), ['displayName', 'password'])
})

test('registration accepts the legacy username request field during migration', async () => {
  const { response, body } = await register({ username: '兼容昵称', password: 'Fit@2026ab' })
  assert.equal(response.status, 201); assert.equal(body.data.user.displayName, '兼容昵称')
})

test('account code collision retries and the database unique key remains the final guard', async () => {
  let writes = 0
  const service = createAuthService({ usersRepository: { async create() { writes++; if (writes === 1) { const error = new Error("uq_users_account_code"); error.code = 'ER_DUP_ENTRY'; error.sqlMessage = "uq_users_account_code"; throw error } } },
    accountCodes: { createAccountCode: () => writes ? '23456789' : '12345678', createInternalUsername: () => 'uinternalloginvalue' } })
  const user = await service.register({ displayName: '冲突重试', password: 'Fit@2026ab', timezone: 'Asia/Shanghai' })
  assert.equal(writes, 2); assert.equal(user.accountCode, '23456789')
})
