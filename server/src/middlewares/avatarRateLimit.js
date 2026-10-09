const{HttpError}=require('../utils/response')

function createAvatarRateLimit({windowMs=10*60*1000,max=12,now=Date.now}={}){
  const attempts=new Map();let calls=0
  return function avatarRateLimit(req,res,next){
    const current=now(),key=req.userId
    if(++calls%100===0){for(const[id,value]of attempts){if(current-value.startedAt>=windowMs)attempts.delete(id)}}
    const existing=attempts.get(key)
    const bucket=!existing||current-existing.startedAt>=windowMs?{startedAt:current,count:0}:existing
    bucket.count++;attempts.set(key,bucket)
    if(bucket.count>max){res.set('Retry-After',String(Math.ceil((windowMs-(current-bucket.startedAt))/1000)));return next(new HttpError(429,'AVATAR_UPLOAD_RATE_LIMITED','头像上传过于频繁，请稍后再试'))}
    next()
  }
}

module.exports={createAvatarRateLimit}
