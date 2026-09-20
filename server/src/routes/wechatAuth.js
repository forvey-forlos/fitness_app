const{Router}=require('express');const controller=require('../controllers/wechatAuth');const{validateWechatLogin}=require('../validators/wechatAuth')
module.exports=function(service){const router=Router(),handler=controller(service);router.post('/wechat',validateWechatLogin,handler.login);return router}
