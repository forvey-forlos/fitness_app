const {test}=require('node:test')
const assert=require('node:assert/strict')
const {createTemplatesService,validateTemplate}=require('../src/services/templates')
const {importPublicationWithPool}=require('../src/repositories/templates')

const userId='11111111-1111-4111-8111-111111111111'
const exerciseId='22222222-2222-4222-8222-222222222222'
const templateId='33333333-3333-4333-8333-333333333333'
const publicationId='44444444-4444-4444-8444-444444444444'
const exercise={exerciseId,variantId:null,bodyPart:'chest',recordMethods:['weight','reps'],targetMetrics:{weight:30,reps:10},plannedSets:3,restSeconds:null,notes:null,sortOrder:1,exerciseName:'卧推',variantName:''}
const input={name:'胸部训练',durationMinutes:45,exercises:[exercise]}
const row={id:templateId,user_id:userId,name:input.name,duration_minutes:45,content:JSON.stringify(input.exercises),version:1}
const post={id:publicationId,author_user_id:userId,title:input.name,duration_minutes:45,content:JSON.stringify(input.exercises),tags:'[]',description:'',author_name:'测试用户'}
function service(overrides={}){
  const calls=[]
  const templatesRepository={findMine:async()=>row,findPublic:async()=>post,importPublication:async(...args)=>{calls.push(['import',...args]);return true},...overrides}
  const result=createTemplatesService({templatesRepository,usersRepository:{findActiveById:async()=>({id:userId})},exercisesRepository:{findVisibleById:async()=>({id:exerciseId,is_system:1,name:'卧推',body_parts:['chest'],category:'chest'}),findVariant:async()=>null},trainingPlansService:{create:async(...args)=>{calls.push(['plan',...args]);return{plan:{id:'plan-id'},created:true}}}})
  return{result,calls}
}
test('template validator requires an independent complete exercise snapshot',()=>{
  assert.equal(validateTemplate(input).exercises[0].plannedSets,3)
  assert.throws(()=>validateTemplate({...input,exercises:[{...exercise,plannedSets:0}]}),/预计组数/)
  assert.throws(()=>validateTemplate({...input,exercises:[{...exercise,sortOrder:undefined}]}),/动作排序/)
})
test('creating a plan uses template targets and blank actual groups',async()=>{
  const{result,calls}=service()
  await result.createPlan(userId,templateId,{planDate:'2026-10-10'})
  const plan=calls[0][2]
  assert.equal(plan.exercises[0].sets,3)
  assert.deepEqual(plan.exercises[0].targetMetrics,{weight:30,reps:10})
  assert.equal(plan.exercises[0].actualGroups.length,1)
  assert.equal(plan.exercises[0].actualGroups[0].set_count,1)
  assert.equal(plan.exercises[0].plannedGroups[0].set_count,3)
  assert.deepEqual(plan.exercises[0].actualGroups[0].values,{weight:null,reps:null})
})
test('import creates a private copy without a reference to mutable publication content',async()=>{
  const{result,calls}=service()
  const imported=await result.importPublic(userId,publicationId)
  assert.equal(calls[0][0],'import')
  assert.equal(calls[0][2],publicationId)
  assert.notEqual(calls[0][3].id,publicationId)
  assert.deepEqual(calls[0][3].exercises[0].targetMetrics,{weight:30,reps:10})
  assert.equal(imported.name,'胸部训练')
})
test('publication import adds system actions and private copy in one transaction',async()=>{
  const statements=[],events=[]
  const connection={beginTransaction:async()=>events.push('begin'),commit:async()=>events.push('commit'),rollback:async()=>events.push('rollback'),release:()=>events.push('release'),execute:async(sql)=>{statements.push(sql);if(sql.includes('FROM template_publications'))return[[{id:publicationId}]];if(sql.includes('FROM exercises WHERE'))return[[{id:exerciseId}]];return[{affectedRows:1}]}}
  const okay=await importPublicationWithPool({getConnection:async()=>connection},userId,publicationId,{id:templateId,name:'副本',durationMinutes:45,exercises:[exercise]})
  assert.equal(okay,true)
  assert.ok(statements.some(sql=>sql.includes('INSERT INTO user_exercise_preferences')))
  assert.ok(statements.some(sql=>sql.includes('INSERT INTO training_templates')))
  assert.ok(statements.some(sql=>sql.includes('download_count=download_count+1')))
  assert.deepEqual(events,['begin','commit','release'])
})
test('failed system-action restore rolls back the whole import',async()=>{
  const events=[]
  const connection={beginTransaction:async()=>events.push('begin'),commit:async()=>events.push('commit'),rollback:async()=>events.push('rollback'),release:()=>events.push('release'),execute:async(sql)=>{if(sql.includes('FROM template_publications'))return[[{id:publicationId}]];if(sql.includes('FROM exercises WHERE'))return[[{id:exerciseId}]];if(sql.includes('INSERT INTO user_exercise_preferences'))throw new Error('database failure');return[{affectedRows:1}]}}
  await assert.rejects(()=>importPublicationWithPool({getConnection:async()=>connection},userId,publicationId,{id:templateId,name:'副本',durationMinutes:45,exercises:[exercise]}),/database failure/)
  assert.deepEqual(events,['begin','rollback','release'])
})
