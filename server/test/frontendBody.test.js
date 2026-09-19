const assert = require('node:assert/strict')
const { readFileSync } = require('node:fs')
const path = require('node:path')
const { test } = require('node:test')

test('body API adapter uses the formal authenticated endpoints and query names', async () => {
  const filename = path.resolve(__dirname, '../../src/api/body.js')
  const source = readFileSync(filename, 'utf8').replace(
    "import { request, withQuery } from './request'",
    "const request = globalThis.__bodyRequest; const withQuery = (url, query) => {" +
      "const values = Object.entries(query).filter(([, value]) => value !== undefined && value !== null && value !== '');" +
      "return values.length ? url + '?' + new URLSearchParams(values) : url}"
  )
  const moduleUrl = 'data:text/javascript;base64,' + Buffer.from(source).toString('base64')
  const calls = []
  globalThis.__bodyRequest = async (options) => {
    calls.push(options)
    return { ok: true }
  }
  try {
    const api = await import(moduleUrl)
    await api.getBodyProfile()
    await api.updateBodyProfile({ version: 0 })
    await api.createMeasurement({ measuredAt: '2026-09-19T00:00:00.000Z', weight: 70 }, 'body-1')
    await api.getMeasurements({ startDate: '2026-09-01', page: 2, pageSize: 20 })
    await api.updateMeasurement('id / 1', { version: 1, weight: 69 })
    await api.deleteMeasurement('id / 1')
    await api.getWeightTrend('month')
    assert.deepEqual(calls, [
      { url: '/api/v1/body/profile' },
      { url: '/api/v1/body/profile', method: 'PUT', data: { version: 0 } },
      {
        url: '/api/v1/body/measurements', method: 'POST',
        data: { measuredAt: '2026-09-19T00:00:00.000Z', weight: 70 },
        idempotencyKey: 'body-1'
      },
      { url: '/api/v1/body/measurements?startDate=2026-09-01&page=2&pageSize=20' },
      { url: '/api/v1/body/measurements/id%20%2F%201', method: 'PATCH', data: { version: 1, weight: 69 } },
      { url: '/api/v1/body/measurements/id%20%2F%201', method: 'DELETE' },
      { url: '/api/v1/body/trends/weight?range=month' }
    ])
  } finally {
    delete globalThis.__bodyRequest
  }
})
