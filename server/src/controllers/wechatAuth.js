const {sendSuccess}=require('../utils/response')
module.exports=function(service){return{async login(req,res){const value=await (service||require('../services/wechatAuth').createWechatAuthService()).login(req.validated);sendSuccess(res,value)}}}
