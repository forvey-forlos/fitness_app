const { HttpError } = require('../utils/response')
const {
  bodyParts,recordMethods,equipmentTypes,muscleParts,legacyCategory,legacyMuscle
} = require('../constants/exerciseMetadata')

const groupCategory={
  chest:'chest',back:'back',shoulder:'shoulder',biceps:'arms',triceps:'arms',
  legs:'legs',glutes:'legs',core:'abs'
}
const categories=[...new Set(Object.values(groupCategory))]

function normalizeName(name){return name.normalize('NFKC').trim().replace(/\s+/gu,' ').toLowerCase()}
function error(errors){return new HttpError(400,'VALIDATION_ERROR','请求参数不合法',errors)}
function validateName(value){return typeof value==='string'&&value===value.trim()&&Array.from(value).length>=1&&Array.from(value).length<=40&&!/[\p{Cc}\p{Cf}]/u.test(value)&&normalizeName(value).length<=80}
function validStringArray(value,allowed,max=12){return Array.isArray(value)&&value.length<=max&&new Set(value).size===value.length&&value.every(item=>allowed.includes(item))}
function validVariants(value){
  if(!Array.isArray(value)||value.length>30)return false
  const names=new Set(),ids=new Set()
  for(const variant of value){
    if(!variant||typeof variant!=='object'||Array.isArray(variant))return false
    if(Object.keys(variant).some(key=>!['id','name','primaryMuscles','secondaryMuscles'].includes(key)))return false
    if(typeof variant.id!=='string'||!/^[A-Za-z0-9_-]{1,64}$/.test(variant.id)||ids.has(variant.id))return false
    if(!validateName(variant.name))return false
    const normalized=normalizeName(variant.name)
    if(names.has(normalized))return false
    if(!validStringArray(variant.primaryMuscles||[],Object.keys(muscleParts),20)||!validStringArray(variant.secondaryMuscles||[],Object.keys(muscleParts),20))return false
    if((variant.primaryMuscles||[]).some(key=>(variant.secondaryMuscles||[]).includes(key)))return false
    ids.add(variant.id);names.add(normalized)
  }
  return true
}

function validateBody(req,res,next,patch=false){
  const body=req.body
  if(!body||typeof body!=='object'||Array.isArray(body))return next(error([{field:'body',message:'请求体必须是对象'}]))
  const errors=[]
  const modern=['bodyParts','recordMethods','primaryMuscles','secondaryMuscles','variants','sortOrder']
  const allowed=['name','category','muscleGroup','equipment',...modern,...(patch?['version']:[])]
  for(const field of Object.keys(body))if(!allowed.includes(field))errors.push({field,message:'不允许修改此字段'})
  if(patch&&(!Number.isInteger(body.version)||body.version<1||body.version>4294967294))errors.push({field:'version',message:'必须提供有效版本号'})
  if(patch&&!['name','category','muscleGroup','equipment',...modern].some(field=>Object.hasOwn(body,field)))errors.push({field:'body',message:'至少提供一个要修改的字段'})
  if((!patch||Object.hasOwn(body,'name'))&&!validateName(body.name))errors.push({field:'name',message:'动作名称须为 1–40 个字符，不能有首尾空格或控制字符'})

  const hasModern=Object.hasOwn(body,'bodyParts')||Object.hasOwn(body,'recordMethods')||Object.hasOwn(body,'primaryMuscles')||Object.hasOwn(body,'secondaryMuscles')
  if(hasModern||!patch&&!Object.hasOwn(body,'category')){
    if(!validStringArray(body.bodyParts,bodyParts,10)||!body.bodyParts.length)errors.push({field:'bodyParts',message:'至少选择一个合法训练部位'})
    if(!validStringArray(body.recordMethods,recordMethods,7)||!body.recordMethods.length)errors.push({field:'recordMethods',message:'至少选择一种合法记录方式'})
    if(!validStringArray(body.primaryMuscles||[],Object.keys(muscleParts),20))errors.push({field:'primaryMuscles',message:'主要肌群不合法'})
    if(!validStringArray(body.secondaryMuscles||[],Object.keys(muscleParts),20))errors.push({field:'secondaryMuscles',message:'辅助肌群不合法'})
    const overlap=(body.primaryMuscles||[]).find(key=>(body.secondaryMuscles||[]).includes(key))
    if(overlap)errors.push({field:'secondaryMuscles',message:'主要肌群与辅助肌群不能重复'})
    const selected=new Set(body.bodyParts||[])
    for(const key of [...(body.primaryMuscles||[]),...(body.secondaryMuscles||[])]){
      if(!selected.has('full_body')&&!selected.has('other')&&!muscleParts[key]?.some(part=>selected.has(part)))errors.push({field:'primaryMuscles',message:'所选肌群与训练部位不匹配'})
    }
  }else{
    if((!patch||Object.hasOwn(body,'category'))&&!categories.includes(body.category))errors.push({field:'category',message:'训练部位不合法'})
    if((!patch||Object.hasOwn(body,'muscleGroup'))&&!Object.hasOwn(groupCategory,body.muscleGroup))errors.push({field:'muscleGroup',message:'目标肌群不合法'})
    if(body.category&&body.muscleGroup&&groupCategory[body.muscleGroup]!==body.category)errors.push({field:'muscleGroup',message:'目标肌群与训练部位不匹配'})
  }
  if((!patch||Object.hasOwn(body,'equipment'))&&!equipmentTypes.includes(body.equipment))errors.push({field:'equipment',message:'器械类型不合法'})
  if(Object.hasOwn(body,'sortOrder')&&(!Number.isInteger(body.sortOrder)||body.sortOrder<0||body.sortOrder>1000000))errors.push({field:'sortOrder',message:'排序值不合法'})
  if(Object.hasOwn(body,'variants')&&!validVariants(body.variants))errors.push({field:'variants',message:'动作变式格式不合法、名称重复或肌群配置冲突'})
  if(!patch){const key=req.get('Idempotency-Key');if(key!==undefined&&!/^[\x21-\x7E]{1,128}$/.test(key))errors.push({field:'Idempotency-Key',message:'幂等键必须为 1–128 位可见 ASCII 字符'})}
  if(errors.length)return next(error(errors))

  req.validated={...body}
  if(body.name!==undefined)req.validated.nameNormalized=normalizeName(body.name)
  if(hasModern){
    const firstPart=body.bodyParts[0],firstMuscle=(body.primaryMuscles||[])[0]
    req.validated.category=legacyCategory[firstPart]||firstPart
    req.validated.muscleGroup=legacyMuscle[firstMuscle]||({chest:'chest',back:'back',shoulder:'shoulder',arms:'biceps',legs:'legs',glutes:'glutes',core:'core'}[firstPart]||'core')
  }
  if(!patch)req.validated.idempotencyKey=req.get('Idempotency-Key')||null
  next()
}
function validateCreate(req,res,next){validateBody(req,res,next)}
function validateUpdate(req,res,next){validateBody(req,res,next,true)}

function validateList(req,res,next){
  const {category,muscleGroup,equipment,keyword,page='1',pageSize='20'}=req.query,errors=[]
  for(const key of Object.keys(req.query))if(!['category','muscleGroup','equipment','keyword','page','pageSize'].includes(key))errors.push({field:key,message:'不支持的查询参数'})
  if(category!==undefined&&!categories.includes(category))errors.push({field:'category',message:'训练部位不合法'})
  if(muscleGroup!==undefined&&!Object.hasOwn(groupCategory,muscleGroup))errors.push({field:'muscleGroup',message:'目标肌群不合法'})
  if(equipment!==undefined&&!equipmentTypes.includes(equipment))errors.push({field:'equipment',message:'器械类型不合法'})
  if(keyword!==undefined&&(typeof keyword!=='string'||keyword.trim().length<1||keyword.length>40))errors.push({field:'keyword',message:'关键词长度须为 1–40 个字符'})
  if(!/^[1-9]\d*$/.test(page)||Number(page)>100000)errors.push({field:'page',message:'页码不合法'})
  if(!/^[1-9]\d*$/.test(pageSize)||Number(pageSize)>100)errors.push({field:'pageSize',message:'每页条数须为 1–100'})
  if(errors.length)return next(error(errors))
  req.validated={category,muscleGroup,equipment,keyword:keyword?normalizeName(keyword):undefined,page:Number(page),pageSize:Number(pageSize)}
  next()
}
module.exports={validateCreate,validateUpdate,validateList,normalizeName,groupCategory}
