const PNG_SIGNATURE=Buffer.from([0x89,0x50,0x4e,0x47,0x0d,0x0a,0x1a,0x0a])

function pngMetadata(buffer){
  if(buffer.length<45||!buffer.subarray(0,8).equals(PNG_SIGNATURE)||buffer.subarray(12,16).toString('ascii')!=='IHDR'||buffer.subarray(buffer.length-8,buffer.length-4).toString('ascii')!=='IEND')return null
  let animated=false,offset=8
  while(offset+12<=buffer.length){const length=buffer.readUInt32BE(offset),type=buffer.subarray(offset+4,offset+8).toString('ascii');if(offset+12+length>buffer.length)return null;if(type==='acTL')animated=true;offset+=12+length;if(type==='IEND')break}
  return{mime:'image/png',width:buffer.readUInt32BE(16),height:buffer.readUInt32BE(20),animated}
}

function jpegMetadata(buffer){
  if(buffer.length<4||buffer[0]!==0xff||buffer[1]!==0xd8||buffer[buffer.length-2]!==0xff||buffer[buffer.length-1]!==0xd9)return null
  const sofMarkers=new Set([0xc0,0xc1,0xc2,0xc3,0xc5,0xc6,0xc7,0xc9,0xca,0xcb,0xcd,0xce,0xcf])
  let offset=2
  while(offset+3<buffer.length){
    if(buffer[offset]!==0xff){offset++;continue}
    while(offset<buffer.length&&buffer[offset]===0xff)offset++
    const marker=buffer[offset++]
    if(marker===0xd8||marker===0xd9)continue
    if(marker===0xda)break
    if(offset+2>buffer.length)return null
    const length=buffer.readUInt16BE(offset)
    if(length<2||offset+length>buffer.length)return null
    if(sofMarkers.has(marker)){
      if(length<7)return null
      return{mime:'image/jpeg',width:buffer.readUInt16BE(offset+5),height:buffer.readUInt16BE(offset+3),animated:false}
    }
    offset+=length
  }
  return null
}

function webpMetadata(buffer){
  if(buffer.length<30||buffer.subarray(0,4).toString('ascii')!=='RIFF'||buffer.subarray(8,12).toString('ascii')!=='WEBP')return null
  if(buffer.readUInt32LE(4)+8>buffer.length)return null
  const chunk=buffer.subarray(12,16).toString('ascii')
  if(chunk==='VP8X'){
    const flags=buffer[20]
    const width=1+buffer[24]+(buffer[25]<<8)+(buffer[26]<<16)
    const height=1+buffer[27]+(buffer[28]<<8)+(buffer[29]<<16)
    return{mime:'image/webp',width,height,animated:Boolean(flags&0x02)}
  }
  if(chunk==='VP8 '&&buffer.length>=30&&buffer[23]===0x9d&&buffer[24]===0x01&&buffer[25]===0x2a){
    return{mime:'image/webp',width:buffer.readUInt16LE(26)&0x3fff,height:buffer.readUInt16LE(28)&0x3fff,animated:false}
  }
  if(chunk==='VP8L'&&buffer.length>=25&&buffer[20]===0x2f){
    const bits=buffer.readUInt32LE(21)
    return{mime:'image/webp',width:1+(bits&0x3fff),height:1+((bits>>>14)&0x3fff),animated:false}
  }
  return null
}

function inspectImage(buffer){
  if(!Buffer.isBuffer(buffer))return null
  return pngMetadata(buffer)||jpegMetadata(buffer)||webpMetadata(buffer)
}

module.exports={inspectImage}
