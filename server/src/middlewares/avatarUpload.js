const multer=require('multer');const{HttpError}=require('../utils/response')
const upload=multer({storage:multer.memoryStorage(),limits:{fileSize:2097152,files:1},fileFilter(req,file,done){done(null,['image/jpeg','image/png','image/webp'].includes(file.mimetype))}}).single('avatar')
function avatarUpload(req,res,next){upload(req,res,error=>{if(error)return next(new HttpError(400,'AVATAR_UPLOAD_INVALID',error.code==='LIMIT_FILE_SIZE'?'头像不能超过 2 MB':'头像上传不合法'));if(!req.file)return next(new HttpError(400,'AVATAR_REQUIRED','请选择头像图片'));next()})}
module.exports=avatarUpload
