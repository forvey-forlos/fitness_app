const {randomUUID}=require('node:crypto')
const {HttpError}=require('../utils/response')

function createWechatAuthService(options={}){
  const repository=options.wechatAccountsRepository||require('../repositories/wechatAccounts')
  const refreshRepository=options.refreshTokensRepository||require('../repositories/refreshTokens')
  const tokens=options.tokenUtils||require('../utils/tokens')
  const tokenConfig=options.tokenConfig||require('../config/tokens').getTokenConfig()
  const wechatConfig=options.wechatConfig||require('../config/wechat').getWechatConfig()
  const exchange=options.exchangeCode||require('../utils/wechatClient').exchangeCode
  const createId=options.createId||randomUUID
  const accountCodes=options.accountCodes||require('../utils/accountCode')
  return{async login({code,deviceId}){
    const identity=await exchange(code,wechatConfig)
    let account=await repository.findByOpenId(wechatConfig.appId,identity.openId),created=false
    if(!account){
      const id=createId(),username=accountCodes.createInternalUsername(id)
      const user={id,displayName:'微信用户',username,usernameNormalized:username,passwordHash:null,timezone:'Asia/Shanghai'}
      for(let attempt=0;attempt<20&&!created;attempt+=1){
        user.accountCode=accountCodes.createAccountCode()
        try{await repository.createWithUser({id:createId(),userId:user.id,appId:wechatConfig.appId,
          openId:identity.openId,unionId:identity.unionId},user);created=true}
        catch(error){
          if(error.code!=='ER_DUP_ENTRY')throw error
          account=await repository.findByOpenId(wechatConfig.appId,identity.openId)
          if(account)break
          if(!error.sqlMessage?.includes('uq_users_account_code'))throw error
        }
      }
      if(!created&&!account)throw new HttpError(503,'ACCOUNT_CODE_UNAVAILABLE','暂时无法分配账号，请稍后重试')
      account=await repository.findByOpenId(wechatConfig.appId,identity.openId)
    }
    if(!account||account.status!=='active'||account.deleted_at!==null)throw new HttpError(401,'UNAUTHORIZED','用户已失效')
    const accessToken=tokens.createAccessToken(account.user_id,tokenConfig),refreshToken=tokens.createRefreshToken()
    await refreshRepository.create({id:createId(),userId:account.user_id,tokenHash:tokens.hashRefreshToken(refreshToken),
      deviceId,platform:'mp-weixin',expiresAt:new Date(Date.now()+tokenConfig.refreshTtl*1000)})
    return{user:{id:account.user_id,username:account.display_name,displayName:account.display_name,
      accountCode:account.account_code,avatarUrl:account.avatar_url,timezone:account.timezone},
      accessToken,accessTokenExpiresIn:tokenConfig.accessTtl,refreshToken,refreshTokenExpiresIn:tokenConfig.refreshTtl,
      isNewUser:created,avatarConsentRequired:created&&!account.avatar_url}
  }}
}
module.exports={createWechatAuthService}
