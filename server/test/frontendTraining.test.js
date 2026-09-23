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

test('training UI submits actual results, supports date changes, and does not reopen action-part picker', () => {
  const root = path.resolve(__dirname, '../..')
  const plan = readFileSync(path.join(root, 'src/pages/training-plan/training-plan.vue'), 'utf8')
  const home = readFileSync(path.join(root, 'src/pages/home/home.vue'), 'utf8')
  const library = readFileSync(path.join(root, 'src/pages/action-management/action-management.vue'), 'utf8')
  assert.match(plan, /<picker mode="date"/)
  assert.match(plan, /exercises:actualExercises/)
  assert.match(plan, /请完整填写每个动作的实际数据/)
  assert.match(plan, /v-for="\(group,groupIndex\) in \(currentPlan\?action\.actualGroups:\[\]\)"/)
  assert.match(plan, /v-if="currentPlan&&!todayCompleted" class="add-group"/)
  assert.match(plan, /currentPlan\?'保存计划修改':'创建训练计划'/)
  assert.match(plan, /const actualGroups=currentPlan\.value\?action\.actualGroups\.map/)
  assert.match(plan, /PLAN_DRAFT_PREFIX='fit_note_training_plan_draft_v1_'/)
  assert.match(plan, /PLAN_LAST_DATE_KEY='fit_note_training_plan_last_date_'/)
  assert.match(plan, /onHide\(saveLocalDraft\)/)
  assert.match(plan, /onUnload\(saveLocalDraft\)/)
  assert.match(plan, /basePlanVersion:currentPlan\.value\?\.version/)
  assert.match(plan, /await Promise\.all\(\[loadExerciseLibrary\(\),loadPlan\(\)\]\);restoreLocalDraft\(\)/)
  assert.match(plan, /applyPlan\(requirePlanResponse\(saved\)\)\s*clearLocalDraft\(\)/)
  assert.doesNotMatch(home, /action-management\?mode=add/)
  assert.doesNotMatch(library, /launchOptions\.value\.mode==='add'/)
  assert.match(library, /@tap="openEditor\(action\)"/)
  assert.match(library, /bodyParts/)
  assert.match(library, /recordMethods/)
  assert.match(library, /@tap\.stop="removeAction\(action\)"/)
})
