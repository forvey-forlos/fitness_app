<template>
  <view class="page" :style="themeStyle">
    <view class="theme-hitarea" @tap="switchTheme" />
    <view v-if="themeChanging" :key="transitionKey" class="theme-wave" :style="transitionStyle" />
    <view class="music-bg">
      <view class="dot-halo" />
      <view class="sound-ring ring-one" /><view class="sound-ring ring-two" /><view class="sound-ring ring-three" />
      <view class="scan-wave wave-one" /><view class="scan-wave wave-two" />
      <view class="spectrum spectrum-top"><view v-for="bar in frequencyBars" :key="`t${bar.id}`" class="frequency" :style="bar.style" /></view>
      <view class="spectrum spectrum-bottom"><view v-for="bar in frequencyBars" :key="`b${bar.id}`" class="frequency" :style="bar.style" /></view>
      <view class="music-caption"><text class="caption-dot" /><text>点击空白处 · 切换主题</text></view>
    </view>

    <view class="mobile-hero">
      <view class="mobile-ring" /><view class="mobile-orb" />
      <view class="brand"><view class="brand-mark" /><text>FIT NOTE</text></view>
    </view>
    <view class="back" @tap.stop="goBack"><text>‹</text><text class="back-label">返回登录</text></view>

    <view class="panel">
      <text class="eyebrow">CREATE ACCOUNT</text>
      <text class="title">开始你的训练旅程</text>
      <text class="subtitle">创建账户，记录每一次突破</text>

      <view class="form-item">
        <text class="label">昵称</text>
        <view class="input-box" :class="{ focused: focusField==='username', invalid: errors.username }">
          <text class="input-icon">○</text>
          <input v-model="username" class="input" maxlength="-1" placeholder="请输入昵称" placeholder-class="placeholder" @focus="focusField='username'" @blur="validateUsername" @input="onUsernameInput" />
          <text v-if="username" class="clear" @tap="username=''">×</text>
        </view>
        <text class="hint" :class="{ error: errors.username }">{{ errors.username || '昵称可以重复，注册后可自由修改' }}</text>
      </view>

      <view class="form-item">
        <text class="label">密码</text>
        <view class="input-box" :class="{ focused: focusField==='password', invalid: errors.password }">
          <text class="input-icon lock">▢</text>
          <input v-model="password" class="input" :password="!showPassword" maxlength="16" placeholder="请输入密码" placeholder-class="placeholder" @focus="focusField='password'" @blur="validatePassword" />
          <text class="eye" @tap="showPassword=!showPassword">{{ showPassword ? '隐藏' : '显示' }}</text>
        </view>
        <view class="hint-row">
          <text class="hint" :class="{ error: errors.password }">{{ errors.password || '8–16 位，至少包含数字、大小写字母、特殊字符中的两种' }}</text>
          <view v-if="password && !errors.password" class="strength"><i v-for="i in 4" :key="i" :class="{ active:i<=passwordTypes }" /></view>
        </view>
      </view>

      <view class="form-item last">
        <text class="label">确认密码</text>
        <view class="input-box" :class="{ focused: focusField==='confirm', invalid: errors.confirm }">
          <text class="input-icon lock">▢</text>
          <input v-model="confirmPassword" class="input" :password="!showConfirm" maxlength="16" placeholder="请再次输入密码" placeholder-class="placeholder" @focus="focusField='confirm'" @blur="validateConfirm" />
          <text class="eye" @tap="showConfirm=!showConfirm">{{ showConfirm ? '隐藏' : '显示' }}</text>
        </view>
        <text class="hint" :class="{ error: errors.confirm, success: confirmPassword && !errors.confirm }">{{ errors.confirm || (confirmPassword ? '两次密码输入一致' : '请再次输入密码，确保两次输入一致') }}</text>
      </view>

      <button class="register-button" :disabled="loading" hover-class="button-pressed" @tap="submit">
        <view v-if="loading" class="spinner" /><text v-else>创 建 账 户</text>
      </button>
      <view class="login-tip"><text>已有账户？</text><text class="login-link" @tap="goBack">返回登录</text></view>
    </view>
  </view>
</template>

<script setup>
import { computed, reactive, ref } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import { register } from '../../api/auth'
import { getUsernameError, sanitizeUsername } from '../../utils/username'

const THEME_STORAGE_KEY='fit_note_theme_index'

const username=ref(''),password=ref(''),confirmPassword=ref('')
const showPassword=ref(false),showConfirm=ref(false),loading=ref(false),focusField=ref('')
const errors=reactive({username:'',password:'',confirm:''})
const themes=[
  {accent:'#6658ec',accent2:'#a55eea',bgA:'#111126',bgB:'#211b4b',glow:'102,88,236'},
  {accent:'#16b8c8',accent2:'#42e3b4',bgA:'#071b25',bgB:'#0c3a45',glow:'22,184,200'},
  {accent:'#ff6f59',accent2:'#ffb44a',bgA:'#241016',bgB:'#4b211d',glow:'255,111,89'}
]
const savedThemeIndex=Number(uni.getStorageSync(THEME_STORAGE_KEY))
const initialThemeIndex=Number.isInteger(savedThemeIndex)&&savedThemeIndex>=0&&savedThemeIndex<themes.length?savedThemeIndex:0
const themeIndex=ref(initialThemeIndex),uiThemeIndex=ref(initialThemeIndex),pendingTheme=ref(themes[initialThemeIndex]),themeChanging=ref(false),transitionKey=ref(0)
const frequencyBars=Array.from({length:30},(_,i)=>({id:i,style:{'--height':`${18+((i*19+i*i*7)%74)}px`,'--duration':`${.72+(i%7)*.11}s`,'--delay':`${-(i%11)*.09}s`}}))
const themeStyle=computed(()=>{const bg=themes[themeIndex.value],ui=themes[uiThemeIndex.value];return{'--accent':ui.accent,'--accent-2':ui.accent2,'--bg-a':bg.bgA,'--bg-b':bg.bgB,'--glow-rgb':ui.glow}})
const transitionStyle=computed(()=>({'--next-a':pendingTheme.value.bgA,'--next-b':pendingTheme.value.bgB}))
const passwordTypes=computed(()=>[/[0-9]/,/[A-Z]/,/[a-z]/,/[^A-Za-z0-9]/].filter(rule=>rule.test(password.value)).length)

function onUsernameInput(event){const original=event.detail.value;const result=sanitizeUsername(original);username.value=result;errors.username=original===result?'':'仅支持数字、英文和汉字，最多 30 个字符';return result}
function validateUsername(){focusField.value='';errors.username=getUsernameError(username.value);return !errors.username}
function validatePassword(){focusField.value='';if(!password.value)errors.password='请输入密码';else if(!/^[\x21-\x7E]{8,16}$/.test(password.value))errors.password='密码须为 8–16 位数字、字母或特殊字符';else if(passwordTypes.value<2)errors.password='密码至少需要包含两种字符类型';else errors.password='';if(confirmPassword.value)validateConfirm();return !errors.password}
function validateConfirm(){focusField.value='';if(!confirmPassword.value)errors.confirm='请再次输入密码';else if(confirmPassword.value!==password.value)errors.confirm='两次输入的密码不一致';else errors.confirm='';return !errors.confirm}
function switchTheme(){if(themeChanging.value)return;const next=(themeIndex.value+1)%themes.length;pendingTheme.value=themes[next];uiThemeIndex.value=next;uni.setStorageSync(THEME_STORAGE_KEY,next);transitionKey.value++;themeChanging.value=true;setTimeout(()=>{themeIndex.value=next;themeChanging.value=false},820)}
function syncStoredTheme(){const stored=Number(uni.getStorageSync(THEME_STORAGE_KEY));if(!Number.isInteger(stored)||stored<0||stored>=themes.length||stored===themeIndex.value)return;themeChanging.value=false;themeIndex.value=stored;uiThemeIndex.value=stored;pendingTheme.value=themes[stored]}
onShow(syncStoredTheme)
function goBack(){uni.navigateBack({fail:()=>uni.redirectTo({url:'/pages/login/login'})})}
async function submit(){
  if(!validateUsername()||!validatePassword()||!validateConfirm())return
  loading.value=true
  try{
    const result=await register({displayName:username.value,password:password.value})
    const accountCode=result?.user?.accountCode
    if(!accountCode)throw new Error('注册响应缺少登录账号')
    uni.setStorageSync('fit_note_pending_account_code',accountCode)
    password.value=''
    confirmPassword.value=''
    uni.showModal({title:'账户创建成功',content:`你的登录账号是 ${accountCode}\n请妥善保存，登录时需使用该账号。`,showCancel:false,confirmText:'复制并登录',success:()=>uni.setClipboardData({data:accountCode,complete:()=>uni.reLaunch({url:'/pages/login/login'})})})
  }catch(error){
    uni.showToast({title:error.message||'注册失败，请稍后重试',icon:'none'})
  }finally{loading.value=false}
}
</script>

<style scoped>
@property --accent{syntax:'<color>';inherits:true;initial-value:#6658ec}
@property --accent-2{syntax:'<color>';inherits:true;initial-value:#a55eea}
page{background:#f7f8fc}.page{position:relative;transition:--accent .82s cubic-bezier(.3,.7,.15,1),--accent-2 .82s cubic-bezier(.3,.7,.15,1);min-height:100vh;color:#182038;background:#f7f8fc}.mobile-hero{position:relative;height:355rpx;overflow:hidden;background:linear-gradient(145deg,#eef0ff,#fff3ec)}.mobile-ring{position:absolute;width:390rpx;height:390rpx;left:-190rpx;top:-170rpx;border:66rpx solid rgba(var(--glow-rgb),.14);border-radius:50%}.mobile-orb{position:absolute;width:280rpx;height:280rpx;right:-50rpx;top:80rpx;border-radius:50%;background:var(--accent);box-shadow:0 0 80rpx rgba(var(--glow-rgb),.22)}.brand{position:absolute;left:52rpx;top:95rpx;display:flex;align-items:center;gap:18rpx;color:#3c4561;font-size:25rpx;font-weight:700;letter-spacing:4rpx}.brand-mark{width:43rpx;height:43rpx;border-radius:70% 30% 70% 30%;background:linear-gradient(135deg,var(--accent) 50%,var(--accent-2) 50%);transform:rotate(-12deg)}.back{position:absolute;z-index:5;left:34rpx;top:calc(var(--status-bar-height) + 20rpx);display:flex;align-items:center;gap:8rpx;color:#525a70;font-size:25rpx}.back>text:first-child{font-size:48rpx;line-height:1}.panel{position:relative;z-index:3;margin-top:-48rpx;min-height:calc(100vh - 307rpx);padding:48rpx 48rpx 34rpx;border-radius:58rpx 58rpx 0 0;background:#fff}.eyebrow,.title,.subtitle,.label,.hint{display:block}.eyebrow{color:var(--accent);font-size:21rpx;font-weight:700;letter-spacing:5rpx}.title{margin-top:11rpx;font-size:48rpx;font-weight:750}.subtitle{margin:12rpx 0 30rpx;color:#7b8498;font-size:25rpx}.form-item{margin-bottom:22rpx}.form-item.last{margin-bottom:8rpx}.label{margin:0 0 11rpx 6rpx;color:var(--accent);transition:color .82s ease;font-size:24rpx;font-weight:600}.input-box{height:92rpx;display:flex;align-items:center;gap:18rpx;padding:0 26rpx;border:3rpx solid #e7e9f1;border-radius:26rpx;background:#fafbfe}.input-box.focused{border-color:var(--accent);background:#fff;box-shadow:0 0 0 7rpx rgba(var(--glow-rgb),.09)}.input-box.invalid{border-color:#e7505a}.input-icon{width:32rpx;color:#9299aa;font-size:34rpx;text-align:center}.lock{font-size:27rpx}.input{flex:1;height:100%;color:#182038;font-size:27rpx}.placeholder{color:#b4b9c7}.clear{padding:10rpx;color:#8d95a8;font-size:34rpx}.eye{padding:10rpx;color:var(--accent);transition:color .82s ease;font-size:22rpx}.hint{min-height:30rpx;margin:8rpx 6rpx 0;color:var(--accent);opacity:.68;transition:color .82s ease;font-size:20rpx;line-height:30rpx}.hint.error{color:#e7505a;opacity:1}.hint.success{color:#1aa978;opacity:1}.hint-row{display:flex;align-items:flex-start;justify-content:space-between;gap:10rpx}.hint-row .hint{flex:1}.strength{display:flex;gap:5rpx;margin-top:18rpx}.strength i{width:22rpx;height:6rpx;border-radius:6rpx;background:#e2e5ec}.strength i.active{background:var(--accent)}.register-button{height:98rpx;margin-top:28rpx;border:0;border-radius:28rpx;color:#fff;background:linear-gradient(100deg,var(--accent),var(--accent-2));box-shadow:0 22rpx 42rpx rgba(var(--glow-rgb),.25);font-size:28rpx;font-weight:700;letter-spacing:5rpx}.register-button:after{border:0}.button-pressed{transform:scale(.985);opacity:.92}.spinner{width:34rpx;height:34rpx;margin:auto;border:4rpx solid rgba(255,255,255,.4);border-top-color:#fff;border-radius:50%;animation:spin .7s linear infinite}.login-tip{display:flex;justify-content:center;gap:10rpx;margin-top:24rpx;color:#9399a8;font-size:22rpx}.login-link{color:var(--accent);font-weight:600}.eyebrow,.label{display:inline-block;width:max-content;color:var(--accent);background-image:linear-gradient(100deg,var(--accent),var(--accent-2));background-clip:text;-webkit-background-clip:text;-webkit-text-fill-color:transparent;transition:color .82s ease,background-image .82s ease}.music-bg,.theme-wave,.theme-hitarea{display:none}@keyframes spin{to{transform:rotate(360deg)}}
@media(min-width:900px){
  .page{display:flex;align-items:center;justify-content:center;overflow:hidden;padding:44px;background:radial-gradient(circle at 50% 48%,var(--bg-b),var(--bg-a) 68%)}.mobile-hero{position:absolute;inset:0;height:auto;background:transparent}.mobile-ring,.mobile-orb{display:none}.brand{left:56px;top:42px;color:rgba(255,255,255,.78)}.back{left:55px;top:78px;color:rgba(255,255,255,.75);cursor:pointer}.back>text:first-child{font-size:30px}.back-label{font-size:12px}
  .eyebrow,.login-link,.register-button{transition:color .82s ease,background-color .82s ease,box-shadow .82s ease}.input-box{transition:border-color .42s ease,box-shadow .42s ease,background-color .22s ease}.strength i{transition:background-color .82s ease}.panel{transition:box-shadow .82s ease}
  .panel{z-index:4;width:548px;min-height:0;margin:0;padding:38px 48px 30px;border:1px solid rgba(255,255,255,.66);border-radius:38px;background:rgba(255,255,255,.93);box-shadow:0 34px 100px rgba(0,0,0,.3),0 0 70px rgba(var(--glow-rgb),.24);backdrop-filter:blur(26px)}.eyebrow{font-size:11px;letter-spacing:3px}.title{font-size:31px}.subtitle{margin:7px 0 22px;font-size:13px}.form-item{margin-bottom:13px}.label{margin-bottom:7px;font-size:12px}.input-box{height:50px;padding:0 15px;border-width:1.5px;border-radius:14px;gap:10px}.input{font-size:14px}.input-icon{width:19px;font-size:18px}.clear{font-size:19px}.eye{font-size:11px}.hint{min-height:17px;margin:5px 3px 0;font-size:10.5px;line-height:16px}.strength{gap:4px;margin-top:10px}.strength i{width:16px;height:4px}.register-button{height:52px;margin-top:19px;border-radius:15px;font-size:14px;letter-spacing:4px;box-shadow:0 12px 25px rgba(var(--glow-rgb),.26)}.login-tip{gap:6px;margin-top:14px;font-size:11px}
  .theme-hitarea{display:block;position:absolute;inset:0;z-index:2}.music-bg{display:block;position:absolute;inset:0;z-index:1;overflow:hidden;pointer-events:none}.theme-wave{display:block;position:fixed;z-index:2;inset:0;background:radial-gradient(circle at 50% 50%,var(--next-b),var(--next-a) 68%);clip-path:circle(0 at 50% 50%);will-change:clip-path;animation:themeExpand .82s cubic-bezier(.3,.7,.15,1) forwards;pointer-events:none}@keyframes themeExpand{to{clip-path:circle(75vmax at 50% 50%)}}
  .dot-halo{position:absolute;left:50%;top:50%;width:780px;height:780px;transform:translate(-50%,-50%);opacity:.5;background-image:radial-gradient(circle,rgba(var(--glow-rgb),.72) 1.4px,transparent 1.8px);background-size:18px 18px;mask-image:radial-gradient(circle,transparent 0 32%,#000 48%,transparent 72%);animation:haloBreath 3.8s ease-in-out infinite}@keyframes haloBreath{50%{opacity:.8;transform:translate(-50%,-50%) scale(1.06)}}
  .sound-ring{position:absolute;left:50%;top:50%;border:1px solid rgba(var(--glow-rgb),.3);border-radius:50%;transform:translate(-50%,-50%);animation:ringPulse 3s ease-out infinite}.ring-one{width:620px;height:620px}.ring-two{width:710px;height:710px;animation-delay:-1s}.ring-three{width:810px;height:810px;animation-delay:-2s}@keyframes ringPulse{0%{opacity:.1;transform:translate(-50%,-50%) scale(.9)}55%{opacity:.5}100%{opacity:0;transform:translate(-50%,-50%) scale(1.12)}}
  .scan-wave{position:absolute;left:-10%;width:120%;height:170px;border-top:2px solid rgba(var(--glow-rgb),.42);border-radius:50%;filter:drop-shadow(0 0 10px rgba(var(--glow-rgb),.7));animation:waveScan 5s ease-in-out infinite}.wave-one{top:24%;transform:rotate(-5deg)}.wave-two{bottom:10%;transform:rotate(7deg);animation-delay:-2.4s}@keyframes waveScan{0%,100%{opacity:.18;scale:1 .75}50%{opacity:.7;scale:1 1.15}}
  .spectrum{position:absolute;left:3%;right:3%;height:110px;display:flex;align-items:flex-end;justify-content:space-between;gap:7px;opacity:.58}.spectrum-top{top:8%;transform:rotate(180deg)}.spectrum-bottom{bottom:1%}.frequency{flex:1;max-width:12px;height:var(--height);border-radius:8px;background:linear-gradient(to top,transparent,rgba(var(--glow-rgb),.35),var(--accent-2));transform-origin:bottom;will-change:transform;animation:frequency var(--duration) ease-in-out var(--delay) infinite alternate}@keyframes frequency{from{transform:scaleY(.18);opacity:.34}to{transform:scaleY(1);opacity:.92}}.music-caption{position:absolute;right:55px;top:47px;display:flex;align-items:center;gap:9px;color:rgba(255,255,255,.55);font-size:10px;letter-spacing:3px}.caption-dot{width:7px;height:7px;border-radius:50%;background:var(--accent-2);box-shadow:0 0 12px var(--accent-2);animation:beat .75s ease-in-out infinite alternate}@keyframes beat{to{transform:scale(1.8);opacity:.45}}
}</style>
