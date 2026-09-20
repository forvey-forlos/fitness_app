const { HttpError } = require('./response')

async function exchangeCode(code, config, fetchImpl = fetch) {
  const query = new URLSearchParams({ appid: config.appId, secret: config.appSecret,
    js_code: code, grant_type: 'authorization_code' })
  let response
  try { response = await fetchImpl('https://api.weixin.qq.com/sns/jscode2session?' + query) }
  catch { throw new HttpError(502, 'WECHAT_SERVICE_UNAVAILABLE', '微信登录服务暂时不可用') }
  if (!response.ok) throw new HttpError(502, 'WECHAT_SERVICE_UNAVAILABLE', '微信登录服务暂时不可用')
  const result = await response.json()
  if (result.errcode || !result.openid) throw new HttpError(401, 'WECHAT_LOGIN_FAILED', '微信登录凭证无效或已过期')
  return { openId: result.openid, unionId: result.unionid || null }
}
module.exports = { exchangeCode }
