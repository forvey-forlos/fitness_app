const assert = require('node:assert/strict')
const { readFileSync } = require('node:fs')
const path = require('node:path')
const { test } = require('node:test')

test('home training API adapter keeps an array and requests the chosen date', async () => {
  const filename = path.resolve(__dirname, '../../src/api/training.js')
  const source = readFileSync(filename, 'utf8').replace(
    "import { request, withQuery } from './request'",
    "const request = globalThis.__trainingRequest; const withQuery = (url, query) => url + '?' + new URLSearchParams(query)"
  )
  const moduleUrl = 'data:text/javascript;base64,' + Buffer.from(source).toString('base64')
  let calledUrl
  globalThis.__trainingRequest = async ({ url }) => {
    calledUrl = url
    return {
      items: [{
        id: 'plan-1', planDate: '2026-09-18',
        name: '胸部训练', durationMinutes: 24
      }]
    }
  }
  try {
    const api = await import(moduleUrl)
    const plans = await api.getTrainingPlans('2026-09-18')
    assert.equal(calledUrl, '/api/v1/training-plans?date=2026-09-18')
    assert.deepEqual(plans, [{
      id: 'plan-1', planDate: '2026-09-18',
      name: '胸部训练', durationMinutes: 24, duration: 24
    }])
  } finally {
    delete globalThis.__trainingRequest
  }
})
