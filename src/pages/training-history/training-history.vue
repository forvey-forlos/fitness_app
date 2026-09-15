<template>
  <view class="page" :style="themeStyle">
    <view class="orb" /><view class="shell">
      <view class="topbar"><button class="back" hover-class="pressed" @tap="goBack">‹</button><view><text class="kicker">TRAINING LOG</text><text class="title">训练历史</text></view><view class="theme-mark" /></view>
      <view class="week-card">
        <view class="week-head"><view><text class="week-title">本周完成</text><text class="week-range">{{ weekRange }}</text></view><text class="score">{{ completedCount }}<small>/7</small></text></view>
        <view class="dots"><view v-for="day in weekDays" :key="day.key" class="day" :class="{ today:day.today }"><view class="dot" :class="{ done:day.done }">{{ day.done?'✓':'' }}</view><text>{{ day.label }}</text><text>{{ day.dateLabel }}</text></view></view>
      </view>
      <view class="history-card"><view class="list-head"><text>完成记录</text><text>共 {{ history.length }} 次</text></view>
        <view v-if="sortedHistory.length" class="history-list">
          <view v-for="item in sortedHistory" :key="item.id" class="record">
            <view class="record-main"><view class="record-icon">✓</view><view class="record-copy"><text>{{ item.title }}</text><text>{{ formatDate(item.date) }} · {{ item.duration }} 分钟</text></view><text class="complete-label">已完成</text></view>
            <view v-if="Array.isArray(item.parts)&&item.parts.length" class="record-details">
              <view v-for="part in item.parts" :key="part.key" class="history-part">
                <view class="history-part-head"><text>{{ part.name }}</text><text>{{ part.actions.length }} 个动作</text></view>
                <view v-for="action in part.actions" :key="action.id" class="history-action"><text>{{ action.name }}</text><text>{{ formatActual(action) }}</text></view>
              </view>
            </view>
          </view>
        </view>
        <view v-else class="empty"><view>○</view><text>还没有训练记录</text><text>完成今日训练后，记录会出现在这里</text><button hover-class="pressed" @tap="goPlan">前往训练计划</button></view>
      </view>
    </view>
  </view>
</template>

<script setup>
import { computed,ref } from 'vue'
import { onShow } from '@dcloudio/uni-app'
const THEME_KEY='fit_note_theme_index',HISTORY_KEY='fit_note_training_history'
const themes=[{accent:'#7775bd',accent2:'#a59bd2',pale:'#f1f0f9',pale2:'#faf9fd',glow:'119,117,189'},{accent:'#5f9fa5',accent2:'#8bbdaf',pale:'#edf6f5',pale2:'#f8fbfa',glow:'95,159,165'},{accent:'#bd8073',accent2:'#cda56f',pale:'#faf1ed',pale2:'#fdf9f5',glow:'189,128,115'}]
const themeIndex=ref(0),history=ref([])
const themeStyle=computed(()=>{const t=themes[themeIndex.value];return{'--accent':t.accent,'--accent-2':t.accent2,'--pale':t.pale,'--pale-2':t.pale2,'--glow-rgb':t.glow}})
function pad(v){return String(v).padStart(2,'0')}
function dateKey(d){return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`}
function monday(){const n=new Date(),day=n.getDay()||7;return new Date(n.getFullYear(),n.getMonth(),n.getDate()-day+1)}
const weekDays=computed(()=>{const start=monday(),today=dateKey(new Date());return Array.from({length:7},(_,i)=>{const d=new Date(start.getFullYear(),start.getMonth(),start.getDate()+i),key=dateKey(d);return{key,label:['一','二','三','四','五','六','日'][i],dateLabel:`${d.getMonth()+1}/${d.getDate()}`,today:key===today,done:history.value.some(item=>item.date===key&&item.status==='completed')}})})
const completedCount=computed(()=>weekDays.value.filter(day=>day.done).length)
const weekRange=computed(()=>`${weekDays.value[0]?.dateLabel||''} — ${weekDays.value[6]?.dateLabel||''}`)
const sortedHistory=computed(()=>history.value.slice().sort((a,b)=>(b.completedAt||0)-(a.completedAt||0)))
function formatDate(value){const [y,m,d]=String(value).split('-');return `${y}年${Number(m)}月${Number(d)}日`}
function formatActual(action){const actual=action.actual||{};return `${actual.kg||0}kg · ${actual.reps||0}个 · ${actual.sets||0}组`}
function load(){const ti=Number(uni.getStorageSync(THEME_KEY));themeIndex.value=Number.isInteger(ti)&&themes[ti]?ti:0;const saved=uni.getStorageSync(HISTORY_KEY);history.value=Array.isArray(saved)?saved:[]}
function goBack(){uni.navigateBack({delta:1})}
function goPlan(){uni.redirectTo({url:'/pages/training-plan/training-plan'})}
onShow(load)
</script>

<style scoped>
page{background:#f6f5fa}.page{position:relative;min-height:100vh;overflow:hidden;color:#2b3142;background:linear-gradient(145deg,var(--pale),var(--pale-2))}.orb{position:absolute;width:590rpx;height:590rpx;top:-310rpx;right:-260rpx;border-radius:50%;background:rgba(var(--glow-rgb),.1)}.shell{position:relative;z-index:1;width:100%;padding:calc(var(--status-bar-height) + 25rpx) 28rpx 50rpx}.topbar{display:flex;align-items:center;gap:18rpx}.back{width:64rpx;height:64rpx;margin:0;padding:0;border:0;border-radius:20rpx;color:var(--accent);background:rgba(255,255,255,.72);font-size:43rpx;line-height:58rpx}.back:after,.empty button:after{border:0}.pressed{opacity:.8;transform:scale(.98)}.kicker,.title{display:block}.kicker{color:var(--accent);font-size:16rpx;font-weight:750;letter-spacing:3rpx}.title{font-size:31rpx;font-weight:760}.theme-mark{width:22rpx;height:22rpx;margin-left:auto;border:6rpx solid rgba(255,255,255,.8);border-radius:50%;background:var(--accent);box-shadow:0 6rpx 18rpx rgba(var(--glow-rgb),.25)}.week-card,.history-card{margin-top:28rpx;padding:29rpx;border:1rpx solid rgba(255,255,255,.9);border-radius:32rpx;background:rgba(255,255,255,.78);box-shadow:0 20rpx 50rpx rgba(53,61,92,.08)}.week-head,.list-head{display:flex;justify-content:space-between;align-items:center}.week-title,.week-range{display:block}.week-title{font-size:28rpx;font-weight:750}.week-range{margin-top:4rpx;color:#999fac;font-size:17rpx}.score{color:var(--accent);font-size:44rpx;font-weight:780}.score small{font-size:20rpx}.dots{display:flex;justify-content:space-between;margin-top:28rpx}.day{display:grid;justify-items:center;gap:8rpx;color:#a0a5b0;font-size:15rpx}.day text:last-child{font-size:13rpx}.day.today{color:var(--accent);font-weight:700}.dot{width:43rpx;height:43rpx;display:grid;place-items:center;border:3rpx solid rgba(var(--glow-rgb),.25);border-radius:50%;color:#fff;font-size:19rpx}.dot.done{border-color:var(--accent);background:linear-gradient(135deg,var(--accent),var(--accent-2));box-shadow:0 8rpx 20rpx rgba(var(--glow-rgb),.25)}.day.today .dot:not(.done){border-color:var(--accent)}.list-head text:first-child{font-size:27rpx;font-weight:750}.list-head text:last-child{color:#999fac;font-size:17rpx}.history-list{display:grid;gap:13rpx;margin-top:22rpx}.record{padding:18rpx;border-radius:21rpx;background:var(--pale-2)}.record-main,.record-icon{display:flex;align-items:center}.record-main{gap:15rpx}.record-icon{width:45rpx;height:45rpx;justify-content:center;flex:none;border-radius:15rpx;color:#fff;background:var(--accent);font-size:18rpx}.record-copy{flex:1}.record-copy text{display:block;font-size:20rpx;font-weight:650}.record-copy text:last-child{margin-top:3rpx;color:#999fac;font-size:15rpx;font-weight:400}.complete-label{color:var(--accent);font-size:16rpx}.record-details{display:grid;gap:10rpx;margin-top:15rpx;padding-top:14rpx;border-top:1rpx solid rgba(var(--glow-rgb),.14)}.history-part{padding:11rpx;border-radius:15rpx;background:#fff}.history-part-head,.history-action{display:flex;justify-content:space-between}.history-part-head{color:#4f576a;font-size:16rpx;font-weight:700}.history-part-head text:last-child{color:var(--accent);font-size:13rpx}.history-action{margin-top:7rpx;color:#858c9d;font-size:14rpx}.history-action text:last-child{color:#555d70}.empty{display:grid;justify-items:center;padding:65rpx 0 35rpx;color:#9aa0ad}.empty view{color:var(--accent);font-size:68rpx}.empty text{font-size:21rpx;font-weight:650}.empty text:nth-child(3){margin-top:7rpx;font-size:16rpx;font-weight:400}.empty button{height:66rpx;margin-top:25rpx;padding:0 32rpx;border:0;border-radius:20rpx;color:var(--accent);background:var(--pale);font-size:19rpx;font-weight:700}@media(min-width:900px){.shell{width:min(900px,calc(100% - 60px));margin:auto;padding-top:32px}.week-card,.history-card{border-radius:25px;padding:25px}.history-list{grid-template-columns:1fr 1fr;align-items:start}}
</style>
