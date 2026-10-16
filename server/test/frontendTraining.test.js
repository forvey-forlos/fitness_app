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
  assert.match(plan, /v-if="!currentPlan" class="complete-button"/)
  assert.doesNotMatch(plan, /保存计划修改/)
  assert.match(plan, /v-if="contentVisible"/)
  assert.match(plan, /模板管理/)
  assert.match(plan, /选择模板/)
  assert.match(plan, /saveCurrentAsTemplate/)
  assert.match(plan, /selectedTemplateIds/)
  assert.match(plan, /createTrainingPlan\(data,`merged-template-/)
  assert.match(plan, /const today=dateKey\(\)/)
  assert.match(plan, /checkOverduePlans\(today\)/)
  assert.match(plan, /cloudSavePromise/)
  assert.match(plan, /function leavePlan\(next\)/)
  assert.match(plan, /plannedGroups:action\.plannedGroups/)
  assert.doesNotMatch(plan, /startFromHistory/)
  assert.match(plan, /@keyframes surface-panel/)
  assert.match(plan, /const actualGroups=\(currentPlan\.value\|\|includeActualGroups\)\?action\.actualGroups\.map/)
  assert.match(plan, /PLAN_DRAFT_PREFIX='fit_note_training_plan_draft_v1_'/)
  assert.match(plan, /PLAN_LAST_DATE_KEY='fit_note_training_plan_last_date_'/)
  assert.match(plan, /watch\(planParts,scheduleLocalDraftSave,\{deep:true\}\)/)
  assert.match(plan, /draftSaveTimer=setTimeout\(\(\)=>\{draftSaveTimer=null;saveLocalDraft\(\)\},120\)/)
  assert.match(plan, /onHide\(flushLocalDraft\)/)
  assert.match(plan, /onUnload\(flushLocalDraft\)/)
  assert.match(plan, /const newPlanHasContent=!currentPlan\.value&&planParts\.value\.length>0/)
  assert.match(plan, /if\(draftHydrating\)return/)
  assert.match(plan, /loading\.value=true;draftHydrating=true;loadError\.value=''/)
  assert.match(plan, /finally\{loading\.value=false;draftHydrating=false;/)
  assert.match(plan, /basePlanVersion:currentPlan\.value\?\.version/)
  assert.match(plan, /await Promise\.all\(\[loadExerciseLibrary\(\),loadPlan\(\)\]\)/)
  assert.match(plan, /if\(restoreLocalDraft\(\)\)editorRevealed\.value=true/)
  assert.match(plan, /if\(draftSignature\(\)===signature\)\{applyPlan\(confirmed\);clearLocalDraft\(\)\}/)
  assert.doesNotMatch(home, /action-management\?mode=add/)
  assert.doesNotMatch(library, /launchOptions\.value\.mode==='add'/)
  assert.match(library, /@tap="openEditor\(action\)"/)
  assert.match(library, /bodyParts/)
  assert.match(library, /recordMethods/)
  assert.match(library, /@tap\.stop="removeAction\(action\)"/)
})

test('training history exposes themed selection, preview and multi-platform export', () => {
  const root = path.resolve(__dirname, '../..')
  const history = readFileSync(path.join(root, 'src/pages/training-history/training-history.vue'), 'utf8')
  const api = readFileSync(path.join(root, 'src/api/training.js'), 'utf8')
  const exporter = readFileSync(path.join(root, 'src/utils/training-export.js'), 'utf8')
  assert.match(history, /训练数据导出/)
  assert.match(history, /history\.length<=30/)
  assert.match(history, /exportMonthGroups/)
  assert.match(history, /toggleMonthSelection\(month\)/)
  assert.match(history, /buildTrainingExport/)
  assert.match(history, /saveTrainingExportFile/)
  assert.match(api, /\/api\/v1\/training-history\/export-data/)
  assert.match(exporter, /用户昵称：/)
  assert.match(exporter, /#ifdef H5/)
  assert.match(exporter, /#ifdef MP-WEIXIN/)
  assert.match(exporter, /#ifdef APP-PLUS/)
  assert.match(exporter, /shareFileMessage/)
})

test('page navigation and drag ordering keep the new layout consistent', () => {
  const root = path.resolve(__dirname, '../..')
  const read = name => readFileSync(path.join(root, `src/pages/${name}/${name}.vue`), 'utf8')
  const plan = read('training-plan')
  const templates = read('my-templates')
  const body = read('body-data')
  const history = read('training-history')
  const actions = read('action-management')
  assert.ok(plan.indexOf('class="content"') < plan.indexOf('class="template-manager"'))
  assert.match(plan, /startPartTouchDrag/)
  assert.match(plan, /planParts\.value=\[\.\.\.byCategory\.keys\(\)\]/)
  assert.match(templates, /startEditorTouchDrag/)
  assert.match(templates, /长按模板选中并进行发布/)
  assert.doesNotMatch(templates, /:disabled="!selectedId"/)
  for (const source of [body, history, actions]) {
    assert.match(source, /pageSafeStyles/)
    assert.match(source, /safeStyles\.shell/)
    assert.match(source, /safeStyles\.overlay/)
  }
})

test('home navigation, monochrome icons, and corrected reverse pec deck catalog stay aligned', () => {
  const root = path.resolve(__dirname, '../..')
  const read = name => readFileSync(path.join(root, name), 'utf8')
  const home = read('src/pages/home/home.vue')
  const body = read('src/pages/body-data/body-data.vue')
  const plan = read('src/pages/training-plan/training-plan.vue')
  const actions = read('src/pages/action-management/action-management.vue')
  const seed = read('server/seeds/002_standard_exercise_catalog.sql')
  const symbols = read('src/components/UiSymbol.vue')
  assert.match(home, /class="module body-card" @tap\.stop="editBodyData"/)
  assert.match(home, /class="trend-panel"[^>]*@tap\.stop="toggleTrend"/)
  assert.match(home, /class="module action-card" @tap\.stop="openLibrary"/)
  assert.match(home, /<UiChevron v-if="todayPlan" class="plan-arrow"/)
  assert.match(home, /<UiSymbol kind="dumbbell"/)
  assert.doesNotMatch(home, /class="day-tag"|class="icon-button"|›|管理数据 →|创建计划 →/)
  assert.match(body, /<UiSymbol kind="person"/)
  assert.match(body, /<UiSymbol kind="folder"/)
  assert.match(body, /<UiSymbol kind="ring"/)
  assert.match(symbols, /currentColor/)
  assert.match(plan, /<view v-else class="hero-empty"><text>/)
  assert.match(seed, /'反向蝴蝶机','反向蝴蝶机','reverse_pec_deck','Reverse Pec Deck'/)
  assert.match(seed, /JSON_ARRAY\('back'\),JSON_ARRAY\('weight','reps'\),'back','back'/)
  assert.match(seed, /category=VALUES\(category\), muscle_group=VALUES\(muscle_group\)/)
  assert.match(actions, /'背部肌群'/)
})
