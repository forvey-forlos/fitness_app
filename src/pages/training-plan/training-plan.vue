<template>
  <view class="page" :style="themeStyle">
    <view class="ambient"><view class="orb orb-one"/><view class="orb orb-two"/><view class="dot-field"/></view>
    <view class="shell">
      <view class="topbar">
        <button class="back" hover-class="pressed" @tap="goBack">‹</button>
        <view><text class="kicker">TODAY'S PLAN</text><text class="page-title">训练计划</text></view>
        <view class="theme-badge"><view/><text>主题同步</text></view>
      </view>

      <view class="hero">
        <view class="hero-head">
          <view><picker mode="date" :value="selectedDate" @change="changePlanDate"><view class="date date-picker">{{ todayText }} <text>⌄</text></view></picker><text class="plan-title">{{ planTitle }}</text><text class="hero-meta">{{ totalActions }} 个动作 · 预计 {{ estimatedDuration }} 分钟</text></view>
          <view class="status" :class="{completed:todayCompleted}" @tap="managePlan">{{ todayCompleted?'该日已完成':currentPlan?'管理计划':'新建计划' }}</view>
        </view>
        <view v-if="planParts.length" class="part-progress-list">
          <view v-for="part in planParts" :key="part.key" class="part-progress">
            <view class="part-progress-head"><text>{{ part.name }}</text><text>{{ completedInPart(part) }}/{{ part.actions.length }}</text></view>
            <view v-if="part.actions.length" class="progress-nodes">
              <view class="progress-rail"/>
              <view v-for="action in part.actions" :key="action.id" class="progress-node" :class="{done:isActionDone(action)}">
                <view class="progress-dot">{{ isActionDone(action)?'✓':'' }}</view><text>{{ action.name }}</text>
              </view>
            </view>
            <text v-else class="part-empty-tip">请在下方为该部位添加具体动作</text>
          </view>
        </view>
        <view v-else class="hero-empty"><view>＋</view><text>在下方添加今天要训练的部位</text></view>
      </view>

      <view class="content">
        <view class="content-head"><view><text class="section-title">训练内容</text><text class="section-caption">选择部位并录入预期与实际数据</text></view><text class="saved-tip">{{ syncText }}</text></view>
        <view class="planner">
          <view class="part-column">
            <text class="column-label">训练部位</text>
            <view class="part-list">
              <view v-for="part in planParts" :key="part.key" class="part-tab" :class="{active:selectedPartKey===part.key}" hover-class="tab-pressed" @tap="selectedPartKey=part.key">
                <view class="part-symbol">{{ part.icon }}</view><view class="part-tab-copy"><text>{{ part.name }}</text><text>{{ part.actions.length }} 项</text></view><text class="part-remove" @tap.stop="removePart(part)">×</text>
              </view>
            </view>
            <button class="add-part" hover-class="pressed" @tap="addPart"><text>＋</text><text>添加部位</text></button>
          </view>

          <view class="action-column">
            <template v-if="activePart">
              <view class="action-column-head"><view><text class="column-title">{{ activePart.name }}动作</text><text>{{ activePart.actions.length }} 个已选动作</text></view><button hover-class="pressed" @tap="addAction">＋ 添加动作</button></view>
              <view v-if="activePart.actions.length" class="action-list">
                <view v-for="action in activePart.actions" :key="action.id" class="action-editor">
                  <view class="action-head">
                    <view class="action-name"><view class="state-dot" :class="{done:isActionDone(action)}">{{ isActionDone(action)?'✓':'' }}</view><view><text>{{ action.name }}</text><text>{{ action.equipment||'徒手' }}</text></view></view>
                    <text class="remove-action" @tap="removeAction(action)">移除</text>
                  </view>
                  <view class="metric-row target-row">
                    <text class="row-label">预期</text>
                    <label><text>千克</text><input v-model="action.target.kg" :disabled="todayCompleted" type="digit" maxlength="6" placeholder="0"/></label>
                    <label><text>个数</text><input v-model="action.target.reps" :disabled="todayCompleted" type="number" maxlength="4" placeholder="0"/></label>
                    <label><text>组数</text><input v-model="action.target.sets" :disabled="todayCompleted" type="number" maxlength="3" placeholder="0"/></label>
                  </view>
                  <view class="metric-row actual-row">
                    <text class="row-label">实际</text>
                    <label><text>千克</text><input v-model="action.actual.kg" :disabled="todayCompleted" type="digit" maxlength="6" placeholder="点击输入"/></label>
                    <label><text>个数</text><input v-model="action.actual.reps" :disabled="todayCompleted" type="number" maxlength="4" placeholder="点击输入"/></label>
                    <label><text>组数</text><input v-model="action.actual.sets" :disabled="todayCompleted" type="number" maxlength="3" placeholder="点击输入"/></label>
                  </view>
                </view>
              </view>
              <view v-else class="action-empty"><view>⌁</view><text>尚未添加具体动作</text><text>动作选项来自“动作管理”页面</text><button hover-class="pressed" @tap="addAction">从动作库添加</button></view>
            </template>
            <view v-else class="part-empty"><view>＋</view><text>先从左侧添加训练部位</text><text>可选择动作管理中已有动作的部位</text></view>
          </view>
        </view>
        <button class="complete-button" :class="{update:currentPlan}" :disabled="saving||loading" hover-class="pressed" @tap="savePlan">{{ todayCompleted?'该日训练已完成':currentPlan?'保存计划修改':'创建训练计划' }}</button>
        <button v-if="currentPlan&&!todayCompleted" class="complete-button update" :disabled="completing" hover-class="pressed" @tap="completeTraining">{{ completing?'正在完成训练…':'完成该日训练' }}</button>
      </view>
    </view>
  </view>
</template>

<script setup>
import { computed,ref } from 'vue'
import { onLoad,onShow } from '@dcloudio/uni-app'
import { getExercises } from '../../api/exercises'
import {
  completeTrainingPlan, createTrainingPlan, deleteTrainingPlan,
  listTrainingPlans, updateTrainingPlan
} from '../../api/training'
const THEME_KEY='fit_note_theme_index'
const themes=[{accent:'#7775bd',accent2:'#a59bd2',pale:'#f1f0f9',pale2:'#faf9fd',glow:'119,117,189'},{accent:'#5f9fa5',accent2:'#8bbdaf',pale:'#edf6f5',pale2:'#f8fbfa',glow:'95,159,165'},{accent:'#bd8073',accent2:'#cda56f',pale:'#faf1ed',pale2:'#fdf9f5',glow:'189,128,115'}]
const parts=[{key:'shoulder',name:'肩部',short:'肩',icon:'▽'},{key:'chest',name:'胸部',short:'胸',icon:'◇'},{key:'back',name:'背部',short:'背',icon:'⌁'},{key:'arms',name:'手臂',short:'臂',icon:'↯'},{key:'abs',name:'腹部',short:'腹',icon:'◎'},{key:'legs',name:'腿部',short:'腿',icon:'△'}]
const equipmentLabels={barbell:'杠铃',dumbbell:'哑铃',machine:'器械',cable:'绳索',bodyweight:'徒手',other:'其他'}
const themeIndex=ref(0),actionLibrary=ref([]),planParts=ref([]),selectedPartKey=ref('')
const currentPlan=ref(null),selectedDate=ref(''),loading=ref(false),saving=ref(false),completing=ref(false),loadError=ref('')
const completionAttempt=ref(null)
const workoutStartedAt=ref('')
const savedDraftSignature=ref('')
const themeStyle=computed(()=>{const t=themes[themeIndex.value];return{'--accent':t.accent,'--accent-2':t.accent2,'--pale':t.pale,'--pale-2':t.pale2,'--glow-rgb':t.glow}})
const todayText=computed(()=>new Date(selectedDate.value+'T00:00:00').toLocaleDateString('zh-CN',{month:'long',day:'numeric',weekday:'long'}))
const activePart=computed(()=>planParts.value.find(part=>part.key===selectedPartKey.value)||null)
const totalActions=computed(()=>planParts.value.reduce((sum,part)=>sum+part.actions.length,0))
const completedActions=computed(()=>planParts.value.reduce((sum,part)=>sum+completedInPart(part),0))
const planTitle=computed(()=>{if(currentPlan.value?.name)return currentPlan.value.name;if(!planParts.value.length)return'训练计划';if(planParts.value.length===1)return planParts.value[0].name+'训练';return planParts.value.map(part=>part.short).join('')+'训练'})
const estimatedDuration=computed(()=>Math.max(20,totalActions.value*8))
const todayCompleted=computed(()=>currentPlan.value?.status==='completed')
const syncText=computed(()=>saving.value?'正在保存':loading.value?'正在同步':loadError.value?'同步失败':currentPlan.value?'云端已保存':'尚未创建')
function pad(v){return String(v).padStart(2,'0')}
function dateKey(){const d=new Date();return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`}
function emptyMetrics(){return{kg:'',reps:'',sets:''}}
function equipmentName(value){return equipmentLabels[value]||value||'徒手'}
function catalogAction(exercise){return{id:exercise.id,exerciseId:exercise.id,name:exercise.name,equipment:equipmentName(exercise.equipment),category:exercise.category,target:emptyMetrics(),actual:emptyMetrics(),restSeconds:null,notes:null}}
function planAction(item){return{id:item.exerciseId,exerciseId:item.exerciseId,name:item.exercise?.name||'已归档动作',equipment:equipmentName(item.exercise?.equipment),category:item.exercise?.category,target:{kg:item.weight??'',reps:item.reps??'',sets:item.sets??''},actual:{kg:item.actual?.kg??'',reps:item.actual?.reps??'',sets:item.actual?.sets??''},restSeconds:item.restSeconds??null,notes:item.notes??null}}
function draftSignature(){return JSON.stringify(planParts.value.map(part=>({key:part.key,actions:part.actions.map(action=>({exerciseId:action.exerciseId,target:action.target,actual:action.actual,restSeconds:action.restSeconds,notes:action.notes}))})))}
function isActionDone(action){const actual=action.actual||{};return actual.kg!==''&&Number(actual.kg)>=0&&Number(actual.reps)>0&&Number(actual.sets)>0}
function completedInPart(part){return part.actions.filter(isActionDone).length}
function availableParts(){return parts.filter(part=>actionLibrary.value.some(action=>action.category===part.key)&&!planParts.value.some(item=>item.key===part.key))}
function applyPlan(plan){
  const previousPlanId=currentPlan.value?.id
  const actualByExercise=new Map(planParts.value.flatMap(part=>part.actions.map(action=>[action.exerciseId,{...action.actual}])))
  currentPlan.value=plan||null
  if(plan?.status==='draft'&&previousPlanId!==plan.id)workoutStartedAt.value=new Date().toISOString()
  if(!plan||plan.status==='completed')workoutStartedAt.value=''
  if(!plan||completionAttempt.value&&(completionAttempt.value.planId!==plan.id||completionAttempt.value.version!==plan.version))completionAttempt.value=null
  if(!plan){planParts.value=[];selectedPartKey.value='';savedDraftSignature.value='';return}
  const byCategory=new Map()
  for(const item of plan.exercises||[]){
    const action=planAction(item),key=action.category
    if((!previousPlanId||previousPlanId===plan.id)&&actualByExercise.has(action.exerciseId))action.actual=actualByExercise.get(action.exerciseId)
    if(!byCategory.has(key))byCategory.set(key,[])
    byCategory.get(key).push(action)
  }
  planParts.value=parts.filter(part=>byCategory.has(part.key)).map(part=>({...part,actions:byCategory.get(part.key)}))
  selectedPartKey.value=planParts.value[0]?.key||''
  savedDraftSignature.value=draftSignature()
}
async function loadExerciseLibrary(){
  const items=[],query={page:1,pageSize:100}
  for(;;){
    const result=await getExercises(query)
    items.push(...(Array.isArray(result?.items)?result.items:[]))
    if(!result?.hasMore)break
    query.page+=1
  }
  actionLibrary.value=items
}
function showError(error,fallback='请求失败'){
  loadError.value=error?.message||fallback
  const title=error?.code==='EXERCISE_UNAVAILABLE'?'计划中包含已失效或无权使用的动作':loadError.value
  uni.showToast({title,icon:'none'})
}
async function loadPlan(){
  const result=await listTrainingPlans({date:selectedDate.value,page:1,pageSize:20})
  applyPlan(Array.isArray(result?.items)?result.items[0]||null:null)
}
async function load(){
  if(loading.value)return
  const ti=Number(uni.getStorageSync(THEME_KEY));themeIndex.value=Number.isInteger(ti)&&themes[ti]?ti:0
  loading.value=true;loadError.value=''
  try{await Promise.all([loadExerciseLibrary(),loadPlan()])}
  catch(error){showError(error,'训练计划加载失败')}
  finally{loading.value=false}
}
function ensureEditable(){if(!todayCompleted.value)return true;uni.showToast({title:'已完成计划不可修改',icon:'none'});return false}
function addPart(){if(!ensureEditable())return;const available=availableParts();if(!available.length){uni.showToast({title:'暂无可添加部位，请先管理动作库',icon:'none'});return}uni.showActionSheet({itemList:available.map(part=>part.name),success:({tapIndex})=>{const part=available[tapIndex];planParts.value.push({...part,actions:[]});selectedPartKey.value=part.key}})}
function removePart(part){if(!ensureEditable())return;uni.showModal({title:`移除${part.name}？`,content:'该部位今天填写的数据会一并移除。',success:result=>{if(!result.confirm)return;planParts.value=planParts.value.filter(item=>item.key!==part.key);selectedPartKey.value=planParts.value[0]?.key||''}})}
function addAction(){if(!ensureEditable()||!activePart.value)return;const used=activePart.value.actions.map(item=>item.exerciseId),available=actionLibrary.value.filter(item=>item.category===activePart.value.key&&!used.includes(item.id));if(!available.length){uni.showToast({title:'该部位暂无更多动作',icon:'none'});return}uni.showActionSheet({itemList:available.map(item=>`${item.name} · ${equipmentName(item.equipment)}`),success:({tapIndex})=>activePart.value.actions.push(catalogAction(available[tapIndex]))})}
function removeAction(action){if(!ensureEditable())return;activePart.value.actions=activePart.value.actions.filter(item=>item.id!==action.id)}
function optionalNumber(value,integer=false){
  if(value===''||value===null||value===undefined)return null
  const number=Number(value)
  if(!Number.isFinite(number)||number<0||integer&&!Number.isInteger(number))return NaN
  return number
}
function payload(){
  let sortOrder=0
  return {
    planDate:selectedDate.value,name:null,durationMinutes:estimatedDuration.value,
    exercises:planParts.value.flatMap(part=>part.actions.map(action=>({
      exerciseId:action.exerciseId,sets:optionalNumber(action.target.sets,true),
      reps:optionalNumber(action.target.reps,true),weight:optionalNumber(action.target.kg),
      actual:{kg:optionalNumber(action.actual.kg),reps:optionalNumber(action.actual.reps,true),sets:optionalNumber(action.actual.sets,true)},
      restSeconds:action.restSeconds,notes:action.notes,sortOrder:++sortOrder
    })))
  }
}
function validPayload(data){
  if(!data.exercises.length){uni.showToast({title:'请至少添加一个训练动作',icon:'none'});return false}
  if(data.exercises.some(item=>[item.sets,item.reps,item.weight,item.restSeconds,...Object.values(item.actual)].some(Number.isNaN))){uni.showToast({title:'训练数据格式不正确',icon:'none'});return false}
  return true
}
function hasUnsavedPlan(){return draftSignature()!==savedDraftSignature.value}
async function changePlanDate(event){
  const next=event?.detail?.value
  if(!/^\d{4}-\d{2}-\d{2}$/.test(next||'')||next===selectedDate.value)return
  const switchDate=async()=>{
    const previous=selectedDate.value
    selectedDate.value=next;loading.value=true;loadError.value=''
    try{await loadPlan()}
    catch(error){selectedDate.value=previous;showError(error,'训练计划加载失败')}
    finally{loading.value=false}
  }
  if(!hasUnsavedPlan()){await switchDate();return}
  uni.showModal({title:'切换训练日期？',content:'当前未保存的计划修改将丢失。',success:result=>{if(result.confirm)switchDate()}})
}
function requirePlanResponse(plan){
  const valid=plan&&typeof plan==='object'&&typeof plan.id==='string'&&plan.id&&
    Number.isInteger(plan.version)&&typeof plan.status==='string'&&
    Array.isArray(plan.exercises)&&typeof plan.planDate==='string'&&
    typeof plan.name==='string'&&plan.name
  if(!valid){
    const error=new Error('训练计划响应不完整，请重新获取')
    error.code='INVALID_PLAN_RESPONSE'
    throw error
  }
  return plan
}
async function savePlan(){
  if(todayCompleted.value){uni.showToast({title:'已完成计划不可修改',icon:'none'});return}
  if(saving.value)return
  const data=payload()
  if(!validPayload(data))return
  saving.value=true;loadError.value=''
  try{
    const saved=currentPlan.value
      ?await updateTrainingPlan(currentPlan.value.id,{...data,version:currentPlan.value.version})
      :await createTrainingPlan(data,'plan-'+selectedDate.value+'-'+Date.now())
    applyPlan(requirePlanResponse(saved))
    uni.showToast({title:currentPlan.value?.version>1?'计划已更新':'计划已创建',icon:'success'})
  }catch(error){
    if(error?.code==='PLAN_VERSION_CONFLICT'){
      uni.showModal({title:'计划已在其他位置更新',content:'不会覆盖服务器数据，点击确定后加载最新计划。',showCancel:false,success:()=>loadPlan().catch(loadError=>showError(loadError,'最新计划加载失败'))})
    }else{
      showError(error,error?.code==='PLAN_DATE_CONFLICT'?'当天已有训练计划':'计划保存失败')
      if(error?.code==='PLAN_DATE_CONFLICT')await loadPlan().catch(()=>{})
      if(error?.code==='EXERCISE_UNAVAILABLE')await loadExerciseLibrary().catch(()=>{})
    }
  }finally{saving.value=false}
}
async function completeTraining(){
  const plan=currentPlan.value
  if(!plan||plan.status==='completed'||completing.value)return
  if(draftSignature()!==savedDraftSignature.value){uni.showToast({title:'请先保存计划修改',icon:'none'});return}
  if(!Array.isArray(plan.exercises)||!plan.exercises.length){uni.showToast({title:'计划至少需要一个动作',icon:'none'});return}
  const actualExercises=planParts.value.flatMap(part=>part.actions.map(action=>({
    exerciseId:action.exerciseId,
    actual:{kg:optionalNumber(action.actual.kg),reps:optionalNumber(action.actual.reps,true),sets:optionalNumber(action.actual.sets,true)}
  })))
  if(actualExercises.some(item=>item.actual.kg===null||item.actual.reps===null||item.actual.sets===null||Object.values(item.actual).some(Number.isNaN)||item.actual.reps<1||item.actual.sets<1)){
    uni.showToast({title:'请完整填写每个动作的实际数据',icon:'none'});return
  }
  if(!completionAttempt.value){
    const completedAt=new Date().toISOString()
    completionAttempt.value={
      planId:plan.id,version:plan.version,startedAt:workoutStartedAt.value||null,completedAt,
      key:'complete-'+plan.id+'-'+plan.version+'-'+Date.now()
    }
  }
  const attempt=completionAttempt.value
  completing.value=true;loadError.value=''
  try{
    await completeTrainingPlan(plan.id,{
      version:attempt.version,completedAt:attempt.completedAt,
      exercises:actualExercises,
      ...(attempt.startedAt?{startedAt:attempt.startedAt}:{})
    },attempt.key)
    completionAttempt.value=null
    await loadPlan()
    uni.showToast({title:'训练已完成',icon:'success'})
  }catch(error){
    if(error?.code==='TRAINING_ALREADY_COMPLETED'){
      completionAttempt.value=null
      await loadPlan().catch(()=>{})
      uni.showToast({title:'该训练已完成',icon:'none'})
    }else if(error?.code==='PLAN_VERSION_CONFLICT'){
      completionAttempt.value=null
      uni.showModal({title:'计划版本已变化',content:'不会重复完成训练，点击确定后加载最新计划。',showCancel:false,success:()=>loadPlan().catch(loadError=>showError(loadError,'最新计划加载失败'))})
    }else showError(error,'完成训练失败，请稍后重试')
  }finally{completing.value=false}
}
function managePlan(){
  if(!currentPlan.value){load();return}
  uni.showActionSheet({itemList:['刷新计划','删除计划'],success:({tapIndex})=>{
    if(tapIndex===0){loadPlan().catch(error=>showError(error,'计划刷新失败'));return}
    uni.showModal({title:`删除“${currentPlan.value.name}”？`,content:'删除后当天将恢复为无计划状态。',success:async result=>{
      if(!result.confirm)return
      saving.value=true
      try{await deleteTrainingPlan(currentPlan.value.id);applyPlan(null);uni.showToast({title:'计划已删除',icon:'success'})}
      catch(error){showError(error,'计划删除失败')}
      finally{saving.value=false}
    }})
  }})
}
function goBack(){uni.navigateBack({fail:()=>uni.reLaunch({url:'/pages/home/home'})})}
onLoad(options=>{selectedDate.value=/^\d{4}-\d{2}-\d{2}$/.test(options?.date||'')?options.date:dateKey()})
onShow(load)
</script>

<style scoped>
page{background:#f6f5fa}.page{position:relative;min-height:100vh;overflow:hidden;color:#2b3142;background:linear-gradient(145deg,var(--pale),var(--pale-2))}.ambient{position:absolute;inset:0;overflow:hidden;pointer-events:none}.orb{position:absolute;border-radius:50%;background:rgba(var(--glow-rgb),.1)}.orb-one{width:520rpx;height:520rpx;top:-290rpx;right:-210rpx}.orb-two{width:390rpx;height:390rpx;bottom:-210rpx;left:-210rpx}.dot-field{position:absolute;inset:0;opacity:.12;background-image:radial-gradient(rgba(var(--glow-rgb),.5) 1rpx,transparent 1rpx);background-size:36rpx 36rpx;mask-image:linear-gradient(#000,transparent 80%)}.shell{position:relative;z-index:1;width:100%;padding:calc(var(--status-bar-height) + 24rpx) 24rpx 48rpx}.topbar{display:flex;align-items:center;gap:17rpx}.back{width:62rpx;height:62rpx;margin:0;padding:0;border:0;border-radius:19rpx;color:var(--accent);background:rgba(255,255,255,.72);font-size:42rpx;line-height:56rpx}.back:after,.add-part:after,.action-column-head button:after,.action-empty button:after,.complete-button:after{border:0}.kicker,.page-title{display:block}.kicker{color:var(--accent);font-size:15rpx;font-weight:750;letter-spacing:3rpx}.page-title{font-size:30rpx;font-weight:760}.theme-badge{display:flex;align-items:center;gap:7rpx;margin-left:auto;color:#9096a4;font-size:15rpx}.theme-badge view{width:16rpx;height:16rpx;border-radius:50%;background:var(--accent)}.hero,.content{margin-top:24rpx;border:1rpx solid rgba(255,255,255,.92);border-radius:31rpx;background:rgba(255,255,255,.8);box-shadow:0 19rpx 48rpx rgba(53,61,92,.08);backdrop-filter:blur(16rpx)}.hero{padding:27rpx}.hero-head{display:flex;justify-content:space-between;align-items:center}.date,.plan-title,.hero-meta{display:block}.date{color:var(--accent);font-size:17rpx;font-weight:700}.plan-title{margin-top:6rpx;font-size:37rpx;font-weight:780}.hero-meta{margin-top:6rpx;color:#9299a8;font-size:17rpx}.status{padding:9rpx 14rpx;border-radius:20rpx;color:var(--accent);background:var(--pale);font-size:16rpx;font-weight:700}.status.completed{color:#fff;background:var(--accent)}.part-progress-list{display:grid;gap:15rpx;margin-top:23rpx;padding-top:20rpx;border-top:1rpx solid rgba(var(--glow-rgb),.13)}.part-progress{padding:15rpx 17rpx;border-radius:20rpx;background:var(--pale-2)}.part-progress-head{display:flex;justify-content:space-between;color:#656d80;font-size:17rpx;font-weight:700}.part-progress-head text:last-child{color:var(--accent)}.progress-nodes{position:relative;display:flex;gap:17rpx;margin-top:15rpx;overflow-x:auto}.progress-rail{position:absolute;left:15rpx;right:15rpx;top:14rpx;height:2rpx;background:rgba(var(--glow-rgb),.18)}.progress-node{position:relative;z-index:1;display:grid;justify-items:center;gap:7rpx;min-width:80rpx;color:#969caa;font-size:14rpx;text-align:center}.progress-node text{max-width:105rpx;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.progress-dot{width:29rpx;height:29rpx;display:grid;place-items:center;border:3rpx solid var(--accent);border-radius:50%;color:#fff;background:var(--pale-2);font-size:14rpx}.progress-node.done{color:#4c5468}.progress-node.done .progress-dot{background:var(--accent);box-shadow:0 6rpx 15rpx rgba(var(--glow-rgb),.24)}.part-empty-tip{display:block;margin-top:10rpx;color:#9ba1ae;font-size:14rpx}.hero-empty{display:grid;justify-items:center;padding:25rpx 0 6rpx;color:#9ba1ae;font-size:16rpx}.hero-empty view{width:43rpx;height:43rpx;display:grid;place-items:center;margin-bottom:8rpx;border-radius:50%;color:#fff;background:var(--accent);font-size:24rpx}.content{padding:23rpx}.content-head{display:flex;justify-content:space-between;align-items:center;margin-bottom:20rpx}.section-title,.section-caption{display:block}.section-title{font-size:27rpx;font-weight:760}.section-caption{margin-top:4rpx;color:#999fac;font-size:16rpx}.saved-tip{padding:7rpx 12rpx;border-radius:15rpx;color:var(--accent);background:var(--pale);font-size:14rpx}.planner{display:grid;grid-template-columns:164rpx minmax(0,1fr);gap:14rpx}.part-column,.action-column{min-width:0;border-radius:23rpx;background:var(--pale-2)}.part-column{padding:13rpx}.column-label{display:block;padding:5rpx;color:#818899;font-size:15rpx;font-weight:700}.part-list{display:grid;gap:9rpx;margin-top:8rpx}.part-tab{position:relative;display:grid;justify-items:center;gap:4rpx;padding:12rpx 5rpx;border:2rpx solid transparent;border-radius:18rpx;color:#777f91;background:#fff;transition:transform .2s ease,border-color .2s ease}.part-tab.active{border-color:var(--accent);color:var(--accent);box-shadow:0 7rpx 18rpx rgba(var(--glow-rgb),.1)}.part-symbol{width:37rpx;height:37rpx;display:grid;place-items:center;border-radius:12rpx;color:var(--accent);background:var(--pale);font-size:18rpx}.part-tab-copy{text-align:center}.part-tab-copy text{display:block;font-size:17rpx;font-weight:700}.part-tab-copy text:last-child{margin-top:2rpx;color:#a0a5b0;font-size:13rpx;font-weight:400}.part-remove{position:absolute;right:6rpx;top:2rpx;color:#b1b5bf;font-size:23rpx}.add-part{height:auto;margin:11rpx 0 0;padding:13rpx 4rpx;border:2rpx dashed rgba(var(--glow-rgb),.28);border-radius:17rpx;color:var(--accent);background:transparent;font-size:15rpx;line-height:1.4}.add-part text{display:block}.add-part text:first-child{font-size:23rpx}.action-column{padding:14rpx}.action-column-head{display:flex;justify-content:space-between;align-items:center;margin-bottom:13rpx}.action-column-head view text{display:block}.column-title{font-size:21rpx;font-weight:750}.action-column-head view text:last-child{margin-top:2rpx;color:#9aa0ad;font-size:13rpx}.action-column-head button{height:48rpx;margin:0;padding:0 13rpx;border:0;border-radius:15rpx;color:#fff;background:var(--accent);font-size:14rpx;line-height:48rpx}.action-list{display:grid;gap:12rpx}.action-editor{padding:14rpx;border:1rpx solid rgba(255,255,255,.95);border-radius:19rpx;background:#fff}.action-head,.action-name{display:flex;align-items:center}.action-head{justify-content:space-between;margin-bottom:13rpx}.action-name{gap:9rpx;min-width:0}.state-dot{width:29rpx;height:29rpx;display:grid;place-items:center;flex:none;border:3rpx solid var(--accent);border-radius:50%;color:#fff;font-size:13rpx}.state-dot.done{background:var(--accent)}.action-name text{display:block;max-width:250rpx;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:18rpx;font-weight:700}.action-name text:last-child{margin-top:2rpx;color:#a0a5b0;font-size:12rpx;font-weight:400}.remove-action{color:#ab8490;font-size:13rpx}.metric-row{display:grid;grid-template-columns:47rpx repeat(3,minmax(0,1fr));gap:7rpx;align-items:end;padding:9rpx;border-radius:15rpx}.actual-row{margin-top:7rpx;background:var(--pale)}.row-label{align-self:center;color:#788093;font-size:14rpx;font-weight:700}.metric-row label{min-width:0}.metric-row label text{display:block;margin-bottom:4rpx;color:#9ca2ae;font-size:12rpx;text-align:center}.metric-row input{box-sizing:border-box;width:100%;height:48rpx;padding:0 5rpx;border:1rpx solid rgba(var(--glow-rgb),.18);border-radius:11rpx;color:#343b4d;background:#f8f8fb;font-size:15rpx;text-align:center}.actual-row input{border-color:rgba(var(--glow-rgb),.3);background:#fff}.actual-row input::placeholder{font-size:10rpx}.part-empty,.action-empty{display:grid;justify-items:center;align-content:center;min-height:320rpx;padding:20rpx;color:#999fac;text-align:center}.part-empty view,.action-empty view{color:var(--accent);font-size:47rpx}.part-empty text,.action-empty text{font-size:16rpx;font-weight:650}.part-empty text:last-child,.action-empty text:nth-child(3){margin-top:5rpx;font-size:13rpx;font-weight:400}.action-empty button{height:54rpx;margin-top:17rpx;padding:0 18rpx;border:0;border-radius:16rpx;color:var(--accent);background:var(--pale);font-size:15rpx}.complete-button{height:75rpx;margin-top:21rpx;border:0;border-radius:22rpx;color:#fff;background:linear-gradient(100deg,var(--accent),var(--accent-2));font-size:22rpx;font-weight:750;box-shadow:0 13rpx 29rpx rgba(var(--glow-rgb),.2)}.complete-button.update{box-shadow:none}.pressed,.tab-pressed{opacity:.8;transform:scale(.98)}
@media(min-width:900px){.shell{width:min(1120px,calc(100% - 70px));margin:auto;padding:30px 0 50px}.hero,.content{border-radius:26px}.hero{padding:25px}.part-progress-list{grid-template-columns:repeat(2,minmax(0,1fr));gap:12px}.content{padding:24px}.planner{grid-template-columns:210px minmax(0,1fr);gap:18px}.part-column,.action-column{border-radius:20px}.part-column{padding:14px}.part-tab{grid-template-columns:34px 1fr 14px;justify-items:start;align-items:center;padding:11px;border-radius:15px}.part-symbol{width:34px;height:34px}.part-tab-copy{text-align:left}.part-remove{position:static}.action-column{padding:18px}.action-list{grid-template-columns:repeat(2,minmax(0,1fr));gap:12px}.action-name text{max-width:180px}.metric-row{grid-template-columns:42px repeat(3,minmax(0,1fr))}.metric-row input{height:39px}.complete-button{height:54px}}
.date-picker{display:inline-flex;align-items:center;gap:8rpx;padding:6rpx 10rpx 6rpx 0}.date-picker text{font-size:14rpx}
</style>
