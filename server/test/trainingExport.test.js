const assert = require('node:assert/strict')
const { readFileSync } = require('node:fs')
const path = require('node:path')
const { test } = require('node:test')

test('training export is chronological, readable and respects selected content', async () => {
  const filename = path.resolve(__dirname, '../../src/utils/training-export.js')
  const source = readFileSync(filename, 'utf8').replace(
    "import { recordMethodName, recordMethodUnit } from '../constants/exercise-meta'",
    "const recordMethodName = (key) => ({weight:'重量',reps:'次数'}[key] || key); const recordMethodUnit = (key) => ({weight:'kg',reps:'次'}[key] || '')"
  )
  const moduleUrl = 'data:text/javascript;base64,' + Buffer.from(source).toString('base64')
  const exporter = await import(moduleUrl)
  const records = [
    { id: 'later', planDate: '2026-10-08', title: '背部训练', duration: 45, exercises: [] },
    { id: 'early', planDate: '2026-10-01', title: '胸部训练', duration: 40, exercises: [{
      exerciseNameSnapshot: '杠铃卧推', recordMethods: ['weight', 'reps'], sets: 2,
      targetMetrics: { weight: 40, reps: 10 },
      actualGroups: [{ values: { weight: 42.5, reps: 9 } }, { values: { weight: 42.5, reps: 8 } }]
    }] }
  ]
  const markdown = exporter.buildTrainingExport({ format: 'md', nickname: '测试用户', records, include: { actions: true, plan: true, actual: true } })
  assert.equal(markdown.split('\n')[0], '用户昵称：测试用户')
  assert.ok(markdown.indexOf('2026-10-01') < markdown.indexOf('2026-10-08'))
  assert.match(markdown, /### 1\. 杠铃卧推/)
  assert.match(markdown, /计划量：重量 40 kg · 次数 10 次 · 预计 2 组/)
  assert.match(markdown, /第 2 组：重量 42\.5 kg · 次数 8 次/)
  assert.match(markdown, /重量训练总量：722\.5 kg/)
  const text = exporter.buildTrainingExport({ format: 'txt', nickname: '测试用户', records: [records[1]], include: { actions: false, plan: false, actual: true } })
  assert.doesNotMatch(text, /^#/m)
  assert.match(text, /1\. 动作 1/)
  assert.doesNotMatch(text, /计划量/)
  assert.equal(exporter.trainingExportFilename(records, 'md'), 'fityloop-training-2026-10-01_2026-10-08.md')
})
