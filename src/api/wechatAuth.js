import{request}from'./request'
export function getWechatLoginCode(){return new Promise((resolve,reject)=>uni.login({provider:'weixin',success:result=>result.code?resolve(result.code):reject(new Error('未取得微信登录凭证')),fail:()=>reject(new Error('微信登录失败'))}))}
export async function loginWithWechat(deviceId){const code=await getWechatLoginCode();return request({url:'/api/v1/auth/wechat',method:'POST',auth:false,data:{code,deviceId}})}
