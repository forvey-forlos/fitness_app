const multer=require('multer');const{HttpError}=require('../utils/response');const{MAX_AVATAR_BYTES}=require('../config/avatar')
const allowedTypes=new Set(['image/jpeg','image/png','image/webp'])
const upload=multer({storage:multer.memoryStorage(),limits:{fileSize:MAX_AVATAR_BYTES,files:1,fields:0,parts:1},fileFilter(req,file,done){
  if(!allowedTypes.has(String(file.mimetype||'').toLowerCase()))return done(new HttpError(400,'AVATAR_UPLOAD_INVALID','仅支持 JPG、PNG 或 WebP 图片'))
  done(null,true)
}}).single('avatar')
function avatarUpload(req,res,next){upload(req,res,error=>{
  if(error instanceof HttpError)return next(error)
  if(error)return next(new HttpError(400,'AVATAR_UPLOAD_INVALID',error.code==='LIMIT_FILE_SIZE'?'头像不能超过 2 MB':'头像上传不合法'))
  if(!req.file)return next(new HttpError(400,'AVATAR_REQUIRED','请选择头像图片'))
  next()
})}
module.exports=avatarUpload
