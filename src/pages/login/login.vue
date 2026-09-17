<template>
  <view class="page" :style="themeStyle">
    <view class="theme-hitarea" @tap="switchTheme" />
    <view v-if="themeChanging" :key="transitionKey" class="theme-wave" :style="transitionStyle" aria-hidden="true" />
    <view class="music-bg" aria-hidden="true">
      <view class="dot-halo" />
      <view class="sound-ring ring-one" /><view class="sound-ring ring-two" /><view class="sound-ring ring-three" />
      <view class="scan-wave wave-one" /><view class="scan-wave wave-two" />
      <view class="spectrum spectrum-top"><view v-for="bar in frequencyBars" :key="`top-${bar.id}`" class="frequency" :style="bar.style" /></view>
      <view class="spectrum spectrum-bottom"><view v-for="bar in frequencyBars" :key="`bottom-${bar.id}`" class="frequency" :style="bar.style" /></view>
      <view class="music-caption"><text class="caption-dot" /> <text>MOVE · RECORD · REPEAT</text></view>
    </view>
    <view class="hero">
      <view class="glow glow-left" />
      <view class="glow glow-right" />
      <view class="brand"><view class="brand-mark" /><text>FIT NOTE</text></view>
      <view class="figure">
        <view class="head" /><view class="body" /><view class="arm arm-left" /><view class="arm arm-right" />
      </view>
    </view>

    <view class="panel">
      <text class="eyebrow">WELCOME BACK</text>
      <text class="title">欢迎回来</text>
      <text class="subtitle">登录后继续记录每一次进步</text>

      <view class="form-item">
        <text class="label">用户名</text>
        <view class="input-box" :class="{ focused: focusField === 'username', invalid: errors.username }">
          <text class="input-icon">○</text>
          <input v-model="username" class="input" maxlength="15" placeholder="请输入中文或英文用户名" placeholder-class="placeholder" autocomplete="username" @focus="focusField='username'" @blur="validateUsername" @input="onUsernameInput" />
          <text v-if="username" class="clear" @tap="username=''">×</text>
        </view>
        <text v-if="errors.username" class="error">{{ errors.username }}</text>
      </view>

      <view class="form-item">
        <text class="label">密码</text>
        <view class="input-box" :class="{ focused: focusField === 'password', invalid: errors.password }">
          <text class="input-icon lock">▢</text>
          <input v-model="password" class="input" :password="!showPassword" maxlength="16" placeholder="8–16 位，至少包含两种字符" placeholder-class="placeholder" autocomplete="current-password" @focus="focusField='password'" @blur="validatePassword" />
          <text class="eye" @tap="showPassword=!showPassword">{{ showPassword ? '隐藏' : '显示' }}</text>
        </view>
        <text v-if="errors.password" class="error">{{ errors.password }}</text>
        <view v-else-if="password" class="strength-row">
          <view v-for="i in 4" :key="i" class="strength-bar" :class="{ active: i <= passwordTypes }" />
          <text>{{ strengthText }}</text>
        </view>
      </view>

      <view class="option-row">
        <view class="remember" @tap="remember=!remember"><view class="checkbox" :class="{ checked: remember }"><text v-if="remember">✓</text></view><text>记住账户</text></view>
        <view class="account-actions">
          <text class="forgot" @tap="forgotPassword">忘记密码？</text>
          <view class="action-divider" />
          <!-- #ifdef H5 -->
          <text class="register" @click.stop="openRegister">注册账户</text>
          <!-- #endif -->
          <!-- #ifndef H5 -->
          <navigator class="register" url="/pages/register/register" open-type="navigate" hover-class="register-pressed">注册账户</navigator>
          <!-- #endif -->
        </view>
      </view>

      <view class="agreement" @tap="agreed=!agreed">
        <view class="checkbox small" :class="{ checked: agreed }"><text v-if="agreed">✓</text></view>
        <text>我已阅读并同意</text><text class="agreement-link" @tap.stop="showAgreement('用户协议')">《用户协议》</text><text>和</text><text class="agreement-link" @tap.stop="showAgreement('隐私政策')">《隐私政策》</text>
      </view>
      <text v-if="errors.agreement" class="agreement-error">{{ errors.agreement }}</text>

      <button class="login-button" :class="{ loading }" :disabled="loading" hover-class="button-pressed" @tap="submit">
        <view v-if="loading" class="spinner" /><text v-else>登 录</text>
      </button>
      <view class="safe-tip"><text class="shield">◇</text><text>你的账户信息将被安全保存</text></view>
    </view>
  </view>
</template>

<script setup>
import { computed, reactive, ref, onMounted } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import { ACCESS_TOKEN_KEY, clearSession, getCurrentUser, login, saveSession } from '../../api/auth'

const STORAGE_KEY = 'fit_note_remembered_login'
const THEME_STORAGE_KEY = 'fit_note_theme_index'
const username = ref('')
const password = ref('')
const remember = ref(false)
const agreed = ref(false)
const showPassword = ref(false)
const loading = ref(false)
const focusField = ref('')
const errors = reactive({ username: '', password: '', agreement: '' })
const themes = [
  { accent: '#6658ec', accent2: '#a55eea', bgA: '#111126', bgB: '#211b4b', glow: '102,88,236' },
  { accent: '#16b8c8', accent2: '#42e3b4', bgA: '#071b25', bgB: '#0c3a45', glow: '22,184,200' },
  { accent: '#ff6f59', accent2: '#ffb44a', bgA: '#241016', bgB: '#4b211d', glow: '255,111,89' }
]
const savedThemeIndex = Number(uni.getStorageSync(THEME_STORAGE_KEY))
const initialThemeIndex = Number.isInteger(savedThemeIndex) && savedThemeIndex >= 0 && savedThemeIndex < themes.length ? savedThemeIndex : 0
const themeIndex = ref(initialThemeIndex)
const uiThemeIndex = ref(initialThemeIndex)
const pendingTheme = ref(themes[initialThemeIndex])
const themeChanging = ref(false)
const transitionKey = ref(0)
const frequencyBars = Array.from({ length: 30 }, (_, index) => ({
  id: index,
  style: {
    '--height': `${18 + ((index * 19 + index * index * 7) % 74)}px`,
    '--duration': `${0.72 + (index % 7) * 0.11}s`,
    '--delay': `${-(index % 11) * 0.09}s`
  }
}))
const themeStyle = computed(() => {
  const backgroundTheme = themes[themeIndex.value]
  const uiTheme = themes[uiThemeIndex.value]
  return { '--accent': uiTheme.accent, '--accent-2': uiTheme.accent2, '--bg-a': backgroundTheme.bgA, '--bg-b': backgroundTheme.bgB, '--glow-rgb': uiTheme.glow }
})
const transitionStyle = computed(() => ({ '--next-a': pendingTheme.value.bgA, '--next-b': pendingTheme.value.bgB }))

const byteLength = (value) => {
  try { return encodeURIComponent(value).replace(/%[0-9A-F]{2}|./g, 'x').length } catch (_) { return value.length }
}
const usernameBytes = computed(() => byteLength(username.value))
const passwordTypes = computed(() => [/[0-9]/, /[A-Z]/, /[a-z]/, /[^A-Za-z0-9]/].filter(rule => rule.test(password.value)).length)
const strengthText = computed(() => passwordTypes.value >= 4 ? '强' : passwordTypes.value >= 3 ? '良好' : '一般')

function onUsernameInput(event) {
  const original = event.detail.value
  const filtered = Array.from(original).filter(char => /[A-Za-z\u3400-\u9FFF]/.test(char))
  let result = ''
  for (const char of filtered) {
    if (byteLength(result + char) > 15) break
    result += char
  }
  username.value = result
  errors.username = original !== result ? '仅支持中英文，且不超过 15 字节' : ''
  return result
}

function validateUsername() {
  focusField.value = ''
  if (!username.value) errors.username = '请输入用户名'
  else if (!/^[A-Za-z\u3400-\u9FFF]+$/.test(username.value)) errors.username = '用户名仅支持中文和英文'
  else if (usernameBytes.value > 15) errors.username = '用户名不能超过 15 字节'
  else errors.username = ''
  return !errors.username
}

function validatePassword() {
  focusField.value = ''
  if (!password.value) errors.password = '请输入密码'
  else if (!/^[\x21-\x7E]{8,16}$/.test(password.value)) errors.password = '密码须为 8–16 位数字、字母或特殊字符'
  else if (passwordTypes.value < 2) errors.password = '密码至少包含数字、大写、小写、特殊字符中的两种'
  else errors.password = ''
  return !errors.password
}

function forgotPassword() { uni.showToast({ title: '请联系管理员重置密码', icon: 'none' }) }
function openRegister() {
  uni.navigateTo({
    url: '/pages/register/register',
    fail(error) {
      console.error('注册页跳转失败', error)
      // 极端情况下重新装载当前服务的注册路由，避免只改变地址而不刷新视图。
      const target = `${window.location.href.split('#')[0]}#/pages/register/register`
      window.location.replace(target)
      window.location.reload()
    }
  })
}
function switchTheme() {
  if (themeChanging.value) return
  const nextIndex = (themeIndex.value + 1) % themes.length
  pendingTheme.value = themes[nextIndex]
  uiThemeIndex.value = nextIndex
  uni.setStorageSync(THEME_STORAGE_KEY, nextIndex)
  transitionKey.value += 1
  themeChanging.value = true
  setTimeout(() => {
    themeIndex.value = nextIndex
    themeChanging.value = false
  }, 820)
}
function showAgreement(name) { uni.showModal({ title: name, content: `这里展示${name}正文，接入正式协议页后可替换为 uni.navigateTo。`, showCancel: false }) }

async function submit() {
  errors.agreement = agreed.value ? '' : '请先阅读并同意用户协议与隐私政策'
  if (!validateUsername() || !validatePassword() || errors.agreement) return
  loading.value = true
  try {
    const session = await login({ username: username.value, password: password.value })
    saveSession(session)
    if (remember.value) uni.setStorageSync(STORAGE_KEY, { username: username.value })
    else uni.removeStorageSync(STORAGE_KEY)
    password.value = ''
    uni.showToast({ title: '登录成功', icon: 'success' })
    setTimeout(() => uni.reLaunch({ url: '/pages/home/home' }), 450)
  } catch (error) {
    uni.showToast({ title: error.message || '登录失败，请稍后重试', icon: 'none' })
  } finally { loading.value = false }
}

function syncStoredTheme() {
  const stored = Number(uni.getStorageSync(THEME_STORAGE_KEY))
  if (!Number.isInteger(stored) || stored < 0 || stored >= themes.length || stored === themeIndex.value) return
  themeChanging.value = false
  themeIndex.value = stored
  uiThemeIndex.value = stored
  pendingTheme.value = themes[stored]
}

async function restoreSession() {
  if (!uni.getStorageSync(ACCESS_TOKEN_KEY)) return
  loading.value = true
  try {
    await getCurrentUser()
    uni.reLaunch({ url: '/pages/home/home' })
  } catch (error) {
    if (error.statusCode === 401 || error.code === 'UNAUTHORIZED' ||
        error.code === 'TOKEN_EXPIRED') {
      clearSession()
    } else {
      uni.showToast({ title: error.message || '登录状态验证失败', icon: 'none' })
    }
  } finally {
    loading.value = false
  }
}

onShow(syncStoredTheme)
onMounted(() => {
  const saved = uni.getStorageSync(STORAGE_KEY)
  if (saved && saved.username) {
    username.value = saved.username
    remember.value = true
    if (saved.password) uni.setStorageSync(STORAGE_KEY, { username: saved.username })
  }
  restoreSession()
})
</script>

<style scoped>
@property --accent{syntax:'<color>';inherits:true;initial-value:#6658ec}
@property --accent-2{syntax:'<color>';inherits:true;initial-value:#a55eea}
page{background:#f7f8fc}.page{transition:--accent .82s cubic-bezier(.3,.7,.15,1),--accent-2 .82s cubic-bezier(.3,.7,.15,1);min-height:100vh;background:#f7f8fc;color:#182038}.hero{position:relative;height:470rpx;overflow:hidden;background:linear-gradient(145deg,#eef0ff,#fff3ec)}.glow{position:absolute;border-radius:50%}.glow-left{width:390rpx;height:390rpx;left:-190rpx;top:-170rpx;border:66rpx solid rgba(var(--glow-rgb),.14);transition:border-color .55s ease}.glow-right{width:330rpx;height:330rpx;right:-40rpx;top:90rpx;background:var(--accent);box-shadow:0 0 80rpx rgba(var(--glow-rgb),.22);transition:background .55s ease,box-shadow .55s ease}.brand{position:absolute;z-index:2;left:52rpx;top:105rpx;display:flex;align-items:center;gap:18rpx;color:#3c4561;font-size:25rpx;font-weight:700;letter-spacing:4rpx}.brand-mark{width:43rpx;height:43rpx;border-radius:70% 30% 70% 30%;background:linear-gradient(135deg,var(--accent) 50%,var(--accent-2) 50%);transform:rotate(-12deg);transition:background .55s ease}.figure{position:absolute;right:98rpx;top:146rpx;width:180rpx;height:240rpx;transform:rotate(-7deg)}.head{position:absolute;top:0;left:67rpx;width:54rpx;height:54rpx;border-radius:50%;background:#ffc7b8}.body{position:absolute;top:50rpx;left:50rpx;width:88rpx;height:144rpx;border-radius:46rpx 46rpx 24rpx 24rpx;background:#ff987f;transform:rotate(5deg)}.arm{position:absolute;top:70rpx;width:30rpx;height:128rpx;border-radius:20rpx;background:#ffc7b8}.arm-left{left:25rpx;transform:rotate(29deg)}.arm-right{right:14rpx;transform:rotate(-36deg)}.panel{position:relative;margin-top:-58rpx;min-height:calc(100vh - 412rpx);padding:55rpx 48rpx 42rpx;border-radius:58rpx 58rpx 0 0;background:#fff}.eyebrow,.title,.subtitle,.label,.error,.agreement-error{display:block}.eyebrow{color:#5968e9;font-size:21rpx;font-weight:700;letter-spacing:5rpx}.title{margin-top:11rpx;font-size:54rpx;font-weight:750;letter-spacing:-2rpx}.subtitle{margin:13rpx 0 40rpx;color:#7b8498;font-size:26rpx}.form-item{margin-bottom:24rpx}.label-row{display:flex;justify-content:space-between}.label{margin:0 0 13rpx 6rpx;color:var(--accent);transition:color .82s ease;font-size:24rpx;font-weight:600}.counter{color:#a4a9b8;font-size:20rpx}.danger,.error,.agreement-error{color:#e7505a}.input-box{height:100rpx;display:flex;align-items:center;gap:20rpx;padding:0 28rpx;border:3rpx solid #e7e9f1;border-radius:28rpx;background:#fafbfe;transition:.2s}.input-box.focused{border-color:#5968e9;background:#fff;box-shadow:0 0 0 7rpx rgba(89,104,233,.09)}.input-box.invalid{border-color:#e7505a}.input-icon{width:34rpx;color:#9299aa;font-size:36rpx;text-align:center}.lock{font-size:28rpx}.input{flex:1;height:100%;color:#182038;font-size:28rpx}.placeholder{color:#b4b9c7}.clear,.eye{padding:12rpx;color:var(--accent);transition:color .82s ease;font-size:23rpx}.clear{font-size:36rpx}.error{margin:9rpx 0 0rpx 7rpx;font-size:21rpx}.strength-row{display:flex;align-items:center;gap:8rpx;margin:12rpx 7rpx 0;color:#969dad;font-size:20rpx}.strength-bar{width:46rpx;height:7rpx;border-radius:9rpx;background:#e5e7ed}.strength-bar.active{background:#5968e9}.option-row{display:flex;justify-content:space-between;align-items:center;margin:4rpx 5rpx 32rpx;color:#646c7f;font-size:23rpx}.remember,.agreement{display:flex;align-items:center}.checkbox{width:34rpx;height:34rpx;display:grid;place-items:center;margin-right:14rpx;border:3rpx solid #c7cbd7;border-radius:10rpx;color:#fff;font-size:21rpx}.checkbox.checked{border-color:#5968e9;background:#5968e9}.forgot,.agreement-link{color:#5968e9;font-weight:600}.agreement{flex-wrap:wrap;color:#858c9e;font-size:21rpx;line-height:38rpx}.checkbox.small{width:30rpx;height:30rpx;border-radius:9rpx}.agreement-error{margin:7rpx 0 0 44rpx;font-size:21rpx}.login-button{height:102rpx;margin-top:30rpx;border:0;border-radius:29rpx;color:#fff;background:linear-gradient(100deg,#5968e9,#7482f2);box-shadow:0 22rpx 42rpx rgba(89,104,233,.25);font-size:29rpx;font-weight:700;letter-spacing:7rpx}.login-button:after{border:0}.button-pressed{transform:scale(.985);opacity:.92}.spinner{width:34rpx;height:34rpx;margin:auto;border:4rpx solid rgba(255,255,255,.4);border-top-color:#fff;border-radius:50%;animation:spin .7s linear infinite}@keyframes spin{to{transform:rotate(360deg)}}.safe-tip{display:flex;justify-content:center;align-items:center;gap:9rpx;margin-top:28rpx;color:#a1a7b6;font-size:20rpx}.shield{color:#6d79eb}
.eyebrow,.label{display:inline-block;width:max-content;color:var(--accent);background-image:linear-gradient(100deg,var(--accent),var(--accent-2));background-clip:text;-webkit-background-clip:text;-webkit-text-fill-color:transparent;transition:color .82s ease,background-image .82s ease}.account-actions{display:flex;align-items:center;gap:18rpx}.action-divider{width:2rpx;height:22rpx;background:#dfe2ea}.register{display:inline;color:#5968e9;font-weight:600;line-height:1.4}.register-pressed{opacity:.55}.music-bg,.theme-wave,.theme-hitarea{display:none}
@media (min-width:900px){
  .page{position:relative;transition:--accent .82s cubic-bezier(.3,.7,.15,1),--accent-2 .82s cubic-bezier(.3,.7,.15,1);min-height:100vh;display:flex;align-items:center;justify-content:center;overflow:hidden;padding:48px;background:radial-gradient(circle at 50% 48%,var(--bg-b),var(--bg-a) 68%)}
  .hero{position:absolute;inset:0;height:auto;background:transparent;pointer-events:none}.brand{left:56px;top:42px;color:rgba(255,255,255,.78)}.brand-mark{background:linear-gradient(135deg,var(--accent) 50%,var(--accent-2) 50%)}.figure{display:none}
  .panel{z-index:4;width:520px;min-height:0;margin:0;padding:45px 48px 36px;border:1px solid rgba(255,255,255,.66);border-radius:38px;background:rgba(255,255,255,.92);box-shadow:0 34px 100px rgba(0,0,0,.3),0 0 70px rgba(var(--glow-rgb),.24),inset 0 1px 0 #fff;backdrop-filter:blur(26px);transition:box-shadow .5s ease}
  .eyebrow,.forgot,.register,.agreement-link,.shield{color:var(--accent);transition:color .82s ease}.panel{transition:box-shadow .82s ease}.input-box{transition:border-color .42s ease,box-shadow .42s ease,background-color .22s ease}.checkbox,.strength-bar{transition:background-color .82s ease,border-color .82s ease}.login-button{transition:background-color .82s ease,box-shadow .82s ease,transform .18s ease}.input-box.focused{border-color:var(--accent);box-shadow:0 0 0 4px rgba(var(--glow-rgb),.1)}.checkbox.checked{border-color:var(--accent);background:var(--accent)}.strength-bar.active{background:var(--accent)}.login-button{background:linear-gradient(100deg,var(--accent),var(--accent-2));box-shadow:0 12px 25px rgba(var(--glow-rgb),.28)}
  .eyebrow{font-size:12px;letter-spacing:3px}.title{font-size:34px}.subtitle{margin:8px 0 26px;font-size:14px}.form-item{margin-bottom:16px}.label{margin-bottom:8px;font-size:13px}.counter{font-size:11px}.input-box{height:54px;padding:0 16px;border-width:1.5px;border-radius:15px;gap:11px}.input{font-size:14px}.input-icon{width:20px;font-size:19px}.clear{font-size:20px}.eye{font-size:12px}.error,.agreement-error{font-size:11px}.strength-row{margin-top:7px;gap:5px;font-size:11px}.strength-bar{width:28px;height:4px}.option-row{margin:2px 2px 19px;font-size:12px}.checkbox{width:18px;height:18px;margin-right:8px;border-width:1.5px;border-radius:6px;font-size:11px}.account-actions{gap:10px}.action-divider{width:1px;height:12px}.agreement{font-size:11px;line-height:20px}.checkbox.small{width:16px;height:16px;border-radius:5px}.agreement-error{margin-left:24px}.login-button{height:54px;margin-top:21px;border-radius:16px;font-size:15px;letter-spacing:4px}.safe-tip{font-size:11px;text-align:center;margin-top:14px;color:#9aa0af}
  .theme-hitarea{display:block;position:absolute;inset:0;z-index:2}.music-bg{display:block;position:absolute;inset:0;z-index:1;overflow:hidden;pointer-events:none}.theme-wave{display:block;position:fixed;z-index:2;inset:0;background:radial-gradient(circle at 50% 50%,var(--next-b),var(--next-a) 68%);clip-path:circle(0 at 50% 50%);will-change:clip-path;animation:themeExpand .82s cubic-bezier(.3,.7,.15,1) forwards;pointer-events:none}@keyframes themeExpand{to{clip-path:circle(75vmax at 50% 50%)}}
  .dot-halo{position:absolute;left:50%;top:50%;width:760px;height:760px;transform:translate(-50%,-50%);opacity:.48;background-image:radial-gradient(circle,rgba(var(--glow-rgb),.7) 1.4px,transparent 1.8px);background-size:18px 18px;mask-image:radial-gradient(circle,transparent 0 32%,#000 48%,transparent 72%);animation:haloBreath 3.8s ease-in-out infinite}@keyframes haloBreath{50%{opacity:.78;transform:translate(-50%,-50%) scale(1.06)}}
  .sound-ring{position:absolute;left:50%;top:50%;border:1px solid rgba(var(--glow-rgb),.3);border-radius:50%;transform:translate(-50%,-50%);animation:ringPulse 3s ease-out infinite}.ring-one{width:600px;height:600px}.ring-two{width:690px;height:690px;animation-delay:-1s}.ring-three{width:790px;height:790px;animation-delay:-2s}@keyframes ringPulse{0%{opacity:.1;transform:translate(-50%,-50%) scale(.9)}55%{opacity:.5}100%{opacity:0;transform:translate(-50%,-50%) scale(1.12)}}
  .scan-wave{position:absolute;left:-10%;width:120%;height:170px;border-top:2px solid rgba(var(--glow-rgb),.42);border-radius:50%;filter:drop-shadow(0 0 10px rgba(var(--glow-rgb),.7));animation:waveScan 5s ease-in-out infinite}.wave-one{top:24%;transform:rotate(-5deg)}.wave-two{bottom:10%;transform:rotate(7deg);animation-delay:-2.4s}@keyframes waveScan{0%,100%{opacity:.18;scale:1 .75}50%{opacity:.7;scale:1 1.15}}
  .spectrum{position:absolute;left:3%;right:3%;height:110px;display:flex;align-items:flex-end;justify-content:space-between;gap:7px;opacity:.58}.spectrum-top{top:8%;transform:rotate(180deg)}.spectrum-bottom{bottom:1%}.frequency{flex:1;max-width:12px;height:var(--height);border-radius:8px;background:linear-gradient(to top,transparent,rgba(var(--glow-rgb),.35),var(--accent-2));transform-origin:bottom;will-change:transform;animation:frequency var(--duration) ease-in-out var(--delay) infinite alternate}@keyframes frequency{from{transform:scaleY(.18);opacity:.34}to{transform:scaleY(1);opacity:.92}}
  .music-caption{position:absolute;right:55px;top:47px;display:flex;align-items:center;gap:9px;color:rgba(255,255,255,.55);font-size:10px;letter-spacing:3px}.caption-dot{width:7px;height:7px;border-radius:50%;background:var(--accent-2);box-shadow:0 0 12px var(--accent-2);animation:beat .75s ease-in-out infinite alternate}@keyframes beat{to{transform:scale(1.8);opacity:.45}}
}
</style>
