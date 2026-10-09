const{sendSuccess}=require('../utils/response')
module.exports=function(service){const current=()=>service||require('../services/avatars').createAvatarsService();return{
  async upload(req,res){sendSuccess(res,await current().upload(req.userId,req.file),201)},
  async get(req,res){
    const row=await current().get(req.params.userId)
    const updatedAt=new Date(row.updated_at).getTime()||0
    const etag=`\"avatar-${req.params.userId}-${updatedAt}-${row.byte_size}\"`
    res.set('ETag',etag);res.set('Cache-Control','public, max-age=86400, must-revalidate');res.set('X-Content-Type-Options','nosniff')
    if(req.get('If-None-Match')===etag)return res.status(304).end()
    res.set('Content-Type',row.mime_type);res.set('Content-Length',String(row.byte_size));res.send(row.image_data)
  },
  async remove(req,res){sendSuccess(res,await current().remove(req.userId))}
}}
