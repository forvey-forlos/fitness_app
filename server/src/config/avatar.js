const MAX_AVATAR_BYTES=2*1024*1024
const MAX_AVATAR_EDGE=4096
const MAX_AVATAR_PIXELS=12*1024*1024

function getAvatarConfig(){
  const baseUrl=String(process.env.PUBLIC_API_BASE_URL||'').replace(/\/+$/,'')
  if(!/^https:\/\//i.test(baseUrl))throw new Error('PUBLIC_API_BASE_URL must be an HTTPS URL')
  return{baseUrl,maxBytes:MAX_AVATAR_BYTES,maxEdge:MAX_AVATAR_EDGE,maxPixels:MAX_AVATAR_PIXELS}
}
module.exports={getAvatarConfig,MAX_AVATAR_BYTES,MAX_AVATAR_EDGE,MAX_AVATAR_PIXELS}
