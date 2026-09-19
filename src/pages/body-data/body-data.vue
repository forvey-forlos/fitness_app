<template>
  <view class="page" :style="themeStyle">
    <view class="ambient" aria-hidden="true"><view class="blob blob-one"/><view class="blob blob-two"/><view class="dot-field"/></view>
    <view class="shell">
      <view class="topbar">
        <view class="back" hover-class="pressed" @tap="goBack"><text>‹</text><text>返回首页</text></view>
        <view class="brand"><view class="brand-mark"/><text>FIT NOTE</text></view>
        <view class="sync-badge"><view class="sync-dot"/><text>{{ syncText }}</text></view>
      </view>

      <view class="hero">
        <view><text class="eyebrow">BODY PROFILE</text><text class="title">身体数据</text><text class="subtitle">用数据看见改变，也别忘了享受过程</text></view>
        <view class="completion"><view class="completion-icon">⌁</view><view><text class="completion-value">{{ totalCount }}</text><text class="completion-label">项身体指标</text></view></view>
      </view>

      <view class="data-grid">
        <view class="section circumference">
          <view class="section-head">
            <view class="section-title-wrap"><view class="section-icon ruler">↕</view><view><text class="section-kicker">MEASUREMENTS</text><text class="section-title">体型与围度</text></view></view>
            <text class="section-count">{{ circumferenceMetrics.length + 1 }} 项</text>
          </view>
          <text class="section-desc">记录身高和身体各部位围度，单位统一为厘米</text>

          <view class="primary-metric bouncy" hover-class="card-pressed" @tap="editMetric('height', heightMetric)">
            <view class="metric-visual height-visual"><text>↕</text></view>
            <view class="primary-copy"><text class="primary-name">身高</text><view><text class="primary-value">{{ heightMetric.value || '--' }}</text><text class="primary-unit">cm</text></view><text class="primary-note">基本数据 · 点击修改</text></view>
            <text class="edit-arrow">›</text>
          </view>

          <view class="optional-grid">
            <view v-for="metric in circumferenceMetrics" :key="metric.key" class="metric-card bouncy" hover-class="card-pressed" @tap="editMetric('circumference',metric)">
              <view class="metric-top"><view class="mini-icon">{{ metric.icon }}</view><text class="remove" @tap.stop="removeMetric('circumference',metric)">×</text></view>
              <text class="metric-name">{{ metric.name }}</text><view><text class="metric-number">{{ metric.value || '--' }}</text><text class="metric-unit">{{ metric.unit }}</text></view>
            </view>
            <view class="add-card bouncy" hover-class="card-pressed" @tap="addMetric('circumference')"><view class="add-circle">＋</view><text>添加围度</text></view>
          </view>
        </view>

        <view class="section composition">
          <view class="section-head">
            <view class="section-title-wrap"><view class="section-icon scale">◌</view><view><text class="section-kicker">COMPOSITION</text><text class="section-title">体重与身体成分</text></view></view>
            <text class="section-count">{{ compositionMetrics.length + 1 }} 项</text>
          </view>
          <text class="section-desc">录入体重及体脂秤测量出的身体成分数据</text>

          <view class="primary-metric bouncy" hover-class="card-pressed" @tap="editMetric('weight', weightMetric)">
            <view class="metric-visual weight-visual"><text>◇</text></view>
            <view class="primary-copy"><text class="primary-name">体重</text><view><text class="primary-value">{{ weightMetric.value || '--' }}</text><text class="primary-unit">kg</text></view><text class="primary-note">基本数据 · 点击修改</text></view>
            <text class="edit-arrow">›</text>
          </view>

          <view class="optional-grid">
            <view v-for="metric in compositionMetrics" :key="metric.key" class="metric-card bouncy" hover-class="card-pressed" @tap="editMetric('composition',metric)">
              <view class="metric-top"><view class="mini-icon composition-icon">{{ metric.icon }}</view><text class="remove" @tap.stop="removeMetric('composition',metric)">×</text></view>
              <text class="metric-name">{{ metric.name }}</text><view><text class="metric-number">{{ metric.value || '--' }}</text><text class="metric-unit">{{ metric.unit }}</text></view>
            </view>
            <view class="add-card composition-add bouncy" hover-class="card-pressed" @tap="addMetric('composition')"><view class="add-circle">＋</view><text>添加成分</text></view>
          </view>
        </view>

        <view class="section circumference">
          <view class="section-head">
            <view class="section-title-wrap"><view class="section-icon ruler">≋</view><view><text class="section-kicker">HISTORY</text><text class="section-title">测量历史</text></view></view>
            <text class="section-count">{{ measurements.length }} 条</text>
          </view>
          <text class="section-desc">正式记录已同步到账号，点击记录可编辑或删除</text>
          <view class="primary-metric bouncy" hover-class="card-pressed" @tap="addMeasurement">
            <view class="metric-visual height-visual"><text>＋</text></view>
            <view class="primary-copy"><text class="primary-name">新增一次测量</text><text class="primary-note">选择一项身体指标并记录</text></view>
            <text class="edit-arrow">›</text>
          </view>
          <view v-if="historyLoading" class="section-desc">正在加载测量历史…</view>
          <view v-else-if="!measurements.length" class="section-desc">暂无测量记录</view>
          <view v-else class="optional-grid">
            <view v-for="item in measurements" :key="item.id" class="metric-card bouncy" hover-class="card-pressed" @tap="manageMeasurement(item)">
              <view class="metric-top"><view class="mini-icon">◷</view><text class="remove">›</text></view>
              <text class="metric-name">{{ formatMeasuredAt(item.measuredAt) }}</text>
              <view><text class="metric-number">{{ measurementSummary(item) }}</text></view>
            </view>
          </view>
        </view>

        <view class="section composition">
          <view class="section-head">
            <view class="section-title-wrap"><view class="section-icon scale">⌁</view><view><text class="section-kicker">WEIGHT TREND</text><text class="section-title">体重趋势</text></view></view>
            <text class="section-count" @tap="toggleTrend">{{ trendRange === 'week' ? '周' : '月' }} ↻</text>
          </view>
          <text class="section-desc">{{ trendRange === 'week' ? '最近 7 天每日记录' : '最近 6 个月月度记录' }}</text>
          <view v-if="trendLoading" class="section-desc">正在加载趋势…</view>
          <view v-else-if="!trend.points.length" class="section-desc">暂无体重趋势数据</view>
          <view v-else class="optional-grid">
            <view v-for="point in trend.points" :key="point.date" class="metric-card">
              <view class="metric-top"><view class="mini-icon composition-icon">kg</view></view>
              <text class="metric-name">{{ point.date }}</text>
              <view><text class="metric-number">{{ point.value ?? '--' }}</text><text class="metric-unit">kg</text></view>
            </view>
          </view>
          <view v-if="trend.current !== null" class="primary-metric">
            <view class="metric-visual weight-visual"><text>◇</text></view>
            <view class="primary-copy"><text class="primary-name">当前 {{ trend.current }} kg</text><text class="primary-note">{{ trend.change === null ? '只有一条记录，暂无变化值' : `变化 ${trend.change > 0 ? '+' : ''}${trend.change} kg` }}</text></view>
          </view>
        </view>
      </view>
      <view class="footer-tip" @tap="loadAll"><text>{{ loadError ? '!' : '✓' }}</text><text>{{ loadError || '身体档案、测量与趋势已同步到当前账号' }}</text></view>
    </view>
  </view>
</template>

<script setup>
import { computed, reactive, ref } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import {
  createMeasurement, deleteMeasurement, getBodyProfile, getMeasurements,
  getWeightTrend, updateBodyProfile, updateMeasurement
} from '../../api/body'

const THEME_STORAGE_KEY='fit_note_theme_index'
const DATA_STORAGE_KEY='fit_note_body_profile'
const themes=[
  {accent:'#7775bd',accent2:'#a59bd2',pale:'#f1f0f9',pale2:'#faf9fd',glow:'119,117,189'},
  {accent:'#5f9fa5',accent2:'#8bbdaf',pale:'#edf6f5',pale2:'#f8fbfa',glow:'95,159,165'},
  {accent:'#bd8073',accent2:'#cda56f',pale:'#faf1ed',pale2:'#fdf9f5',glow:'189,128,115'}
]
const profileKeys=['height','weight','waist','chest','hip','shoulderWidth','thigh','upperArm','calf']
const measurementKeys=profileKeys.filter(key=>key!=='height')
const savedTheme=Number(uni.getStorageSync(THEME_STORAGE_KEY))
const themeIndex=ref(Number.isInteger(savedTheme)&&savedTheme>=0&&savedTheme<themes.length?savedTheme:0)
const themeStyle=computed(()=>{const t=themes[themeIndex.value];return{'--accent':t.accent,'--accent-2':t.accent2,'--pale':t.pale,'--pale-2':t.pale2,'--glow-rgb':t.glow}})
const circumferenceOptions=[
  {key:'shoulderWidth',name:'肩宽',unit:'cm',icon:'↔'},{key:'chest',name:'胸围',unit:'cm',icon:'○'},{key:'waist',name:'腰围',unit:'cm',icon:'⌁'},{key:'hip',name:'臀围',unit:'cm',icon:'∞'},
  {key:'upperArm',name:'大臂围',unit:'cm',icon:'⌇'},{key:'thigh',name:'大腿围',unit:'cm',icon:'△'},{key:'calf',name:'小腿围',unit:'cm',icon:'◇'}
]
const compositionOptions=[
  {key:'bodyFat',name:'体脂率',unit:'%',icon:'%'},{key:'muscle',name:'肌肉率',unit:'%',icon:'M'},{key:'water',name:'水分率',unit:'%',icon:'≈'},{key:'bone',name:'骨量',unit:'kg',icon:'B'},
  {key:'visceralFat',name:'内脏脂肪',unit:'级',icon:'V'},{key:'protein',name:'蛋白质',unit:'%',icon:'P'},{key:'bmr',name:'基础代谢',unit:'kcal',icon:'↯'},{key:'bodyAge',name:'身体年龄',unit:'岁',icon:'A'}
]
const saved=uni.getStorageSync(DATA_STORAGE_KEY)||{}
const legacyCircumference=Array.isArray(saved.circumference)?saved.circumference:[]
const visibleCircumferenceKeys=Array.isArray(saved.visibleCircumferenceKeys)
  ? saved.visibleCircumferenceKeys
  : legacyCircumference.map(item=>item.key==='shoulder'?'shoulderWidth':item.key)
const heightMetric=reactive({key:'height',name:'身高',unit:'cm',value:''})
const weightMetric=reactive({key:'weight',name:'体重',unit:'kg',value:''})
const circumferenceMetrics=ref(circumferenceOptions.filter(item=>visibleCircumferenceKeys.includes(item.key)).map(item=>({...item,value:''})))
const compositionMetrics=ref(Array.isArray(saved.composition)?saved.composition:[])
const profile=reactive(Object.fromEntries([...profileKeys.map(key=>[key,null]),['version',0]]))
const measurements=ref([])
const trend=ref({current:null,change:null,points:[]})
const trendRange=ref('week')
const loading=ref(false)
const historyLoading=ref(false)
const trendLoading=ref(false)
const saving=ref(false)
const loadError=ref('')
const totalCount=computed(()=>2+circumferenceMetrics.value.length+compositionMetrics.value.length)
const syncText=computed(()=>saving.value?'正在保存':loading.value?'正在同步':loadError.value?'同步失败':'云端已同步')

function persistUi(){
  uni.setStorageSync(DATA_STORAGE_KEY,{
    visibleCircumferenceKeys:circumferenceMetrics.value.map(item=>item.key),
    composition:compositionMetrics.value
  })
}
function applyProfile(data){
  for(const key of profileKeys)profile[key]=data?.[key]??null
  profile.version=Number(data?.version||0)
  heightMetric.value=profile.height??''
  weightMetric.value=profile.weight??''
  circumferenceMetrics.value.forEach(metric=>{metric.value=profile[metric.key]??''})
}
function profilePayload(changes={}){
  return Object.fromEntries([
    ...profileKeys.map(key=>[key,Object.hasOwn(changes,key)?changes[key]:profile[key]]),
    ['version',profile.version]
  ])
}
function showError(error,fallback='请求失败'){
  loadError.value=error?.message||fallback
  uni.showToast({title:loadError.value,icon:'none'})
}
async function loadProfile(){applyProfile(await getBodyProfile())}
async function loadHistory(){
  historyLoading.value=true
  try{const result=await getMeasurements({page:1,pageSize:50});measurements.value=Array.isArray(result?.items)?result.items:[]}
  finally{historyLoading.value=false}
}
async function loadTrend(){
  trendLoading.value=true
  try{const result=await getWeightTrend(trendRange.value);trend.value={current:result?.current??null,change:result?.change??null,points:Array.isArray(result?.points)?result.points:[]}}
  finally{trendLoading.value=false}
}
async function loadAll(){
  if(loading.value)return
  loading.value=true;loadError.value=''
  try{await Promise.all([loadProfile(),loadHistory(),loadTrend()])}
  catch(error){showError(error,'身体数据加载失败')}
  finally{loading.value=false}
}
async function saveProfile(changes){
  if(saving.value)return false
  saving.value=true
  try{
    applyProfile(await updateBodyProfile(profilePayload(changes)))
    uni.showToast({title:'保存成功',icon:'success'})
    return true
  }catch(error){showError(error,'身体档案保存失败');await loadProfile().catch(()=>{});return false}
  finally{saving.value=false}
}
function numericInput(metric,callback){
  uni.showModal({title:`记录${metric.name}`,editable:true,placeholderText:`请输入${metric.name}（${metric.unit}）`,content:metric.value!==''&&metric.value!==null?String(metric.value):'',success:async result=>{
    if(!result.confirm)return
    const raw=String(result.content||'').trim(),value=Number(raw)
    if(!/^\d+(\.\d{1,2})?$/.test(raw)||!Number.isFinite(value)||value<=0){uni.showToast({title:'请输入正确的正数，最多两位小数',icon:'none'});return}
    await callback(value)
  }})
}
function editMetric(type,metric){
  if(type==='composition'){
    numericInput(metric,async value=>{metric.value=value;persistUi();uni.showToast({title:'草稿已保存',icon:'success'})})
    return
  }
  numericInput(metric,value=>saveProfile({[metric.key]:value}))
}
function optionsFor(type){
  const source=type==='circumference'?circumferenceOptions:compositionOptions
  const active=type==='circumference'?circumferenceMetrics.value:compositionMetrics.value
  return source.filter(item=>!active.some(metric=>metric.key===item.key))
}
function addMetric(type){
  const available=optionsFor(type)
  if(!available.length){uni.showToast({title:'所有项目都已添加',icon:'none'});return}
  uni.showActionSheet({itemList:available.map(item=>item.name),success:({tapIndex})=>{
    const item={...available[tapIndex],value:type==='circumference'?(profile[available[tapIndex].key]??''):''}
    ;(type==='circumference'?circumferenceMetrics.value:compositionMetrics.value).push(item)
    persistUi();setTimeout(()=>editMetric(type,item),180)
  }})
}
function removeMetric(type,metric){
  uni.showModal({title:`移除${metric.name}？`,content:type==='composition'?'仅移除当前设备上的草稿。':'同时清空云端身体档案中的该项数据。',success:async result=>{
    if(!result.confirm)return
    if(type==='circumference'&&!await saveProfile({[metric.key]:null}))return
    const list=type==='circumference'?circumferenceMetrics:compositionMetrics
    list.value=list.value.filter(item=>item.key!==metric.key);persistUi()
  }})
}
function metricMeta(key){return [weightMetric,...circumferenceOptions].find(item=>item.key===key)}
function chooseMetric(keys,callback){
  const available=keys.map(metricMeta).filter(Boolean)
  uni.showActionSheet({itemList:available.map(item=>item.name),success:({tapIndex})=>callback(available[tapIndex])})
}
function addMeasurement(){
  chooseMetric(measurementKeys,metric=>numericInput(metric,async value=>{
    try{
      const key='body-'+Date.now()+'-'+Math.random().toString(36).slice(2,10)
      await createMeasurement({measuredAt:new Date().toISOString(),[metric.key]:value},key)
      await Promise.all([loadHistory(),loadTrend()])
      uni.showToast({title:'测量已记录',icon:'success'})
    }catch(error){showError(error,'测量记录创建失败')}
  }))
}
function manageMeasurement(item){
  uni.showActionSheet({itemList:['编辑记录','删除记录'],success:({tapIndex})=>{
    if(tapIndex===0)editMeasurement(item)
    else confirmDeleteMeasurement(item)
  }})
}
function editMeasurement(item){
  const keys=measurementKeys.filter(key=>item[key]!==null&&item[key]!==undefined)
  chooseMetric(keys.length?keys:measurementKeys,metric=>numericInput({...metric,value:item[metric.key]??''},async value=>{
    try{
      await updateMeasurement(item.id,{version:item.version,[metric.key]:value})
      await Promise.all([loadHistory(),loadTrend()])
      uni.showToast({title:'记录已更新',icon:'success'})
    }catch(error){showError(error,'测量记录更新失败')}
  }))
}
function confirmDeleteMeasurement(item){
  uni.showModal({title:'删除这条测量记录？',content:formatMeasuredAt(item.measuredAt),success:async result=>{
    if(!result.confirm)return
    try{await deleteMeasurement(item.id);await Promise.all([loadHistory(),loadTrend()]);uni.showToast({title:'已删除',icon:'success'})}
    catch(error){showError(error,'测量记录删除失败')}
  }})
}
function formatMeasuredAt(value){
  if(!value)return'未知时间'
  try{return new Intl.DateTimeFormat('zh-CN',{year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit'}).format(new Date(value))}
  catch(_){return String(value).slice(0,16).replace('T',' ')}
}
function measurementSummary(item){
  const values=measurementKeys.filter(key=>item[key]!==null&&item[key]!==undefined).slice(0,2)
    .map(key=>`${metricMeta(key)?.name||key} ${item[key]}`)
  return values.join(' · ')||'空记录'
}
async function toggleTrend(){trendRange.value=trendRange.value==='week'?'month':'week';try{await loadTrend()}catch(error){showError(error,'趋势加载失败')}}
function goBack(){uni.navigateBack({fail:()=>uni.reLaunch({url:'/pages/home/home'})})}
function syncTheme(){const value=Number(uni.getStorageSync(THEME_STORAGE_KEY));if(Number.isInteger(value)&&value>=0&&value<themes.length)themeIndex.value=value}
onShow(()=>{syncTheme();loadAll()})
</script>

<style scoped>
@property --accent{syntax:'<color>';inherits:true;initial-value:#7775bd}@property --accent-2{syntax:'<color>';inherits:true;initial-value:#a59bd2}
page{background:#f5f5fa}.page{position:relative;min-height:100vh;overflow:hidden;color:#293044;background:linear-gradient(145deg,var(--pale),var(--pale-2));transition:--accent .7s ease,--accent-2 .7s ease}.ambient{position:absolute;inset:0;overflow:hidden;pointer-events:none}.blob{position:absolute;border-radius:48% 52% 68% 32%;background:rgba(var(--glow-rgb),.1)}.blob-one{width:520rpx;height:520rpx;left:-250rpx;top:-210rpx;transform:rotate(22deg)}.blob-two{width:430rpx;height:430rpx;right:-220rpx;top:520rpx;transform:rotate(-18deg)}.dot-field{position:absolute;inset:0;opacity:.17;background-image:radial-gradient(rgba(var(--glow-rgb),.55) 1rpx,transparent 1rpx);background-size:35rpx 35rpx;mask-image:linear-gradient(#000,transparent 80%)}.shell{position:relative;z-index:2;padding:calc(var(--status-bar-height) + 22rpx) 28rpx 48rpx}.topbar{display:grid;grid-template-columns:1fr auto 1fr;align-items:center}.back{display:flex;align-items:center;gap:7rpx;color:#697084;font-size:22rpx}.back text:first-child{font-size:45rpx;line-height:1}.brand{display:flex;align-items:center;gap:12rpx;color:#535b6e;font-size:21rpx;font-weight:700;letter-spacing:3rpx}.brand-mark{width:34rpx;height:34rpx;border-radius:70% 30% 70% 30%;background:linear-gradient(135deg,var(--accent) 50%,var(--accent-2) 50%);transform:rotate(-12deg)}.sync-badge{justify-self:end;display:flex;align-items:center;gap:8rpx;padding:10rpx 13rpx;border-radius:20rpx;color:#8d93a2;background:rgba(255,255,255,.6);font-size:17rpx}.sync-dot{width:9rpx;height:9rpx;border-radius:50%;background:var(--accent);box-shadow:0 0 12rpx rgba(var(--glow-rgb),.5)}.hero{display:flex;justify-content:space-between;align-items:flex-end;margin:48rpx 5rpx 31rpx}.eyebrow,.title,.subtitle{display:block}.eyebrow{color:var(--accent);font-size:18rpx;font-weight:700;letter-spacing:4rpx}.title{margin-top:7rpx;font-size:47rpx;font-weight:760}.subtitle{margin-top:9rpx;color:#858c9d;font-size:21rpx}.completion{display:flex;align-items:center;gap:12rpx;padding:14rpx 18rpx;border:1rpx solid rgba(255,255,255,.9);border-radius:22rpx;background:rgba(255,255,255,.65);box-shadow:0 12rpx 28rpx rgba(60,68,98,.07)}.completion-icon{width:47rpx;height:47rpx;display:grid;place-items:center;border-radius:15rpx;color:#fff;background:linear-gradient(135deg,var(--accent),var(--accent-2))}.completion-value,.completion-label{display:block}.completion-value{font-size:25rpx;font-weight:750}.completion-label{color:#9298a6;font-size:16rpx}.data-grid{display:flex;flex-direction:column;gap:24rpx}.section{padding:29rpx;border:1rpx solid rgba(255,255,255,.9);border-radius:34rpx;background:rgba(255,255,255,.8);box-shadow:0 20rpx 50rpx rgba(48,56,88,.08);backdrop-filter:blur(18rpx)}.section-head,.section-title-wrap{display:flex;align-items:center}.section-head{justify-content:space-between}.section-title-wrap{gap:15rpx}.section-icon{width:59rpx;height:59rpx;display:grid;place-items:center;border-radius:19rpx;color:#fff;background:linear-gradient(135deg,var(--accent),var(--accent-2));font-size:28rpx;box-shadow:0 10rpx 20rpx rgba(var(--glow-rgb),.18)}.scale{border-radius:50%}.section-kicker,.section-title,.section-desc{display:block}.section-kicker{color:var(--accent);font-size:15rpx;font-weight:700;letter-spacing:3rpx}.section-title{margin-top:3rpx;font-size:29rpx;font-weight:750}.section-count{padding:7rpx 13rpx;border-radius:15rpx;color:var(--accent);background:var(--pale);font-size:17rpx}.section-desc{margin:18rpx 0 22rpx;color:#9096a5;font-size:19rpx}.primary-metric{position:relative;display:flex;align-items:center;gap:20rpx;padding:23rpx;border-radius:27rpx;background:linear-gradient(120deg,var(--pale),var(--pale-2));box-shadow:inset 0 0 0 1rpx rgba(255,255,255,.75)}.metric-visual{width:90rpx;height:90rpx;display:grid;place-items:center;border-radius:28rpx;color:var(--accent);background:#fff;font-size:38rpx;box-shadow:0 12rpx 25rpx rgba(var(--glow-rgb),.12)}.weight-visual{border-radius:50%}.primary-copy{flex:1}.primary-name,.primary-note{display:block}.primary-name{font-size:21rpx;font-weight:650}.primary-value{font-size:42rpx;font-weight:770}.primary-unit{margin-left:7rpx;color:#858c9c;font-size:18rpx}.primary-note{margin-top:4rpx;color:#959ba8;font-size:16rpx}.edit-arrow{color:var(--accent);font-size:42rpx}.optional-grid{display:grid;grid-template-columns:repeat(2,1fr);gap:13rpx;margin-top:18rpx}.metric-card,.add-card{min-height:154rpx;padding:18rpx;border-radius:23rpx;background:#fff;box-shadow:0 9rpx 24rpx rgba(47,55,86,.06)}.metric-top{display:flex;justify-content:space-between}.mini-icon,.add-circle{width:38rpx;height:38rpx;display:grid;place-items:center;border-radius:12rpx;color:var(--accent);background:var(--pale);font-size:18rpx}.composition-icon{border-radius:50%}.remove{padding:0 5rpx;color:#b2b6c1;font-size:25rpx}.metric-name{display:block;margin:11rpx 0 3rpx;color:#7a8293;font-size:17rpx}.metric-number{font-size:26rpx;font-weight:720}.metric-unit{margin-left:5rpx;color:#9a9fac;font-size:15rpx}.add-card{display:grid;place-content:center;justify-items:center;gap:9rpx;color:var(--accent);border:2rpx dashed rgba(var(--glow-rgb),.28);background:rgba(var(--glow-rgb),.035);font-size:18rpx}.add-circle{width:43rpx;height:43rpx;border-radius:50%;color:#fff;background:linear-gradient(135deg,var(--accent),var(--accent-2));font-size:25rpx}.bouncy{transition:transform .28s cubic-bezier(.2,1.6,.4,1),box-shadow .28s ease}.card-pressed{transform:scale(.965)}.footer-tip{display:flex;justify-content:center;gap:8rpx;margin-top:25rpx;color:#9a9fac;font-size:17rpx}.footer-tip text:first-child{color:var(--accent)}.pressed{opacity:.65}
@media(min-width:900px){.shell{width:min(1280px,calc(100% - 70px));margin:auto;padding:28px 0 46px}.back{gap:5px;font-size:11px}.back text:first-child{font-size:29px}.brand{gap:8px;font-size:12px}.brand-mark{width:23px;height:23px}.sync-badge{gap:6px;padding:7px 10px;font-size:10px}.sync-dot{width:6px;height:6px}.hero{margin:44px 4px 27px}.eyebrow{font-size:10px;letter-spacing:3px}.title{font-size:35px}.subtitle{font-size:12px}.completion{gap:9px;padding:10px 14px;border-radius:16px}.completion-icon{width:35px;height:35px;border-radius:11px}.completion-value{font-size:17px}.completion-label{font-size:10px}.data-grid{display:grid;grid-template-columns:1fr 1fr;align-items:start;gap:22px}.section{min-height:570px;padding:27px;border-radius:28px}.section-title-wrap{gap:12px}.section-icon{width:44px;height:44px;border-radius:14px;font-size:20px}.section-kicker{font-size:9px;letter-spacing:2px}.section-title{font-size:22px}.section-count{padding:5px 10px;font-size:10px}.section-desc{margin:15px 0 20px;font-size:11px}.primary-metric{gap:15px;padding:18px;border-radius:21px}.metric-visual{width:67px;height:67px;border-radius:21px;font-size:28px}.primary-name{font-size:13px}.primary-value{font-size:31px}.primary-unit{font-size:11px}.primary-note{font-size:10px}.edit-arrow{font-size:30px}.optional-grid{grid-template-columns:repeat(3,1fr);gap:10px;margin-top:15px}.metric-card,.add-card{min-height:116px;padding:14px;border-radius:18px}.mini-icon{width:29px;height:29px;border-radius:9px;font-size:13px}.remove{font-size:18px}.metric-name{margin:8px 0 3px;font-size:10px}.metric-number{font-size:19px}.metric-unit{font-size:9px}.add-card{gap:7px;font-size:11px}.add-circle{width:32px;height:32px;font-size:19px}.footer-tip{margin-top:21px;font-size:10px}.bouncy:hover{transform:translateY(-3px);box-shadow:0 15px 35px rgba(47,55,86,.1)}}
</style>
