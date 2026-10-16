const assert = require('node:assert/strict')
const { test } = require('node:test')
const { exerciseDisplayName, displayExerciseContent } = require('../src/utils/exerciseDisplay')

test('legacy pec deck labels display as chest and back fly without changing source snapshots', () => {
  assert.equal(exerciseDisplayName('正向蝴蝶机'), '正向飞鸟')
  assert.equal(exerciseDisplayName('蝴蝶机夹胸'), '正向飞鸟')
  assert.equal(exerciseDisplayName('反向蝴蝶机'), '反向飞鸟')
  assert.equal(exerciseDisplayName('其他动作'), '其他动作')
  const source = [{ exerciseId: 'original-id', exerciseName: '反向蝴蝶机' }]
  assert.deepEqual(displayExerciseContent(source), [{ exerciseId: 'original-id', exerciseName: '反向飞鸟' }])
  assert.equal(source[0].exerciseName, '反向蝴蝶机')
})
