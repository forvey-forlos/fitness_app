const{sendSuccess}=require('../utils/response')
module.exports=function(service){const current=()=>service||require('../services/avatars').createAvatarsService();return{
  async upload(req,res){sendSuccess(res,await current().upload(req.userId,req.file),201)},
  async get(req,res){const row=await current().get(req.params.userId);res.set('Content-Type',row.mime_type);res.set('Content-Length',String(row.byte_size));res.set('Cache-Control','public, max-age=31536000, immutable');res.send(row.image_data)},
  async remove(req,res){sendSuccess(res,await current().remove(req.userId))}
}}
