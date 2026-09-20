const{HttpError}=require('../utils/response');const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
function validateAvatarUserId(req,res,next){if(!uuid.test(req.params.userId||''))return next(new HttpError(400,'VALIDATION_ERROR','用户 ID 不合法'));next()}
module.exports={validateAvatarUserId}
