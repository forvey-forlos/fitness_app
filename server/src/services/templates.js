const{randomUUID}=require('node:crypto')
const{HttpError}=require('../utils/response')
const{validDate}=require('../utils/bodyTime')
const{bodyParts,recordMethods}=require('../constants/exerciseMetadata')
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const metricRanges={weight:[0,1000],reps:[0,10000],duration:[0,1440],distance:[0,1000000],speed:[0,500],incline:[0,100],assistance_weight:[0,1000],rir:[0,10],rpe:[0,10],angle:[0,360],other:[0,1000000]}
function invalid(message){return new HttpError(400,'VALIDATION_ERROR',message)}
function readJson(value,fallback){if(value===null||value===undefined)return fallback;if(typeof value==='object')return value;try{return JSON.parse(value)}catch{return fallback}}
function cleanText(value,max,required=false){if(typeof value!=='string'||value!==value.trim()||[...value].length>max||/[\p{Cc}\p{Cf}]/u.test(value)||(required&&!value))throw invalid('名称、简介或标签格式不合法');return value}
function validMetric(method,value){if(value===null)return true;const range=metricRanges[method];return typeof value==='number'&&Number.isFinite(value)&&value>=range[0]&&value<=range[1]&&(method!=='reps'||Number.isInteger(value))}
function validateTemplate(input){
  if(!input||typeof input!=='object'||Array.isArray(input)||Object.keys(input).some(key=>!['name','durationMinutes','exercises','version'].includes(key)))throw invalid('模板数据不合法')
  const name=cleanText(input.name,100,true),durationMinutes=input.durationMinutes
  if(!Number.isInteger(durationMinutes)||durationMinutes<1||durationMinutes>1440)throw invalid('预计时长须为 1–1440 分钟')
  if(!Array.isArray(input.exercises)||!input.exercises.length||input.exercises.length>100)throw invalid('模板须包含 1–100 个动作')
  const orders=new Set()
  const exercises=input.exercises.map((item,index)=>{
    if(!item||typeof item!=='object'||Array.isArray(item)||Object.keys(item).some(key=>!['exerciseId','variantId','bodyPart','recordMethods','targetMetrics','plannedSets','restSeconds','notes','sortOrder','exerciseName','variantName'].includes(key)))throw invalid(`第 ${index+1} 个动作格式不合法`)
    const methods=item.recordMethods,targets=item.targetMetrics
    if(!uuid.test(item.exerciseId||'')||item.variantId!==null&&item.variantId!==undefined&&!uuid.test(item.variantId)||!bodyParts.includes(item.bodyPart))throw invalid(`第 ${index+1} 个动作或训练部位不合法`)
    if(!Array.isArray(methods)||!methods.length||methods.length>recordMethods.length||new Set(methods).size!==methods.length||methods.some(method=>!recordMethods.includes(method)))throw invalid(`第 ${index+1} 个动作的记录方式不合法`)
    if(!targets||typeof targets!=='object'||Array.isArray(targets)||Object.keys(targets).length!==methods.length||methods.some(method=>!Object.hasOwn(targets,method)||!validMetric(method,targets[method])))throw invalid(`第 ${index+1} 个动作的预计指标不合法`)
    if(!Number.isInteger(item.plannedSets)||item.plannedSets<1||item.plannedSets>100)throw invalid(`第 ${index+1} 个动作的预计组数须为 1–100`)
    if(!Number.isInteger(item.sortOrder)||item.sortOrder<1||item.sortOrder>1000||orders.has(item.sortOrder))throw invalid('动作排序不合法')
    orders.add(item.sortOrder)
    if(item.restSeconds!==null&&item.restSeconds!==undefined&&(!Number.isInteger(item.restSeconds)||item.restSeconds<0||item.restSeconds>3600))throw invalid('休息时间不合法')
    const notes=item.notes===null||item.notes===undefined?null:cleanText(item.notes,1000)
    return{exerciseId:item.exerciseId,variantId:item.variantId||null,bodyPart:item.bodyPart,recordMethods:[...methods],targetMetrics:{...targets},plannedSets:item.plannedSets,restSeconds:item.restSeconds??null,notes,sortOrder:item.sortOrder,exerciseName:typeof item.exerciseName==='string'?cleanText(item.exerciseName,100,true):'',variantName:typeof item.variantName==='string'?cleanText(item.variantName,100):''}
  }).sort((a,b)=>a.sortOrder-b.sortOrder)
  return{name,durationMinutes,exercises}
}
function presentTemplate(row){const exercises=readJson(row.content,[]);return{id:row.id,name:row.name,durationMinutes:row.duration_minutes,exercises,actionCount:exercises.length,partCount:new Set(exercises.map(item=>item.bodyPart)).size,version:row.version,sourcePublicationId:row.source_publication_id||null,createdAt:row.created_at,updatedAt:row.updated_at}}
function presentPublication(row){const exercises=readJson(row.content,[]);return{id:row.id,authorId:row.author_user_id,authorName:row.author_name,authorAvatarUrl:row.author_avatar_url,title:row.title,description:row.description,tags:readJson(row.tags,[]),durationMinutes:row.duration_minutes,exercises,actionCount:exercises.length,partCount:new Set(exercises.map(item=>item.bodyPart)).size,likeCount:Number(row.like_count||0),favoriteCount:Number(row.favorite_count||0),downloadCount:Number(row.download_count||0),liked:Boolean(row.liked),favorited:Boolean(row.favorited),createdAt:row.created_at}}

function createTemplatesService(options={}){
  const repository=options.templatesRepository||require('../repositories/templates')
  const users=options.usersRepository||require('../repositories/users')
  const catalog=options.exercisesRepository||require('../repositories/exercises')
  const plans=options.trainingPlansService||require('./trainingPlans').createTrainingPlansService()
  async function active(userId){if(!await users.findActiveById(userId))throw new HttpError(401,'UNAUTHORIZED','登录已失效')}
  async function own(userId,id){const row=await repository.findMine(userId,id);if(!row)throw new HttpError(404,'NOT_FOUND','模板不存在');return row}
  async function publication(userId,id){const row=await repository.findPublic(userId,id);if(!row)throw new HttpError(404,'NOT_FOUND','帖子不存在');return row}
  async function verifyExercises(userId,exercises){
    const snapshots=new Map()
    for(const item of exercises){
      const row=await catalog.findVisibleById(userId,item.exerciseId)
      if(!row||!row.is_system)throw new HttpError(422,'EXERCISE_UNAVAILABLE','模板包含已失效或非系统动作，请先修改模板')
      const variant=item.variantId?await catalog.findVariant(item.exerciseId,item.variantId):null
      if(item.variantId&&!variant)throw new HttpError(422,'EXERCISE_VARIANT_UNAVAILABLE','模板包含已失效的动作变式')
      snapshots.set(item.sortOrder,{exerciseName:row.default_display_name_zh||row.name,variantName:variant?.default_display_name_zh||''})
    }
    return snapshots
  }
  function contentOf(row){return validateTemplate({name:row.name||row.title,durationMinutes:row.duration_minutes,exercises:readJson(row.content,[])})}
  return{
    async listMine(userId){await active(userId);return{items:(await repository.listMine(userId)).map(presentTemplate)}},
    async getMine(userId,id){await active(userId);return presentTemplate(await own(userId,id))},
    async create(userId,input){await active(userId);const data=validateTemplate(input),names=await verifyExercises(userId,data.exercises);data.exercises=data.exercises.map(item=>({...item,...names.get(item.sortOrder)}));const id=randomUUID();await repository.create({id,userId,...data});return presentTemplate(await own(userId,id))},
    async update(userId,id,input){await active(userId);if(!Number.isInteger(input?.version)||input.version<1)throw invalid('模板版本不合法');const data=validateTemplate(input),names=await verifyExercises(userId,data.exercises);data.exercises=data.exercises.map(item=>({...item,...names.get(item.sortOrder)}));await own(userId,id);if(!await repository.update(userId,id,input.version,data))throw new HttpError(409,'TEMPLATE_VERSION_CONFLICT','模板已在其他位置更新，请刷新');return presentTemplate(await own(userId,id))},
    async remove(userId,id){await active(userId);if(!await repository.remove(userId,id))throw new HttpError(404,'NOT_FOUND','模板不存在');return{id,deleted:true}},
    async createPlan(userId,id,{planDate,idempotencyKey}={}){
      await active(userId);if(!validDate(planDate))throw invalid('训练日期不合法')
      const data=contentOf(await own(userId,id));await verifyExercises(userId,data.exercises)
      const result=await plans.create(userId,{planDate,name:data.name,durationMinutes:data.durationMinutes,idempotencyKey:idempotencyKey||null,exercises:data.exercises.map(item=>({exerciseId:item.exerciseId,variantId:item.variantId,bodyPart:item.bodyPart,recordMethods:item.recordMethods,targetMetrics:item.targetMetrics,sets:item.plannedSets,reps:item.targetMetrics.reps??null,weight:item.targetMetrics.weight??null,actualGroups:Array.from({length:item.plannedSets},()=>({values:Object.fromEntries(item.recordMethods.map(method=>[method,null]))})),actual:{kg:null,reps:null,sets:null},restSeconds:item.restSeconds,notes:item.notes,sortOrder:item.sortOrder}))})
      return result
    },
    async publish(userId,id,input){
      await active(userId);const data=contentOf(await own(userId,id));await verifyExercises(userId,data.exercises)
      if(!input||typeof input!=='object'||Array.isArray(input)||Object.keys(input).some(key=>!['description','tags'].includes(key)))throw invalid('发布资料不合法')
      const description=cleanText(input.description??'',400),tags=input.tags??[]
      if(!Array.isArray(tags)||tags.length>5||new Set(tags).size!==tags.length)throw invalid('最多选择 5 个不重复标签')
      tags.forEach(tag=>cleanText(tag,16,true))
      const postId=randomUUID();await repository.publish({id:postId,userId,title:data.name,description,tags,...data})
      return presentPublication(await publication(userId,postId))
    },
    async listPublic(userId,filters){await active(userId);const{rows,total}=await repository.listPublic(userId,filters);return{items:rows.map(presentPublication),total,page:filters.page,pageSize:filters.pageSize,hasMore:filters.page*filters.pageSize<total}},
    async getPublic(userId,id){await active(userId);return presentPublication(await publication(userId,id))},
    async removePublication(userId,id){await active(userId);if(!await repository.removePublication(userId,id))throw new HttpError(404,'NOT_FOUND','帖子不存在或不属于你');return{id,deleted:true}},
    async setReaction(userId,id,kind,enabled){await active(userId);if(typeof enabled!=='boolean'||!['like','favorite'].includes(kind))throw invalid('互动参数不合法');if(!await repository.setReaction(userId,id,kind,enabled))throw new HttpError(404,'NOT_FOUND','帖子不存在');return presentPublication(await publication(userId,id))},
    async importPublic(userId,id){
      await active(userId);const post=await publication(userId,id);const data=contentOf(post);await verifyExercises(userId,data.exercises)
      const templateId=randomUUID();if(!await repository.importPublication(userId,id,{id:templateId,name:data.name,durationMinutes:data.durationMinutes,exercises:data.exercises}))throw new HttpError(404,'NOT_FOUND','帖子已删除')
      return presentTemplate(await own(userId,templateId))
    }
  }
}
module.exports={createTemplatesService,validateTemplate,presentTemplate,presentPublication}
