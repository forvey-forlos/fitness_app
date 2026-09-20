const{HttpError}=require('../utils/response')
function detectedMime(buffer){if(buffer?.subarray(0,3).equals(Buffer.from([0xff,0xd8,0xff])))return'image/jpeg';if(buffer?.subarray(0,8).equals(Buffer.from([0x89,0x50,0x4e,0x47,0x0d,0x0a,0x1a,0x0a])))return'image/png';if(buffer?.subarray(0,4).toString()==='RIFF'&&buffer?.subarray(8,12).toString()==='WEBP')return'image/webp';return null}
function createAvatarsService(options={}){const repository=options.avatarsRepository||require('../repositories/avatars'),users=options.usersRepository||require('../repositories/users'),config=options.avatarConfig||require('../config/avatar').getAvatarConfig();return{
  async upload(userId,file){if(!await users.findActiveById(userId))throw new HttpError(401,'UNAUTHORIZED','登录已失效');const mime=detectedMime(file.buffer);if(!mime||mime!==file.mimetype)throw new HttpError(400,'AVATAR_UPLOAD_INVALID','头像文件格式不正确');const version=Date.now();const url=`${config.baseUrl}/api/v1/avatars/${userId}?v=${version}`;await repository.save(userId,mime,file.buffer,url);return{avatarUrl:url}},
  async get(userId){const row=await repository.find(userId);if(!row)throw new HttpError(404,'NOT_FOUND','头像不存在');return row},
  async remove(userId){if(!await users.findActiveById(userId))throw new HttpError(401,'UNAUTHORIZED','登录已失效');await repository.remove(userId);return{avatarUrl:null}}
}}
module.exports={createAvatarsService,detectedMime}
