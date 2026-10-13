const{Router}=require('express')
const{createAuthMiddleware}=require('../middlewares/auth')
const{HttpError,sendSuccess}=require('../utils/response')
const{createTemplatesService}=require('../services/templates')
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
function validateId(req,res,next){if(!uuid.test(req.params.id||''))return next(new HttpError(400,'VALIDATION_ERROR','ID 不合法'));next()}
function listFilters(req){const query=req.query||{};if(Object.keys(query).some(key=>!['q','scope','page','pageSize'].includes(key)))throw new HttpError(400,'VALIDATION_ERROR','查询参数不合法')
  const q=String(query.q||'').trim().toLowerCase(),scope=query.scope||'all',page=Number(query.page||1),pageSize=Number(query.pageSize||20)
  if(q.length>50||/[\p{Cc}\p{Cf}]/u.test(q)||!['all','mine','favorites'].includes(scope)||!Number.isInteger(page)||page<1||page>1000||!Number.isInteger(pageSize)||pageSize<1||pageSize>30)throw new HttpError(400,'VALIDATION_ERROR','搜索或分页参数不合法')
  return{q,scope,page,pageSize}
}
module.exports=function createTemplateRoutes(service,authenticate=createAuthMiddleware()){
  const router=Router(),current=()=>service||createTemplatesService()
  router.use('/training-templates',authenticate)
  router.use('/template-community',authenticate)
  router.get('/training-templates',async(req,res)=>sendSuccess(res,await current().listMine(req.userId)))
  router.post('/training-templates',async(req,res)=>sendSuccess(res,await current().create(req.userId,req.body),201))
  router.get('/training-templates/:id',validateId,async(req,res)=>sendSuccess(res,await current().getMine(req.userId,req.params.id)))
  router.put('/training-templates/:id',validateId,async(req,res)=>sendSuccess(res,await current().update(req.userId,req.params.id,req.body)))
  router.delete('/training-templates/:id',validateId,async(req,res)=>sendSuccess(res,await current().remove(req.userId,req.params.id)))
  router.post('/training-templates/:id/create-plan',validateId,async(req,res)=>{const key=req.get('Idempotency-Key');if(key!==undefined&&!/^[\x21-\x7E]{1,128}$/.test(key))throw new HttpError(400,'VALIDATION_ERROR','幂等键不合法');const result=await current().createPlan(req.userId,req.params.id,{...req.body,idempotencyKey:key});sendSuccess(res,result.plan,result.created?201:200)})
  router.post('/training-templates/:id/publish',validateId,async(req,res)=>sendSuccess(res,await current().publish(req.userId,req.params.id,req.body),201))
  router.get('/template-community',async(req,res)=>sendSuccess(res,await current().listPublic(req.userId,listFilters(req))))
  router.get('/template-community/:id',validateId,async(req,res)=>sendSuccess(res,await current().getPublic(req.userId,req.params.id)))
  router.delete('/template-community/:id',validateId,async(req,res)=>sendSuccess(res,await current().removePublication(req.userId,req.params.id)))
  router.put('/template-community/:id/like',validateId,async(req,res)=>sendSuccess(res,await current().setReaction(req.userId,req.params.id,'like',req.body?.enabled)))
  router.put('/template-community/:id/favorite',validateId,async(req,res)=>sendSuccess(res,await current().setReaction(req.userId,req.params.id,'favorite',req.body?.enabled)))
  router.post('/template-community/:id/import',validateId,async(req,res)=>sendSuccess(res,await current().importPublic(req.userId,req.params.id),201))
  return router
}
