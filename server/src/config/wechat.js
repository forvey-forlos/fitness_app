function getWechatConfig() {
  const appId = process.env.WECHAT_MINI_APP_ID
  const appSecret = process.env.WECHAT_MINI_APP_SECRET
  if (!appId || !appSecret) throw new Error('WECHAT_MINI_APP_ID and WECHAT_MINI_APP_SECRET must be configured')
  return { appId, appSecret }
}
module.exports = { getWechatConfig }
