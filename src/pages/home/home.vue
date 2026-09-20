<template>
  <view class="page" :style="themeStyle" @tap="switchTheme">
    <view v-if="themeChanging" :key="transitionKey" class="theme-wave" :style="transitionStyle" aria-hidden="true" />
    <view class="ambient" aria-hidden="true">
      <view class="ambient-orb orb-one" /><view class="ambient-orb orb-two" />
      <view class="wave-line wave-one" /><view class="wave-line wave-two" />
      <view class="soft-grid" />
    </view>

    <view class="shell">
      <view class="topbar" @tap.stop>
        <view class="brand"><view class="brand-mark" /><text>FIT NOTE</text></view>
        <view class="top-actions">
          <view class="theme-switch" @tap="switchTheme">
            <view v-for="(_, index) in themes" :key="index" class="theme-dot" :class="{ active: index === themeIndex }" />
          </view>
          <view class="avatar" @tap="showProfile"><image v-if="homeUser?.avatarUrl" :src="homeUser.avatarUrl" mode="aspectFill" style="width:100%;height:100%;border-radius:50%" /><text v-else>{{ avatarInitial }}</text></view>
        </view>
      </view>

      <view class="welcome" @tap.stop>
        <view>
          <text class="eyebrow">GOOD MORNING</text>
          <text class="headline">今天也要比昨天更强一点</text>
          <text class="date">{{ displayUsername }} · {{ todayText }} · 保持节奏，享受每一次进步</text>
        </view>
        <view class="streak"><text class="streak-icon">↗</text><view><text class="streak-value">{{ currentStreak }}</text><text class="streak-label">连续打卡</text></view></view>
      </view>
      <view v-if="homeLoading" class="card-footer" @tap.stop><text>首页数据加载中…</text></view>
      <view v-else-if="homeError" class="card-footer" @tap.stop><text>{{ homeError }}</text><text class="text-action" @tap="loadHomeSummary">重试 →</text></view>

      <view class="dashboard">
        <view class="module body-card" @tap.stop>
          <view class="module-head"><view><text class="module-kicker">OVERVIEW</text><text class="module-title">身体数据</text></view><button class="icon-button" hover-class="pressed" @tap="editBodyData">＋</button></view>
          <view class="body-main">
            <view class="score-ring"><view class="score-inner"><text class="score">{{ bmiValue }}</text><text class="unit">BMI</text></view></view>
            <view class="metrics">
              <view class="metric"><text class="metric-value">{{ displayWeight }}<small> kg</small></text><text class="metric-label">当前体重</text><text class="trend" :class="weightChangeClass">{{ weightChangeText }}</text></view>
              <view class="metric"><text class="metric-value">{{ displayHeight }}<small> cm</small></text><text class="metric-label">身高</text><text class="trend">{{ bodyHeight !== null ? '已同步' : '待录入' }}</text></view>
            </view>
          </view>
          <view class="trend-panel" hover-class="chart-pressed" @tap.stop="toggleTrend">
            <view class="trend-head"><view><text class="trend-title">体重变化趋势</text><text class="trend-caption">{{ trendMode === 'week' ? '最近 7 天每日记录' : '月趋势待接入' }}</text></view><view class="range-switch"><text>{{ trendMode === 'week' ? '切换月趋势' : '切换周趋势' }}</text><text>↻</text></view></view>
            <view class="chart-layout">
              <view class="y-axis"><text v-for="tick in yAxisTicks" :key="tick">{{ tick }}</text></view>
              <view class="chart-main">
                <canvas id="weightTrendCanvas" canvas-id="weightTrendCanvas" class="trend-canvas" />
                <view v-if="recordedPointCount === 0" class="chart-empty"><text>⌁</text><text>{{ trendMode === 'month' ? '月趋势待接入' : '记录体重后生成趋势' }}</text></view>
                <view class="x-axis"><text v-for="point in trendSeries" :key="point.key">{{ point.label }}</text></view>
              </view>
            </view>
          </view>
          <view class="card-footer"><text>最近记录：{{ latestRecordText }}</text><text class="text-action" @tap="editBodyData">管理数据 →</text></view>
        </view>

        <view class="module plan-card" @tap.stop>
          <view class="module-head"><view><text class="module-kicker">TODAY</text><text class="module-title">训练计划</text></view><view class="day-tag">{{ todayWeekday }}</view></view>
          <view class="today-plan" hover-class="plan-pressed" @tap="openTrainingPlan">
            <view class="plan-focus">
              <view class="plan-icon"><text>⌁</text></view>
              <view class="plan-copy"><text class="plan-name">{{ todayPlan?.name || '今天暂无训练计划' }}</text><text class="plan-meta">{{ todayPlan ? `${todayPlanActionCount} 个动作 · 预计 ${todayPlanDuration} 分钟` : '点击创建今天的训练安排' }}</text></view>
              <text class="plan-arrow">›</text>
            </view>
            <view class="plan-status"><text>{{ todayCompleted ? '今日训练已完成' : todayPlan ? '今天的安排已经准备好' : '可以去创建今日计划' }}</text><text>{{ todayCompleted ? '查看计划' : todayPlan ? '开始训练' : '创建计划' }} →</text></view>
          </view>
          <view class="week-completion" hover-class="plan-pressed" @tap="openTrainingHistory">
            <view class="completion-head"><view><text class="completion-title">训练完成点状图</text><text class="completion-caption">{{ weekRangeText }}</text></view><text class="completion-count">{{ weekCompletedCount }}/7</text></view>
            <view class="completion-dots">
              <view v-for="day in weekCompletion" :key="day.key" class="completion-day" :class="{ today:day.today }">
                <view class="completion-dot" :class="{ done:day.done }"><text v-if="day.done">✓</text></view><text>{{ day.label }}</text>
              </view>
            </view>
            <view class="history-link"><text>点击查看训练历史</text><text>›</text></view>
          </view>
        </view>

        <view class="module action-card" @tap.stop>
          <view class="module-head"><view><text class="module-kicker">LIBRARY</text><text class="module-title">动作管理</text></view><button class="icon-button" hover-class="pressed" @tap="addAction">＋</button></view>
          <view class="library-count"><text class="big-number">{{ actionTotal }}</text><view><text class="count-label">已收录动作</text><text class="count-note">覆盖 {{ actionPartCount }} 个训练部位 · 系统 {{ systemActionCount }} / 自定义 {{ customActionCount }}</text></view></view>
          <view class="body-parts">
            <view v-for="part in bodyParts" :key="part.name" class="part" @tap="openPart(part.name)"><view class="part-icon">{{ part.icon }}</view><view class="part-copy"><text>{{ part.name }}</text><text>{{ part.count }} 个动作</text></view><text class="arrow">›</text></view>
          </view>
          <button class="secondary-button" hover-class="pressed" @tap="openLibrary">管理动作库</button>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup>
import { computed, nextTick,ref, watch } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import { ACCESS_TOKEN_KEY } from '../../api/auth'
import { getHomeSummary } from '../../api/home'

const THEME_STORAGE_KEY = 'fit_note_theme_index'
const themes = [
  { accent:'#7775bd', accent2:'#a59bd2', pale:'#f1f0f9', pale2:'#faf9fd', glow:'119,117,189' },
  { accent:'#5f9fa5', accent2:'#8bbdaf', pale:'#edf6f5', pale2:'#f8fbfa', glow:'95,159,165' },
  { accent:'#bd8073', accent2:'#cda56f', pale:'#faf1ed', pale2:'#fdf9f5', glow:'189,128,115' }
]
const stored = Number(uni.getStorageSync(THEME_STORAGE_KEY))
const initialThemeIndex = Number.isInteger(stored) && stored >= 0 && stored < themes.length ? stored : 0
const themeIndex = ref(initialThemeIndex)
const uiThemeIndex = ref(initialThemeIndex)
const pendingTheme = ref(themes[initialThemeIndex])
const themeChanging = ref(false)
const transitionKey = ref(0)
const homeSummary=ref(null)
const homeLoading=ref(false)
const homeError=ref('')
let homeRequestId=0
const actionPartMeta=[{key:'shoulder',name:'肩部',icon:'▽'},{key:'chest',name:'胸部',icon:'◇'},{key:'back',name:'背部',icon:'⌁'},{key:'arms',name:'手臂',icon:'↯'},{key:'abs',name:'腹部',icon:'◎'},{key:'legs',name:'腿部',icon:'△'}]
const actionCountMap=computed(()=>homeSummary.value?.exerciseLibrary?.partCounts||{})
const bodyParts=computed(()=>actionPartMeta.filter(part=>['chest','back','legs'].includes(part.key)).map(part=>({...part,count:Number(actionCountMap.value[part.key]||0)})))
const actionTotal=computed(()=>{const library=homeSummary.value?.exerciseLibrary;return Number(library?.systemCount||0)+Number(library?.customCount||0)})
const systemActionCount=computed(()=>Number(homeSummary.value?.exerciseLibrary?.systemCount||0))
const customActionCount=computed(()=>Number(homeSummary.value?.exerciseLibrary?.customCount||0))
const actionPartCount=computed(()=>Number(homeSummary.value?.exerciseLibrary?.activePartCount||0))
const themeStyle = computed(() => { const bg=themes[themeIndex.value],ui=themes[uiThemeIndex.value]; return { '--accent':ui.accent,'--accent-2':ui.accent2,'--pale':ui.pale,'--pale-2':ui.pale2,'--bg-pale':bg.pale,'--bg-pale-2':bg.pale2,'--glow-rgb':ui.glow } })
const transitionStyle = computed(() => ({ '--next-pale':pendingTheme.value.pale,'--next-pale-2':pendingTheme.value.pale2 }))
const homeUser=computed(()=>homeSummary.value?.user||null)
const displayUsername=computed(()=>homeUser.value?.username||'朋友')
const avatarInitial=computed(()=>Array.from(displayUsername.value)[0]||'F')
const userTimezone=computed(()=>homeUser.value?.timezone||'Asia/Shanghai')
function zonedDateText(options){try{return new Intl.DateTimeFormat('zh-CN',{timeZone:userTimezone.value,...options}).format(new Date())}catch(_){return new Date().toLocaleDateString('zh-CN',options)}}
const todayText=computed(()=>zonedDateText({month:'long',day:'numeric',weekday:'long'}))
const todayWeekday=computed(()=>zonedDateText({weekday:'short'}))
function todayDateKey(){try{const parts=new Intl.DateTimeFormat('en-US',{timeZone:userTimezone.value,year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(new Date());const field=(type)=>parts.find(part=>part.type===type)?.value;return [field('year'),field('month'),field('day')].join('-')}catch(_){return localDateKey(new Date())}}
const currentStreak=computed(()=>Number(homeSummary.value?.weekTraining?.currentStreak||0))
const todayPlan=computed(()=>homeSummary.value?.todayPlan||null)
const todayPlanActionCount=computed(()=>Array.isArray(todayPlan.value?.exercises)?todayPlan.value.exercises.length:Number(todayPlan.value?.totalActionCount||0))
const todayPlanDuration=computed(()=>todayPlan.value?.durationMinutes??'--')
const todayCompleted=computed(()=>todayPlan.value?.status==='completed')
const body=computed(()=>homeSummary.value?.body||null)
const bodyHeight=computed(()=>body.value?.height??body.value?.profile?.height??null)
const bodyWeight=computed(()=>body.value?.weight??body.value?.latestMeasurement?.weight??body.value?.profile?.weight??null)
const displayHeight=computed(()=>bodyHeight.value??'--')
const displayWeight=computed(()=>bodyWeight.value??'--')
const bmiValue=computed(()=>body.value?.bmi??'--')
const weightChange=computed(()=>body.value?.weightTrendSummary?.change??body.value?.lastWeightChange??null)
const weightChangeText=computed(()=>weightChange.value===null?'暂无对比':Math.abs(weightChange.value)<.01?'与上次持平':`${weightChange.value>0?'↑':'↓'} ${Math.abs(weightChange.value).toFixed(1)} kg`)
const weightChangeClass=computed(()=>weightChange.value===null?'':weightChange.value>0?'negative':weightChange.value<0?'positive':'')
const latestRecordText=computed(()=>{const value=body.value?.latestMeasurement?.measuredAt??body.value?.latestMeasuredAt;if(!value)return'暂无记录';try{return new Intl.DateTimeFormat('zh-CN',{timeZone:userTimezone.value,year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date(value))}catch(_){return String(value).slice(0,10).replaceAll('-','/')}})
const trendMode=ref('week')
function pad(value){return String(value).padStart(2,'0')}
function localDateKey(date){return `${date.getFullYear()}-${pad(date.getMonth()+1)}-${pad(date.getDate())}`}
function shiftDateKey(key,days){const [year,month,day]=key.split('-').map(Number);return new Date(Date.UTC(year,month-1,day+days)).toISOString().slice(0,10)}
const weekCompletion=computed(()=>{const days=homeSummary.value?.weekTraining?.days;const today=todayDateKey();return Array.from({length:7},(_,index)=>{const day=Array.isArray(days)?days[index]:null;return{key:day?.date||`empty-${index}`,label:['一','二','三','四','五','六','日'][index],today:day?.date===today,done:day?.completed===true}})})
const weekCompletedCount=computed(()=>Number(homeSummary.value?.weekTraining?.completedCount||0))
const weekRangeText=computed(()=>{const week=homeSummary.value?.weekTraining;return week?.weekStart&&week?.weekEnd?`${week.weekStart.slice(5).replace('-','/')} — ${week.weekEnd.slice(5).replace('-','/')}`:'本周训练记录'})
function makeTrendSeries(){const today=todayDateKey();if(trendMode.value==='week'){const points=Array.isArray(body.value?.weightTrendSummary?.points)?body.value.weightTrendSummary.points:[];const byDate=new Map(points.map(point=>[point.date,point.value]));return Array.from({length:7},(_,index)=>{const key=shiftDateKey(today,index-6),date=new Date(key+'T00:00:00.000Z'),raw=byDate.get(key);return{key,label:`${date.getUTCMonth()+1}/${date.getUTCDate()}`,value:raw===null||raw===undefined?null:Number(raw)}})}const [year,month]=today.split('-').map(Number);return Array.from({length:6},(_,index)=>{const date=new Date(Date.UTC(year,month-6+index,1));return{key:`${date.getUTCFullYear()}-${pad(date.getUTCMonth()+1)}`,label:`${date.getUTCMonth()+1}月`,value:null}})}
const trendSeries=computed(makeTrendSeries)
const recordedPointCount=computed(()=>trendSeries.value.filter(point=>point.value!==null).length)
const chartRange=computed(()=>{const values=trendSeries.value.filter(point=>point.value!==null).map(point=>point.value);if(!values.length)return{min:0,max:100};const low=Math.min(...values),high=Math.max(...values),padding=Math.max((high-low)*.25,.8);return{min:Math.floor((low-padding)*10)/10,max:Math.ceil((high+padding)*10)/10}})
const yAxisTicks=computed(()=>{const {min,max}=chartRange.value;return[max,(max+min)/2,min].map(value=>value.toFixed(1))})
function toggleTrend(){trendMode.value=trendMode.value==='week'?'month':'week';nextTick(drawWeightChart)}
function drawWeightChart(){const query=uni.createSelectorQuery();query.select('#weightTrendCanvas').boundingClientRect(rect=>{if(!rect||!rect.width)return;const ctx=uni.createCanvasContext('weightTrendCanvas'),width=rect.width,height=rect.height,left=8,right=width-8,top=10,bottom=height-10,{min,max}=chartRange.value,points=trendSeries.value.map((point,index)=>({x:left+(right-left)*(index/Math.max(trendSeries.value.length-1,1)),y:point.value===null?null:top+(max-point.value)/(max-min||1)*(bottom-top),value:point.value}));ctx.clearRect(0,0,width,height);ctx.setStrokeStyle('rgba(132,138,154,.18)');ctx.setLineWidth(1);for(let i=0;i<3;i++){const y=top+(bottom-top)*i/2;ctx.beginPath();ctx.moveTo(left,y);ctx.lineTo(right,y);ctx.stroke()}const valid=points.filter(point=>point.y!==null);if(valid.length>1){const gradient=ctx.createLinearGradient(left,0,right,0),theme=themes[themeIndex.value];gradient.addColorStop(0,theme.accent);gradient.addColorStop(1,theme.accent2);ctx.beginPath();ctx.moveTo(valid[0].x,valid[0].y);valid.slice(1).forEach(point=>ctx.lineTo(point.x,point.y));ctx.setStrokeStyle(gradient);ctx.setLineWidth(3);ctx.setLineCap('round');ctx.setLineJoin('round');ctx.stroke()}const theme=themes[themeIndex.value];valid.forEach(point=>{ctx.beginPath();ctx.arc(point.x,point.y,4,0,Math.PI*2);ctx.setFillStyle('#fff');ctx.fill();ctx.setStrokeStyle(theme.accent);ctx.setLineWidth(2);ctx.stroke()});ctx.draw()}).exec()}

function switchTheme(){
  if(themeChanging.value)return
  const next=(themeIndex.value+1)%themes.length
  pendingTheme.value=themes[next]
  uiThemeIndex.value=next
  uni.setStorageSync(THEME_STORAGE_KEY,next)
  transitionKey.value+=1
  themeChanging.value=true
  setTimeout(()=>{themeIndex.value=next;themeChanging.value=false},820)
}
function syncTheme(){ const value=Number(uni.getStorageSync(THEME_STORAGE_KEY)); if(Number.isInteger(value)&&value>=0&&value<themes.length){themeIndex.value=value;uiThemeIndex.value=value;pendingTheme.value=themes[value];themeChanging.value=false;nextTick(drawWeightChart)} }
function notice(title){ uni.showToast({title,icon:'none'}) }
function showProfile(){uni.navigateTo({url:'/pages/profile/profile'})}
function editBodyData(){uni.navigateTo({url:'/pages/body-data/body-data'})}
function openTrainingPlan(){uni.navigateTo({url:'/pages/training-plan/training-plan'})}
function openTrainingHistory(){uni.navigateTo({url:'/pages/training-history/training-history'})}
function addAction(){uni.navigateTo({url:'/pages/action-management/action-management'})}
function openPart(name){notice(`${name}动作列表将在后续开放`)}
function openLibrary(){uni.navigateTo({url:'/pages/action-management/action-management'})}
watch([trendSeries,themeIndex],()=>nextTick(drawWeightChart),{deep:true})
async function loadHomeSummary() {
  const requestId=++homeRequestId
  if (!uni.getStorageSync(ACCESS_TOKEN_KEY)) {
    uni.reLaunch({ url: '/pages/login/login' })
    return
  }
  homeLoading.value=true
  homeError.value=''
  try {
    const summary=await getHomeSummary()
    if(requestId!==homeRequestId)return
    homeSummary.value=summary&&typeof summary==='object'?summary:null
    if(!homeSummary.value)homeError.value='暂无首页数据，请稍后重试'
  } catch (error) {
    if(requestId!==homeRequestId)return
    if(error.statusCode!==401&&error.code!=='UNAUTHORIZED'&&error.code!=='TOKEN_EXPIRED'){
      homeError.value=error.message||'首页加载失败，请稍后重试'
    }
  } finally {
    if(requestId===homeRequestId){
      homeLoading.value=false
      nextTick(()=>setTimeout(drawWeightChart,60))
    }
  }
}
onShow(()=>{syncTheme();loadHomeSummary()})
</script>

<style scoped>
@property --accent{syntax:'<color>';inherits:true;initial-value:#7775bd}@property --accent-2{syntax:'<color>';inherits:true;initial-value:#a59bd2}
page{background:#f4f4fa}.page{position:relative;min-height:100vh;overflow:hidden;color:#283044;background:linear-gradient(145deg,var(--bg-pale),var(--bg-pale-2));transition:--accent .7s ease,--accent-2 .7s ease,background .7s ease}.theme-wave{position:fixed;z-index:1;inset:0;background:linear-gradient(145deg,var(--next-pale),var(--next-pale-2));clip-path:circle(0 at 50% 50%);will-change:clip-path;pointer-events:none;animation:themeExpand .82s cubic-bezier(.3,.7,.15,1) forwards}@keyframes themeExpand{to{clip-path:circle(75vmax at 50% 50%)}}.ambient{position:absolute;inset:0;overflow:hidden;pointer-events:none}.ambient-orb{position:absolute;border-radius:50%;filter:blur(2rpx);transition:background .7s ease}.orb-one{width:520rpx;height:520rpx;left:-250rpx;top:-230rpx;background:rgba(var(--glow-rgb),.12)}.orb-two{width:420rpx;height:420rpx;right:-210rpx;top:310rpx;background:rgba(var(--glow-rgb),.09)}.wave-line{position:absolute;left:-10%;width:120%;height:230rpx;border-top:2rpx solid rgba(var(--glow-rgb),.13);border-radius:50%;animation:floatWave 7s ease-in-out infinite}.wave-one{top:180rpx;transform:rotate(-5deg)}.wave-two{bottom:120rpx;transform:rotate(7deg);animation-delay:-3.4s}.soft-grid{position:absolute;inset:0;opacity:.2;background-image:radial-gradient(rgba(var(--glow-rgb),.45) 1rpx,transparent 1rpx);background-size:36rpx 36rpx;mask-image:linear-gradient(to bottom,#000,transparent 70%)}@keyframes floatWave{50%{opacity:.35;scale:1 1.12}}
.shell{position:relative;z-index:2;width:100%;padding:calc(var(--status-bar-height) + 26rpx) 28rpx 46rpx}.topbar{display:flex;justify-content:space-between;align-items:center}.brand{display:flex;align-items:center;gap:14rpx;color:#4d5569;font-size:23rpx;font-weight:700;letter-spacing:3rpx}.brand-mark{width:38rpx;height:38rpx;border-radius:70% 30% 70% 30%;background:linear-gradient(135deg,var(--accent) 50%,var(--accent-2) 50%);transform:rotate(-12deg)}.top-actions{display:flex;align-items:center;gap:16rpx}.theme-switch{display:flex;gap:8rpx;padding:12rpx 14rpx;border:1rpx solid rgba(255,255,255,.7);border-radius:40rpx;background:rgba(255,255,255,.55)}.theme-dot{width:13rpx;height:13rpx;border-radius:50%;background:#c8cad4}.theme-dot.active{width:30rpx;background:var(--accent)}.avatar{width:62rpx;height:62rpx;display:grid;place-items:center;border:4rpx solid rgba(255,255,255,.8);border-radius:50%;color:#fff;background:linear-gradient(135deg,var(--accent),var(--accent-2));font-size:23rpx;font-weight:700;box-shadow:0 10rpx 28rpx rgba(var(--glow-rgb),.18)}
.welcome{display:flex;justify-content:space-between;align-items:flex-end;margin:54rpx 6rpx 36rpx}.eyebrow,.headline,.date{display:block}.eyebrow{color:var(--accent);font-size:20rpx;font-weight:700;letter-spacing:4rpx}.headline{margin-top:10rpx;font-size:42rpx;font-weight:750;letter-spacing:-1rpx}.date{margin-top:12rpx;color:#858c9d;font-size:22rpx}.streak{display:flex;align-items:center;gap:12rpx;padding:17rpx 21rpx;border:1rpx solid rgba(255,255,255,.8);border-radius:22rpx;background:rgba(255,255,255,.62);box-shadow:0 12rpx 32rpx rgba(var(--glow-rgb),.09)}.streak-icon{color:var(--accent);font-size:32rpx}.streak-value,.streak-label{display:block}.streak-value{font-size:29rpx;font-weight:750}.streak-label{color:#8d93a1;font-size:18rpx}
.dashboard{display:flex;flex-direction:column;gap:24rpx}.module{padding:30rpx;border:1rpx solid rgba(255,255,255,.88);border-radius:32rpx;background:rgba(255,255,255,.78);box-shadow:0 20rpx 50rpx rgba(53,61,92,.08);backdrop-filter:blur(18rpx);transition:box-shadow .3s ease,transform .3s ease}.module-head{display:flex;justify-content:space-between;align-items:flex-start}.module-kicker,.module-title{display:block}.module-kicker{color:var(--accent);font-size:17rpx;font-weight:700;letter-spacing:3rpx}.module-title{margin-top:5rpx;font-size:32rpx;font-weight:750}.icon-button{width:54rpx;height:54rpx;margin:0;padding:0;border:0;border-radius:17rpx;color:var(--accent);background:var(--pale);font-size:31rpx;line-height:54rpx}.icon-button:after,.primary-button:after,.secondary-button:after{border:0}.pressed{opacity:.75;transform:scale(.97)}
.body-main{display:flex;align-items:center;gap:30rpx;margin:35rpx 0}.score-ring{width:164rpx;height:164rpx;display:grid;place-items:center;border-radius:50%;background:conic-gradient(var(--accent) 0 72%,rgba(var(--glow-rgb),.12) 72%)}.score-inner{width:132rpx;height:132rpx;display:grid;place-content:center;border-radius:50%;text-align:center;background:#fff}.score,.unit{display:block}.score{font-size:36rpx;font-weight:750}.unit{margin-top:2rpx;color:#9399a7;font-size:17rpx}.metrics{flex:1;display:grid;grid-template-columns:1fr 1fr;gap:15rpx}.metric{position:relative;padding:18rpx;border-radius:20rpx;background:var(--pale-2)}.metric-value,.metric-label,.trend{display:block}.metric-value{font-size:27rpx;font-weight:700}.metric-value small{font-size:17rpx;font-weight:500}.metric-label{margin-top:5rpx;color:#949aa8;font-size:18rpx}.trend{margin-top:9rpx;color:#9298a6;font-size:17rpx}.trend.positive{color:#5b9d7d}.card-footer{display:flex;justify-content:space-between;padding-top:22rpx;border-top:1rpx solid #eceef3;color:#9a9fab;font-size:18rpx}.text-action{color:var(--accent);font-weight:600}
.trend-panel{margin:20rpx 0 0;padding:18rpx;border:1rpx solid rgba(255,255,255,.9);border-radius:23rpx;background:var(--pale-2);transition:transform .25s ease}.chart-pressed{transform:scale(.985)}.trend-head{display:flex;justify-content:space-between;align-items:center}.trend-title,.trend-caption{display:block}.trend-title{font-size:20rpx;font-weight:680}.trend-caption{margin-top:3rpx;color:#979dab;font-size:15rpx}.range-switch{display:flex;align-items:center;gap:5rpx;padding:7rpx 10rpx;border-radius:14rpx;color:var(--accent);background:#fff;font-size:15rpx}.chart-layout{display:grid;grid-template-columns:45rpx 1fr;gap:7rpx;margin-top:12rpx}.y-axis{height:150rpx;display:flex;flex-direction:column;justify-content:space-between;color:#9ca1ad;font-size:14rpx;text-align:right}.chart-main{position:relative;min-width:0}.trend-canvas{width:100%;height:150rpx}.chart-empty{position:absolute;inset:0 0 25rpx;display:grid;place-content:center;justify-items:center;color:#a4a9b4;font-size:14rpx}.chart-empty text:first-child{color:var(--accent);font-size:29rpx}.x-axis{display:flex;justify-content:space-between;margin-top:5rpx;color:#9ca1ad;font-size:13rpx}.x-axis text{width:14.28%;text-align:center}.trend.negative{color:#c88074}.plan-focus{display:flex;align-items:center;gap:18rpx;margin:34rpx 0 23rpx}.plan-icon{width:72rpx;height:72rpx;display:grid;place-items:center;border-radius:22rpx;color:#fff;background:linear-gradient(135deg,var(--accent),var(--accent-2));font-size:32rpx}.plan-copy{flex:1}.plan-name,.plan-meta{display:block}.plan-name{font-size:25rpx;font-weight:700}.plan-meta{margin-top:5rpx;color:#9399a7;font-size:18rpx}.percent{color:var(--accent);font-size:23rpx;font-weight:700}.day-tag{padding:9rpx 15rpx;border-radius:20rpx;color:var(--accent);background:var(--pale);font-size:18rpx}.progress{height:9rpx;overflow:hidden;border-radius:10rpx;background:#e9ebf0}.progress-value{width:40%;height:100%;border-radius:10rpx;background:linear-gradient(90deg,var(--accent),var(--accent-2))}.steps{display:flex;justify-content:space-between;margin:27rpx 0}.step{flex:1;display:grid;justify-items:center;gap:8rpx;color:#9da2ae;font-size:16rpx;text-align:center}.step-dot{width:36rpx;height:36rpx;display:grid;place-items:center;border:2rpx solid #d7dae3;border-radius:50%;font-size:16rpx}.step.done{color:#4e5669}.step.done .step-dot{border-color:var(--accent);color:#fff;background:var(--accent)}.primary-button,.secondary-button{height:76rpx;border:0;border-radius:22rpx;font-size:23rpx;font-weight:700}.primary-button{color:#fff;background:linear-gradient(100deg,var(--accent),var(--accent-2));box-shadow:0 14rpx 30rpx rgba(var(--glow-rgb),.2)}
.library-count{display:flex;align-items:center;gap:17rpx;margin:25rpx 0}.big-number{color:var(--accent);font-size:58rpx;font-weight:760}.count-label,.count-note{display:block}.count-label{font-size:22rpx;font-weight:650}.count-note{margin-top:4rpx;color:#969caa;font-size:17rpx}.body-parts{display:grid;gap:11rpx}.part{display:flex;align-items:center;gap:14rpx;padding:14rpx;border-radius:18rpx;background:var(--pale-2)}.part-icon{width:48rpx;height:48rpx;display:grid;place-items:center;border-radius:14rpx;color:var(--accent);background:var(--pale);font-size:23rpx}.part-copy{flex:1}.part-copy text{display:block;font-size:20rpx}.part-copy text:last-child{margin-top:2rpx;color:#9a9fac;font-size:16rpx}.arrow{color:#a6abb7;font-size:30rpx}.secondary-button{margin-top:20rpx;color:var(--accent);background:var(--pale)}
.plan-card{display:flex;flex-direction:column;gap:20rpx;}.plan-card .module-head{flex-shrink:0;}.today-plan,.week-completion{flex:1;min-height:0;box-sizing:border-box;}.today-plan,.week-completion{flex:1;min-height:0;box-sizing:border-box;}.today-plan{padding:20rpx;border:1rpx solid rgba(255,255,255,.95);border-radius:24rpx;background:linear-gradient(135deg,var(--pale-2),#fff)}.plan-pressed{transform:scale(.985)}.today-plan .plan-focus{margin:0}.plan-arrow{color:var(--accent);font-size:38rpx}.plan-status{display:flex;justify-content:space-between;margin-top:18rpx;padding-top:15rpx;border-top:1rpx solid rgba(var(--glow-rgb),.12);color:#969caa;font-size:17rpx}.plan-status text:last-child{color:var(--accent);font-weight:650}.week-completion{padding:20rpx;border-radius:24rpx;background:var(--pale-2)}.completion-head{display:flex;align-items:center;justify-content:space-between}.completion-title,.completion-caption{display:block}.completion-title{font-size:21rpx;font-weight:700}.completion-caption{margin-top:4rpx;color:#999fac;font-size:16rpx}.completion-count{color:var(--accent);font-size:25rpx;font-weight:750}.completion-dots{display:flex;justify-content:space-between;margin:23rpx 0 16rpx}.completion-day{display:grid;justify-items:center;gap:9rpx;color:#a0a5b0;font-size:15rpx}.completion-day.today{color:var(--accent);font-weight:700}.completion-dot{width:32rpx;height:32rpx;display:grid;place-items:center;border:3rpx solid rgba(var(--glow-rgb),.26);border-radius:50%;color:#fff;font-size:17rpx;background:transparent;transition:background .45s ease,border-color .45s ease}.completion-dot.done{border-color:var(--accent);background:linear-gradient(135deg,var(--accent),var(--accent-2));box-shadow:0 7rpx 17rpx rgba(var(--glow-rgb),.25)}.completion-day.today .completion-dot:not(.done){border-color:var(--accent)}.history-link{display:flex;justify-content:space-between;padding-top:14rpx;border-top:1rpx solid rgba(var(--glow-rgb),.12);color:var(--accent);font-size:17rpx;font-weight:600}
@media(min-width:900px){.shell{width:min(1380px,calc(100% - 72px));margin:auto;padding:34px 0 54px}.brand{font-size:13px;gap:9px}.brand-mark{width:25px;height:25px}.top-actions{gap:12px}.theme-switch{padding:8px 10px;gap:6px}.theme-dot{width:8px;height:8px}.theme-dot.active{width:20px}.avatar{width:42px;height:42px;border-width:2px;font-size:14px}.welcome{margin:55px 4px 35px}.eyebrow{font-size:11px;letter-spacing:3px}.headline{margin-top:7px;font-size:34px}.date{margin-top:9px;font-size:12px}.dashboard{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:22px}.module{min-height:490px;padding:27px;border-radius:28px}.module:hover{transform:translateY(-4px);box-shadow:0 28px 65px rgba(53,61,92,.13)}.module-kicker{font-size:10px;letter-spacing:2px}.module-title{font-size:24px}.icon-button{width:38px;height:38px;border-radius:12px;font-size:22px;line-height:38px}.body-main{gap:20px;margin:34px 0}.score-ring{width:118px;height:118px}.score-inner{width:94px;height:94px}.score{font-size:26px}.unit{font-size:10px}.metrics{gap:10px}.metric{padding:13px}.metric-value{font-size:18px}.metric-value small,.metric-label,.trend{font-size:10px}.card-footer{padding-top:18px;font-size:10px}.trend-panel{margin-top:17px;padding:14px;border-radius:18px}.trend-title{font-size:13px}.trend-caption{font-size:9px}.range-switch{padding:5px 8px;border-radius:10px;font-size:9px}.chart-layout{grid-template-columns:31px 1fr;gap:5px;margin-top:9px}.y-axis{height:112px;font-size:9px}.trend-canvas{height:112px}.x-axis{margin-top:4px;font-size:8px}.chart-empty{inset:0 0 18px;font-size:9px}.chart-empty text:first-child{font-size:20px}.plan-focus{gap:13px;margin:31px 0 21px}.plan-icon{width:52px;height:52px;border-radius:16px;font-size:22px}.plan-name{font-size:17px}.plan-meta{font-size:10px}.percent{font-size:15px}.day-tag{padding:6px 11px;font-size:10px}.progress{height:6px}.steps{margin:25px 0}.step{font-size:10px}.step-dot{width:27px;height:27px;font-size:10px}.primary-button,.secondary-button{height:48px;border-radius:15px;font-size:13px}.library-count{gap:13px;margin:22px 0}.big-number{font-size:42px}.count-label{font-size:14px}.count-note{font-size:10px}.body-parts{gap:9px}.part{gap:11px;padding:11px}.part-icon{width:37px;height:37px;border-radius:11px;font-size:16px}.part-copy text{font-size:13px}.part-copy text:last-child{font-size:10px}.arrow{font-size:21px}.secondary-button{margin-top:18px}}
</style>
