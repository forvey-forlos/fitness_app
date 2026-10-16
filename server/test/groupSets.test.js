const { test } = require('node:test')
const assert = require('node:assert/strict')
const { legacyPlanned, legacyActual, total } = require('../src/utils/groupSets')
const { validateTemplate } = require('../src/services/templates')
const { validateCreate } = require('../src/validators/trainingPlanRecords')
const { validateComplete } = require('../src/validators/trainingSessions')

const exerciseId='22222222-2222-4222-8222-222222222222'
const values={weight:20,reps:12}
function action(extra={}){return{exerciseId,variantId:null,bodyPart:'chest',recordMethods:['weight','reps'],targetMetrics:values,plannedSets:3,restSeconds:null,notes:null,sortOrder:1,...extra}}

test('legacy groups keep planned total and count old actual rows individually',()=>{
  assert.deepEqual(legacyPlanned(null,3,values),[{set_count:3,values}])
  assert.deepEqual(legacyActual([{values},{values}]),[{set_count:1,values},{set_count:1,values}])
  assert.equal(total([{set_count:2},{set_count:1}]),3)
})

test('template validates planned row counts without changing legacy templates',()=>{
  const input={name:'胸部训练',durationMinutes:45,exercises:[action()]}
  assert.equal(validateTemplate(input).exercises[0].plannedGroups[0].set_count,3)
  assert.equal(validateTemplate({...input,exercises:[action({plannedGroups:[{set_count:2,values},{set_count:1,values}]})]}).exercises[0].plannedSets,3)
  assert.throws(()=>validateTemplate({...input,exercises:[action({plannedGroups:[{set_count:2,values}]})]}),/请核对组数/)
  assert.throws(()=>validateTemplate({...input,exercises:[action({category:'legs'})]}),/动作格式不合法/)
})

test('plan API rejects mismatched planned groups and accepts matching groups',()=>{
  const base={planDate:'2026-10-15',name:'胸部训练',durationMinutes:30,exercises:[{exerciseId,bodyPart:'chest',recordMethods:['weight','reps'],targetMetrics:values,sets:3,reps:12,weight:20,sortOrder:1,plannedGroups:[{set_count:2,values},{set_count:1,values}]}]}
  let error
  const req={body:base,get:()=>null}
  validateCreate(req,{},cause=>{error=cause})
  assert.equal(error,undefined)
  assert.equal(req.validated.exercises[0].plannedGroups.length,2)
  validateCreate({body:{...base,exercises:[{...base.exercises[0],plannedGroups:[{set_count:2,values}]}]},get:()=>null},{},cause=>{error=cause})
  assert.equal(error?.code,'VALIDATION_ERROR')
})

test('completion counts set_count independently of the planned total',()=>{
  const record={exerciseId,recordMethods:['weight','reps'],actualGroups:[{set_count:2,values:{weight:25,reps:10}}],actual:{kg:25,reps:10,sets:2}}
  const req={body:{version:1,exercises:[record]},get:()=> 'test-key'}
  let error
  validateComplete(req,{},cause=>{error=cause})
  assert.equal(error,undefined)
  assert.equal(req.validated.exercises[0].actual.sets,2)
  validateComplete({body:{version:1,exercises:[{...record,actual:{...record.actual,sets:1}}]},get:()=> 'test-key'},{},cause=>{error=cause})
  assert.equal(error?.code,'VALIDATION_ERROR')
})
