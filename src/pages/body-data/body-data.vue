<template>
  <view class="page" :style="themeStyle">
    <view class="ambient" aria-hidden="true"><view class="blob blob-one"/><view class="blob blob-two"/><view class="dot-field"/></view>
    <view class="shell">
      <view class="topbar">
        <view class="back" hover-class="pressed" @tap="goBack"><text>‹</text><text>返回首页</text></view>
        <view class="brand"><view class="brand-mark"/><text>FIT NOTE</text></view>
        <view class="sync-badge"><view class="sync-dot"/><text>主题已同步</text></view>
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
      </view>
      <view class="footer-tip"><text>✓</text><text>数据仅保存在当前设备，后续可接入云端同步</text></view>
    </view>
  </view>
</template>

<script setup>
import { computed, reactive, ref } from 'vue'
import { onShow } from '@dcloudio/uni-app'

const THEME_STORAGE_KEY='fit_note_theme_index'
const DATA_STORAGE_KEY='fit_note_body_profile'
const themes=[
  {accent:'#7775bd',accent2:'#a59bd2',pale:'#f1f0f9',pale2:'#faf9fd',glow:'119,117,189'},
  {accent:'#5f9fa5',accent2:'#8bbdaf',pale:'#edf6f5',pale2:'#f8fbfa',glow:'95,159,165'},
  {accent:'#bd8073',accent2:'#cda56f',pale:'#faf1ed',pale2:'#fdf9f5',glow:'189,128,115'}
]
const savedTheme=Number(uni.getStorageSync(THEME_STORAGE_KEY))
const themeIndex=ref(Number.isInteger(savedTheme)&&savedTheme>=0&&savedTheme<themes.length?savedTheme:0)
const themeStyle=computed(()=>{const t=themes[themeIndex.value];return{'--accent':t.accent,'--accent-2':t.accent2,'--pale':t.pale,'--pale-2':t.pale2,'--glow-rgb':t.glow}})

const circumferenceOptions=[
  {key:'shoulder',name:'肩宽',unit:'cm',icon:'↔'},{key:'chest',name:'胸围',unit:'cm',icon:'○'},{key:'waist',name:'腰围',unit:'cm',icon:'⌁'},{key:'hip',name:'臀围',unit:'cm',icon:'∞'},
  {key:'upperArm',name:'大臂围',unit:'cm',icon:'⌇'},{key:'thigh',name:'大腿围',unit:'cm',icon:'△'},{key:'calf',name:'小腿围',unit:'cm',icon:'◇'}
]
const compositionOptions=[
  {key:'bodyFat',name:'体脂率',unit:'%',icon:'%'},{key:'muscle',name:'肌肉率',unit:'%',icon:'M'},{key:'water',name:'水分率',unit:'%',icon:'≈'},{key:'bone',name:'骨量',unit:'kg',icon:'B'},
  {key:'visceralFat',name:'内脏脂肪',unit:'级',icon:'V'},{key:'protein',name:'蛋白质',unit:'%',icon:'P'},{key:'bmr',name:'基础代谢',unit:'kcal',icon:'↯'},{key:'bodyAge',name:'身体年龄',unit:'岁',icon:'A'}
]
const saved=uni.getStorageSync(DATA_STORAGE_KEY)||{}
const heightMetric=reactive({key:'height',name:'身高',unit:'cm',value:saved.height||''})
const weightMetric=reactive({key:'weight',name:'体重',unit:'kg',value:saved.weight||''})
const circumferenceMetrics=ref(Array.isArray(saved.circumference)?saved.circumference:[])
const compositionMetrics=ref(Array.isArray(saved.composition)?saved.composition:[])
const weightHistory=ref(Array.isArray(saved.weightHistory)?saved.weightHistory:[])
const totalCount=computed(()=>2+circumferenceMetrics.value.length+compositionMetrics.value.length)

function dateKey(date=new Date()){const year=date.getFullYear(),month=String(date.getMonth()+1).padStart(2,'0'),day=String(date.getDate()).padStart(2,'0');return year+'-'+month+'-'+day}
function recordWeight(value){const today=dateKey();const existing=weightHistory.value.find(item=>item.date===today);if(existing){existing.value=Number(value);existing.timestamp=Date.now()}else{weightHistory.value.push({date:today,value:Number(value),timestamp:Date.now()})}weightHistory.value=weightHistory.value.sort((a,b)=>(a.timestamp||0)-(b.timestamp||0)).slice(-730)}
function persist(){uni.setStorageSync(DATA_STORAGE_KEY,{height:heightMetric.value,weight:weightMetric.value,circumference:circumferenceMetrics.value,composition:compositionMetrics.value,weightHistory:weightHistory.value})}
function goBack(){uni.navigateBack({fail:()=>uni.reLaunch({url:'/pages/home/home'})})}
function syncTheme(){const value=Number(uni.getStorageSync(THEME_STORAGE_KEY));if(Number.isInteger(value)&&value>=0&&value<themes.length)themeIndex.value=value}
function optionsFor(type){const source=type==='circumference'?circumferenceOptions:compositionOptions;const active=type==='circumference'?circumferenceMetrics.value:compositionMetrics.value;return source.filter(item=>!active.some(metric=>metric.key===item.key))}
function addMetric(type){const available=optionsFor(type);if(!available.length){uni.showToast({title:'所有项目都已添加',icon:'none'});return}uni.showActionSheet({itemList:available.map(item=>item.name),success:({tapIndex})=>{const item={...available[tapIndex],value:''};(type==='circumference'?circumferenceMetrics.value:compositionMetrics.value).push(item);persist();setTimeout(()=>editMetric(type,item),180)}})}
function editMetric(type,metric){uni.showModal({title:`记录${metric.name}`,editable:true,placeholderText:`请输入${metric.name}（${metric.unit}）`,content:metric.value?String(metric.value):'',success:result=>{if(!result.confirm)return;const value=String(result.content||'').trim();if(!/^\d+(\.\d{1,2})?$/.test(value)||Number(value)<=0){uni.showToast({title:'请输入正确的正数，最多两位小数',icon:'none'});return}metric.value=value;if(metric.key==='weight')recordWeight(value);persist();uni.showToast({title:'记录成功',icon:'success'})}})}
function removeMetric(type,metric){uni.showModal({title:`移除${metric.name}？`,content:'已填写的数据也会同时移除。',success:result=>{if(!result.confirm)return;const list=type==='circumference'?circumferenceMetrics:compositionMetrics;list.value=list.value.filter(item=>item.key!==metric.key);persist()}})}
onShow(syncTheme)
</script>

<style scoped>
@property --accent{syntax:'<color>';inherits:true;initial-value:#7775bd}@property --accent-2{syntax:'<color>';inherits:true;initial-value:#a59bd2}
page{background:#f5f5fa}.page{position:relative;min-height:100vh;overflow:hidden;color:#293044;background:linear-gradient(145deg,var(--pale),var(--pale-2));transition:--accent .7s ease,--accent-2 .7s ease}.ambient{position:absolute;inset:0;overflow:hidden;pointer-events:none}.blob{position:absolute;border-radius:48% 52% 68% 32%;background:rgba(var(--glow-rgb),.1)}.blob-one{width:520rpx;height:520rpx;left:-250rpx;top:-210rpx;transform:rotate(22deg)}.blob-two{width:430rpx;height:430rpx;right:-220rpx;top:520rpx;transform:rotate(-18deg)}.dot-field{position:absolute;inset:0;opacity:.17;background-image:radial-gradient(rgba(var(--glow-rgb),.55) 1rpx,transparent 1rpx);background-size:35rpx 35rpx;mask-image:linear-gradient(#000,transparent 80%)}.shell{position:relative;z-index:2;padding:calc(var(--status-bar-height) + 22rpx) 28rpx 48rpx}.topbar{display:grid;grid-template-columns:1fr auto 1fr;align-items:center}.back{display:flex;align-items:center;gap:7rpx;color:#697084;font-size:22rpx}.back text:first-child{font-size:45rpx;line-height:1}.brand{display:flex;align-items:center;gap:12rpx;color:#535b6e;font-size:21rpx;font-weight:700;letter-spacing:3rpx}.brand-mark{width:34rpx;height:34rpx;border-radius:70% 30% 70% 30%;background:linear-gradient(135deg,var(--accent) 50%,var(--accent-2) 50%);transform:rotate(-12deg)}.sync-badge{justify-self:end;display:flex;align-items:center;gap:8rpx;padding:10rpx 13rpx;border-radius:20rpx;color:#8d93a2;background:rgba(255,255,255,.6);font-size:17rpx}.sync-dot{width:9rpx;height:9rpx;border-radius:50%;background:var(--accent);box-shadow:0 0 12rpx rgba(var(--glow-rgb),.5)}.hero{display:flex;justify-content:space-between;align-items:flex-end;margin:48rpx 5rpx 31rpx}.eyebrow,.title,.subtitle{display:block}.eyebrow{color:var(--accent);font-size:18rpx;font-weight:700;letter-spacing:4rpx}.title{margin-top:7rpx;font-size:47rpx;font-weight:760}.subtitle{margin-top:9rpx;color:#858c9d;font-size:21rpx}.completion{display:flex;align-items:center;gap:12rpx;padding:14rpx 18rpx;border:1rpx solid rgba(255,255,255,.9);border-radius:22rpx;background:rgba(255,255,255,.65);box-shadow:0 12rpx 28rpx rgba(60,68,98,.07)}.completion-icon{width:47rpx;height:47rpx;display:grid;place-items:center;border-radius:15rpx;color:#fff;background:linear-gradient(135deg,var(--accent),var(--accent-2))}.completion-value,.completion-label{display:block}.completion-value{font-size:25rpx;font-weight:750}.completion-label{color:#9298a6;font-size:16rpx}.data-grid{display:flex;flex-direction:column;gap:24rpx}.section{padding:29rpx;border:1rpx solid rgba(255,255,255,.9);border-radius:34rpx;background:rgba(255,255,255,.8);box-shadow:0 20rpx 50rpx rgba(48,56,88,.08);backdrop-filter:blur(18rpx)}.section-head,.section-title-wrap{display:flex;align-items:center}.section-head{justify-content:space-between}.section-title-wrap{gap:15rpx}.section-icon{width:59rpx;height:59rpx;display:grid;place-items:center;border-radius:19rpx;color:#fff;background:linear-gradient(135deg,var(--accent),var(--accent-2));font-size:28rpx;box-shadow:0 10rpx 20rpx rgba(var(--glow-rgb),.18)}.scale{border-radius:50%}.section-kicker,.section-title,.section-desc{display:block}.section-kicker{color:var(--accent);font-size:15rpx;font-weight:700;letter-spacing:3rpx}.section-title{margin-top:3rpx;font-size:29rpx;font-weight:750}.section-count{padding:7rpx 13rpx;border-radius:15rpx;color:var(--accent);background:var(--pale);font-size:17rpx}.section-desc{margin:18rpx 0 22rpx;color:#9096a5;font-size:19rpx}.primary-metric{position:relative;display:flex;align-items:center;gap:20rpx;padding:23rpx;border-radius:27rpx;background:linear-gradient(120deg,var(--pale),var(--pale-2));box-shadow:inset 0 0 0 1rpx rgba(255,255,255,.75)}.metric-visual{width:90rpx;height:90rpx;display:grid;place-items:center;border-radius:28rpx;color:var(--accent);background:#fff;font-size:38rpx;box-shadow:0 12rpx 25rpx rgba(var(--glow-rgb),.12)}.weight-visual{border-radius:50%}.primary-copy{flex:1}.primary-name,.primary-note{display:block}.primary-name{font-size:21rpx;font-weight:650}.primary-value{font-size:42rpx;font-weight:770}.primary-unit{margin-left:7rpx;color:#858c9c;font-size:18rpx}.primary-note{margin-top:4rpx;color:#959ba8;font-size:16rpx}.edit-arrow{color:var(--accent);font-size:42rpx}.optional-grid{display:grid;grid-template-columns:repeat(2,1fr);gap:13rpx;margin-top:18rpx}.metric-card,.add-card{min-height:154rpx;padding:18rpx;border-radius:23rpx;background:#fff;box-shadow:0 9rpx 24rpx rgba(47,55,86,.06)}.metric-top{display:flex;justify-content:space-between}.mini-icon,.add-circle{width:38rpx;height:38rpx;display:grid;place-items:center;border-radius:12rpx;color:var(--accent);background:var(--pale);font-size:18rpx}.composition-icon{border-radius:50%}.remove{padding:0 5rpx;color:#b2b6c1;font-size:25rpx}.metric-name{display:block;margin:11rpx 0 3rpx;color:#7a8293;font-size:17rpx}.metric-number{font-size:26rpx;font-weight:720}.metric-unit{margin-left:5rpx;color:#9a9fac;font-size:15rpx}.add-card{display:grid;place-content:center;justify-items:center;gap:9rpx;color:var(--accent);border:2rpx dashed rgba(var(--glow-rgb),.28);background:rgba(var(--glow-rgb),.035);font-size:18rpx}.add-circle{width:43rpx;height:43rpx;border-radius:50%;color:#fff;background:linear-gradient(135deg,var(--accent),var(--accent-2));font-size:25rpx}.bouncy{transition:transform .28s cubic-bezier(.2,1.6,.4,1),box-shadow .28s ease}.card-pressed{transform:scale(.965)}.footer-tip{display:flex;justify-content:center;gap:8rpx;margin-top:25rpx;color:#9a9fac;font-size:17rpx}.footer-tip text:first-child{color:var(--accent)}.pressed{opacity:.65}
@media(min-width:900px){.shell{width:min(1280px,calc(100% - 70px));margin:auto;padding:28px 0 46px}.back{gap:5px;font-size:11px}.back text:first-child{font-size:29px}.brand{gap:8px;font-size:12px}.brand-mark{width:23px;height:23px}.sync-badge{gap:6px;padding:7px 10px;font-size:10px}.sync-dot{width:6px;height:6px}.hero{margin:44px 4px 27px}.eyebrow{font-size:10px;letter-spacing:3px}.title{font-size:35px}.subtitle{font-size:12px}.completion{gap:9px;padding:10px 14px;border-radius:16px}.completion-icon{width:35px;height:35px;border-radius:11px}.completion-value{font-size:17px}.completion-label{font-size:10px}.data-grid{display:grid;grid-template-columns:1fr 1fr;align-items:start;gap:22px}.section{min-height:570px;padding:27px;border-radius:28px}.section-title-wrap{gap:12px}.section-icon{width:44px;height:44px;border-radius:14px;font-size:20px}.section-kicker{font-size:9px;letter-spacing:2px}.section-title{font-size:22px}.section-count{padding:5px 10px;font-size:10px}.section-desc{margin:15px 0 20px;font-size:11px}.primary-metric{gap:15px;padding:18px;border-radius:21px}.metric-visual{width:67px;height:67px;border-radius:21px;font-size:28px}.primary-name{font-size:13px}.primary-value{font-size:31px}.primary-unit{font-size:11px}.primary-note{font-size:10px}.edit-arrow{font-size:30px}.optional-grid{grid-template-columns:repeat(3,1fr);gap:10px;margin-top:15px}.metric-card,.add-card{min-height:116px;padding:14px;border-radius:18px}.mini-icon{width:29px;height:29px;border-radius:9px;font-size:13px}.remove{font-size:18px}.metric-name{margin:8px 0 3px;font-size:10px}.metric-number{font-size:19px}.metric-unit{font-size:9px}.add-card{gap:7px;font-size:11px}.add-circle{width:32px;height:32px;font-size:19px}.footer-tip{margin-top:21px;font-size:10px}.bouncy:hover{transform:translateY(-3px);box-shadow:0 15px 35px rgba(47,55,86,.1)}}
</style>
