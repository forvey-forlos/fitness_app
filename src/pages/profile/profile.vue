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
          <view class="avatar">
            <image v-if="form.avatarUrl" :src="form.avatarUrl" mode="aspectFill" />
            <text v-else>{{ avatarInitial }}</text>
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
              <button class="avatar-button" open-type="chooseAvatar" @chooseavatar="onChooseAvatar">选择微信头像</button>
              <!-- #endif -->
              <!-- #ifndef MP-WEIXIN -->
              <button class="avatar-button" @tap="chooseLocalAvatar">上传头像</button>
              <!-- #endif -->
              <button v-if="form.avatarUrl" class="avatar-remove" @tap="removeAvatar">删除头像</button>
            </view>
            <text class="avatar-note">支持 JPG、PNG、WebP，最大 2 MB</text>
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
  </view>
</template>

<script setup>
import { computed, reactive, ref } from 'vue'
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
const form=reactive({displayName:'',accountCode:'',avatarUrl:'',timezone:'Asia/Shanghai'})
const errors=reactive({username:''})
const themeStyle=computed(()=>{const t=themes[themeIndex.value];return{'--accent':t.accent,'--accent-2':t.accent2,'--pale':t.pale,'--pale-2':t.pale2,'--glow-rgb':t.glow}})
const avatarInitial=computed(()=>Array.from(form.displayName||'F')[0]||'F')

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
async function uploadSelectedAvatar(path){if(!path||avatarUploading.value)return;avatarUploading.value=true;try{const result=await uploadAvatar(path);form.avatarUrl=result.avatarUrl;uni.showToast({title:'头像已保存',icon:'success'})}catch(error){uni.showToast({title:error?.message||'头像上传失败',icon:'none'})}finally{avatarUploading.value=false}}
function onChooseAvatar(event){uploadSelectedAvatar(event?.detail?.avatarUrl)}
function chooseLocalAvatar(){uni.chooseImage({count:1,sizeType:['compressed'],success:result=>uploadSelectedAvatar(result.tempFilePaths?.[0])})}
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
</style>
