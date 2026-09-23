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
          <view><picker mode="date" :value="selectedDate" @change="changePlanDate"><view class="date date-picker">{{ todayText }} <text>⌄</text></view></picker><text class="plan-title">{{ planTitle }}</text></view>
          <view class="status" :class="{completed:todayCompleted}" @tap="managePlan">{{ todayCompleted?'该日已完成':currentPlan?'管理计划':'新建计划' }}</view>
        </view>
        <view v-if="planParts.length" class="part-progress-list" :class="{'single-part':planParts.length===1}">
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
                <view v-for="(action,actionIndex) in activePart.actions" :key="action.id+'-'+actionIndex" class="action-editor" :class="{dragging:dragIndex===actionIndex}">
                  <view class="action-head">
                    <view class="action-name"><view class="state-dot" :class="{done:isActionDone(action)}">{{ isActionDone(action)?'✓':'' }}</view><view><text>{{ action.name }}</text><text>{{ action.equipment||'徒手' }}</text></view></view>
                    <view class="action-tools"><text class="remove-action" @tap="removeAction(action)">移除</text><view class="drag-handle" @touchstart.stop.prevent="startTouchDrag($event,actionIndex)" @touchmove.stop.prevent="moveTouchDrag" @touchend.stop="finishDrag" @mousedown.stop.prevent="startMouseDrag($event,actionIndex)">⠿</view></view>
                  </view>
                  <picker v-if="action.variants.length" :range="action.variants" range-key="name" @change="selectVariant(action,$event)"><view class="method-caption"><text>动作变式：{{ action.variant?.name||'默认' }}</text><text>选择 ›</text></view></picker>
                  <view class="method-caption" @tap="editRecordMethods(action)"><text>记录方式：{{ action.recordMethods.map(recordMethodName).join('、') }}</text><text>{{ todayCompleted?'已锁定':'调整 ›' }}</text></view>
                  <view class="metric-row target-row" :style="metricGridStyle(action)">
                    <text class="row-label">计划</text>
                    <label v-for="method in action.recordMethods" :key="'target-'+method"><text>{{ recordMethodName(method) }}</text><input v-model="action.targetMetrics[method]" :disabled="todayCompleted" :type="metricInputType(method)" maxlength="8" placeholder="0"/></label>
                    <view class="group-action-placeholder"/>
                  </view>
                  <view v-for="(group,groupIndex) in action.actualGroups" :key="group.id" class="metric-row actual-row" :style="metricGridStyle(action)">
                    <text class="row-label">{{ groupIndex+1 }}组</text>
                    <label v-for="method in action.recordMethods" :key="group.id+'-'+method"><text>{{ recordMethodName(method) }}</text><input v-model="group.values[method]" :disabled="todayCompleted" :type="metricInputType(method)" maxlength="8" placeholder="输入"/></label>
                    <text v-if="!todayCompleted" class="group-remove" @tap="removeGroup(action,groupIndex)">×</text><view v-else class="group-action-placeholder"/>
                  </view>
                  <button v-if="!todayCompleted" class="add-group" hover-class="pressed" @tap="addGroup(action)">＋ 新增一组</button>
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
    <view v-if="methodEditorAction" class="method-overlay" @tap.self="closeMethodEditor">
      <view class="method-dialog">
        <view class="method-dialog-head"><view><text>记录方式</text><text>{{ methodEditorAction.name }}</text></view><text @tap="closeMethodEditor">×</text></view>
        <checkbox-group class="method-options" @change="changeMethodDraft">
          <label v-for="option in recordMethodOptions" :key="option.key">
            <checkbox :value="option.key" :checked="methodDraft.includes(option.key)" color="#7775bd"/>
            <text>{{ option.name }}</text>
          </label>
        </checkbox-group>
        <view class="method-dialog-actions">
          <button @tap="resetMethodDraft">系统默认</button>
          <button class="primary" @tap="saveMethodDraft">确定</button>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup>
import { computed,ref } from 'vue'
import { onHide,onLoad,onShow,onUnload } from '@dcloudio/uni-app'
import { getExercises } from '../../api/exercises'
import { USER_KEY } from '../../api/auth'
import { bodyPartOptions,recordMethodOptions,recordMethodName } from '../../constants/exercise-meta'
import {
  completeTrainingPlan, createTrainingPlan, deleteTrainingPlan,
  listTrainingPlans, updateTrainingPlan
} from '../../api/training'
const THEME_KEY='fit_note_theme_index'
const cachedUser=uni.getStorageSync(USER_KEY)||{}
const USER_SCOPE=String(cachedUser.id||cachedUser.accountCode||'anonymous')
const ACTION_ORDER_KEY='fit_note_action_order_'+USER_SCOPE
const PLAN_DRAFT_PREFIX='fit_note_training_plan_draft_v1_'+USER_SCOPE+'_'
const PLAN_LAST_DATE_KEY='fit_note_training_plan_last_date_'+USER_SCOPE
const themes=[{accent:'#7775bd',accent2:'#a59bd2',pale:'#f1f0f9',pale2:'#faf9fd',glow:'119,117,189'},{accent:'#5f9fa5',accent2:'#8bbdaf',pale:'#edf6f5',pale2:'#f8fbfa',glow:'95,159,165'},{accent:'#bd8073',accent2:'#cda56f',pale:'#faf1ed',pale2:'#fdf9f5',glow:'189,128,115'}]
const partLooks={chest:['胸','◇'],back:['背','⌁'],shoulder:['肩','▽'],arms:['臂','↯'],legs:['腿','△'],glutes:['臀','◒'],core:['核','◎'],full_body:['全','✦'],cardio:['氧','≈'],other:['其','·']}
const parts=bodyPartOptions.map(part=>({...part,short:partLooks[part.key][0],icon:partLooks[part.key][1]}))
const legacyPart={abs:'core'}
const equipmentLabels={barbell:'杠铃',dumbbell:'哑铃',machine:'器械',cable:'绳索',bodyweight:'徒手',other:'其他'}
const themeIndex=ref(0),actionLibrary=ref([]),planParts=ref([]),selectedPartKey=ref('')
const currentPlan=ref(null),selectedDate=ref(''),loading=ref(false),saving=ref(false),completing=ref(false),loadError=ref('')
const completionAttempt=ref(null)
const workoutStartedAt=ref('')
const savedDraftSignature=ref('')
const dragIndex=ref(-1)
const methodEditorAction=ref(null),methodDraft=ref([])
let dragStartY=0,mouseCleanup=null
const themeStyle=computed(()=>{const t=themes[themeIndex.value];return{'--accent':t.accent,'--accent-2':t.accent2,'--pale':t.pale,'--pale-2':t.pale2,'--glow-rgb':t.glow}})
const todayText=computed(()=>new Date(selectedDate.value+'T00:00:00').toLocaleDateString('zh-CN',{month:'long',day:'numeric',weekday:'long'}))
const activePart=computed(()=>planParts.value.find(part=>part.key===selectedPartKey.value)||null)
const totalActions=computed(()=>planParts.value.reduce((sum,part)=>sum+part.actions.length,0))
const completedActions=computed(()=>planParts.value.reduce((sum,part)=>sum+completedInPart(part),0))
const planTitle=computed(()=>{if(currentPlan.value?.name)return currentPlan.value.name;if(!planParts.value.length)return'训练计划';if(planParts.value.length===1)return planParts.value[0].name+'训练';return planParts.value.map(part=>part.short).join('')+'训练'})
const estimatedDuration=computed(()=>Math.max(20,totalActions.value*8))
const todayCompleted=computed(()=>currentPlan.value?.status==='completed')
const syncText=computed(()=>saving.value?'正在保存':loading.value?'正在同步':loadError.value?'同步失败':hasUnsavedPlan()?'本地草稿':currentPlan.value?'云端已保存':'尚未创建')
function pad(v){return String(v).padStart(2,'0')}
function dateKey(){const d=new Date();return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`}
function list(value){return Array.isArray(value)?value:[]}
function emptyValues(methods,source={}){return Object.fromEntries(methods.map(method=>[method,source?.[method]??'']))}
function createGroup(methods,values={}){return{id:'group-'+Date.now()+'-'+Math.random().toString(36).slice(2,7),values:emptyValues(methods,values)}}
function normalizeGroups(groups,methods,legacyActual){
  if(Array.isArray(groups)&&groups.length)return groups.map(group=>createGroup(methods,group?.values||group||{}))
  const legacy={weight:legacyActual?.kg,reps:legacyActual?.reps}
  return Object.values(legacy).some(value=>value!==null&&value!==undefined&&value!=='')?[createGroup(methods,legacy)]:[createGroup(methods)]
}
function equipmentName(value){return equipmentLabels[value]||value||'徒手'}
function actionParts(exercise){const modern=list(exercise.bodyParts);return modern.length?modern:[legacyPart[exercise.category]||exercise.category].filter(Boolean)}
function catalogAction(exercise,partKey){const methods=list(exercise.recordMethods).length?list(exercise.recordMethods):['weight','reps'];return{id:exercise.id,exerciseId:exercise.id,name:exercise.name,equipment:equipmentName(exercise.equipment),bodyPart:partKey,exerciseDefaultMethods:[...methods],recordMethods:[...methods],variants:list(exercise.variants),variantId:null,variant:null,targetMetrics:emptyValues(methods),actualGroups:[createGroup(methods)],restSeconds:null,notes:null}}
function planAction(item){
  const methods=list(item.recordMethods).length?list(item.recordMethods):(list(item.exercise?.recordMethods).length?list(item.exercise.recordMethods):['weight','reps'])
  const target=item.targetMetrics||{weight:item.weight,reps:item.reps}
  const variants=list(item.exercise?.variants),variant=item.variant||variants.find(value=>value.id===item.variantId)||null
  return{id:item.id||item.exerciseId,exerciseId:item.exerciseId,name:item.exercise?.name||'已归档动作',equipment:equipmentName(item.exercise?.equipment),bodyPart:item.bodyPart||actionParts(item.exercise||{})[0]||'other',exerciseDefaultMethods:list(item.exercise?.recordMethods).length?list(item.exercise.recordMethods):['weight','reps'],recordMethods:methods,variants,variantId:item.variantId||null,variant,targetMetrics:emptyValues(methods,target),actualGroups:normalizeGroups(item.actualGroups,methods,item.actual),restSeconds:item.restSeconds??null,notes:item.notes??null}
}
function draftSignature(){return JSON.stringify(planParts.value.map(part=>({key:part.key,actions:part.actions.map(action=>({exerciseId:action.exerciseId,variantId:action.variantId,recordMethods:action.recordMethods,targetMetrics:action.targetMetrics,actualGroups:action.actualGroups.map(group=>group.values),restSeconds:action.restSeconds,notes:action.notes}))})))}
function draftStorageKey(date=selectedDate.value){return PLAN_DRAFT_PREFIX+date}
function clearLocalDraft(date=selectedDate.value){if(date)uni.removeStorageSync(draftStorageKey(date))}
function saveLocalDraft(){
  if(!/^\d{4}-\d{2}-\d{2}$/.test(selectedDate.value||''))return
  if(todayCompleted.value||!hasUnsavedPlan()){clearLocalDraft();return}
  uni.setStorageSync(draftStorageKey(),{
    schemaVersion:1,userScope:USER_SCOPE,planDate:selectedDate.value,
    basePlanId:currentPlan.value?.id||null,basePlanVersion:currentPlan.value?.version||null,
    selectedPartKey:selectedPartKey.value,workoutStartedAt:workoutStartedAt.value,
    planParts:JSON.parse(JSON.stringify(planParts.value)),updatedAt:new Date().toISOString()
  })
}
function restoreLocalDraft(){
  const draft=uni.getStorageSync(draftStorageKey())
  if(!draft||typeof draft!=='object')return false
  const sameBase=(draft.basePlanId||null)===(currentPlan.value?.id||null)
  const sameVersion=!draft.basePlanId||draft.basePlanVersion===currentPlan.value?.version
  if(draft.schemaVersion!==1||draft.userScope!==USER_SCOPE||draft.planDate!==selectedDate.value||
      !sameBase||!sameVersion||todayCompleted.value||!Array.isArray(draft.planParts)){
    clearLocalDraft()
    if(!sameBase||!sameVersion)uni.showToast({title:'云端计划已更新，旧草稿未恢复',icon:'none'})
    return false
  }
  const partMap=new Map(parts.map(part=>[part.key,part]))
  planParts.value=draft.planParts.filter(part=>partMap.has(part?.key)&&Array.isArray(part.actions))
    .map(part=>({...partMap.get(part.key),actions:part.actions}))
  selectedPartKey.value=planParts.value.some(part=>part.key===draft.selectedPartKey)
    ?draft.selectedPartKey:planParts.value[0]?.key||''
  workoutStartedAt.value=draft.workoutStartedAt||workoutStartedAt.value
  return true
}
function hasMetricValue(value){return value!==''&&value!==null&&value!==undefined&&Number.isFinite(Number(value))}
function isActionDone(action){return action.actualGroups.length>0&&action.actualGroups.every(group=>action.recordMethods.every(method=>hasMetricValue(group.values[method])))}
function completedInPart(part){return part.actions.filter(isActionDone).length}
function availableParts(){return parts.filter(part=>!planParts.value.some(item=>item.key===part.key))}
function applyPlan(plan){
  const previousPlanId=currentPlan.value?.id
  const actualByExercise=new Map(planParts.value.flatMap(part=>part.actions.map(action=>[action.exerciseId,action.actualGroups.map(group=>({...group,values:{...group.values}}))])))
  currentPlan.value=plan||null
  if(plan?.status==='draft'&&previousPlanId!==plan.id)workoutStartedAt.value=new Date().toISOString()
  if(!plan||plan.status==='completed')workoutStartedAt.value=''
  if(!plan||completionAttempt.value&&(completionAttempt.value.planId!==plan.id||completionAttempt.value.version!==plan.version))completionAttempt.value=null
  if(!plan){planParts.value=[];selectedPartKey.value='';savedDraftSignature.value=draftSignature();return}
  const byCategory=new Map()
  for(const item of plan.exercises||[]){
    const action=planAction(item),key=action.bodyPart
    if((!previousPlanId||previousPlanId===plan.id)&&actualByExercise.has(action.exerciseId))action.actualGroups=actualByExercise.get(action.exerciseId)
    if(!byCategory.has(key))byCategory.set(key,[])
    byCategory.get(key).push(action)
  }
  planParts.value=parts.filter(part=>byCategory.has(part.key)).map(part=>({...part,actions:byCategory.get(part.key)}))
  selectedPartKey.value=planParts.value[0]?.key||''
  savedDraftSignature.value=draftSignature()
}
async function loadExerciseLibrary(){
  const items=[],query={scope:'library',page:1,pageSize:100}
  for(;;){
    const result=await getExercises(query)
    items.push(...(Array.isArray(result?.items)?result.items:[]))
    if(!result?.hasMore)break
    query.page+=1
  }
  const order=uni.getStorageSync(ACTION_ORDER_KEY)
  const orderIndex=new Map((Array.isArray(order)?order:[]).map((id,index)=>[id,index]))
  actionLibrary.value=items.sort((a,b)=>(orderIndex.get(a.id)??99999)-(orderIndex.get(b.id)??99999))
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
  try{await Promise.all([loadExerciseLibrary(),loadPlan()]);restoreLocalDraft()}
  catch(error){showError(error,'训练计划加载失败')}
  finally{loading.value=false}
}
function ensureEditable(){if(!todayCompleted.value)return true;uni.showToast({title:'已完成计划不可修改',icon:'none'});return false}
function addPart(){if(!ensureEditable())return;const available=availableParts();if(!available.length){uni.showToast({title:'训练部位已全部添加',icon:'none'});return}uni.showActionSheet({itemList:available.map(part=>part.name),success:({tapIndex})=>{const part=available[tapIndex];planParts.value.push({...part,actions:[]});selectedPartKey.value=part.key}})}
function removePart(part){if(!ensureEditable())return;uni.showModal({title:`移除${part.name}？`,content:'该部位今天填写的数据会一并移除。',success:result=>{if(!result.confirm)return;planParts.value=planParts.value.filter(item=>item.key!==part.key);selectedPartKey.value=planParts.value[0]?.key||''}})}
function addAction(){if(!ensureEditable()||!activePart.value)return;const used=activePart.value.actions.map(item=>item.exerciseId),available=actionLibrary.value.filter(item=>actionParts(item).includes(activePart.value.key)&&!used.includes(item.id));if(!available.length){uni.showToast({title:'该部位暂无更多动作，请先在动作管理添加',icon:'none'});return}uni.showActionSheet({itemList:available.map(item=>`${item.name} · ${equipmentName(item.equipment)}`),success:({tapIndex})=>activePart.value.actions.push(catalogAction(available[tapIndex],activePart.value.key))})}
function removeAction(action){if(!ensureEditable())return;activePart.value.actions=activePart.value.actions.filter(item=>item.id!==action.id)}
function metricInputType(method){return method==='reps'?'number':'digit'}
function metricGridStyle(action){return{gridTemplateColumns:`47rpx repeat(${action.recordMethods.length},minmax(82rpx,1fr)) 35rpx`}}
function addGroup(action){action.actualGroups.push(createGroup(action.recordMethods))}
function selectVariant(action,event){if(!ensureEditable())return;const variant=action.variants[Number(event.detail.value)];action.variant=variant||null;action.variantId=variant?.id||null}
function applyRecordMethods(action,methods){const previousTarget=action.targetMetrics||{},previousGroups=action.actualGroups||[];action.recordMethods=[...methods];action.targetMetrics=emptyValues(methods,previousTarget);action.actualGroups=previousGroups.length?previousGroups.map(group=>createGroup(methods,group.values)):[createGroup(methods)]}
function editRecordMethods(action){if(!ensureEditable())return;methodEditorAction.value=action;methodDraft.value=[...action.recordMethods]}
function closeMethodEditor(){methodEditorAction.value=null;methodDraft.value=[]}
function changeMethodDraft(event){methodDraft.value=recordMethodOptions.map(item=>item.key).filter(key=>(event.detail.value||[]).includes(key))}
function resetMethodDraft(){if(methodEditorAction.value)methodDraft.value=[...methodEditorAction.value.exerciseDefaultMethods]}
function saveMethodDraft(){if(!methodEditorAction.value)return;if(!methodDraft.value.length){uni.showToast({title:'至少保留一种记录方式',icon:'none'});return}applyRecordMethods(methodEditorAction.value,methodDraft.value);closeMethodEditor()}
function removeGroup(action,index){if(action.actualGroups.length===1){action.actualGroups[0]=createGroup(action.recordMethods);return}action.actualGroups.splice(index,1)}
function reorderAction(from,to){if(!activePart.value||from===to||to<0||to>=activePart.value.actions.length)return;const actions=[...activePart.value.actions],[item]=actions.splice(from,1);actions.splice(to,0,item);activePart.value.actions=actions;dragIndex.value=to}
function moveDrag(y){if(dragIndex.value<0)return;const delta=y-dragStartY;if(Math.abs(delta)<72)return;const next=dragIndex.value+(delta>0?1:-1);if(activePart.value&&next>=0&&next<activePart.value.actions.length){reorderAction(dragIndex.value,next);dragStartY=y}}
function startTouchDrag(event,index){if(todayCompleted.value)return;dragIndex.value=index;dragStartY=event.touches?.[0]?.clientY||0}
function moveTouchDrag(event){moveDrag(event.touches?.[0]?.clientY||dragStartY)}
function startMouseDrag(event,index){if(todayCompleted.value||typeof window==='undefined')return;dragIndex.value=index;dragStartY=event.clientY;const move=mouseEvent=>moveDrag(mouseEvent.clientY);const end=()=>{window.removeEventListener('mousemove',move);window.removeEventListener('mouseup',end);mouseCleanup=null;finishDrag()};mouseCleanup=end;window.addEventListener('mousemove',move);window.addEventListener('mouseup',end)}
function finishDrag(){if(mouseCleanup&&typeof window!=='undefined')mouseCleanup();dragIndex.value=-1}
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
    exercises:planParts.value.flatMap(part=>part.actions.map(action=>{
      const targetMetrics=Object.fromEntries(action.recordMethods.map(method=>[method,optionalNumber(action.targetMetrics[method],method==='reps')]))
      const actualGroups=action.actualGroups.map(group=>({values:Object.fromEntries(action.recordMethods.map(method=>[method,optionalNumber(group.values[method],method==='reps')]))}))
      const first=actualGroups[0]?.values||{}
      return{exerciseId:action.exerciseId,variantId:action.variantId,bodyPart:part.key,recordMethods:[...action.recordMethods],targetMetrics,actualGroups,
        sets:actualGroups.length,reps:targetMetrics.reps??null,weight:targetMetrics.weight??null,
        actual:{kg:first.weight??null,reps:first.reps??null,sets:actualGroups.length},
        restSeconds:action.restSeconds,notes:action.notes,sortOrder:++sortOrder}
    }))
  }
}
function validPayload(data){
  if(!data.exercises.length){uni.showToast({title:'请至少添加一个训练动作',icon:'none'});return false}
  if(data.exercises.some(item=>[item.sets,item.reps,item.weight,item.restSeconds,...Object.values(item.targetMetrics),...item.actualGroups.flatMap(group=>Object.values(group.values))].some(Number.isNaN))){uni.showToast({title:'训练数据格式不正确',icon:'none'});return false}
  return true
}
function hasUnsavedPlan(){return draftSignature()!==savedDraftSignature.value}
async function changePlanDate(event){
  const next=event?.detail?.value
  if(!/^\d{4}-\d{2}-\d{2}$/.test(next||'')||next===selectedDate.value)return
  const switchDate=async()=>{
    const previous=selectedDate.value
    selectedDate.value=next;uni.setStorageSync(PLAN_LAST_DATE_KEY,next);loading.value=true;loadError.value=''
    try{await loadPlan();restoreLocalDraft()}
    catch(error){selectedDate.value=previous;uni.setStorageSync(PLAN_LAST_DATE_KEY,previous);showError(error,'训练计划加载失败')}
    finally{loading.value=false}
  }
  if(!hasUnsavedPlan()){await switchDate();return}
  uni.showModal({title:'切换训练日期？',content:'当前内容会保存为本地草稿，返回该日期时自动恢复。',success:result=>{if(result.confirm){saveLocalDraft();switchDate()}}})
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
    clearLocalDraft()
    uni.showToast({title:currentPlan.value?.version>1?'计划已更新':'计划已创建',icon:'success'})
  }catch(error){
    if(error?.code==='PLAN_VERSION_CONFLICT'){
      clearLocalDraft()
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
  const actualExercises=planParts.value.flatMap(part=>part.actions.map(action=>{
    const actualGroups=action.actualGroups.map(group=>({values:Object.fromEntries(action.recordMethods.map(method=>[method,optionalNumber(group.values[method],method==='reps')]))}))
    const first=actualGroups[0]?.values||{}
    return{exerciseId:action.exerciseId,recordMethods:[...action.recordMethods],actualGroups,actual:{kg:first.weight??0,reps:first.reps??1,sets:actualGroups.length}}
  }))
  if(actualExercises.some(item=>!item.actualGroups.length||item.actualGroups.some(group=>Object.values(group.values).some(value=>value===null||Number.isNaN(value))))) {
    uni.showToast({title:'请完整填写每个动作的实际数据',icon:'none'});return
  }
  const durationMinutes=completionAttempt.value?completionAttempt.value.durationMinutes:await askCompletionDuration()
  if(durationMinutes===undefined)return
  if(Number.isNaN(durationMinutes)){uni.showToast({title:'训练时长请输入 1–1440 分钟',icon:'none'});return}
  if(!completionAttempt.value){
    const completedAt=new Date().toISOString()
    completionAttempt.value={
      planId:plan.id,version:plan.version,startedAt:workoutStartedAt.value||null,completedAt,durationMinutes,exercises:actualExercises,
      key:'complete-'+plan.id+'-'+plan.version+'-'+Date.now()
    }
  }
  const attempt=completionAttempt.value
  completing.value=true;loadError.value=''
  try{
    await completeTrainingPlan(plan.id,{
      version:attempt.version,completedAt:attempt.completedAt,
      exercises:attempt.exercises,
      ...(attempt.durationMinutes?{durationMinutes:attempt.durationMinutes}:{}),
      ...(attempt.startedAt?{startedAt:attempt.startedAt}:{})
    },attempt.key)
    completionAttempt.value=null
    clearLocalDraft()
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
function askCompletionDuration(){return new Promise(resolve=>uni.showModal({title:'完成本次训练',content:'可填写本次训练时长，留空也可以直接保存。',editable:true,placeholderText:'训练时长（分钟，可不填）',confirmText:'保存',success:result=>{if(!result.confirm){resolve(undefined);return}const value=String(result.content||'').trim();if(!value){resolve(null);return}const minutes=Number(value);resolve(Number.isInteger(minutes)&&minutes>=1&&minutes<=1440?minutes:NaN)},fail:()=>resolve(undefined)}))}
function managePlan(){
  if(!currentPlan.value){load();return}
  uni.showActionSheet({itemList:['刷新计划','删除计划'],success:({tapIndex})=>{
    if(tapIndex===0){loadPlan().catch(error=>showError(error,'计划刷新失败'));return}
    uni.showModal({title:`删除“${currentPlan.value.name}”？`,content:'删除后当天将恢复为无计划状态。',success:async result=>{
      if(!result.confirm)return
      saving.value=true
      try{await deleteTrainingPlan(currentPlan.value.id);clearLocalDraft();applyPlan(null);uni.showToast({title:'计划已删除',icon:'success'})}
      catch(error){showError(error,'计划删除失败')}
      finally{saving.value=false}
    }})
  }})
}
function goBack(){uni.navigateBack({fail:()=>uni.reLaunch({url:'/pages/home/home'})})}
onLoad(options=>{const stored=uni.getStorageSync(PLAN_LAST_DATE_KEY),requested=options?.date||'';selectedDate.value=/^\d{4}-\d{2}-\d{2}$/.test(requested)?requested:/^\d{4}-\d{2}-\d{2}$/.test(stored||'')?stored:dateKey();uni.setStorageSync(PLAN_LAST_DATE_KEY,selectedDate.value)})
onShow(load)
onHide(saveLocalDraft)
onUnload(saveLocalDraft)
</script>

<style scoped>
page{background:#f6f5fa}.page{position:relative;min-height:100vh;overflow:hidden;color:#2b3142;background:linear-gradient(145deg,var(--pale),var(--pale-2))}.ambient{position:absolute;inset:0;overflow:hidden;pointer-events:none}.orb{position:absolute;border-radius:50%;background:rgba(var(--glow-rgb),.1)}.orb-one{width:520rpx;height:520rpx;top:-290rpx;right:-210rpx}.orb-two{width:390rpx;height:390rpx;bottom:-210rpx;left:-210rpx}.dot-field{position:absolute;inset:0;opacity:.12;background-image:radial-gradient(rgba(var(--glow-rgb),.5) 1rpx,transparent 1rpx);background-size:36rpx 36rpx;mask-image:linear-gradient(#000,transparent 80%)}.shell{position:relative;z-index:1;width:100%;padding:calc(var(--status-bar-height) + 24rpx) 24rpx 48rpx}.topbar{display:flex;align-items:center;gap:17rpx}.back{width:62rpx;height:62rpx;margin:0;padding:0;border:0;border-radius:19rpx;color:var(--accent);background:rgba(255,255,255,.72);font-size:42rpx;line-height:56rpx}.back:after,.add-part:after,.action-column-head button:after,.action-empty button:after,.complete-button:after{border:0}.kicker,.page-title{display:block}.kicker{color:var(--accent);font-size:15rpx;font-weight:750;letter-spacing:3rpx}.page-title{font-size:30rpx;font-weight:760}.theme-badge{display:flex;align-items:center;gap:7rpx;margin-left:auto;color:#9096a4;font-size:15rpx}.theme-badge view{width:16rpx;height:16rpx;border-radius:50%;background:var(--accent)}.hero,.content{margin-top:24rpx;border:1rpx solid rgba(255,255,255,.92);border-radius:31rpx;background:rgba(255,255,255,.8);box-shadow:0 19rpx 48rpx rgba(53,61,92,.08);backdrop-filter:blur(16rpx)}.hero{padding:27rpx}.hero-head{display:flex;justify-content:space-between;align-items:center}.date,.plan-title,.hero-meta{display:block}.date{color:var(--accent);font-size:17rpx;font-weight:700}.plan-title{margin-top:6rpx;font-size:37rpx;font-weight:780}.hero-meta{margin-top:6rpx;color:#9299a8;font-size:17rpx}.status{padding:9rpx 14rpx;border-radius:20rpx;color:var(--accent);background:var(--pale);font-size:16rpx;font-weight:700}.status.completed{color:#fff;background:var(--accent)}.part-progress-list{display:grid;gap:15rpx;margin-top:23rpx;padding-top:20rpx;border-top:1rpx solid rgba(var(--glow-rgb),.13)}.part-progress{padding:15rpx 17rpx;border-radius:20rpx;background:var(--pale-2)}.part-progress-head{display:flex;justify-content:space-between;color:#656d80;font-size:17rpx;font-weight:700}.part-progress-head text:last-child{color:var(--accent)}.progress-nodes{position:relative;display:flex;gap:17rpx;margin-top:15rpx;overflow-x:auto}.progress-rail{position:absolute;left:15rpx;right:15rpx;top:14rpx;height:2rpx;background:rgba(var(--glow-rgb),.18)}.progress-node{position:relative;z-index:1;display:grid;justify-items:center;gap:7rpx;min-width:80rpx;color:#969caa;font-size:14rpx;text-align:center}.progress-node text{max-width:105rpx;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.progress-dot{width:29rpx;height:29rpx;display:grid;place-items:center;border:3rpx solid var(--accent);border-radius:50%;color:#fff;background:var(--pale-2);font-size:14rpx}.progress-node.done{color:#4c5468}.progress-node.done .progress-dot{background:var(--accent);box-shadow:0 6rpx 15rpx rgba(var(--glow-rgb),.24)}.part-empty-tip{display:block;margin-top:10rpx;color:#9ba1ae;font-size:14rpx}.hero-empty{display:grid;justify-items:center;padding:25rpx 0 6rpx;color:#9ba1ae;font-size:16rpx}.hero-empty view{width:43rpx;height:43rpx;display:grid;place-items:center;margin-bottom:8rpx;border-radius:50%;color:#fff;background:var(--accent);font-size:24rpx}.content{padding:23rpx}.content-head{display:flex;justify-content:space-between;align-items:center;margin-bottom:20rpx}.section-title,.section-caption{display:block}.section-title{font-size:27rpx;font-weight:760}.section-caption{margin-top:4rpx;color:#999fac;font-size:16rpx}.saved-tip{padding:7rpx 12rpx;border-radius:15rpx;color:var(--accent);background:var(--pale);font-size:14rpx}.planner{display:grid;grid-template-columns:164rpx minmax(0,1fr);gap:14rpx}.part-column,.action-column{min-width:0;border-radius:23rpx;background:var(--pale-2)}.part-column{padding:13rpx}.column-label{display:block;padding:5rpx;color:#818899;font-size:15rpx;font-weight:700}.part-list{display:grid;gap:9rpx;margin-top:8rpx}.part-tab{position:relative;display:grid;justify-items:center;gap:4rpx;padding:12rpx 5rpx;border:2rpx solid transparent;border-radius:18rpx;color:#777f91;background:#fff;transition:transform .2s ease,border-color .2s ease}.part-tab.active{border-color:var(--accent);color:var(--accent);box-shadow:0 7rpx 18rpx rgba(var(--glow-rgb),.1)}.part-symbol{width:37rpx;height:37rpx;display:grid;place-items:center;border-radius:12rpx;color:var(--accent);background:var(--pale);font-size:18rpx}.part-tab-copy{text-align:center}.part-tab-copy text{display:block;font-size:17rpx;font-weight:700}.part-tab-copy text:last-child{margin-top:2rpx;color:#a0a5b0;font-size:13rpx;font-weight:400}.part-remove{position:absolute;right:6rpx;top:2rpx;color:#b1b5bf;font-size:23rpx}.add-part{height:auto;margin:11rpx 0 0;padding:13rpx 4rpx;border:2rpx dashed rgba(var(--glow-rgb),.28);border-radius:17rpx;color:var(--accent);background:transparent;font-size:15rpx;line-height:1.4}.add-part text{display:block}.add-part text:first-child{font-size:23rpx}.action-column{padding:14rpx}.action-column-head{display:flex;justify-content:space-between;align-items:center;margin-bottom:13rpx}.action-column-head view text{display:block}.column-title{font-size:21rpx;font-weight:750}.action-column-head view text:last-child{margin-top:2rpx;color:#9aa0ad;font-size:13rpx}.action-column-head button{height:48rpx;margin:0;padding:0 13rpx;border:0;border-radius:15rpx;color:#fff;background:var(--accent);font-size:14rpx;line-height:48rpx}.action-list{display:grid;gap:12rpx}.action-editor{padding:14rpx;border:1rpx solid rgba(255,255,255,.95);border-radius:19rpx;background:#fff}.action-head,.action-name{display:flex;align-items:center}.action-head{justify-content:space-between;margin-bottom:13rpx}.action-name{gap:9rpx;min-width:0}.state-dot{width:29rpx;height:29rpx;display:grid;place-items:center;flex:none;border:3rpx solid var(--accent);border-radius:50%;color:#fff;font-size:13rpx}.state-dot.done{background:var(--accent)}.action-name text{display:block;max-width:250rpx;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:18rpx;font-weight:700}.action-name text:last-child{margin-top:2rpx;color:#a0a5b0;font-size:12rpx;font-weight:400}.remove-action{color:#ab8490;font-size:13rpx}.metric-row{display:grid;grid-template-columns:47rpx repeat(3,minmax(0,1fr));gap:7rpx;align-items:end;padding:9rpx;border-radius:15rpx}.actual-row{margin-top:7rpx;background:var(--pale)}.row-label{align-self:center;color:#788093;font-size:14rpx;font-weight:700}.metric-row label{min-width:0}.metric-row label text{display:block;margin-bottom:4rpx;color:#9ca2ae;font-size:12rpx;text-align:center}.metric-row input{box-sizing:border-box;width:100%;height:48rpx;padding:0 5rpx;border:1rpx solid rgba(var(--glow-rgb),.18);border-radius:11rpx;color:#343b4d;background:#f8f8fb;font-size:15rpx;text-align:center}.actual-row input{border-color:rgba(var(--glow-rgb),.3);background:#fff}.actual-row input::placeholder{font-size:10rpx}.part-empty,.action-empty{display:grid;justify-items:center;align-content:center;min-height:320rpx;padding:20rpx;color:#999fac;text-align:center}.part-empty view,.action-empty view{color:var(--accent);font-size:47rpx}.part-empty text,.action-empty text{font-size:16rpx;font-weight:650}.part-empty text:last-child,.action-empty text:nth-child(3){margin-top:5rpx;font-size:13rpx;font-weight:400}.action-empty button{height:54rpx;margin-top:17rpx;padding:0 18rpx;border:0;border-radius:16rpx;color:var(--accent);background:var(--pale);font-size:15rpx}.complete-button{height:75rpx;margin-top:21rpx;border:0;border-radius:22rpx;color:#fff;background:linear-gradient(100deg,var(--accent),var(--accent-2));font-size:22rpx;font-weight:750;box-shadow:0 13rpx 29rpx rgba(var(--glow-rgb),.2)}.complete-button.update{box-shadow:none}.pressed,.tab-pressed{opacity:.8;transform:scale(.98)}
@media(min-width:900px){.shell{width:min(1120px,calc(100% - 70px));margin:auto;padding:30px 0 50px}.hero,.content{border-radius:26px}.hero{padding:25px}.part-progress-list{grid-template-columns:repeat(2,minmax(0,1fr));gap:12px}.content{padding:24px}.planner{grid-template-columns:210px minmax(0,1fr);gap:18px}.part-column,.action-column{border-radius:20px}.part-column{padding:14px}.part-tab{grid-template-columns:34px 1fr 14px;justify-items:start;align-items:center;padding:11px;border-radius:15px}.part-symbol{width:34px;height:34px}.part-tab-copy{text-align:left}.part-remove{position:static}.action-column{padding:18px}.action-list{grid-template-columns:repeat(2,minmax(0,1fr));gap:12px}.action-name text{max-width:180px}.metric-row{grid-template-columns:42px repeat(3,minmax(0,1fr))}.metric-row input{height:39px}.complete-button{height:54px}}
.date-picker{display:inline-flex;align-items:center;gap:8rpx;padding:6rpx 10rpx 6rpx 0}.date-picker text{font-size:14rpx}
.shell,.hero,.content,.planner,.part-column,.action-column,.action-editor{box-sizing:border-box}.topbar,.hero-head,.content-head{min-width:0}.hero-head>view:first-child,.content-head>view:first-child{min-width:0}.action-editor{transition:transform .2s ease,box-shadow .2s ease}.action-editor.dragging{z-index:3;transform:scale(1.01) rotate(-.2deg);box-shadow:0 18rpx 38rpx rgba(var(--glow-rgb),.18)}.action-tools{display:flex;align-items:center;gap:12rpx;flex:none}.drag-handle{display:grid;place-items:center;width:38rpx;height:42rpx;border-radius:12rpx;color:#a1a6b3;background:var(--pale-2);font-size:25rpx;cursor:grab;user-select:none}.method-caption{display:flex;justify-content:space-between;gap:15rpx;margin:0 7rpx 8rpx;color:#9299a8;font-size:13rpx}.method-caption text:first-child{min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.method-caption text:last-child{flex:none;color:var(--accent);font-weight:700}.metric-row{overflow-x:auto}.metric-row label{min-width:82rpx}.group-remove{display:grid;place-items:center;align-self:center;width:31rpx;height:31rpx;border-radius:50%;color:#a37583;background:#f7edf0;font-size:22rpx}.group-action-placeholder{width:31rpx}.add-group{height:48rpx;margin:9rpx 0 0;border:1rpx dashed rgba(var(--glow-rgb),.28);border-radius:15rpx;color:var(--accent);background:rgba(var(--glow-rgb),.045);font-size:14rpx;line-height:46rpx}.add-group::after{border:0}
@media(max-width:899px){.shell{width:100%;padding-left:24rpx;padding-right:24rpx}.hero,.content{width:100%;max-width:100%}.topbar{width:100%}.theme-badge{flex:none}.hero-head{gap:14rpx}.status{flex:none}.planner{grid-template-columns:148rpx minmax(0,1fr);gap:11rpx}.content{padding:20rpx}.action-column{padding:11rpx}.action-column-head{align-items:flex-start;gap:8rpx}.action-column-head button{padding:0 9rpx}.action-name text{max-width:190rpx}.metric-row{padding:8rpx 3rpx}.row-label{font-size:12rpx}}
@media(min-width:900px){.part-progress-list.single-part{grid-template-columns:minmax(0,1fr)}.part-progress-list.single-part .progress-node{flex:1;min-width:0}.part-progress-list.single-part .progress-nodes{justify-content:space-between}.action-list{grid-template-columns:minmax(0,1fr)}.metric-row{grid-auto-columns:minmax(90px,1fr)}.method-caption{font-size:13px}}
.method-overlay{position:fixed;z-index:80;inset:0;display:flex;align-items:center;justify-content:center;padding:30rpx;background:rgba(35,38,52,.42);backdrop-filter:blur(8px)}.method-dialog{width:min(650rpx,560px);max-height:82vh;padding:30rpx;box-sizing:border-box;overflow:auto;border-radius:30rpx;background:#fbfbfd;box-shadow:0 30rpx 80rpx rgba(30,33,48,.25)}.method-dialog-head{display:flex;align-items:flex-start;justify-content:space-between}.method-dialog-head>view text{display:block}.method-dialog-head>view text:first-child{font-size:29rpx;font-weight:900}.method-dialog-head>view text:last-child{margin-top:5rpx;color:#9297a5;font-size:17rpx}.method-dialog-head>text{display:grid;place-items:center;width:46rpx;height:46rpx;border-radius:50%;color:#858b9a;background:#edeef2;font-size:29rpx}.method-options{display:grid;grid-template-columns:1fr 1fr;gap:12rpx;margin-top:24rpx}.method-options label{display:flex;align-items:center;gap:10rpx;min-height:58rpx;padding:6rpx 13rpx;border:1rpx solid rgba(var(--glow-rgb),.12);border-radius:17rpx;background:#fff;color:#52596b;font-size:18rpx;font-weight:750}.method-dialog-actions{display:grid;grid-template-columns:1fr 1.2fr;gap:12rpx;margin-top:26rpx}.method-dialog-actions button{height:66rpx;line-height:66rpx;margin:0;border:0;border-radius:20rpx;color:var(--accent);background:var(--pale);font-size:18rpx;font-weight:850}.method-dialog-actions button::after{border:0}.method-dialog-actions .primary{color:#fff;background:linear-gradient(135deg,var(--accent),var(--accent-2))}
</style>
