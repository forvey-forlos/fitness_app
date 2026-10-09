<template>
  <view class="page" :style="themeStyle">
    <view class="ambient"><view class="orb orb-one" /><view class="orb orb-two" /></view>
    <view class="shell">
      <view class="topbar">
        <button class="back" hover-class="pressed" @tap="goBack">‹</button>
        <view><text class="kicker">ACCOUNT</text><text class="title">个人资料</text></view>
        <view class="theme-mark" />
      </view>

      <view class="profile-card">
        <view class="identity">
          <view class="avatar avatar-editable">
            <image v-if="avatarDisplayUrl && !avatarLoadFailed" :src="avatarDisplayUrl" mode="aspectFill" @error="avatarLoadFailed=true" />
            <text v-else>{{ avatarInitial }}</text>
            <view class="avatar-edit-mark">✦</view>
            <!-- #ifdef MP-WEIXIN -->
            <button class="avatar-hit" open-type="chooseAvatar" aria-label="选择头像" @chooseavatar="onChooseAvatar" />
            <!-- #endif -->
            <!-- #ifndef MP-WEIXIN -->
            <view class="avatar-hit" aria-label="选择头像" @tap="chooseLocalAvatar" />
            <!-- #endif -->
          </view>
          <view><text class="identity-name">{{ form.displayName || '加载中' }}</text><text class="identity-note">登录账号 {{ form.accountCode || '—' }}</text></view>
        </view>

        <view v-if="loading" class="state">正在加载资料…</view>
        <view v-else class="form">
          <label class="field">
            <text>昵称</text>
            <input v-model="form.displayName" maxlength="30" placeholder="数字、英文或汉字" @input="onUsernameInput" />
            <text v-if="errors.username" class="error">{{ errors.username }}</text>
          </label>
          <label class="field">
            <text>用户头像</text>
            <view class="avatar-actions">
              <!-- #ifdef MP-WEIXIN -->
              <button class="avatar-button" open-type="chooseAvatar" @chooseavatar="onChooseAvatar">{{ pendingAvatarPath ? '重新选择' : '选择微信头像' }}</button>
              <!-- #endif -->
              <!-- #ifndef MP-WEIXIN -->
              <button class="avatar-button" @tap="chooseLocalAvatar">{{ pendingAvatarPath ? '重新选择' : '选择图片' }}</button>
              <!-- #endif -->
              <button v-if="form.avatarUrl && !pendingAvatarPath" class="avatar-remove" @tap="removeAvatar">删除头像</button>
            </view>
            <view v-if="pendingAvatarPath" class="avatar-pending">
              <text>裁剪预览已就绪，确认后才会上传</text>
              <view class="pending-actions">
                <button class="pending-confirm" :disabled="avatarUploading" @tap="confirmAvatarUpload">{{ avatarUploading ? '上传中…' : '确认使用' }}</button>
                <button class="pending-cancel" :disabled="avatarUploading" @tap="cancelAvatarDraft">取消</button>
              </view>
            </view>
            <text class="avatar-note">支持 JPG、PNG、WebP；自动裁剪为 512 × 512，上传文件最大 2 MB</text>
          </label>
          <label class="field">
            <text>时区</text>
            <input v-model="form.timezone" placeholder="例如 Asia/Shanghai" />
          </label>
          <button class="save" :disabled="saving" hover-class="pressed" @tap="save">{{ saving ? '正在保存…' : '保存资料' }}</button>
        </view>
      </view>

      <view class="account-card">
        <text class="account-title">账号操作</text>
        <!-- #ifdef MP-WEIXIN -->
        <view class="wechat-binding">
          <view><text class="binding-title">微信账号</text><text class="account-note">{{ wechatBound ? '已绑定，可使用微信快捷登录' : '未绑定' }}</text></view>
          <button class="binding-button" :disabled="bindingWechat" @tap="toggleWechatBinding">{{ bindingWechat ? '处理中…' : (wechatBound ? '解除绑定' : '绑定微信') }}</button>
        </view>
        <!-- #endif -->
        <text class="account-note">退出后会清除本机保存的用户资料和 Token。</text>
        <button class="logout" :disabled="loggingOut" hover-class="pressed" @tap="confirmLogout">{{ loggingOut ? '正在退出…' : '退出登录' }}</button>
      </view>
    </view>

    <view v-if="crop.visible" class="crop-modal">
      <view class="crop-mask" />
      <view class="crop-sheet">
        <view class="crop-head"><text>裁剪头像</text><button @tap="closeCrop">取消</button></view>
        <view class="crop-stage" :style="{width:`${cropStageSize}px`,height:`${cropStageSize}px`}" @touchstart.stop="startCropDrag" @touchmove.stop.prevent="moveCropDrag" @touchend.stop="endCropDrag">
          <image class="crop-image" :src="crop.sourcePath" mode="scaleToFill" :style="cropImageStyle" />
          <view class="crop-grid"><view /><view /><view /><view /></view>
          <view class="crop-ring" />
        </view>
        <text class="crop-help">拖动图片调整位置，滑动缩放</text>
        <slider class="crop-slider" min="1" max="3" step="0.05" :value="crop.scale" :activeColor="themes[themeIndex].accent" @changing="changeCropScale" @change="changeCropScale" />
        <view class="crop-actions">
          <button class="crop-reselect" @tap="reselectAvatar">重新选择</button>
          <button class="crop-confirm" :disabled="cropExporting" @tap="exportAvatarCrop">{{ cropExporting ? '处理中…' : '使用此裁剪' }}</button>
        </view>
      </view>
    </view>
    <canvas class="avatar-canvas" canvas-id="avatarCropCanvas" id="avatarCropCanvas" />
  </view>
</template>

<script setup>
import { computed, reactive, ref, watch } from 'vue'
import { onLoad,onShow } from '@dcloudio/uni-app'
import { logout } from '../../api/auth'
import { getCurrentUser, updateCurrentUser } from '../../api/user'
import { deleteAvatar,uploadAvatar } from '../../api/avatar'
import { bindWechat,getWechatBindingStatus,unbindWechat } from '../../api/wechatBinding'
import { getUsernameError, sanitizeUsername } from '../../utils/username'

const THEME_KEY='fit_note_theme_index'
const themes=[
  {accent:'#7775bd',accent2:'#a59bd2',pale:'#f1f0f9',pale2:'#faf9fd',glow:'119,117,189'},
  {accent:'#5f9fa5',accent2:'#8bbdaf',pale:'#edf6f5',pale2:'#f8fbfa',glow:'95,159,165'},
  {accent:'#bd8073',accent2:'#cda56f',pale:'#faf1ed',pale2:'#fdf9f5',glow:'189,128,115'}
]
const themeIndex=ref(0),loading=ref(false),saving=ref(false),loggingOut=ref(false),avatarUploading=ref(false),bindingWechat=ref(false),wechatBound=ref(false)
const pendingAvatarPath=ref(''),avatarLoadFailed=ref(false),cropExporting=ref(false)
const crop=reactive({visible:false,sourcePath:'',sourceWidth:1,sourceHeight:1,scale:1,x:0,y:0,dragging:false,startTouchX:0,startTouchY:0,startX:0,startY:0})
const form=reactive({displayName:'',accountCode:'',avatarUrl:'',timezone:'Asia/Shanghai'})
const errors=reactive({username:''})
const themeStyle=computed(()=>{const t=themes[themeIndex.value];return{'--accent':t.accent,'--accent-2':t.accent2,'--pale':t.pale,'--pale-2':t.pale2,'--glow-rgb':t.glow}})
const avatarInitial=computed(()=>Array.from(form.displayName||'F')[0]||'F')
const avatarDisplayUrl=computed(()=>pendingAvatarPath.value||form.avatarUrl)
const cropStageSize=computed(()=>Math.min(uni.upx2px(520),360))
const cropBaseSize=computed(()=>{const ratio=crop.sourceWidth/crop.sourceHeight,size=cropStageSize.value;return ratio>=1?{width:size*ratio,height:size}:{width:size,height:size/ratio}})
const cropImageStyle=computed(()=>({width:`${cropBaseSize.value.width*crop.scale}px`,height:`${cropBaseSize.value.height*crop.scale}px`,left:`${cropStageSize.value/2+crop.x}px`,top:`${cropStageSize.value/2+crop.y}px`}))
watch(avatarDisplayUrl,()=>{avatarLoadFailed.value=false})

function applyUser(user){
  form.displayName=user?.displayName||user?.username||''
  form.accountCode=user?.accountCode||''
  form.avatarUrl=user?.avatarUrl||''
  form.timezone=user?.timezone||'Asia/Shanghai'
}
function onUsernameInput(event){
  const original=event.detail.value,result=sanitizeUsername(original)
  form.displayName=result
  errors.username=original===result?'':'用户名仅支持数字、英文和汉字，最多 30 个字符'
  return result
}
async function load(){
  if(loading.value)return
  const value=Number(uni.getStorageSync(THEME_KEY));themeIndex.value=Number.isInteger(value)&&themes[value]?value:0
  loading.value=true
  try{applyUser(await getCurrentUser());
    // #ifdef MP-WEIXIN
    wechatBound.value=Boolean((await getWechatBindingStatus()).bound)
    // #endif
  }
  catch(error){uni.showToast({title:error?.message||'用户资料加载失败',icon:'none'})}
  finally{loading.value=false}
}
async function save(){
  errors.username=getUsernameError(form.displayName)
  if(errors.username)return
  if(!form.timezone.trim()){uni.showToast({title:'请输入时区',icon:'none'});return}
  if(saving.value)return
  saving.value=true
  try{
    const user=await updateCurrentUser({
      displayName:form.displayName,
      timezone:form.timezone.trim()
    })
    applyUser(user)
    uni.showToast({title:'资料已保存',icon:'success'})
  }catch(error){uni.showToast({title:error?.message||'资料保存失败',icon:'none'})}
  finally{saving.value=false}
}
function constrainCrop(){
  const width=cropBaseSize.value.width*crop.scale,height=cropBaseSize.value.height*crop.scale,size=cropStageSize.value
  const maxX=Math.max(0,(width-size)/2),maxY=Math.max(0,(height-size)/2)
  crop.x=Math.max(-maxX,Math.min(maxX,crop.x));crop.y=Math.max(-maxY,Math.min(maxY,crop.y))
}
function openAvatarCrop(path){
  if(!path)return
  uni.getImageInfo({src:path,success:info=>{
    if(!info.width||!info.height){uni.showToast({title:'无法读取该图片',icon:'none'});return}
    crop.sourcePath=info.path||path;crop.sourceWidth=info.width;crop.sourceHeight=info.height;crop.scale=1;crop.x=0;crop.y=0;crop.visible=true
  },fail:()=>uni.showToast({title:'图片读取失败，请重新选择',icon:'none'})})
}
function onChooseAvatar(event){openAvatarCrop(event?.detail?.avatarUrl)}
function chooseLocalAvatar(){if(avatarUploading.value)return;uni.chooseImage({count:1,sizeType:['original','compressed'],sourceType:['album','camera'],success:result=>openAvatarCrop(result.tempFilePaths?.[0])})}
function reselectAvatar(){crop.visible=false;setTimeout(chooseLocalAvatar,80)}
function closeCrop(){if(cropExporting.value)return;crop.visible=false}
function touchPoint(touch){return{x:Number(touch?.clientX??touch?.pageX??0),y:Number(touch?.clientY??touch?.pageY??0)}}
function startCropDrag(event){const touch=event.touches?.[0];if(!touch)return;const point=touchPoint(touch);crop.dragging=true;crop.startTouchX=point.x;crop.startTouchY=point.y;crop.startX=crop.x;crop.startY=crop.y}
function moveCropDrag(event){if(!crop.dragging)return;const touch=event.touches?.[0];if(!touch)return;const point=touchPoint(touch);crop.x=crop.startX+point.x-crop.startTouchX;crop.y=crop.startY+point.y-crop.startTouchY;constrainCrop()}
function endCropDrag(){crop.dragging=false}
function changeCropScale(event){crop.scale=Number(event.detail?.value)||1;constrainCrop()}
function canvasToAvatarFile(){return new Promise((resolve,reject)=>{
  const size=cropStageSize.value,displayWidth=cropBaseSize.value.width*crop.scale,displayHeight=cropBaseSize.value.height*crop.scale
  const left=(size-displayWidth)/2+crop.x,top=(size-displayHeight)/2+crop.y
  const sourceX=Math.max(0,-left/displayWidth*crop.sourceWidth),sourceY=Math.max(0,-top/displayHeight*crop.sourceHeight)
  const sourceSize=Math.min(crop.sourceWidth-sourceX,crop.sourceHeight-sourceY,size/displayWidth*crop.sourceWidth)
  const context=uni.createCanvasContext('avatarCropCanvas');context.setFillStyle('#ffffff');context.fillRect(0,0,512,512);context.drawImage(crop.sourcePath,sourceX,sourceY,sourceSize,sourceSize,0,0,512,512)
  context.draw(false,()=>setTimeout(()=>uni.canvasToTempFilePath({canvasId:'avatarCropCanvas',x:0,y:0,width:512,height:512,destWidth:512,destHeight:512,fileType:'jpg',quality:.86,success:result=>resolve(result.tempFilePath),fail:reject}),80))
})}
async function exportAvatarCrop(){if(cropExporting.value)return;cropExporting.value=true;try{pendingAvatarPath.value=await canvasToAvatarFile();crop.visible=false;uni.showToast({title:'裁剪完成，请确认上传',icon:'none'})}catch(_){uni.showToast({title:'裁剪失败，请重新选择',icon:'none'})}finally{cropExporting.value=false}}
function cancelAvatarDraft(){pendingAvatarPath.value=''}
async function confirmAvatarUpload(){if(!pendingAvatarPath.value||avatarUploading.value)return;const path=pendingAvatarPath.value;avatarUploading.value=true;try{const result=await uploadAvatar(path);form.avatarUrl=result.avatarUrl;pendingAvatarPath.value='';uni.showToast({title:'头像已保存',icon:'success'})}catch(error){pendingAvatarPath.value='';uni.showToast({title:error?.message||'头像上传失败，已恢复原头像',icon:'none'})}finally{avatarUploading.value=false}}
function removeAvatar(){if(avatarUploading.value)return;uni.showModal({title:'删除头像？',content:'删除后首页将显示用户名首字。',success:async result=>{if(!result.confirm)return;avatarUploading.value=true;try{await deleteAvatar();form.avatarUrl='';uni.showToast({title:'头像已删除',icon:'success'})}catch(error){uni.showToast({title:error?.message||'头像删除失败',icon:'none'})}finally{avatarUploading.value=false}}})}
function toggleWechatBinding(){if(bindingWechat.value)return;if(wechatBound.value){uni.showModal({title:'解除微信绑定？',content:'解除后将不能使用该微信快捷登录。',success:async result=>{if(!result.confirm)return;bindingWechat.value=true;try{await unbindWechat();wechatBound.value=false;uni.showToast({title:'已解除绑定',icon:'success'})}catch(error){uni.showToast({title:error?.message||'解除绑定失败',icon:'none'})}finally{bindingWechat.value=false}}});return}bindingWechat.value=true;bindWechat().then(()=>{wechatBound.value=true;uni.showToast({title:'微信绑定成功',icon:'success'})}).catch(error=>uni.showToast({title:error?.message||'微信绑定失败',icon:'none'})).finally(()=>{bindingWechat.value=false})}
function confirmLogout(){
  if(loggingOut.value)return
  uni.showModal({title:'确认退出登录？',content:'退出后需要重新登录才能访问训练数据。',success:async result=>{
    if(!result.confirm)return
    loggingOut.value=true
    try{await logout()}catch(_){/* logout 的 finally 已完成本地清理与跳转。 */}
    finally{loggingOut.value=false}
  }})
}
function goBack(){uni.navigateBack({fail:()=>uni.reLaunch({url:'/pages/home/home'})})}
onShow(load)
onLoad(options=>{if(options?.wechatAvatar==='1')setTimeout(()=>uni.showToast({title:'请点击“选择微信头像”',icon:'none'}),450)})
</script>

<style scoped>
page{background:#f4f4fa}.page{position:relative;min-height:100vh;overflow:hidden;color:#283044;background:linear-gradient(145deg,var(--pale),var(--pale-2))}.ambient{position:absolute;inset:0;overflow:hidden;pointer-events:none}.orb{position:absolute;border-radius:50%;background:rgba(var(--glow-rgb),.1)}.orb-one{width:520rpx;height:520rpx;left:-250rpx;top:-230rpx}.orb-two{width:430rpx;height:430rpx;right:-230rpx;bottom:-180rpx}.shell{position:relative;z-index:1;padding:calc(var(--status-bar-height) + 24rpx) 28rpx 50rpx}.topbar{display:grid;grid-template-columns:64rpx 1fr 64rpx;align-items:center;gap:18rpx}.back{width:64rpx;height:64rpx;margin:0;padding:0;border:0;border-radius:20rpx;color:var(--accent);background:rgba(255,255,255,.72);font-size:43rpx;line-height:58rpx}.back:after,.save:after,.logout:after{border:0}.pressed{opacity:.8;transform:scale(.98)}.kicker,.title{display:block}.kicker{color:var(--accent);font-size:16rpx;font-weight:750;letter-spacing:3rpx}.title{font-size:31rpx;font-weight:760}.theme-mark{justify-self:end;width:22rpx;height:22rpx;border:6rpx solid rgba(255,255,255,.8);border-radius:50%;background:var(--accent)}.profile-card,.account-card{margin-top:28rpx;padding:29rpx;border:1rpx solid rgba(255,255,255,.9);border-radius:32rpx;background:rgba(255,255,255,.8);box-shadow:0 20rpx 50rpx rgba(53,61,92,.08)}.identity{display:flex;align-items:center;gap:20rpx;padding-bottom:24rpx;border-bottom:1rpx solid rgba(var(--glow-rgb),.13)}.avatar{width:96rpx;height:96rpx;display:grid;place-items:center;overflow:hidden;border:5rpx solid #fff;border-radius:50%;color:#fff;background:linear-gradient(135deg,var(--accent),var(--accent-2));font-size:32rpx;font-weight:750}.avatar image{width:100%;height:100%}.identity-name,.identity-note{display:block}.identity-name{font-size:29rpx;font-weight:750}.identity-note{margin-top:6rpx;color:#969caa;font-size:17rpx}.state{padding:70rpx 0;color:#969caa;text-align:center}.form{display:grid;gap:22rpx;margin-top:25rpx}.field>text{display:block;margin:0 0 10rpx 5rpx;color:#737b8f;font-size:18rpx;font-weight:650}.field input{height:82rpx;padding:0 22rpx;border:2rpx solid rgba(var(--glow-rgb),.16);border-radius:21rpx;background:#fff;font-size:21rpx}.field .error{margin-top:8rpx;color:#d56369;font-size:16rpx}.save,.logout{height:76rpx;border:0;border-radius:22rpx;font-size:21rpx;font-weight:720}.save{margin-top:5rpx;color:#fff;background:linear-gradient(100deg,var(--accent),var(--accent-2));box-shadow:0 13rpx 29rpx rgba(var(--glow-rgb),.2)}.save[disabled],.logout[disabled]{opacity:.55}.account-title,.account-note{display:block}.account-title{font-size:25rpx;font-weight:750}.account-note{margin-top:7rpx;color:#969caa;font-size:17rpx}.logout{margin-top:22rpx;color:#b35f68;background:#fff1f1}.logout:after{border:0}@media(min-width:900px){.shell{width:min(720px,calc(100% - 60px));margin:auto;padding-top:32px}.profile-card,.account-card{padding:28px;border-radius:25px}.field input{height:52px;font-size:14px}.save,.logout{height:52px;font-size:14px}}
.avatar-actions{display:flex;gap:14rpx}.avatar-button,.avatar-remove{height:68rpx;margin:0;padding:0 22rpx;border:0;border-radius:18rpx;font-size:18rpx;line-height:68rpx}.avatar-button{color:#fff;background:var(--accent)}.avatar-remove{color:#b35f68;background:#fff1f1}.avatar-button:after,.avatar-remove:after{border:0}.avatar-note{margin-top:9rpx!important;color:#9aa0ad!important;font-size:15rpx!important;font-weight:400!important}
.wechat-binding{display:flex;align-items:center;justify-content:space-between;gap:18rpx;margin:20rpx 0;padding:18rpx 0;border-top:1rpx solid rgba(var(--glow-rgb),.12);border-bottom:1rpx solid rgba(var(--glow-rgb),.12)}.binding-title{display:block;font-size:20rpx;font-weight:700}.binding-button{height:62rpx;margin:0;padding:0 20rpx;border:0;border-radius:18rpx;color:var(--accent);background:var(--pale);font-size:17rpx;line-height:62rpx}.binding-button:after{border:0}
.avatar{position:relative}.avatar-editable{box-shadow:0 8rpx 22rpx rgba(var(--glow-rgb),.22)}.avatar-hit{position:absolute;z-index:3;inset:0;width:100%;height:100%;margin:0;padding:0;border:0;border-radius:50%;opacity:0}.avatar-hit:after{border:0}.avatar-edit-mark{position:absolute;z-index:2;right:0;bottom:0;width:31rpx;height:31rpx;display:grid;place-items:center;border:3rpx solid #fff;border-radius:50%;color:#fff;background:var(--accent);font-size:14rpx}.avatar-pending{margin-top:14rpx;padding:17rpx;border:1rpx solid rgba(var(--glow-rgb),.18);border-radius:19rpx;background:var(--pale-2)}.avatar-pending>text{display:block;color:#596174;font-size:17rpx}.pending-actions{display:flex;gap:12rpx;margin-top:13rpx}.pending-confirm,.pending-cancel{height:61rpx;margin:0;padding:0 22rpx;border:0;border-radius:16rpx;font-size:17rpx;line-height:61rpx}.pending-confirm{color:#fff;background:var(--accent)}.pending-cancel{color:#72798a;background:#fff}.pending-confirm:after,.pending-cancel:after{border:0}
.crop-modal{position:fixed;z-index:80;inset:0;display:flex;align-items:flex-end;justify-content:center}.crop-mask{position:absolute;inset:0;background:rgba(28,31,43,.62);backdrop-filter:blur(8rpx)}.crop-sheet{position:relative;width:100%;box-sizing:border-box;padding:28rpx 28rpx calc(30rpx + env(safe-area-inset-bottom));border-radius:34rpx 34rpx 0 0;background:#fdfdff;box-shadow:0 -18rpx 60rpx rgba(23,27,45,.18)}.crop-head{display:flex;align-items:center;justify-content:space-between;margin-bottom:23rpx}.crop-head>text{font-size:28rpx;font-weight:760}.crop-head button{height:55rpx;margin:0;padding:0 18rpx;border:0;color:#7f8695;background:transparent;font-size:18rpx;line-height:55rpx}.crop-head button:after{border:0}.crop-stage{position:relative;margin:auto;overflow:hidden;border-radius:28rpx;background:#171923;touch-action:none}.crop-image{position:absolute;transform:translate(-50%,-50%);will-change:left,top,width,height}.crop-grid{position:absolute;inset:0;display:grid;grid-template-columns:1fr 1fr;grid-template-rows:1fr 1fr;pointer-events:none}.crop-grid view{border-right:1rpx solid rgba(255,255,255,.26);border-bottom:1rpx solid rgba(255,255,255,.26)}.crop-ring{position:absolute;inset:13rpx;border:2rpx solid rgba(255,255,255,.85);border-radius:50%;box-shadow:0 0 0 80rpx rgba(16,18,27,.2);pointer-events:none}.crop-help{display:block;margin-top:19rpx;color:#8a90a0;font-size:17rpx;text-align:center}.crop-slider{margin:13rpx 10rpx}.crop-actions{display:grid;grid-template-columns:1fr 1.5fr;gap:14rpx;margin-top:8rpx}.crop-reselect,.crop-confirm{height:74rpx;margin:0;border:0;border-radius:20rpx;font-size:19rpx;font-weight:700;line-height:74rpx}.crop-reselect{color:var(--accent);background:var(--pale)}.crop-confirm{color:#fff;background:linear-gradient(100deg,var(--accent),var(--accent-2))}.crop-reselect:after,.crop-confirm:after{border:0}.avatar-canvas{position:fixed;left:-10000px;top:0;width:512px;height:512px;pointer-events:none}@media(min-width:900px){.crop-modal{align-items:center}.crop-sheet{width:520px;padding:24px;border-radius:24px}.crop-actions{margin:10px auto 0;max-width:360px}}
</style>
