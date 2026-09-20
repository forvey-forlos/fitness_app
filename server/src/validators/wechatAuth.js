const { HttpError } = require('../utils/response')
function validateWechatLogin(req,res,next){
  const body=req.body||{},errors=[]
  for(const key of Object.keys(body))if(!['code','deviceId'].includes(key))errors.push({field:key,message:'不支持的字段'})
  if(typeof body.code!=='string'||!/^[A-Za-z0-9_-]{1,256}$/.test(body.code))errors.push({field:'code',message:'微信登录凭证不合法'})
  if(body.deviceId!==undefined&&body.deviceId!==null&&(typeof body.deviceId!=='string'||body.deviceId.length>128))errors.push({field:'deviceId',message:'设备 ID 不合法'})
  if(errors.length)return next(new HttpError(400,'VALIDATION_ERROR','请求参数不合法',errors))
  req.validated={code:body.code,deviceId:body.deviceId||null};next()
}
module.exports={validateWechatLogin}
