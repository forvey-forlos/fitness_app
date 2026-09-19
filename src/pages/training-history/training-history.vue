<template>
  <view class="page" :style="themeStyle">
    <view class="orb" /><view class="shell">
      <view class="topbar"><button class="back" hover-class="pressed" @tap="goBack">‹</button><view><text class="kicker">TRAINING LOG</text><text class="title">训练历史</text></view><view class="theme-mark" /></view>
      <view class="week-card">
        <view class="week-head"><view><text class="week-title">本周完成</text><text class="week-range">{{ weekRange }}</text></view><text class="score">{{ completedCount }}<small>/7</small></text></view>
        <view class="dots"><view v-for="day in weekDays" :key="day.key" class="day" :class="{ today:day.today }"><view class="dot" :class="{ done:day.done }">{{ day.done?'✓':'' }}</view><text>{{ day.label }}</text><text>{{ day.dateLabel }}</text></view></view>
      </view>
      <view class="history-card"><view class="list-head"><text>完成记录</text><text>共 {{ historyTotal }} 次</text></view>
        <view v-if="loading" class="empty"><view>⌁</view><text>正在加载训练记录</text><text>请稍候</text></view>
        <view v-else-if="loadError" class="empty"><view>!</view><text>训练记录加载失败</text><text>{{ loadError }}</text><button hover-class="pressed" @tap="load">重新加载</button></view>
        <view v-else-if="history.length" class="history-list">
          <view v-for="item in history" :key="item.id" class="record" @tap="loadDetail(item)">
            <view class="record-main"><view class="record-icon">✓</view><view class="record-copy"><text>{{ item.title }}</text><text>{{ formatDate(item.date) }} · {{ item.duration }} 分钟</text></view><text class="complete-label">已完成</text></view>
            <view v-if="detailLoadingId===item.id" class="record-details"><text class="week-range">正在加载详情…</text></view>
            <view v-else-if="details[item.id]" class="record-details">
              <view class="history-part">
                <view class="history-part-head"><text>{{ details[item.id].planNameSnapshot }}</text><text>{{ details[item.id].exercises.length }} 个动作</text></view>
                <view v-for="action in details[item.id].exercises" :key="action.id" class="history-action"><text>{{ action.exerciseNameSnapshot }}</text><text>{{ formatSnapshot(action) }}</text></view>
                <view v-if="!details[item.id].exercises.length" class="history-action"><text>没有动作快照</text><text>—</text></view>
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
import { getTrainingHistory, getWeeklyTrainingStats, listTrainingHistory } from '../../api/training'
const THEME_KEY='fit_note_theme_index'
const themes=[{accent:'#7775bd',accent2:'#a59bd2',pale:'#f1f0f9',pale2:'#faf9fd',glow:'119,117,189'},{accent:'#5f9fa5',accent2:'#8bbdaf',pale:'#edf6f5',pale2:'#f8fbfa',glow:'95,159,165'},{accent:'#bd8073',accent2:'#cda56f',pale:'#faf1ed',pale2:'#fdf9f5',glow:'189,128,115'}]
const themeIndex=ref(0),history=ref([])
const historyTotal=ref(0),weekStats=ref({weekStart:'',weekEnd:'',completedCount:0,currentStreak:0,days:[]})
const details=ref({}),detailLoadingId=ref(''),loading=ref(false),loadError=ref('')
const themeStyle=computed(()=>{const t=themes[themeIndex.value];return{'--accent':t.accent,'--accent-2':t.accent2,'--pale':t.pale,'--pale-2':t.pale2,'--glow-rgb':t.glow}})
const todayKey=computed(()=>{const d=new Date();return [d.getFullYear(),String(d.getMonth()+1).padStart(2,'0'),String(d.getDate()).padStart(2,'0')].join('-')})
const weekDays=computed(()=>Array.isArray(weekStats.value.days)?weekStats.value.days.map((day,index)=>({key:day.date||String(index),label:['一','二','三','四','五','六','日'][index],dateLabel:day.date?day.date.slice(5).replace('-','/'):'--/--',today:day.date===todayKey.value,done:day.completed===true})):[])
const completedCount=computed(()=>Number(weekStats.value.completedCount||0))
const currentStreak=computed(()=>Number(weekStats.value.currentStreak||0))
const weekRange=computed(()=>weekStats.value.weekStart&&weekStats.value.weekEnd?`${weekStats.value.weekStart.slice(5).replace('-','/')} — ${weekStats.value.weekEnd.slice(5).replace('-','/')} · 连续 ${currentStreak.value} 天`:'本周暂无统计')
function formatDate(value){
  const [y,m,d]=String(value||'').split('-')
  return y&&m&&d?`${y}年${Number(m)}月${Number(d)}日`:'日期未知'
}
function formatSnapshot(action){
  const weight=action.weight===null||action.weight===undefined?'--':action.weight
  const reps=action.reps===null||action.reps===undefined?'--':action.reps
  const sets=action.sets===null||action.sets===undefined?'--':action.sets
  return `${weight}kg · ${reps}个 · ${sets}组${action.notes?' · '+action.notes:''}`
}
async function loadHistory(query={}){
  const items=[],request={...query,page:1,pageSize:20}
  let total=0
  for(;;){
    const result=await listTrainingHistory(request)
    items.push(...(Array.isArray(result?.items)?result.items:[]))
    total=Number(result?.total||items.length)
    if(!result?.hasMore)break
    request.page+=1
  }
  history.value=items
  historyTotal.value=total
}
async function load(){
  if(loading.value)return
  const ti=Number(uni.getStorageSync(THEME_KEY));themeIndex.value=Number.isInteger(ti)&&themes[ti]?ti:0
  loading.value=true;loadError.value=''
  try{
    const [,weekly]=await Promise.all([loadHistory(),getWeeklyTrainingStats()])
    weekStats.value={weekStart:weekly?.weekStart||'',weekEnd:weekly?.weekEnd||'',completedCount:Number(weekly?.completedCount||0),currentStreak:Number(weekly?.currentStreak||0),days:Array.isArray(weekly?.days)?weekly.days:[]}
  }catch(error){loadError.value=error?.message||'网络请求失败'}
  finally{loading.value=false}
}
async function loadDetail(item){
  if(details.value[item.id]||detailLoadingId.value)return
  detailLoadingId.value=item.id
  try{
    const detail=await getTrainingHistory(item.id)
    details.value={...details.value,[item.id]:{...detail,exercises:Array.isArray(detail?.exercises)?detail.exercises:[]}}
  }catch(error){
    const title=error?.code==='NOT_FOUND'?'训练历史不存在':(error?.message||'历史详情加载失败')
    uni.showToast({title,icon:'none'})
  }finally{detailLoadingId.value=''}
}
function goBack(){uni.navigateBack({delta:1})}
function goPlan(){uni.redirectTo({url:'/pages/training-plan/training-plan'})}
onShow(load)
</script>

<style scoped>
page{background:#f6f5fa}.page{position:relative;min-height:100vh;overflow:hidden;color:#2b3142;background:linear-gradient(145deg,var(--pale),var(--pale-2))}.orb{position:absolute;width:590rpx;height:590rpx;top:-310rpx;right:-260rpx;border-radius:50%;background:rgba(var(--glow-rgb),.1)}.shell{position:relative;z-index:1;width:100%;padding:calc(var(--status-bar-height) + 25rpx) 28rpx 50rpx}.topbar{display:flex;align-items:center;gap:18rpx}.back{width:64rpx;height:64rpx;margin:0;padding:0;border:0;border-radius:20rpx;color:var(--accent);background:rgba(255,255,255,.72);font-size:43rpx;line-height:58rpx}.back:after,.empty button:after{border:0}.pressed{opacity:.8;transform:scale(.98)}.kicker,.title{display:block}.kicker{color:var(--accent);font-size:16rpx;font-weight:750;letter-spacing:3rpx}.title{font-size:31rpx;font-weight:760}.theme-mark{width:22rpx;height:22rpx;margin-left:auto;border:6rpx solid rgba(255,255,255,.8);border-radius:50%;background:var(--accent);box-shadow:0 6rpx 18rpx rgba(var(--glow-rgb),.25)}.week-card,.history-card{margin-top:28rpx;padding:29rpx;border:1rpx solid rgba(255,255,255,.9);border-radius:32rpx;background:rgba(255,255,255,.78);box-shadow:0 20rpx 50rpx rgba(53,61,92,.08)}.week-head,.list-head{display:flex;justify-content:space-between;align-items:center}.week-title,.week-range{display:block}.week-title{font-size:28rpx;font-weight:750}.week-range{margin-top:4rpx;color:#999fac;font-size:17rpx}.score{color:var(--accent);font-size:44rpx;font-weight:780}.score small{font-size:20rpx}.dots{display:flex;justify-content:space-between;margin-top:28rpx}.day{display:grid;justify-items:center;gap:8rpx;color:#a0a5b0;font-size:15rpx}.day text:last-child{font-size:13rpx}.day.today{color:var(--accent);font-weight:700}.dot{width:43rpx;height:43rpx;display:grid;place-items:center;border:3rpx solid rgba(var(--glow-rgb),.25);border-radius:50%;color:#fff;font-size:19rpx}.dot.done{border-color:var(--accent);background:linear-gradient(135deg,var(--accent),var(--accent-2));box-shadow:0 8rpx 20rpx rgba(var(--glow-rgb),.25)}.day.today .dot:not(.done){border-color:var(--accent)}.list-head text:first-child{font-size:27rpx;font-weight:750}.list-head text:last-child{color:#999fac;font-size:17rpx}.history-list{display:grid;gap:13rpx;margin-top:22rpx}.record{padding:18rpx;border-radius:21rpx;background:var(--pale-2)}.record-main,.record-icon{display:flex;align-items:center}.record-main{gap:15rpx}.record-icon{width:45rpx;height:45rpx;justify-content:center;flex:none;border-radius:15rpx;color:#fff;background:var(--accent);font-size:18rpx}.record-copy{flex:1}.record-copy text{display:block;font-size:20rpx;font-weight:650}.record-copy text:last-child{margin-top:3rpx;color:#999fac;font-size:15rpx;font-weight:400}.complete-label{color:var(--accent);font-size:16rpx}.record-details{display:grid;gap:10rpx;margin-top:15rpx;padding-top:14rpx;border-top:1rpx solid rgba(var(--glow-rgb),.14)}.history-part{padding:11rpx;border-radius:15rpx;background:#fff}.history-part-head,.history-action{display:flex;justify-content:space-between}.history-part-head{color:#4f576a;font-size:16rpx;font-weight:700}.history-part-head text:last-child{color:var(--accent);font-size:13rpx}.history-action{margin-top:7rpx;color:#858c9d;font-size:14rpx}.history-action text:last-child{color:#555d70}.empty{display:grid;justify-items:center;padding:65rpx 0 35rpx;color:#9aa0ad}.empty view{color:var(--accent);font-size:68rpx}.empty text{font-size:21rpx;font-weight:650}.empty text:nth-child(3){margin-top:7rpx;font-size:16rpx;font-weight:400}.empty button{height:66rpx;margin-top:25rpx;padding:0 32rpx;border:0;border-radius:20rpx;color:var(--accent);background:var(--pale);font-size:19rpx;font-weight:700}@media(min-width:900px){.shell{width:min(900px,calc(100% - 60px));margin:auto;padding-top:32px}.week-card,.history-card{border-radius:25px;padding:25px}.history-list{grid-template-columns:1fr 1fr;align-items:start}}
</style>
