const assert=require('node:assert/strict');const{test}=require('node:test')
const{createWechatAuthService}=require('../src/services/wechatAuth');const{createAvatarsService}=require('../src/services/avatars')
const{createWechatBindingsService}=require('../src/services/wechatBindings')

test('WeChat login creates one local user and reuses it on later login',async()=>{
  let account=null,refreshWrites=0,id=0
  const repository={async findByOpenId(){return account},async createWithUser(a,u){account={user_id:u.id,display_name:u.displayName,account_code:u.accountCode,avatar_url:null,timezone:u.timezone,status:'active',deleted_at:null};assert.equal(a.openId,'openid-a')}}
  const service=createWechatAuthService({wechatAccountsRepository:repository,
    accountCodes:{createInternalUsername:()=> 'uwechatinternal',createAccountCode:()=> '12345678'},
    refreshTokensRepository:{create:async()=>{refreshWrites++}},wechatConfig:{appId:'app-a',appSecret:'secret'},
    exchangeCode:async()=>({openId:'openid-a',unionId:null}),createId:()=>`id-${++id}`,
    tokenConfig:{accessTtl:60,refreshTtl:120},tokenUtils:{createAccessToken:()=> 'access',createRefreshToken:()=> 'refresh',hashRefreshToken:()=>Buffer.from('hash')}})
  const first=await service.login({code:'one',deviceId:'device'})
  const second=await service.login({code:'two',deviceId:'device'})
  assert.equal(first.isNewUser,true);assert.equal(first.avatarConsentRequired,true)
  assert.equal(second.isNewUser,false);assert.equal(second.user.id,first.user.id)
  assert.equal(refreshWrites,2);assert.equal(first.accessToken,'access')
  assert.equal(first.user.displayName,'微信用户');assert.equal(first.user.accountCode,'12345678')
})

test('existing users can bind and safely unbind WeChat while WeChat-only users cannot',async()=>{
  let binding=null
  const repository={async findByOpenId(){return binding&&{user_id:binding.userId}},async findByUserAndApp(){return binding&&{created_at:'2026-09-20'}},async bind(value){binding=value},async remove(){binding=null;return true}}
  const passwordUser={id:'user-a',password_hash:'hash'}
  const service=createWechatBindingsService({wechatAccountsRepository:repository,usersRepository:{findActiveById:async()=>passwordUser},wechatConfig:{appId:'app-a',appSecret:'secret'},exchangeCode:async()=>({openId:'openid-a',unionId:null}),createId:()=> 'binding-a'})
  assert.deepEqual(await service.status('user-a'),{bound:false,boundAt:null})
  assert.equal((await service.bind('user-a',{code:'code'})).bound,true)
  assert.equal((await service.unbind('user-a')).bound,false)
  passwordUser.password_hash=null
  await service.bind('user-a',{code:'code'})
  await assert.rejects(service.unbind('user-a'),error=>error.code==='LAST_LOGIN_METHOD')
})

test('avatar upload verifies bytes, returns stable URL, and supports removal',async()=>{
  let saved=null,removed=false
  const service=createAvatarsService({avatarConfig:{baseUrl:'https://api.example.com'},
    usersRepository:{findActiveById:async()=>({id:'user-a'})},avatarsRepository:{
      async save(userId,mime,data,url){saved={userId,mime,size:data.length,url}},async remove(){removed=true},async find(){return null}
    }})
  const png=Buffer.from([0x89,0x50,0x4e,0x47,0x0d,0x0a,0x1a,0x0a,1])
  const result=await service.upload('user-a',{mimetype:'image/png',buffer:png})
  assert.match(result.avatarUrl,/https:\/\/api\.example\.com\/api\/v1\/avatars\/user-a\?v=\d+/)
  assert.equal(saved.mime,'image/png');assert.equal(saved.size,png.length)
  await assert.rejects(service.upload('user-a',{mimetype:'image/png',buffer:Buffer.from('fake')}),error=>error.code==='AVATAR_UPLOAD_INVALID')
  assert.deepEqual(await service.remove('user-a'),{avatarUrl:null});assert.equal(removed,true)
})
