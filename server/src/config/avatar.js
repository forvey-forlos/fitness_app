function getAvatarConfig(){const baseUrl=String(process.env.PUBLIC_API_BASE_URL||'').replace(/\/+$/,'');if(!/^https:\/\//i.test(baseUrl))throw new Error('PUBLIC_API_BASE_URL must be an HTTPS URL');return{baseUrl,maxBytes:2097152}}
module.exports={getAvatarConfig}
