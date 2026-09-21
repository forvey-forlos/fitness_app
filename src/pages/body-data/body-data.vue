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
        <view><text class="eyebrow">BODY PROFILE</text><text class="title">身体数据</text><text class="subtitle">把每次测量，装订成看得见的改变</text></view>
        <view class="completion"><view class="completion-icon">⌁</view><view><text class="completion-value">{{ filledCount }}</text><text class="completion-label">项已填写</text></view></view>
      </view>

      <view class="data-grid">
        <view class="section basic-section">
          <view class="section-head">
            <view class="section-title-wrap"><view class="section-icon">↕</view><view><text class="section-kicker">BODY BASICS</text><text class="section-title">身体基础数据</text></view></view>
            <button class="save-button" :disabled="saving" hover-class="save-pressed" @tap="openSavePaper">{{ saving ? '保存中' : '保存' }}</button>
          </view>
          <text class="section-desc">从列表添加测量项目，拖住右侧手柄即可调整排列</text>
          <view class="metric-list">
            <view v-for="(metric,index) in activeMetrics" :key="metric.key" class="metric-row" :class="{dragging:dragIndex===index}">
              <view class="metric-symbol" :class="{composition:metric.group==='composition'}">{{ metric.icon }}</view>
              <view class="metric-copy">
                <view class="metric-label-line"><text class="metric-name">{{ metric.name }}</text><text v-if="metric.required" class="required-chip">基本项</text><text v-else-if="metric.custom" class="custom-chip">自定义</text></view>
                <text class="metric-hint">{{ metricHint(metric) }}</text>
              </view>
              <view class="metric-input-wrap"><input v-model="metric.value" class="metric-input" type="digit" maxlength="8" placeholder="--" @blur="normalizeMetric(metric)"/><text class="metric-unit">{{ metric.unit }}</text></view>
              <text v-if="!metric.required" class="remove" @tap.stop="removeMetric(metric)">×</text>
              <view class="drag-handle" hover-class="handle-pressed"
                @touchstart.stop.prevent="startTouchDrag($event,index)" @touchmove.stop.prevent="moveTouchDrag"
                @touchend.stop.prevent="finishDrag" @touchcancel.stop.prevent="finishDrag"
                @mousedown.stop.prevent="startMouseDrag($event,index)"><text>⠿</text></view>
            </view>
          </view>
          <picker class="add-picker" mode="selector" :range="addOptions" range-key="name" @change="addFromPicker">
            <view class="add-card" hover-class="card-pressed"><view class="add-circle">＋</view><view><text class="add-title">添加身体数据项目</text><text class="add-note">从有序列表选择，或创建自定义项目</text></view><text class="edit-arrow">⌄</text></view>
          </picker>
        </view>

        <view class="section history-section">
          <view class="section-head">
            <view class="section-title-wrap"><view class="section-icon folder-icon">▰</view><view><text class="section-kicker">MEASUREMENT FILES</text><text class="section-title">测量历史</text></view></view>
            <text class="section-count">{{ historyCards.length }} 份</text>
          </view>
          <text class="section-desc">每次保存都会生成一张完整测量纸，按时间收入档案夹</text>
          <view v-if="historyLoading" class="empty-state">正在打开档案夹…</view>
          <view v-else-if="!historyCards.length" class="empty-state"><text class="empty-icon">□</text><text>还没有测量记录</text><text class="empty-note">填写上方数据并保存第一张测量纸</text></view>
          <scroll-view v-else class="history-strip" scroll-x :show-scrollbar="false">
            <view class="history-row">
              <view v-for="item in historyCards" :key="item.id" class="history-paper" hover-class="paper-pressed" @tap="openHistoryPaper(item)">
                <view class="paper-pin"/><text class="history-date">{{ formatMeasuredAt(item.measuredAt) }}</text><text class="history-summary">{{ item.summary }}</text>
                <view class="history-foot"><text>{{ item.count }} 项数据</text><text>查看 ›</text></view>
              </view>
            </view>
          </scroll-view>
        </view>
      </view>
      <view class="footer-tip" @tap="loadAll"><text>{{ loadError ? '!' : '✓' }}</text><text>{{ loadError || '身体档案与测量历史已同步到当前账号' }}</text></view>
    </view>

    <view v-if="paperVisible" class="paper-overlay" :class="{filing:paperPhase==='filing'}" @tap.self="closePaper">
      <view class="paper-stage">
        <view class="review-paper">
          <view class="paper-topline"><text>FIT NOTE</text><text>{{ paperMode==='save' ? 'NEW RECORD' : 'MEASUREMENT' }}</text></view>
          <text class="paper-title">{{ paperMode==='save' ? '本次身体数据' : '测量记录' }}</text><text class="paper-time">{{ paperDate }}</text><view class="paper-rule"/>
          <view class="paper-data"><view v-for="item in paperItems" :key="item.key" class="paper-data-row"><text>{{ item.name }}</text><text>{{ item.value }} {{ item.unit }}</text></view></view>
          <view v-if="!paperItems.length" class="paper-empty">本次还没有填写数据</view>
          <view class="paper-actions">
            <button class="paper-cancel" :disabled="saving" @tap="closePaper">返回修改</button>
            <button v-if="paperMode==='save'" class="paper-confirm" :disabled="saving || !paperItems.length" @tap="confirmSave">{{ saving ? '正在归档…' : '确认并夹入档案' }}</button>
            <button v-else class="paper-confirm" @tap="closePaper">合上记录</button>
          </view>
        </view>
        <view class="archive-folder" aria-hidden="true"><view class="folder-tab">MEASUREMENTS</view><view class="folder-front"><text>身体测量档案</text></view></view>
      </view>
    </view>
  </view>
</template>

<script setup>
import { computed, reactive, ref } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import { createMeasurement, getBodyProfile, getMeasurements, updateBodyProfile } from '../../api/body'
import { USER_KEY } from '../../api/auth'

const THEME_STORAGE_KEY='fit_note_theme_index'
const DATA_STORAGE_KEY='fit_note_body_profile'
const SNAPSHOT_STORAGE_KEY='fit_note_body_measurement_snapshots'
const cachedUser=uni.getStorageSync(USER_KEY)||{}
const storageOwner=String(cachedUser.id||cachedUser.accountCode||'anonymous')
const scopedDataKey=DATA_STORAGE_KEY+'_'+storageOwner
const scopedSnapshotKey=SNAPSHOT_STORAGE_KEY+'_'+storageOwner
const themes=[
  {accent:'#7775bd',accent2:'#a59bd2',pale:'#f1f0f9',pale2:'#faf9fd',glow:'119,117,189'},
  {accent:'#5f9fa5',accent2:'#8bbdaf',pale:'#edf6f5',pale2:'#f8fbfa',glow:'95,159,165'},
  {accent:'#bd8073',accent2:'#cda56f',pale:'#faf1ed',pale2:'#fdf9f5',glow:'189,128,115'}
]
const catalog=[
  {key:'height',name:'身高',unit:'cm',icon:'↕',group:'basic',required:true,cloud:'profile'},
  {key:'weight',name:'体重',unit:'kg',icon:'◇',group:'basic',required:true,cloud:'measurement'},
  {key:'shoulderWidth',name:'肩宽',unit:'cm',icon:'↔',group:'circumference',cloud:'measurement'},
  {key:'chest',name:'胸围',unit:'cm',icon:'○',group:'circumference',cloud:'measurement'},
  {key:'waist',name:'腰围',unit:'cm',icon:'⌁',group:'circumference',cloud:'measurement'},
  {key:'hip',name:'臀围',unit:'cm',icon:'∞',group:'circumference',cloud:'measurement'},
  {key:'upperArm',name:'大臂围',unit:'cm',icon:'⌇',group:'circumference',cloud:'measurement'},
  {key:'thigh',name:'大腿围',unit:'cm',icon:'△',group:'circumference',cloud:'measurement'},
  {key:'calf',name:'小腿围',unit:'cm',icon:'▽',group:'circumference',cloud:'measurement'},
  {key:'bodyFat',name:'体脂率',unit:'%',icon:'%',group:'composition',cloud:'local'},
  {key:'muscle',name:'肌肉率',unit:'%',icon:'M',group:'composition',cloud:'local'},
  {key:'water',name:'水分率',unit:'%',icon:'≈',group:'composition',cloud:'local'},
  {key:'bone',name:'骨量',unit:'kg',icon:'B',group:'composition',cloud:'local'},
  {key:'visceralFat',name:'内脏脂肪',unit:'级',icon:'V',group:'composition',cloud:'local'},
  {key:'protein',name:'蛋白质',unit:'%',icon:'P',group:'composition',cloud:'local'},
  {key:'bmr',name:'基础代谢',unit:'kcal',icon:'↯',group:'composition',cloud:'local'},
  {key:'bodyAge',name:'身体年龄',unit:'岁',icon:'A',group:'composition',cloud:'local'}
]
const profileKeys=['height','weight','waist','chest','hip','shoulderWidth','thigh','upperArm','calf']
const measurementKeys=profileKeys.filter(key=>key!=='height')
const savedTheme=Number(uni.getStorageSync(THEME_STORAGE_KEY))
const themeIndex=ref(Number.isInteger(savedTheme)&&savedTheme>=0&&savedTheme<themes.length?savedTheme:0)
const themeStyle=computed(()=>{const t=themes[themeIndex.value];return{'--accent':t.accent,'--accent-2':t.accent2,'--pale':t.pale,'--pale-2':t.pale2,'--glow-rgb':t.glow}})
const savedUi=uni.getStorageSync(scopedDataKey)||{}

function initialMetrics(){
  const savedItems=Array.isArray(savedUi.metricItems)?savedUi.metricItems:[]
  if(savedItems.length){
    const restored=savedItems.map(saved=>{const known=catalog.find(item=>item.key===saved.key);return known?{...known,value:saved.value??''}:{...saved,custom:true,cloud:'local',icon:saved.icon||'＋',value:saved.value??''}}).filter(item=>item?.key)
    for(const required of catalog.filter(item=>item.required))if(!restored.some(item=>item.key===required.key))restored.unshift({...required,value:''})
    return restored
  }
  const legacyCircumference=Array.isArray(savedUi.visibleCircumferenceKeys)?savedUi.visibleCircumferenceKeys:(Array.isArray(savedUi.circumference)?savedUi.circumference.map(item=>item.key==='shoulder'?'shoulderWidth':item.key):[])
  const legacyComposition=Array.isArray(savedUi.composition)?savedUi.composition:[]
  const keys=['height','weight',...legacyCircumference,...legacyComposition.map(item=>item.key)]
  return [...new Set(keys)].map(key=>{const known=catalog.find(item=>item.key===key),legacy=legacyComposition.find(item=>item.key===key);return known?{...known,value:legacy?.value??''}:{...legacy,custom:true,cloud:'local',value:legacy?.value??''}}).filter(Boolean)
}

const activeMetrics=ref(initialMetrics())
const profile=reactive(Object.fromEntries([...profileKeys.map(key=>[key,null]),['version',0]]))
const measurements=ref([])
const localSnapshots=ref(readSnapshots())
const loading=ref(false),historyLoading=ref(false),saving=ref(false)
const loadError=ref('')
const paperVisible=ref(false),paperMode=ref('save'),paperPhase=ref('open')
const paperItems=ref([]),paperDate=ref('')
const dragIndex=ref(-1)
let dragStartY=0,mouseCleanup=null

const filledCount=computed(()=>activeMetrics.value.filter(metric=>hasValue(metric.value)).length)
const syncText=computed(()=>saving.value?'正在保存':loading.value?'正在同步':loadError.value?'同步失败':'云端已同步')
const addOptions=computed(()=>[...catalog.filter(option=>!activeMetrics.value.some(metric=>metric.key===option.key)).map(option=>({name:option.name,key:option.key})),{name:'＋ 自定义项目',key:'__custom__'}])
const historyCards=computed(()=>{
  const linked=new Set(localSnapshots.value.map(item=>item.serverId).filter(Boolean))
  const local=localSnapshots.value.map(item=>({...item,summary:snapshotSummary(item.items),count:item.items?.length||0}))
  const server=measurements.value.filter(item=>!linked.has(item.id)).map(item=>{const items=measurementItems(item);return{id:item.id,serverId:item.id,measuredAt:item.measuredAt,items,summary:snapshotSummary(items),count:items.length}})
  return [...local,...server].sort((a,b)=>new Date(b.measuredAt)-new Date(a.measuredAt))
})

function hasValue(value){return value!==''&&value!==null&&value!==undefined}
function cleanValue(value){const number=Number(String(value).trim());return Number.isFinite(number)?Math.round(number*100)/100:null}
function metricHint(metric){if(metric.cloud==='local')return'随本次测量纸保存在当前设备';if(metric.key==='height')return'用于更新身体档案与 BMI';return'同步到账号测量历史'}
function persistUi(){uni.setStorageSync(scopedDataKey,{metricItems:activeMetrics.value.map(metric=>({key:metric.key,name:metric.name,unit:metric.unit,icon:metric.icon,group:metric.group,required:!!metric.required,custom:!!metric.custom,cloud:metric.cloud,value:metric.value}))})}
function readSnapshots(){const value=uni.getStorageSync(scopedSnapshotKey);return Array.isArray(value)?value:[]}
function persistSnapshots(){uni.setStorageSync(scopedSnapshotKey,localSnapshots.value)}
function applyProfile(data){for(const key of profileKeys)profile[key]=data?.[key]??null;profile.version=Number(data?.version||0);activeMetrics.value.forEach(metric=>{if(profileKeys.includes(metric.key)&&profile[metric.key]!==null)metric.value=profile[metric.key]});persistUi()}
function profilePayload(){const visible=Object.fromEntries(activeMetrics.value.filter(metric=>profileKeys.includes(metric.key)&&hasValue(metric.value)).map(metric=>[metric.key,cleanValue(metric.value)]));return Object.fromEntries([...profileKeys.map(key=>[key,Object.hasOwn(visible,key)?visible[key]:profile[key]]),['version',profile.version]])}
function showError(error,fallback='请求失败'){loadError.value=error?.message||fallback;uni.showToast({title:loadError.value,icon:'none'})}
async function loadProfile(){applyProfile(await getBodyProfile())}
async function loadHistory(){historyLoading.value=true;try{const result=await getMeasurements({page:1,pageSize:50});measurements.value=Array.isArray(result?.items)?result.items:[]}finally{historyLoading.value=false}}
async function loadAll(){if(loading.value)return;loading.value=true;loadError.value='';try{await Promise.all([loadProfile(),loadHistory()])}catch(error){showError(error,'身体数据加载失败')}finally{loading.value=false}}
function normalizeMetric(metric){const raw=String(metric.value??'').trim();if(!raw){metric.value='';persistUi();return true}if(!/^\d+(\.\d{1,2})?$/.test(raw)||cleanValue(raw)<=0){metric.value='';uni.showToast({title:'请输入正确的正数，最多两位小数',icon:'none'});return false}metric.value=String(cleanValue(raw));persistUi();return true}
function addFromPicker(event){const option=addOptions.value[Number(event.detail.value)];if(!option)return;if(option.key==='__custom__'){createCustomMetric();return}const source=catalog.find(item=>item.key===option.key);if(source){activeMetrics.value.push({...source,value:profile[source.key]??''});persistUi()}}
function createCustomMetric(){uni.showModal({title:'自定义项目名称',editable:true,placeholderText:'例如：左臂围',success:nameResult=>{if(!nameResult.confirm)return;const name=String(nameResult.content||'').trim().slice(0,12);if(!name){uni.showToast({title:'请输入项目名称',icon:'none'});return}uni.showModal({title:name+'的单位',editable:true,placeholderText:'例如：cm、kg、%',success:unitResult=>{if(!unitResult.confirm)return;const unit=String(unitResult.content||'').trim().slice(0,8);if(!unit){uni.showToast({title:'请输入单位',icon:'none'});return}activeMetrics.value.push({key:'custom_'+Date.now(),name,unit,icon:'＋',group:'custom',custom:true,cloud:'local',value:''});persistUi()}})}})}
function removeMetric(metric){uni.showModal({title:'移除“'+metric.name+'”？',content:'仅从当前录入列表移除，不会删除已保存的历史。',success:result=>{if(!result.confirm)return;activeMetrics.value=activeMetrics.value.filter(item=>item.key!==metric.key);persistUi()}})}
function reorder(from,to){if(from===to||to<0||to>=activeMetrics.value.length)return;const list=[...activeMetrics.value],[item]=list.splice(from,1);list.splice(to,0,item);activeMetrics.value=list;dragIndex.value=to}
function moveDrag(y){if(dragIndex.value<0)return;const delta=y-dragStartY;if(Math.abs(delta)<54)return;const next=dragIndex.value+(delta>0?1:-1);if(next>=0&&next<activeMetrics.value.length){reorder(dragIndex.value,next);dragStartY=y}}
function startTouchDrag(event,index){dragIndex.value=index;dragStartY=event.touches?.[0]?.clientY||0}
function moveTouchDrag(event){moveDrag(event.touches?.[0]?.clientY||dragStartY)}
function startMouseDrag(event,index){if(typeof window==='undefined')return;dragIndex.value=index;dragStartY=event.clientY;const move=mouseEvent=>moveDrag(mouseEvent.clientY);const end=()=>{window.removeEventListener('mousemove',move);window.removeEventListener('mouseup',end);mouseCleanup=null;finishDrag()};mouseCleanup=end;window.addEventListener('mousemove',move);window.addEventListener('mouseup',end)}
function finishDrag(){if(mouseCleanup&&typeof window!=='undefined')mouseCleanup();dragIndex.value=-1;persistUi()}
function currentPaperItems(){return activeMetrics.value.filter(metric=>hasValue(metric.value)).map(metric=>({key:metric.key,name:metric.name,unit:metric.unit,value:cleanValue(metric.value),cloud:metric.cloud}))}
function openSavePaper(){let valid=true;activeMetrics.value.forEach(metric=>{if(!normalizeMetric(metric))valid=false});if(!valid)return;paperMode.value='save';paperItems.value=currentPaperItems();paperDate.value=formatMeasuredAt(new Date().toISOString());paperPhase.value='open';paperVisible.value=true}
function openHistoryPaper(item){paperMode.value='history';paperItems.value=item.items||[];paperDate.value=formatMeasuredAt(item.measuredAt);paperPhase.value='open';paperVisible.value=true}
function closePaper(){if(saving.value||paperPhase.value==='filing')return;paperVisible.value=false}
function measurementItems(item){return measurementKeys.filter(key=>hasValue(item[key])).map(key=>{const meta=catalog.find(option=>option.key===key);return{key,name:meta?.name||key,unit:meta?.unit||'',value:item[key],cloud:'measurement'}})}
function snapshotSummary(items=[]){return items.slice(0,2).map(item=>item.name+' '+item.value+item.unit).join(' · ')||'空记录'}
async function confirmSave(){
  if(saving.value||!paperItems.value.length)return
  saving.value=true;loadError.value=''
  const measuredAt=new Date().toISOString()
  const measurementData=Object.fromEntries(paperItems.value.filter(item=>measurementKeys.includes(item.key)).map(item=>[item.key,item.value]))
  let created=null
  try{
    if(Object.keys(measurementData).length){const key='body-sheet-'+Date.now()+'-'+Math.random().toString(36).slice(2,8);const result=await createMeasurement({measuredAt,...measurementData},key);created=result?.measurement||result}
    applyProfile(await updateBodyProfile(profilePayload()))
    const snapshot={id:'sheet_'+Date.now(),serverId:created?.id||null,measuredAt,items:paperItems.value.map(item=>({...item}))}
    localSnapshots.value=[snapshot,...localSnapshots.value].slice(0,100);persistSnapshots();persistUi()
    if(created)measurements.value=[created,...measurements.value.filter(item=>item.id!==created.id)]
    paperPhase.value='filing';setTimeout(()=>{paperVisible.value=false;paperPhase.value='open';uni.showToast({title:'已收入测量历史',icon:'success'})},1050)
  }catch(error){showError(error,'身体数据保存失败');await Promise.all([loadProfile().catch(()=>{}),loadHistory().catch(()=>{})])}
  finally{saving.value=false}
}
function formatMeasuredAt(value){if(!value)return'未知时间';try{return new Intl.DateTimeFormat('zh-CN',{year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit'}).format(new Date(value))}catch(_){return String(value).slice(0,16).replace('T',' ')}}
function goBack(){uni.navigateBack({fail:()=>uni.reLaunch({url:'/pages/home/home'})})}
function syncTheme(){const value=Number(uni.getStorageSync(THEME_STORAGE_KEY));if(Number.isInteger(value)&&value>=0&&value<themes.length)themeIndex.value=value}
onShow(()=>{syncTheme();loadAll()})
</script>

<style scoped>
@property --accent{syntax:'<color>';inherits:true;initial-value:#7775bd}@property --accent-2{syntax:'<color>';inherits:true;initial-value:#a59bd2}
page{background:#f5f5fa}.page{position:relative;min-height:100vh;overflow:hidden;color:#293044;background:linear-gradient(145deg,var(--pale),var(--pale-2));transition:--accent .7s ease,--accent-2 .7s ease}.ambient{position:absolute;inset:0;overflow:hidden;pointer-events:none}.blob{position:absolute;border-radius:48% 52% 68% 32%;background:rgba(var(--glow-rgb),.1)}.blob-one{width:520rpx;height:520rpx;left:-250rpx;top:-210rpx;transform:rotate(22deg)}.blob-two{width:430rpx;height:430rpx;right:-220rpx;top:520rpx;transform:rotate(-18deg)}.dot-field{position:absolute;inset:0;opacity:.17;background-image:radial-gradient(rgba(var(--glow-rgb),.55) 1rpx,transparent 1rpx);background-size:35rpx 35rpx;mask-image:linear-gradient(#000,transparent 80%)}
.shell{position:relative;z-index:2;padding:calc(var(--status-bar-height) + 22rpx) 28rpx 48rpx}.topbar{display:grid;grid-template-columns:1fr auto 1fr;align-items:center}.back{display:flex;align-items:center;gap:7rpx;color:#697084;font-size:22rpx}.back text:first-child{font-size:45rpx;line-height:1}.brand{display:flex;align-items:center;gap:12rpx;color:#535b6e;font-size:21rpx;font-weight:700;letter-spacing:3rpx}.brand-mark{width:34rpx;height:34rpx;border-radius:70% 30% 70% 30%;background:linear-gradient(135deg,var(--accent) 50%,var(--accent-2) 50%);box-shadow:0 7rpx 18rpx rgba(var(--glow-rgb),.24)}.sync-badge{justify-self:end;display:flex;align-items:center;gap:8rpx;color:#777d8c;font-size:18rpx}.sync-dot{width:11rpx;height:11rpx;border-radius:50%;background:var(--accent);box-shadow:0 0 0 6rpx rgba(var(--glow-rgb),.1)}
.hero{display:flex;align-items:flex-end;justify-content:space-between;margin:58rpx auto 32rpx;max-width:1160px}.eyebrow,.title,.subtitle,.completion-value,.completion-label,.section-kicker,.section-title,.section-desc,.metric-name,.metric-hint,.add-title,.add-note,.empty-state text,.history-paper text,.paper-title,.paper-time{display:block}.eyebrow{font-size:19rpx;font-weight:800;letter-spacing:5rpx;color:var(--accent)}.title{margin-top:11rpx;font-size:52rpx;font-weight:800;letter-spacing:-2rpx}.subtitle{margin-top:10rpx;color:#73798b;font-size:23rpx}.completion{display:flex;align-items:center;gap:15rpx;padding:17rpx 23rpx;border:1rpx solid rgba(255,255,255,.86);border-radius:25rpx;background:rgba(255,255,255,.55);box-shadow:0 16rpx 35rpx rgba(67,74,105,.08)}.completion-icon{display:grid;place-items:center;width:56rpx;height:56rpx;border-radius:18rpx;color:#fff;background:linear-gradient(135deg,var(--accent),var(--accent-2))}.completion-value{font-size:29rpx;font-weight:800}.completion-label{font-size:17rpx;color:#818697}
.data-grid{display:grid;grid-template-columns:minmax(0,1.45fr) minmax(280px,.75fr);gap:24rpx;max-width:1160px;margin:0 auto}.section{padding:28rpx;border:1rpx solid rgba(255,255,255,.9);border-radius:34rpx;background:rgba(255,255,255,.72);box-shadow:0 24rpx 55rpx rgba(62,68,98,.09);backdrop-filter:blur(16px)}.section-head{display:flex;align-items:center;justify-content:space-between;gap:18rpx}.section-title-wrap{display:flex;align-items:center;gap:16rpx}.section-icon{display:grid;place-items:center;width:58rpx;height:58rpx;border-radius:19rpx;color:#fff;font-size:28rpx;font-weight:800;background:linear-gradient(135deg,var(--accent),var(--accent-2));box-shadow:0 10rpx 24rpx rgba(var(--glow-rgb),.2)}.section-kicker{font-size:16rpx;font-weight:800;letter-spacing:3rpx;color:var(--accent)}.section-title{margin-top:4rpx;font-size:28rpx;font-weight:800}.section-desc{margin:18rpx 0 22rpx;color:#828797;font-size:20rpx}.section-count{padding:8rpx 14rpx;border-radius:20rpx;color:var(--accent);background:rgba(var(--glow-rgb),.09);font-size:18rpx;font-weight:700}.save-button{flex:none;margin:0;padding:0 25rpx;height:62rpx;line-height:62rpx;border:0;border-radius:22rpx;color:#fff;background:linear-gradient(135deg,var(--accent),var(--accent-2));font-size:21rpx;font-weight:800;box-shadow:0 12rpx 25rpx rgba(var(--glow-rgb),.25)}.save-button::after,.paper-actions button::after{border:0}.save-button[disabled]{opacity:.6}.save-pressed{transform:scale(.96)}
.metric-list{display:flex;flex-direction:column;gap:12rpx}.metric-row{display:flex;align-items:center;gap:15rpx;min-height:92rpx;padding:12rpx 14rpx;border:1rpx solid rgba(var(--glow-rgb),.08);border-radius:24rpx;background:linear-gradient(105deg,#fff,rgba(var(--glow-rgb),.035));box-shadow:0 8rpx 20rpx rgba(53,58,87,.045);transition:transform .2s ease,box-shadow .2s ease}.metric-row.dragging{z-index:5;transform:scale(1.018) rotate(-.35deg);box-shadow:0 18rpx 38rpx rgba(var(--glow-rgb),.18)}.metric-symbol{display:grid;place-items:center;flex:none;width:54rpx;height:54rpx;border-radius:18rpx;color:var(--accent);font-size:22rpx;font-weight:800;background:var(--pale)}.metric-symbol.composition{color:var(--accent-2);background:rgba(var(--glow-rgb),.07)}.metric-copy{min-width:0;flex:1}.metric-label-line{display:flex;align-items:center;gap:9rpx}.metric-name{font-size:22rpx;font-weight:800}.required-chip,.custom-chip{padding:3rpx 9rpx;border-radius:12rpx;color:var(--accent);background:rgba(var(--glow-rgb),.1);font-size:14rpx}.custom-chip{color:#7f6e55;background:#f5eee2}.metric-hint{margin-top:5rpx;color:#9a9eaa;font-size:16rpx}.metric-input-wrap{display:flex;align-items:baseline;justify-content:flex-end;gap:6rpx;width:155rpx;padding:10rpx 13rpx;border-radius:17rpx;background:var(--pale-2)}.metric-input{width:100rpx;height:38rpx;text-align:right;color:#313749;font-size:25rpx;font-weight:800}.metric-unit{color:#8a8f9d;font-size:17rpx}.remove{display:grid;place-items:center;width:32rpx;height:32rpx;border-radius:50%;color:#a5a8b1;background:#f3f3f6;font-size:22rpx}.drag-handle{display:grid;place-items:center;flex:none;width:42rpx;height:58rpx;color:#a9abba;font-size:28rpx;cursor:grab;user-select:none}.handle-pressed{color:var(--accent);background:rgba(var(--glow-rgb),.08);border-radius:14rpx}
.add-picker{display:block;margin-top:16rpx}.add-card{display:flex;align-items:center;gap:15rpx;padding:18rpx;border:2rpx dashed rgba(var(--glow-rgb),.28);border-radius:24rpx;color:var(--accent);background:rgba(var(--glow-rgb),.035)}.add-circle{display:grid;place-items:center;width:48rpx;height:48rpx;border-radius:16rpx;color:#fff;background:linear-gradient(135deg,var(--accent),var(--accent-2));font-size:25rpx}.add-title{font-size:21rpx;font-weight:800}.add-note{margin-top:3rpx;color:#969aa7;font-size:16rpx}.edit-arrow{margin-left:auto;font-size:26rpx}.card-pressed,.pressed,.paper-pressed{opacity:.72;transform:scale(.985)}
.history-section{align-self:start}.folder-icon{border-radius:11rpx 11rpx 19rpx 19rpx}.empty-state{display:flex;flex-direction:column;align-items:center;justify-content:center;min-height:250rpx;border-radius:25rpx;color:#858a9a;background:var(--pale-2);font-size:20rpx}.empty-icon{margin-bottom:10rpx;color:var(--accent);font-size:45rpx}.empty-note{margin-top:8rpx;color:#a0a4b0;font-size:16rpx}.history-strip{width:100%;white-space:nowrap}.history-row{display:inline-flex;gap:14rpx;padding:3rpx 4rpx 16rpx}.history-paper{position:relative;width:250rpx;min-height:180rpx;padding:25rpx 20rpx 17rpx;box-sizing:border-box;border-radius:8rpx 8rpx 20rpx 20rpx;background:#fffdf8;box-shadow:0 13rpx 25rpx rgba(60,65,88,.1);white-space:normal;transition:transform .2s}.history-paper::before{content:'';position:absolute;left:17rpx;right:17rpx;top:55rpx;height:1rpx;background:rgba(var(--glow-rgb),.12);box-shadow:0 29rpx rgba(var(--glow-rgb),.09),0 58rpx rgba(var(--glow-rgb),.09)}.paper-pin{position:absolute;top:-3rpx;right:30rpx;width:18rpx;height:42rpx;border:4rpx solid var(--accent-2);border-bottom-color:transparent;border-radius:13rpx;transform:rotate(7deg)}.history-date{position:relative;color:#9296a2;font-size:16rpx}.history-summary{position:relative;margin-top:24rpx;min-height:65rpx;color:#3a4050;font-size:20rpx;font-weight:800;line-height:1.7}.history-foot{position:relative;display:flex;justify-content:space-between;color:var(--accent);font-size:16rpx}.footer-tip{display:flex;justify-content:center;align-items:center;gap:10rpx;margin:30rpx auto 0;color:#858a99;font-size:18rpx}.footer-tip text:first-child{display:grid;place-items:center;width:28rpx;height:28rpx;border-radius:50%;color:#fff;background:var(--accent);font-size:15rpx}
.paper-overlay{position:fixed;z-index:50;inset:0;display:flex;align-items:center;justify-content:center;padding:35rpx;background:rgba(35,38,52,.38);backdrop-filter:blur(10px);animation:overlay-in .28s ease both}.paper-stage{position:relative;width:min(650rpx,560px);height:min(870rpx,82vh);display:flex;align-items:flex-start;justify-content:center}.review-paper{position:relative;z-index:2;width:100%;max-height:720rpx;overflow:auto;padding:42rpx 42rpx 38rpx;box-sizing:border-box;border-radius:7rpx 7rpx 22rpx 22rpx;color:#343746;background:#fffdf7;background-image:linear-gradient(rgba(var(--glow-rgb),.07) 1rpx,transparent 1rpx);background-size:100% 48rpx;box-shadow:0 40rpx 90rpx rgba(28,31,48,.3);transform-origin:50% 100%;animation:paper-rise .5s cubic-bezier(.2,.9,.28,1.15) both}.paper-topline{display:flex;justify-content:space-between;color:var(--accent);font-size:16rpx;font-weight:800;letter-spacing:3rpx}.paper-title{margin-top:22rpx;font-size:42rpx;font-weight:900}.paper-time{margin-top:8rpx;color:#858995;font-size:18rpx}.paper-rule{height:5rpx;margin:25rpx 0 15rpx;border-radius:4rpx;background:linear-gradient(90deg,var(--accent),var(--accent-2),transparent)}.paper-data{display:grid;grid-template-columns:1fr 1fr;gap:0 28rpx}.paper-data-row{display:flex;justify-content:space-between;padding:18rpx 3rpx;border-bottom:1rpx dashed rgba(var(--glow-rgb),.18);font-size:20rpx}.paper-data-row text:last-child{color:var(--accent);font-weight:800}.paper-empty{padding:60rpx 0;text-align:center;color:#9699a4}.paper-actions{display:flex;gap:14rpx;margin-top:28rpx}.paper-actions button{flex:1;margin:0;height:70rpx;line-height:70rpx;border:0;border-radius:22rpx;font-size:20rpx;font-weight:800}.paper-cancel{color:#777c8a;background:#f0f0f4}.paper-confirm{color:#fff;background:linear-gradient(135deg,var(--accent),var(--accent-2));box-shadow:0 12rpx 25rpx rgba(var(--glow-rgb),.23)}.paper-confirm[disabled]{opacity:.45}.archive-folder{position:absolute;z-index:3;left:-4%;right:-4%;bottom:0;height:190rpx;pointer-events:none}.folder-tab{position:absolute;left:35rpx;top:0;padding:15rpx 35rpx 24rpx;border-radius:24rpx 24rpx 0 0;color:rgba(255,255,255,.82);background:var(--accent-2);font-size:15rpx;font-weight:800;letter-spacing:2rpx}.folder-front{position:absolute;inset:38rpx 0 0;display:flex;align-items:flex-end;justify-content:center;padding-bottom:35rpx;border-radius:27rpx 27rpx 12rpx 12rpx;color:rgba(255,255,255,.78);background:linear-gradient(145deg,var(--accent-2),var(--accent));box-shadow:0 25rpx 55rpx rgba(30,33,49,.28);font-size:17rpx;font-weight:800;letter-spacing:3rpx}.paper-overlay.filing .review-paper{animation:paper-file 1s cubic-bezier(.55,.02,.35,1) both}.paper-overlay.filing .folder-front{animation:folder-close 1s ease both}
@keyframes overlay-in{from{opacity:0}to{opacity:1}}@keyframes paper-rise{from{opacity:0;transform:translateY(110rpx) rotate(2deg) scale(.92)}to{opacity:1;transform:none}}@keyframes paper-file{0%{transform:none}42%{transform:translateY(-25rpx) scale(.96)}100%{transform:translateY(600rpx) scale(.76);opacity:.35}}@keyframes folder-close{0%,55%{transform:perspective(500px) rotateX(0)}100%{transform:perspective(500px) rotateX(-7deg)}}
@media (max-width:760px){.shell{padding-left:22rpx;padding-right:22rpx}.topbar{grid-template-columns:1fr auto}.brand{display:none}.sync-badge{font-size:17rpx}.hero{margin-top:43rpx}.subtitle{max-width:430rpx}.completion{padding:13rpx 16rpx}.completion-icon{width:48rpx;height:48rpx}.data-grid{grid-template-columns:1fr}.section{padding:23rpx;border-radius:30rpx}.metric-row{gap:10rpx;padding:11rpx 9rpx}.metric-symbol{width:48rpx;height:48rpx}.metric-hint{display:none}.metric-input-wrap{width:135rpx}.drag-handle{width:36rpx}.paper-data{grid-template-columns:1fr}.paper-stage{height:86vh}.review-paper{max-height:75vh;padding:34rpx 30rpx 32rpx}.archive-folder{height:150rpx}.folder-front{inset:32rpx 0 0}.paper-actions{flex-direction:column}.paper-actions button{width:100%}}
@media (min-width:1000px){.shell{padding-left:60px;padding-right:60px}.hero{margin-top:34px}.section{padding:28px}.metric-row{min-height:68px;padding:9px 13px}.metric-input-wrap{width:135px}.save-button{height:44px;line-height:44px}.history-paper{width:210px;min-height:160px}.paper-overlay{padding:24px}}
</style>
