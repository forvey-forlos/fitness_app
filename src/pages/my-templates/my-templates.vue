<template>
  <view class="page" :style="themeStyle">
    <view class="shell" :style="shellStyle">
      <view class="topbar"><button class="back" @tap="goBack">‹</button><view><text class="kicker">MY WORKOUTS</text><text class="title">我的模板</text></view></view>
      <view class="intro"><text>把喜欢的训练安排留在这里</text><text>长按模板可选中并发布到模板广场</text></view>
      <view v-if="loading" class="empty">正在加载模板…</view>
      <view v-else-if="error" class="empty" @tap="load">{{ error }} · 点击重试</view>
      <view v-else-if="!templates.length" class="empty">暂无模板，可在训练计划页保存或从模板广场导入</view>
      <view v-else class="template-list">
        <view v-for="item in templates" :key="item.id" class="template-card" :class="{selected:selectedId===item.id}" @longpress.stop="selectTemplate(item)">
          <view class="card-icon">{{ selectedId===item.id?'✓':'◇' }}</view>
          <view class="card-main"><text class="card-name">{{ item.name }}</text><text class="card-meta">{{ item.partCount }} 个部位 · {{ item.actionCount }} 个动作 · 约 {{ item.durationMinutes }} 分钟</text></view>
          <text class="detail-link" @tap.stop="openDetail(item)">详情 ›</text>
        </view>
      </view>
      <view class="footer-actions"><button class="browse" @tap="browse">浏览模板</button><button class="publish" :class="{inactive:!selectedId}" :aria-disabled="!selectedId" @tap="openPublish">发布模板{{ selectedId?' · 已选 1 项':'' }}</button></view>
    </view>

    <view v-if="detail" class="overlay" @tap="detail=null"><view class="dialog" @tap.stop>
      <view class="dialog-head"><button class="modal-back" @tap="detail=null">‹</button><view><text class="dialog-kicker">TEMPLATE DETAILS</text><text class="dialog-title">{{ detail.name }}</text><text class="dialog-sub">{{ detail.partCount }} 个部位 · {{ detail.actionCount }} 个动作</text></view></view>
      <scroll-view scroll-y class="dialog-scroll"><view v-for="(action,index) in detail.exercises" :key="index" class="action-preview"><text class="action-name">{{ index+1 }}. {{ action.exerciseName||'系统动作' }}</text><text>{{ partName(action.bodyPart) }}{{ action.variantName?' · '+action.variantName:'' }} · 预计 {{ action.plannedSets }} 组</text><text>{{ targetText(action) }}</text></view></scroll-view>
      <view class="dialog-actions"><button class="secondary" @tap="removeTemplate(detail)">删除</button><button class="primary" @tap="openEditor(detail)">编辑模板</button></view>
    </view></view>

    <view v-if="editor" class="overlay"><view class="dialog editor-dialog">
      <view class="dialog-head"><button class="modal-back" @tap="editor=null">‹</button><view><text class="dialog-kicker">EDIT TEMPLATE</text><text class="dialog-title">编辑模板</text><text class="dialog-sub">拖住手柄调整动作顺序</text></view></view>
      <scroll-view scroll-y class="dialog-scroll editor-scroll">
        <text class="field-title">模板名称</text><input v-model="editor.name" class="field-input" maxlength="100" placeholder="模板名称" />
        <text class="field-title">预计时长（分钟）</text><input v-model="editor.durationMinutes" class="field-input" type="number" placeholder="例如 60" />
        <view v-for="(action,index) in editor.exercises" :key="action._dragKey" class="edit-action" :class="{dragging:editorDragIndex===index}">
          <view class="edit-action-head"><text>{{ index+1 }}. {{ action.exerciseName||exerciseName(action.exerciseId) }}</text><view><text class="edit-remove" @tap="removeAction(index)">移除</text><text class="editor-drag-handle" @touchstart.stop.prevent="startEditorTouchDrag($event,index)" @touchmove.stop.prevent="moveEditorTouchDrag" @touchend.stop.prevent="finishEditorDrag" @touchcancel.stop.prevent="finishEditorDrag" @mousedown.stop.prevent="startEditorMouseDrag($event,index)">⠿</text></view></view>
          <view class="edit-tools"><picker :range="partOptions" range-key="name" :value="partIndex(action.bodyPart)" @change="action.bodyPart=partOptions[Number($event.detail.value)].key"><view class="pick">部位：{{ partName(action.bodyPart) }} ⌄</view></picker><picker v-if="variantsFor(action).length" :range="variantsFor(action)" range-key="name" @change="changeVariant(action,$event)"><view class="pick">{{ action.variantName||'默认变式' }} ⌄</view></picker></view>
          <view class="edit-tools"><view class="sets-field"><text>预计组数</text><input v-model="action.plannedSets" type="number" /></view></view>
          <text class="field-title">记录方式</text><view class="methods"><view v-for="method in methodOptions" :key="method.key" class="method" :class="{active:action.recordMethods.includes(method.key)}" @tap="toggleMethod(action,method.key)">{{ method.name }}</view></view>
          <view class="targets"><label v-for="method in action.recordMethods" :key="method"><text>{{ methodName(method) }}</text><input v-model="action.targetMetrics[method]" type="digit" placeholder="未填" /></label></view>
        </view>
        <button class="add-action" @tap="openActionPicker">＋ 添加动作</button>
      </scroll-view>
      <view class="dialog-actions"><button class="secondary" @tap="editor=null">取消</button><button class="primary" :disabled="saving" @tap="saveEditor">{{ saving?'保存中…':'保存修改' }}</button></view>
    </view></view>

    <view v-if="actionPicker" class="overlay"><view class="dialog picker-dialog">
      <view class="dialog-head"><button class="modal-back" @tap="actionPicker=false">‹</button><view><text class="dialog-kicker">ADD MOVEMENT</text><text class="dialog-title">添加系统动作</text><text class="dialog-sub">从个人动作库中选择</text></view></view>
      <input v-model="keyword" class="field-input" placeholder="搜索动作" maxlength="40" />
      <scroll-view scroll-y class="dialog-scroll"><view v-for="item in filteredActions" :key="item.id" class="pick-row" @tap="addAction(item)"><text>{{ item.name }}</text><text>＋</text></view><view v-if="!filteredActions.length" class="empty">没有匹配的动作，请先到动作管理添加</view></scroll-view>
    </view></view>

    <view v-if="publishId" class="overlay"><view class="dialog publish-dialog">
      <view class="dialog-head"><button class="modal-back" @tap="publishId=''">‹</button><view><text class="dialog-kicker">PUBLISH TEMPLATE</text><text class="dialog-title">发布模板</text><text class="dialog-sub">公开内容保存为独立版本</text></view></view>
      <text class="field-title">模板简介</text><textarea v-model="publishDescription" class="description" maxlength="400" placeholder="介绍训练安排、适用人群和注意事项" />
      <text class="field-title">标签（逗号分隔，最多 5 个）</text><input v-model="publishTags" class="field-input" maxlength="100" placeholder="例如：增肌,胸背,初学者" />
      <view class="dialog-actions"><button class="secondary" @tap="publishId=''">取消</button><button class="primary" :disabled="saving" @tap="submitPublish">{{ saving?'发布中…':'确认发布' }}</button></view>
    </view></view>
  </view>
</template>

<script setup>
import{computed,ref}from'vue'
import{onShow}from'@dcloudio/uni-app'
import{getExercises}from'../../api/exercises'
import{pageSafeTop}from'../../utils/page-safe-area'
import{deleteMyTemplate,listMyTemplates,publishMyTemplate,updateMyTemplate}from'../../api/templates'
import{bodyPartOptions,bodyPartName,recordMethodOptions,recordMethodName}from'../../constants/exercise-meta'
const themes=[{accent:'#7775bd',accent2:'#a59bd2',pale:'#f1f0f9',pale2:'#faf9fd',glow:'119,117,189'},{accent:'#5f9fa5',accent2:'#8bbdaf',pale:'#edf6f5',pale2:'#f8fbfa',glow:'95,159,165'},{accent:'#bd8073',accent2:'#cda56f',pale:'#faf1ed',pale2:'#fdf9f5',glow:'189,128,115'}]
const themeIndex=ref(0),templates=ref([]),library=ref([]),loading=ref(false),saving=ref(false),error=ref('')
const selectedId=ref(''),detail=ref(null),editor=ref(null),actionPicker=ref(false),keyword=ref(''),publishId=ref(''),publishDescription=ref(''),publishTags=ref(''),editorDragIndex=ref(-1)
let editorDragStartY=0,editorMouseCleanup=null
function getShellStyle(){
  // #ifdef MP-WEIXIN
  const system=uni.getSystemInfoSync(),statusBarHeight=Number(system?.statusBarHeight)||0
  const capsule=uni.getMenuButtonBoundingClientRect?.(),top=Number(capsule?.top),bottom=Number(capsule?.bottom)
  const gap=Number.isFinite(top)&&top>statusBarHeight?Math.max(8,top-statusBarHeight):10
  return{paddingTop:`${Math.ceil(Number.isFinite(bottom)&&bottom>statusBarHeight?bottom+gap:statusBarHeight+54)}px`}
  // #endif
  return{}
}
const shellStyle=ref(getShellStyle())
const partOptions=bodyPartOptions,methodOptions=recordMethodOptions,partName=bodyPartName,methodName=recordMethodName
const overlaySafeTop=pageSafeTop()
const themeStyle=computed(()=>{const t=themes[themeIndex.value];return{'--accent':t.accent,'--accent-2':t.accent2,'--pale':t.pale,'--pale-2':t.pale2,'--glow-rgb':t.glow,'--page-safe-top':`${overlaySafeTop}px`}})
const filteredActions=computed(()=>library.value.filter(item=>item.name.includes(keyword.value.trim())&&!editor.value?.exercises.some(action=>action.exerciseId===item.id)))
function exerciseName(id){return library.value.find(item=>item.id===id)?.name||'系统动作'}
function variantsFor(action){return[{id:null,name:'默认变式'},...(library.value.find(item=>item.id===action.exerciseId)?.variants||[])]}
function partIndex(key){return Math.max(0,partOptions.findIndex(item=>item.key===key))}
function targetText(action){return action.recordMethods.map(method=>`${methodName(method)} ${action.targetMetrics?.[method]??'—'}`).join(' · ')}
async function load(){if(loading.value)return;loading.value=true;error.value='';try{const result=await listMyTemplates();templates.value=result.items||[];if(selectedId.value&&!templates.value.some(item=>item.id===selectedId.value))selectedId.value=''}catch(cause){error.value=cause.message||'加载失败'}finally{loading.value=false}}
async function loadLibrary(){if(library.value.length)return;const items=[];let page=1;for(;;){const result=await getExercises({scope:'library',page,pageSize:100});items.push(...result.items);if(!result.hasMore)break;page++}library.value=items}
function selectTemplate(item){selectedId.value=selectedId.value===item.id?'':item.id;uni.vibrateShort?.()}
function openDetail(item){detail.value=item}
async function openEditor(item){try{await loadLibrary();editor.value={...item,durationMinutes:String(item.durationMinutes),exercises:item.exercises.map((action,index)=>({...action,_dragKey:`${item.id}-${index}`,plannedSets:String(action.plannedSets),targetMetrics:{...action.targetMetrics}}))};detail.value=null}catch(cause){uni.showToast({title:cause.message||'动作库读取失败',icon:'none'})}}
function openActionPicker(){keyword.value='';actionPicker.value=true}
function addAction(item){const methods=item.recordMethods?.length?item.recordMethods:['weight','reps'];editor.value.exercises.push({_dragKey:`${item.id}-${Date.now()}`,exerciseId:item.id,exerciseName:item.name,variantId:null,variantName:'',bodyPart:item.bodyPart||item.bodyParts?.[0]||'other',recordMethods:[...methods],targetMetrics:Object.fromEntries(methods.map(method=>[method,''])),plannedSets:'3',restSeconds:null,notes:null});actionPicker.value=false}
function removeAction(index){editor.value.exercises.splice(index,1)}
function reorderEditorAction(from,to){if(!editor.value||from===to||to<0||to>=editor.value.exercises.length)return;const items=[...editor.value.exercises],[item]=items.splice(from,1);items.splice(to,0,item);editor.value.exercises=items;editorDragIndex.value=to}
function moveEditorDrag(y){if(editorDragIndex.value<0||!editor.value)return;const delta=y-editorDragStartY;if(Math.abs(delta)<75)return;const next=editorDragIndex.value+(delta>0?1:-1);if(next>=0&&next<editor.value.exercises.length){reorderEditorAction(editorDragIndex.value,next);editorDragStartY=y}}
function startEditorTouchDrag(event,index){editorDragIndex.value=index;editorDragStartY=event.touches?.[0]?.clientY||0}
function moveEditorTouchDrag(event){moveEditorDrag(event.touches?.[0]?.clientY||editorDragStartY)}
function startEditorMouseDrag(event,index){if(typeof window==='undefined')return;editorDragIndex.value=index;editorDragStartY=event.clientY;const move=mouseEvent=>moveEditorDrag(mouseEvent.clientY);const end=()=>{window.removeEventListener('mousemove',move);window.removeEventListener('mouseup',end);editorMouseCleanup=null;finishEditorDrag()};editorMouseCleanup=end;window.addEventListener('mousemove',move);window.addEventListener('mouseup',end)}
function finishEditorDrag(){if(editorMouseCleanup&&typeof window!=='undefined')editorMouseCleanup();editorDragIndex.value=-1}
function changeVariant(action,event){const variant=variantsFor(action)[Number(event.detail.value)];action.variantId=variant?.id||null;action.variantName=variant?.name||''}
function toggleMethod(action,method){if(action.recordMethods.includes(method)){if(action.recordMethods.length===1){uni.showToast({title:'至少保留一种记录方式',icon:'none'});return}action.recordMethods=action.recordMethods.filter(value=>value!==method);delete action.targetMetrics[method]}else{action.recordMethods=[...action.recordMethods,method];action.targetMetrics[method]=''}}
function optionalNumber(value){if(value===''||value===null||value===undefined)return null;const number=Number(value);return Number.isFinite(number)?number:NaN}
async function saveEditor(){if(saving.value||!editor.value)return;const value=editor.value;const exercises=value.exercises.map((action,index)=>({exerciseId:action.exerciseId,variantId:action.variantId||null,bodyPart:action.bodyPart,recordMethods:action.recordMethods,targetMetrics:Object.fromEntries(action.recordMethods.map(method=>[method,optionalNumber(action.targetMetrics[method])])),plannedSets:Number(action.plannedSets),restSeconds:action.restSeconds??null,notes:action.notes??null,sortOrder:index+1}));if(!value.name.trim()||!Number.isInteger(Number(value.durationMinutes))||exercises.some(action=>!Number.isInteger(action.plannedSets)||action.plannedSets<1||action.plannedSets>100||Object.values(action.targetMetrics).some(Number.isNaN))){uni.showToast({title:'请检查名称、时长、组数和指标',icon:'none'});return}saving.value=true;try{await updateMyTemplate(value.id,{name:value.name.trim(),durationMinutes:Number(value.durationMinutes),exercises,version:value.version});editor.value=null;await load();uni.showToast({title:'模板已保存',icon:'success'})}catch(cause){uni.showToast({title:cause.message||'保存失败',icon:'none'})}finally{saving.value=false}}
function removeTemplate(item){uni.showModal({title:'删除模板？',content:'不会影响已发布的帖子和其他用户的副本。',success:async result=>{if(!result.confirm)return;try{await deleteMyTemplate(item.id);detail.value=null;await load();uni.showToast({title:'已删除',icon:'success'})}catch(cause){uni.showToast({title:cause.message||'删除失败',icon:'none'})}}})}
function openPublish(){if(!selectedId.value){uni.showModal({title:'发布模板',content:'长按模板选中并进行发布',showCancel:false,confirmText:'知道了'});return}publishId.value=selectedId.value;publishDescription.value='';publishTags.value=''}
async function submitPublish(){if(saving.value)return;const tags=publishTags.value.split(/[,，]/).map(value=>value.trim()).filter(Boolean);saving.value=true;try{await publishMyTemplate(publishId.value,{description:publishDescription.value.trim(),tags});publishId.value='';selectedId.value='';uni.showToast({title:'已发布到模板广场',icon:'success'})}catch(cause){uni.showToast({title:cause.message||'发布失败',icon:'none'})}finally{saving.value=false}}
function browse(){uni.navigateTo({url:'/pages/template-community/template-community'})}
function goBack(){uni.navigateBack({fail:()=>uni.redirectTo({url:'/pages/training-plan/training-plan'})})}
onShow(()=>{const index=Number(uni.getStorageSync('fit_note_theme_index'));themeIndex.value=themes[index]?index:0;load()})
</script>

<style scoped>
.page{min-height:100vh;box-sizing:border-box;color:#30374a;background:linear-gradient(145deg,var(--pale),var(--pale-2))}.shell{padding:calc(var(--status-bar-height) + 28rpx) 28rpx calc(120rpx + env(safe-area-inset-bottom));box-sizing:border-box}.topbar{display:flex;align-items:center;gap:18rpx}.back,.modal-back{width:64rpx;height:64rpx;flex:none;margin:0;padding:0;border:0;border-radius:20rpx;color:var(--accent);background:#fff;font-size:43rpx;line-height:58rpx}.back:after,.modal-back:after,button:after{border:0}.kicker,.title{display:block}.kicker{color:var(--accent);font-size:16rpx;letter-spacing:3rpx;font-weight:700}.title{font-size:31rpx;font-weight:760}.intro{display:grid;gap:8rpx;margin:30rpx 0 23rpx}.intro text:first-child{font-size:27rpx;font-weight:750}.intro text:last-child{color:#9299a8;font-size:17rpx}.template-list{display:grid;gap:15rpx}.template-card{display:flex;align-items:center;gap:16rpx;padding:20rpx;border:2rpx solid transparent;border-radius:25rpx;background:rgba(255,255,255,.86);box-shadow:0 16rpx 36rpx rgba(50,58,83,.06)}.template-card.selected{border-color:var(--accent);background:var(--pale-2)}.card-icon{display:grid;place-items:center;flex:none;width:54rpx;height:54rpx;border-radius:17rpx;color:#fff;background:linear-gradient(135deg,var(--accent),var(--accent-2));font-size:27rpx}.card-main{flex:1;min-width:0}.card-name,.card-meta{display:block;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.card-name{font-size:22rpx;font-weight:750}.card-meta{margin-top:7rpx;color:#9299a8;font-size:15rpx}.detail-link{flex:none;color:var(--accent);font-size:18rpx;font-weight:700}.empty{padding:85rpx 18rpx;color:#9399a7;font-size:19rpx;text-align:center}.footer-actions{position:fixed;z-index:5;right:0;bottom:0;left:0;display:flex;gap:12rpx;padding:16rpx 28rpx calc(16rpx + env(safe-area-inset-bottom));background:rgba(250,249,253,.96);box-shadow:0 -12rpx 35rpx rgba(53,61,92,.08)}.footer-actions button{flex:1;height:73rpx;margin:0;border:0;border-radius:21rpx;font-size:19rpx;font-weight:750;line-height:73rpx}.browse{color:var(--accent);background:var(--pale)}.publish,.primary{color:#fff;background:linear-gradient(100deg,var(--accent),var(--accent-2))}.publish[disabled]{opacity:.45}.overlay{position:fixed;z-index:20;inset:0;display:flex;align-items:flex-end;justify-content:center;background:rgba(30,34,49,.5)}.dialog{display:flex;flex-direction:column;width:100%;max-height:88vh;box-sizing:border-box;padding:23rpx 26rpx calc(24rpx + env(safe-area-inset-bottom));border-radius:32rpx 32rpx 0 0;background:#fcfcff}.dialog-head{display:flex;align-items:center;gap:14rpx;min-height:66rpx}.dialog-head>view{min-width:0}.dialog-title,.dialog-sub{display:block;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.dialog-title{font-size:27rpx;font-weight:800}.dialog-sub{margin-top:4rpx;color:#9aa0ad;font-size:15rpx}.dialog-scroll{flex:1;min-height:0;max-height:65vh;margin-top:17rpx}.action-preview{display:grid;gap:8rpx;margin-bottom:12rpx;padding:20rpx;border-radius:19rpx;background:var(--pale-2);color:#828a9a;font-size:16rpx}.action-name{color:#41495b;font-size:20rpx;font-weight:750}.dialog-actions{display:flex;gap:12rpx;margin-top:18rpx}.dialog-actions button{flex:1;height:68rpx;margin:0;border:0;border-radius:18rpx;font-size:19rpx;font-weight:730;line-height:68rpx}.secondary{color:var(--accent);background:var(--pale)}.field-title{display:block;margin:16rpx 0 8rpx;color:#737b8c;font-size:17rpx;font-weight:700}.field-input{height:68rpx;box-sizing:border-box;padding:0 18rpx;border:1rpx solid rgba(var(--glow-rgb),.18);border-radius:17rpx;background:#fff;font-size:19rpx}.editor-scroll{padding-bottom:16rpx}.edit-action{margin-top:16rpx;padding:17rpx;border-radius:20rpx;background:var(--pale-2)}.edit-action-head,.edit-tools{display:flex;align-items:center;justify-content:space-between;gap:12rpx}.edit-action-head text:first-child{font-size:19rpx;font-weight:750}.edit-action-head text:last-child{color:#ba6873;font-size:16rpx}.edit-tools{margin-top:15rpx}.pick{padding:11rpx;border-radius:13rpx;color:var(--accent);background:#fff;font-size:16rpx}.sets-field{display:flex;align-items:center;gap:10rpx;color:#6d7484;font-size:16rpx}.sets-field input{width:70rpx;height:51rpx;border-radius:12rpx;background:#fff;text-align:center}.order{display:grid;place-items:center;width:48rpx;height:48rpx;border-radius:12rpx;color:var(--accent);background:#fff;font-size:24rpx}.methods,.targets{display:flex;flex-wrap:wrap;gap:9rpx}.method{padding:9rpx 12rpx;border-radius:12rpx;color:#7b8394;background:#fff;font-size:15rpx}.method.active{color:#fff;background:var(--accent)}.targets{margin-top:15rpx}.targets label{display:flex;align-items:center;gap:7rpx;color:#727a8c;font-size:15rpx}.targets input{width:94rpx;height:49rpx;padding:0 9rpx;border-radius:10rpx;background:#fff;font-size:16rpx}.add-action{height:65rpx;margin-top:18rpx;border:0;border-radius:17rpx;color:var(--accent);background:var(--pale);font-size:18rpx;line-height:65rpx}.pick-row{display:flex;justify-content:space-between;margin:8rpx 0;padding:18rpx;border-radius:16rpx;background:var(--pale-2);font-size:19rpx}.pick-row text:last-child{color:var(--accent)}.description{width:100%;height:185rpx;box-sizing:border-box;padding:16rpx;border:1rpx solid rgba(var(--glow-rgb),.18);border-radius:17rpx;background:#fff;font-size:18rpx}@media(min-width:900px){.shell{max-width:760px;margin:auto;padding-top:34px}.dialog{width:600px;max-height:82vh;border-radius:26px;padding:24px}.footer-actions{position:static;max-width:760px;margin:30px auto;background:transparent;box-shadow:none}}
.publish.inactive{opacity:.45}.dialog-kicker{display:block;color:var(--accent);font-size:14rpx;font-weight:750;letter-spacing:2rpx}.edit-action{transition:transform .18s ease,box-shadow .18s ease}.edit-action.dragging{position:relative;z-index:2;transform:scale(1.015);box-shadow:0 14rpx 30rpx rgba(var(--glow-rgb),.18)}.edit-action-head>view{display:flex;align-items:center;gap:15rpx}.edit-remove{color:#ba6873;font-size:16rpx}.editor-drag-handle{display:grid;place-items:center;width:48rpx;height:48rpx;border-radius:13rpx;color:var(--accent);background:#fff;font-size:27rpx;cursor:grab;user-select:none}
.overlay{box-sizing:border-box;padding-top:calc(var(--page-safe-top) + 12rpx)}.dialog{max-height:calc(100vh - var(--page-safe-top) - 12rpx)}
</style>
