const{randomBytes}=require('node:crypto');const{HttpError}=require('../utils/response');const{inspectImage}=require('../utils/imageMetadata')
function detectedMime(buffer){return inspectImage(buffer)?.mime||null}
function createAvatarsService(options={}){const repository=options.avatarStorage||options.avatarsRepository||require('../repositories/avatars'),users=options.usersRepository||require('../repositories/users'),config=options.avatarConfig||require('../config/avatar').getAvatarConfig();return{
  async upload(userId,file){
    if(!await users.findActiveById(userId))throw new HttpError(401,'UNAUTHORIZED','登录已失效')
    const maxBytes=config.maxBytes||2*1024*1024
    if(!Buffer.isBuffer(file?.buffer)||file.buffer.length<1||file.buffer.length>maxBytes)throw new HttpError(400,'AVATAR_UPLOAD_INVALID','头像文件大小不合法')
    const image=inspectImage(file?.buffer)
    if(!image||image.mime!==String(file?.mimetype||'').toLowerCase())throw new HttpError(400,'AVATAR_UPLOAD_INVALID','头像文件内容与格式不匹配')
    const maxEdge=config.maxEdge||4096,maxPixels=config.maxPixels||12*1024*1024
    if(image.width<1||image.height<1||image.width>maxEdge||image.height>maxEdge||image.width*image.height>maxPixels)throw new HttpError(400,'AVATAR_DIMENSIONS_INVALID',`头像像素尺寸不能超过 ${maxEdge} × ${maxEdge}`)
    if(image.animated)throw new HttpError(400,'AVATAR_ANIMATION_UNSUPPORTED','暂不支持动态头像')
    const version=`${Date.now().toString(36)}${randomBytes(3).toString('hex')}`
    const url=`${config.baseUrl}/api/v1/avatars/${userId}?v=${version}`
    await repository.save(userId,image.mime,file.buffer,url)
    return{avatarUrl:url,width:image.width,height:image.height,byteSize:file.buffer.length}
  },
  async get(userId){const row=await repository.find(userId);if(!row)throw new HttpError(404,'NOT_FOUND','头像不存在');return row},
  async remove(userId){if(!await users.findActiveById(userId))throw new HttpError(401,'UNAUTHORIZED','登录已失效');await repository.remove(userId);return{avatarUrl:null}}
}}
module.exports={createAvatarsService,detectedMime}
