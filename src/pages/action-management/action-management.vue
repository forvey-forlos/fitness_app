<template>
  <view class="page" :style="themeStyle">
    <view class="ambient" aria-hidden="true"><view class="orb orb-one"/><view class="orb orb-two"/><view class="dot-field"/></view>
    <view class="shell">
      <view class="topbar">
        <view class="back" hover-class="pressed" @tap="goBack"><text>‹</text><text>返回首页</text></view>
        <view class="brand"><view class="brand-mark"/><text>FIT NOTE</text></view>
        <view class="sync-badge"><view class="sync-dot"/><text>{{ syncText }}</text></view>
      </view>

      <view class="title-row">
        <view><text class="eyebrow">MOVEMENT LIBRARY</text><text class="title">动作管理</text></view>
        <button class="title-add" hover-class="add-pressed" @tap="openAddMenu">＋</button>
      </view>

      <view class="toolbar-card">
        <view class="search-row"><text class="search-icon">⌕</text><input v-model="keyword" placeholder="输入动作名称" confirm-type="search"/><text v-if="keyword" class="clear-search" @tap="keyword=''">×</text></view>
        <view class="filters">
          <picker :range="partFilterOptions" range-key="name" @change="changePartFilter"><view class="filter-pill" :class="{active:filters.part}">{{ selectedFilterLabel('part') }} <text>⌄</text></view></picker>
          <picker :range="muscleFilterOptions" range-key="name" @change="changeMuscleFilter"><view class="filter-pill" :class="{active:filters.muscle}">{{ selectedFilterLabel('muscle') }} <text>⌄</text></view></picker>
          <picker :range="equipmentFilterOptions" range-key="name" @change="changeEquipmentFilter"><view class="filter-pill" :class="{active:filters.equipment}">{{ selectedFilterLabel('equipment') }} <text>⌄</text></view></picker>
        </view>
      </view>

      <view class="list-head"><view><text class="list-title">全部动作</text><text class="list-count">{{ filteredActions.length }} 个</text></view><text v-if="hasFilters" class="reset" @tap="resetFilters">重置筛选</text></view>
      <view class="divider"/>

      <view v-if="loading" class="empty-state"><view class="loading-dot"/><text>正在整理动作库…</text></view>
      <view v-else-if="!filteredActions.length" class="empty-state"><text class="empty-symbol">＋</text><text>{{ actions.length ? '没有符合条件的动作' : '你的动作库还是空的' }}</text><text class="empty-note">{{ actions.length ? '试试调整关键词或筛选条件' : '点击标题旁的＋，从系统动作目录选取' }}</text></view>
      <view v-else class="alphabet-list">
        <view v-for="section in actionSections" :key="section.initial" class="letter-section" :class="{plain:!showLetterHeaders}">
          <text v-if="showLetterHeaders" class="letter">{{ section.initial }}</text>
          <view class="action-stack">
            <view v-for="action in section.items" :key="action.id" class="action-row" hover-class="row-pressed" @tap="openEditor(action)">
              <view class="action-main"><text class="action-name">{{ action.name }}</text><text class="action-detail">{{ actionDescription(action) }}</text></view>
              <view class="row-actions"><text class="edit">详情/改名</text><text class="delete" @tap.stop="removeAction(action)">×</text></view>
            </view>
          </view>
        </view>
      </view>
      <view class="footer-tip" @tap="loadExercises"><text>{{ loadError ? '!' : '✓' }}</text><text>{{ loadError || '动作目录与当前账号同步' }}</text></view>
    </view>

    <view v-if="libraryVisible" class="overlay" @tap.self="libraryVisible=false">
      <view class="bottom-sheet">
        <view class="grabber"/><view class="sheet-head"><view><text class="sheet-kicker">ACTION CATALOG</text><text class="sheet-title">从动作目录选取</text></view><text class="close" @tap="libraryVisible=false">×</text></view>
        <view class="sheet-search"><text>⌕</text><input v-model="catalogKeyword" placeholder="搜索数据库动作"/></view>
        <scroll-view class="catalog-scroll" scroll-y>
          <view v-if="!catalogResults.length" class="sheet-empty">没有找到可选动作</view>
          <view v-for="action in catalogResults" :key="action.id" class="catalog-row">
            <view class="catalog-letter">{{ pinyinInitial(action.name) }}</view>
            <view class="catalog-copy"><text>{{ action.name }}</text><text>{{ actionDescription(action) }}</text></view>
            <button class="pick-btn" :disabled="isPicked(action)||mutating" @tap="pickCatalogAction(action)">{{ isPicked(action)?'已选':'选取' }}</button>
          </view>
        </scroll-view>
        <text class="field-help">当前版本只允许从系统标准动作库添加，所有关联均使用 exercise_id。</text>
      </view>
    </view>

    <view v-if="editorVisible" class="overlay editor-overlay" @tap.self="closeEditor">
      <scroll-view class="editor-card" scroll-y>
        <view class="editor-content">
        <view class="editor-head"><view><text class="sheet-kicker">MOVEMENT DETAILS</text><text class="sheet-title">动作详情</text></view><text class="close" @tap="closeEditor">×</text></view>
        <view class="field"><text class="field-label">个人显示名称</text><input v-model="editor.personalDisplayName" maxlength="40" :placeholder="editor.defaultDisplayName||'使用系统默认名称'"/></view>
        <view class="edit-guide"><view class="guide-spark">✦</view><text>留空会恢复系统默认名称；这里只修改你的显示名称，不改变系统动作本体。</text></view>
        <view class="field"><text class="field-label">系统标准名称</text><view class="select-box">{{ editor.standardName || '—' }}</view></view>
        <view class="field"><text class="field-label">默认显示名称</text><view class="select-box">{{ editor.defaultDisplayName || editor.name }}</view></view>
        <view class="field"><text class="field-label">默认记录方式</text><view class="tag-editor"><view v-for="key in editor.recordMethods" :key="key" class="chain-item"><view class="chain-node"/><text>{{ recordMethodName(key) }}</text></view></view></view>
        <view class="field"><text class="field-label">主要肌群</text><view class="tag-editor"><view v-for="key in editor.primaryMuscles" :key="key" class="chain-item muscle-chain"><view class="chain-node"/><text>{{ muscleName(key) }}</text></view></view></view>
        <view v-if="editor.variants.length" class="field"><text class="field-label">动作变式</text><view class="tag-editor"><view v-for="variant in editor.variants" :key="variant.id" class="chain-item variant-chain"><view class="chain-node"/><text>{{ variant.name }}</text></view></view></view>
        <view class="editor-actions single"><button class="save-button" :disabled="mutating" @tap="saveEditor">{{ mutating?'保存中…':'保存' }}</button></view>
        </view>
      </scroll-view>
    </view>
  </view>
</template>

<script setup>
import { computed, reactive, ref } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import { addExerciseToLibrary, deleteExercise, getExercises, updateExercise } from '../../api/exercises'
import {
  bodyPartOptions,recordMethodOptions,equipmentOptions,muscleOptions,
  bodyPartName,recordMethodName,equipmentName,muscleName,pinyinInitial,compareExerciseName
} from '../../constants/exercise-meta'

const THEME_STORAGE_KEY='fit_note_theme_index'
const themes=[{accent:'#7775bd',accent2:'#a59bd2',pale:'#f1f0f9',pale2:'#faf9fd',glow:'119,117,189'},{accent:'#5f9fa5',accent2:'#8bbdaf',pale:'#edf6f5',pale2:'#f8fbfa',glow:'95,159,165'},{accent:'#bd8073',accent2:'#cda56f',pale:'#faf1ed',pale2:'#fdf9f5',glow:'189,128,115'}]
const legacyPart={abs:'core'},legacyMuscle={chest:'pectoralis_major',back:'latissimus_dorsi',shoulder:'anterior_deltoid',biceps:'biceps',triceps:'triceps',legs:'quadriceps',glutes:'gluteus_maximus',core:'rectus_abdominis'}
const actions=ref([]),catalogActions=ref([])
const keyword=ref(''),catalogKeyword=ref('')
const filters=reactive({part:'',muscle:'',equipment:''})
const loading=ref(false),mutating=ref(false),loadError=ref('')
const libraryVisible=ref(false),editorVisible=ref(false),advancedOpen=ref(false)
const editor=reactive(emptyEditor())
const savedTheme=Number(uni.getStorageSync(THEME_STORAGE_KEY))
const themeIndex=ref(Number.isInteger(savedTheme)&&themes[savedTheme]?savedTheme:0)
const themeStyle=computed(()=>{const t=themes[themeIndex.value];return{'--accent':t.accent,'--accent-2':t.accent2,'--pale':t.pale,'--pale-2':t.pale2,'--glow-rgb':t.glow}})
const syncText=computed(()=>mutating.value?'正在保存':loading.value?'正在同步':loadError.value?'同步失败':'云端已同步')

function list(value){return Array.isArray(value)?value:[]}
function normalizeAction(action){
  const bodyParts=list(action.bodyParts).length?list(action.bodyParts):[legacyPart[action.category]||action.category].filter(Boolean)
  const primary=list(action.primaryMuscles).length?list(action.primaryMuscles):[legacyMuscle[action.muscleGroup]||action.muscleGroup].filter(Boolean)
  const variants=list(action.variants).map((variant,index)=>({id:variant.id||'variant_'+index,name:variant.name||'未命名变式',primaryMuscles:list(variant.primaryMuscles),secondaryMuscles:list(variant.secondaryMuscles)}))
  return{...action,bodyParts,recordMethods:list(action.recordMethods).length?list(action.recordMethods):['weight','reps'],primaryMuscles:primary,secondaryMuscles:list(action.secondaryMuscles),variants,equipment:action.equipment||'other'}
}
function emptyEditor(){return{id:null,name:'',standardName:'',defaultDisplayName:'',personalDisplayName:'',bodyParts:[],recordMethods:['weight','reps'],primaryMuscles:[],secondaryMuscles:[],variants:[],equipment:'other',version:0}}
function assignEditor(value){Object.assign(editor,emptyEditor(),value||{})}
function actionMatches(action,skip=''){
  const word=keyword.value.trim().toLocaleLowerCase()
  const names=[action.name,action.standardName,action.defaultDisplayName,...list(action.aliases)].filter(Boolean).map(value=>String(value).toLocaleLowerCase())
  if(word&&!names.some(value=>value.includes(word)))return false
  if(skip!=='part'&&filters.part&&!action.bodyParts.includes(filters.part))return false
  if(skip!=='muscle'&&filters.muscle&&![...action.primaryMuscles,...action.secondaryMuscles].includes(filters.muscle))return false
  if(skip!=='equipment'&&filters.equipment&&action.equipment!==filters.equipment)return false
  return true
}
const filteredActions=computed(()=>actions.value.filter(action=>actionMatches(action)).sort(compareExerciseName))
const showLetterHeaders=computed(()=>filteredActions.value.length>=8)
const actionSections=computed(()=>{
  if(!showLetterHeaders.value)return[{initial:'all',items:filteredActions.value}]
  const groups=new Map()
  filteredActions.value.forEach(action=>{const initial=pinyinInitial(action.name);if(!groups.has(initial))groups.set(initial,[]);groups.get(initial).push(action)})
  return [...groups.entries()].map(([initial,items])=>({initial,items}))
})
function uniqueOptions(source,keys){const set=new Set(source.flatMap(item=>keys(item)));return set}
const partFilterOptions=computed(()=>[{key:'',name:'部位'},...bodyPartOptions.filter(option=>uniqueOptions(actions.value.filter(a=>actionMatches(a,'part')),a=>a.bodyParts).has(option.key))])
const muscleFilterOptions=computed(()=>[{key:'',name:'肌群'},...muscleOptions.filter(option=>uniqueOptions(actions.value.filter(a=>actionMatches(a,'muscle')),a=>[...a.primaryMuscles,...a.secondaryMuscles]).has(option.key))])
const equipmentFilterOptions=computed(()=>[{key:'',name:'器械'},...equipmentOptions.filter(option=>uniqueOptions(actions.value.filter(a=>actionMatches(a,'equipment')),a=>[a.equipment]).has(option.key))])
const hasFilters=computed(()=>!!(keyword.value||filters.part||filters.muscle||filters.equipment))
const relevantMuscles=computed(()=>{const selected=new Set(editor.bodyParts);return muscleOptions.filter(item=>item.parts.some(part=>selected.has(part))||selected.has('full_body')||selected.has('other'))})
const availableBodyParts=computed(()=>bodyPartOptions.filter(item=>!editor.bodyParts.includes(item.key)))
const availableRecordMethods=computed(()=>recordMethodOptions.filter(item=>!editor.recordMethods.includes(item.key)))
const availablePrimaryMuscles=computed(()=>relevantMuscles.value.filter(item=>!editor.primaryMuscles.includes(item.key)&&!editor.secondaryMuscles.includes(item.key)))
const availableSecondaryMuscles=computed(()=>relevantMuscles.value.filter(item=>!editor.primaryMuscles.includes(item.key)&&!editor.secondaryMuscles.includes(item.key)))
const catalogResults=computed(()=>{const word=catalogKeyword.value.trim().toLocaleLowerCase();return catalogActions.value.filter(action=>{const terms=[action.name,action.standardName,action.defaultDisplayName,...list(action.aliases)].filter(Boolean).map(value=>String(value).toLocaleLowerCase());return!word||terms.some(value=>value.includes(word))||actionDescription(action).includes(word)}).sort(compareExerciseName)})

function selectedFilterLabel(type){const map={part:[bodyPartOptions,filters.part,'部位'],muscle:[muscleOptions,filters.muscle,'肌群'],equipment:[equipmentOptions,filters.equipment,'器械']},[options,key,fallback]=map[type];return options.find(item=>item.key===key)?.name||fallback}
function keepValidFilters(){if(filters.muscle&&!muscleFilterOptions.value.some(item=>item.key===filters.muscle))filters.muscle='';if(filters.equipment&&!equipmentFilterOptions.value.some(item=>item.key===filters.equipment))filters.equipment=''}
function changePartFilter(event){filters.part=partFilterOptions.value[Number(event.detail.value)]?.key||'';keepValidFilters()}
function changeMuscleFilter(event){filters.muscle=muscleFilterOptions.value[Number(event.detail.value)]?.key||'';keepValidFilters()}
function changeEquipmentFilter(event){filters.equipment=equipmentFilterOptions.value[Number(event.detail.value)]?.key||'';keepValidFilters()}
function resetFilters(){keyword.value='';Object.assign(filters,{part:'',muscle:'',equipment:''})}
function actionDescription(action){const parts=action.bodyParts.slice(0,2).map(bodyPartName).join(' / '),muscles=action.primaryMuscles.slice(0,2).map(muscleName).join('、');return[parts,muscles,equipmentName(action.equipment)].filter(Boolean).join(' · ')}
function showError(error,fallback='请求失败'){loadError.value=error?.message||fallback;uni.showToast({title:error?.code==='EXERCISE_ALREADY_EXISTS'?'已存在同名动作':loadError.value,icon:'none'})}
async function loadExercises(){
  if(loading.value)return
  loading.value=true;loadError.value=''
  try{
    const loadScope=async scope=>{const items=[],query={scope,page:1,pageSize:100};for(;;){const result=await getExercises(query);items.push(...(Array.isArray(result?.items)?result.items:[]));if(!result?.hasMore)break;query.page+=1}return items.map(normalizeAction)}
    const [library,catalog]=await Promise.all([loadScope('library'),loadScope('catalog')])
    actions.value=library
    catalogActions.value=catalog
  }catch(error){showError(error,'动作库加载失败')}finally{loading.value=false}
}
function openAddMenu(){catalogKeyword.value='';libraryVisible.value=true}
function isPicked(catalog){return actions.value.some(item=>item.id===catalog.id)}
async function pickCatalogAction(catalog){
  if(isPicked(catalog)||mutating.value)return
  mutating.value=true
  try{const created=normalizeAction(await addExerciseToLibrary(catalog.id));actions.value.push(created);catalogActions.value=catalogActions.value.map(item=>item.id===created.id?created:item);uni.showToast({title:'已加入动作库',icon:'success'})}
  catch(error){showError(error,'动作选取失败')}finally{mutating.value=false}
}
function openEditor(action){if(!action)return;advancedOpen.value=false;assignEditor(normalizeAction(action));editorVisible.value=true}
function closeEditor(){if(!mutating.value)editorVisible.value=false}
function addTagFromPicker(field,options,event){const item=options[Number(event.detail.value)];if(item&&!editor[field].includes(item.key))editor[field].push(item.key)}
function removeTag(field,key){editor[field]=editor[field].filter(item=>item!==key);if(field==='bodyParts'){const allowed=new Set(relevantMuscles.value.map(item=>item.key));editor.primaryMuscles=editor.primaryMuscles.filter(item=>allowed.has(item));editor.secondaryMuscles=editor.secondaryMuscles.filter(item=>allowed.has(item))}}
function changeEditorEquipment(event){editor.equipment=equipmentOptions[Number(event.detail.value)]?.key||'other'}
function addVariant(){
  uni.showModal({title:'添加动作变式',editable:true,placeholderText:'例如：宽握正握',success:result=>{
    if(!result.confirm)return
    const name=String(result.content||'').trim()
    if(!name){uni.showToast({title:'请输入变式名称',icon:'none'});return}
    if(editor.variants.some(item=>item.name.toLocaleLowerCase()===name.toLocaleLowerCase())){uni.showToast({title:'已存在同名变式',icon:'none'});return}
    editor.variants.push({id:'variant_'+Date.now(),name,primaryMuscles:[...editor.primaryMuscles],secondaryMuscles:[...editor.secondaryMuscles]})
    uni.showToast({title:'已记录当前肌群配置',icon:'none'})
  }})
}
function applyVariant(variant){editor.primaryMuscles=[...variant.primaryMuscles];editor.secondaryMuscles=[...variant.secondaryMuscles];uni.showToast({title:'已应用“'+variant.name+'”肌群',icon:'none'})}
function removeVariant(id){editor.variants=editor.variants.filter(item=>item.id!==id)}
function exercisePayload(action){return{name:action.name.trim(),bodyParts:[...action.bodyParts],recordMethods:[...action.recordMethods],primaryMuscles:[...action.primaryMuscles],secondaryMuscles:[...action.secondaryMuscles],variants:action.variants.map(item=>({id:item.id,name:item.name,primaryMuscles:[...item.primaryMuscles],secondaryMuscles:[...item.secondaryMuscles]})),equipment:action.equipment}}
async function saveEditor(){
  const displayName=String(editor.personalDisplayName||'').trim()||null
  mutating.value=true
  try{
    const updated=normalizeAction(await updateExercise(editor.id,{displayName,version:editor.version}));actions.value=actions.value.map(item=>item.id===updated.id?updated:item);catalogActions.value=catalogActions.value.map(item=>item.id===updated.id?updated:item)
    editorVisible.value=false;uni.showToast({title:'保存成功',icon:'success'})
  }catch(error){showError(error,'动作保存失败')}finally{mutating.value=false}
}
function removeAction(action){uni.showModal({title:'移出“'+action.name+'”？',content:'只会从个人动作列表移除；系统动作本体、已有计划和历史快照不受影响。',success:async result=>{if(!result.confirm)return;mutating.value=true;try{await deleteExercise(action.id);actions.value=actions.value.filter(item=>item.id!==action.id);catalogActions.value=catalogActions.value.map(item=>item.id===action.id?{...item,inLibrary:false,personalDisplayName:null,name:item.defaultDisplayName}:item);uni.showToast({title:'已移出',icon:'success'})}catch(error){showError(error,'移出动作失败')}finally{mutating.value=false}}})}
function syncTheme(){const value=Number(uni.getStorageSync(THEME_STORAGE_KEY));if(Number.isInteger(value)&&themes[value])themeIndex.value=value}
function goBack(){uni.navigateBack({fail:()=>uni.reLaunch({url:'/pages/home/home'})})}
onShow(()=>{syncTheme();loadExercises()})
</script>

<style scoped>
@property --accent{syntax:'<color>';inherits:true;initial-value:#7775bd}@property --accent-2{syntax:'<color>';inherits:true;initial-value:#a59bd2}
page{background:#f5f5fa}.page{position:relative;min-height:100vh;overflow:hidden;color:#282e40;background:linear-gradient(145deg,var(--pale),var(--pale-2));transition:--accent .7s ease,--accent-2 .7s ease}.ambient{position:absolute;inset:0;overflow:hidden;pointer-events:none}.orb{position:absolute;border-radius:50%;filter:blur(2rpx);background:rgba(var(--glow-rgb),.09)}.orb-one{width:560rpx;height:560rpx;right:-300rpx;top:260rpx}.orb-two{width:420rpx;height:420rpx;left:-250rpx;top:920rpx}.dot-field{position:absolute;inset:0;opacity:.12;background-image:radial-gradient(rgba(var(--glow-rgb),.7) 1rpx,transparent 1rpx);background-size:36rpx 36rpx;mask-image:linear-gradient(#000,transparent 88%)}
.shell{position:relative;z-index:2;max-width:1080px;margin:auto;padding:calc(var(--status-bar-height) + 22rpx) 30rpx 55rpx}.topbar{display:grid;grid-template-columns:1fr auto 1fr;align-items:center}.back{display:flex;align-items:center;gap:7rpx;color:#697084;font-size:22rpx}.back text:first-child{font-size:45rpx;line-height:1}.brand{display:flex;align-items:center;gap:12rpx;color:#535b6e;font-size:21rpx;font-weight:800;letter-spacing:3rpx}.brand-mark{width:34rpx;height:34rpx;border-radius:70% 30% 70% 30%;background:linear-gradient(135deg,var(--accent) 50%,var(--accent-2) 50%);box-shadow:0 8rpx 20rpx rgba(var(--glow-rgb),.25)}.sync-badge{justify-self:end;display:flex;align-items:center;gap:8rpx;color:#858b9a;font-size:17rpx}.sync-dot{width:10rpx;height:10rpx;border-radius:50%;background:var(--accent);box-shadow:0 0 0 6rpx rgba(var(--glow-rgb),.1)}
.title-row{display:flex;align-items:flex-end;gap:20rpx;margin:56rpx 4rpx 28rpx}.eyebrow,.title{display:block}.eyebrow{color:var(--accent);font-size:18rpx;font-weight:800;letter-spacing:4rpx}.title{margin-top:7rpx;font-size:50rpx;font-weight:900;letter-spacing:-2rpx;text-shadow:0 8rpx 25rpx rgba(var(--glow-rgb),.12)}.title-add{display:grid;place-items:center;width:64rpx;height:64rpx;margin:0 0 3rpx;padding:0;border:0;border-radius:21rpx;color:#fff;background:linear-gradient(135deg,var(--accent),var(--accent-2));font-size:37rpx;line-height:64rpx;box-shadow:0 13rpx 28rpx rgba(var(--glow-rgb),.28)}.title-add::after{border:0}.add-pressed{transform:scale(.94)}
.toolbar-card{padding:20rpx;border:1rpx solid rgba(255,255,255,.92);border-radius:29rpx;background:rgba(255,255,255,.72);box-shadow:0 22rpx 50rpx rgba(54,60,87,.08);backdrop-filter:blur(16px)}.search-row{display:flex;align-items:center;gap:13rpx;height:76rpx;padding:0 20rpx;border:1rpx solid rgba(var(--glow-rgb),.12);border-radius:22rpx;background:#fff;box-shadow:inset 0 1rpx 0 rgba(255,255,255,.8),0 8rpx 20rpx rgba(49,55,82,.04)}.search-icon{color:var(--accent);font-size:31rpx;font-weight:800}.search-row input{flex:1;height:100%;color:#303647;font-size:22rpx;font-weight:600}.clear-search{display:grid;place-items:center;width:34rpx;height:34rpx;border-radius:50%;color:#969ba8;background:#f0f1f4;font-size:23rpx}.filters{display:flex;gap:11rpx;margin-top:15rpx;overflow-x:auto}.filter-pill{min-width:130rpx;padding:14rpx 18rpx;box-sizing:border-box;border:1rpx solid rgba(var(--glow-rgb),.13);border-radius:18rpx;color:#73798a;background:var(--pale-2);text-align:center;font-size:18rpx;font-weight:700;white-space:nowrap}.filter-pill.active{border-color:rgba(var(--glow-rgb),.3);color:var(--accent);background:rgba(var(--glow-rgb),.1);box-shadow:0 6rpx 15rpx rgba(var(--glow-rgb),.09)}.filter-pill text{margin-left:5rpx}
.list-head{display:flex;align-items:center;justify-content:space-between;margin:35rpx 4rpx 14rpx}.list-head>view{display:flex;align-items:baseline;gap:13rpx}.list-title{font-size:30rpx;font-weight:900}.list-count{color:#969baa;font-size:17rpx}.reset{color:var(--accent);font-size:18rpx;font-weight:700}.divider{height:2rpx;margin-bottom:10rpx;background:linear-gradient(90deg,rgba(var(--glow-rgb),.35),rgba(var(--glow-rgb),.05),transparent)}.alphabet-list{padding-bottom:20rpx}.letter-section{display:grid;grid-template-columns:60rpx 1fr;gap:10rpx;margin-top:14rpx}.letter-section:has(.action-stack:only-child){grid-template-columns:1fr}.letter{position:sticky;top:10rpx;align-self:start;padding-top:13rpx;color:var(--accent);font-size:30rpx;font-weight:950;text-shadow:0 7rpx 16rpx rgba(var(--glow-rgb),.2)}.action-stack{min-width:0}.action-row{display:flex;align-items:center;gap:15rpx;min-height:78rpx;padding:10rpx 16rpx;border-bottom:1rpx solid rgba(var(--glow-rgb),.1);transition:background .18s,transform .18s}.action-row:last-child{border-bottom:0}.action-main{flex:1;min-width:0}.action-name,.action-detail{display:block}.action-name{color:#313748;font-size:23rpx;font-weight:800;letter-spacing:.3rpx}.action-detail{margin-top:5rpx;overflow:hidden;color:#9297a5;font-size:16rpx;text-overflow:ellipsis;white-space:nowrap}.row-actions{display:flex;align-items:center;gap:17rpx}.edit{color:var(--accent);font-size:17rpx;font-weight:700}.delete{display:grid;place-items:center;width:33rpx;height:33rpx;border-radius:50%;color:#a1a5af;background:rgba(127,132,151,.08);font-size:24rpx}.row-pressed{border-radius:17rpx;background:rgba(var(--glow-rgb),.055);transform:scale(.993)}.empty-state{display:flex;flex-direction:column;align-items:center;justify-content:center;min-height:420rpx;color:#7f8595;font-size:21rpx}.empty-symbol{display:grid;place-items:center;width:66rpx;height:66rpx;margin-bottom:17rpx;border-radius:22rpx;color:#fff;background:linear-gradient(135deg,var(--accent),var(--accent-2));font-size:35rpx;box-shadow:0 13rpx 30rpx rgba(var(--glow-rgb),.22)}.empty-note{margin-top:8rpx;color:#a0a4af;font-size:17rpx}.loading-dot{width:18rpx;height:18rpx;margin-bottom:18rpx;border:5rpx solid rgba(var(--glow-rgb),.16);border-top-color:var(--accent);border-radius:50%;animation:spin .7s linear infinite}.footer-tip{display:flex;justify-content:center;gap:8rpx;margin-top:28rpx;color:#989eab;font-size:17rpx}.footer-tip text:first-child{color:var(--accent)}
.overlay{position:fixed;z-index:40;inset:0;display:flex;align-items:flex-end;justify-content:center;background:rgba(34,37,50,.4);backdrop-filter:blur(9px);animation:fade-in .24s ease}.bottom-sheet{width:min(750rpx,650px);max-height:84vh;padding:14rpx 27rpx calc(28rpx + env(safe-area-inset-bottom));box-sizing:border-box;border-radius:34rpx 34rpx 0 0;background:#fafafd;box-shadow:0 -30rpx 75rpx rgba(27,30,45,.22);animation:sheet-up .36s cubic-bezier(.2,.85,.3,1)}.grabber{width:70rpx;height:7rpx;margin:0 auto 24rpx;border-radius:8rpx;background:#dadce3}.sheet-head,.editor-head{display:flex;align-items:center;justify-content:space-between}.sheet-kicker,.sheet-title,.catalog-copy text,.field-label,.field-help{display:block}.sheet-kicker{color:var(--accent);font-size:15rpx;font-weight:850;letter-spacing:3rpx}.sheet-title{margin-top:5rpx;font-size:31rpx;font-weight:900}.close{display:grid;place-items:center;width:49rpx;height:49rpx;border-radius:50%;color:#8b909f;background:#edeef2;font-size:30rpx}.sheet-search{display:flex;align-items:center;gap:12rpx;height:68rpx;margin:22rpx 0 13rpx;padding:0 18rpx;border-radius:20rpx;color:var(--accent);background:var(--pale)}.sheet-search input{flex:1;height:100%;font-size:19rpx}.catalog-scroll{height:51vh}.catalog-row{display:flex;align-items:center;gap:14rpx;margin-bottom:10rpx;padding:14rpx;border-radius:20rpx;background:#fff;box-shadow:0 7rpx 20rpx rgba(48,54,80,.05)}.catalog-letter{display:grid;place-items:center;width:49rpx;height:49rpx;border-radius:15rpx;color:var(--accent);background:var(--pale);font-size:19rpx;font-weight:900}.catalog-copy{flex:1;min-width:0}.catalog-copy text:first-child{font-size:20rpx;font-weight:800}.catalog-copy text:last-child{margin-top:4rpx;overflow:hidden;color:#969ba8;font-size:15rpx;text-overflow:ellipsis;white-space:nowrap}.pick-btn{margin:0;width:88rpx;height:51rpx;line-height:51rpx;border:0;border-radius:17rpx;color:#fff;background:var(--accent);font-size:16rpx;font-weight:800}.pick-btn::after,.create-from-sheet::after,.editor-actions button::after{border:0}.pick-btn[disabled]{color:#9da1ac;background:#eef0f3}.sheet-empty{display:grid;place-items:center;height:300rpx;color:#969ba8}.create-from-sheet{margin:14rpx 0 0;height:67rpx;line-height:67rpx;border:0;border-radius:21rpx;color:var(--accent);background:var(--pale);font-size:18rpx;font-weight:800}
.editor-overlay{align-items:center;padding:28rpx}.editor-card{width:min(700rpx,610px);max-height:88vh;padding:34rpx;box-sizing:border-box;border:1rpx solid rgba(255,255,255,.9);border-radius:34rpx;background:#fbfbfd;box-shadow:0 35rpx 90rpx rgba(27,30,45,.27);animation:editor-in .34s cubic-bezier(.2,.85,.3,1)}.editor-head{margin-bottom:25rpx}.field{margin-top:22rpx}.field.compact{margin-top:18rpx}.field-label{margin-bottom:10rpx;color:#484f61;font-size:19rpx;font-weight:850}.field>input,.select-box{height:67rpx;padding:0 18rpx;border:1rpx solid rgba(var(--glow-rgb),.14);border-radius:19rpx;color:#303647;background:#fff;box-shadow:inset 0 1rpx 0 rgba(255,255,255,.8);font-size:20rpx}.select-box{display:flex;align-items:center;justify-content:space-between}.tag-editor{display:flex;align-items:center;flex-wrap:wrap;gap:9rpx;min-height:65rpx;padding:9rpx 12rpx;border:1rpx solid rgba(var(--glow-rgb),.13);border-radius:19rpx;background:#fff}.tag{padding:7rpx 4rpx;color:var(--accent);font-size:18rpx;font-weight:750;text-shadow:0 4rpx 12rpx rgba(var(--glow-rgb),.12)}.muscle-tag{color:#5e789d}.secondary-tag{color:#8b789a}.tag-add{display:grid;place-items:center;width:39rpx;height:39rpx;border-radius:13rpx;color:#fff;background:linear-gradient(135deg,var(--accent),var(--accent-2));font-size:24rpx;box-shadow:0 7rpx 15rpx rgba(var(--glow-rgb),.2)}.field-help{margin-top:7rpx;color:#a0a4af;font-size:15rpx}.advanced-toggle{display:flex;align-items:center;justify-content:space-between;margin-top:25rpx;padding:17rpx 19rpx;border-radius:18rpx;color:var(--accent);background:var(--pale);font-size:18rpx;font-weight:800}.advanced-panel{padding:3rpx 18rpx 19rpx;border-radius:0 0 23rpx 23rpx;background:rgba(var(--glow-rgb),.035)}.editor-actions{display:grid;grid-template-columns:1fr 1.25fr;gap:12rpx;margin-top:28rpx}.editor-actions button{height:69rpx;line-height:69rpx;margin:0;border:0;border-radius:21rpx;font-size:19rpx;font-weight:850}.advanced-button{color:var(--accent);background:var(--pale)}.save-button{color:#fff;background:linear-gradient(135deg,var(--accent),var(--accent-2));box-shadow:0 12rpx 26rpx rgba(var(--glow-rgb),.24)}.save-button[disabled]{opacity:.55}
@keyframes fade-in{from{opacity:0}to{opacity:1}}@keyframes sheet-up{from{transform:translateY(100%)}to{transform:none}}@keyframes editor-in{from{opacity:0;transform:translateY(40rpx) scale(.96)}to{opacity:1;transform:none}}@keyframes spin{to{transform:rotate(360deg)}}.pressed{opacity:.65}
@media(max-width:700px){.shell{padding-left:22rpx;padding-right:22rpx}.topbar{grid-template-columns:1fr auto}.brand{display:none}.title-row{margin-top:45rpx}.toolbar-card{padding:16rpx}.filters{gap:8rpx}.filter-pill{min-width:120rpx;padding:13rpx 14rpx}.letter-section{grid-template-columns:48rpx 1fr}.row-actions{gap:10rpx}.editor-card{padding:27rpx 23rpx}.editor-overlay{padding:20rpx}.action-detail{max-width:390rpx}}
@media(min-width:900px){.shell{padding-top:28px}.back{font-size:11px}.back text:first-child{font-size:29px}.brand{font-size:12px}.brand-mark{width:23px;height:23px}.sync-badge{font-size:10px}.title-row{margin-top:44px}.eyebrow{font-size:10px}.title{font-size:37px}.title-add{width:45px;height:45px;line-height:45px;border-radius:15px;font-size:27px}.toolbar-card{padding:15px;border-radius:22px}.search-row{height:52px;border-radius:16px}.search-row input{font-size:14px}.filters{margin-top:11px}.filter-pill{padding:10px 14px;border-radius:13px;font-size:11px}.list-head{margin-top:28px}.list-title{font-size:21px}.action-row{min-height:58px;padding:8px 12px}.action-name{font-size:15px}.action-detail,.edit{font-size:10px}.letter{font-size:22px}.editor-card{padding:28px}.field>input,.select-box{height:48px}.tag-editor{min-height:45px}.editor-actions button{height:49px;line-height:49px}}
.letter-section.plain{grid-template-columns:1fr}
.editor-card{height:min(88vh,920rpx)!important;max-height:none!important;padding:0!important;overflow:hidden!important;background:#fbfbfd!important}.editor-content{min-height:100%;padding:34rpx 34rpx calc(42rpx + env(safe-area-inset-bottom));box-sizing:border-box;background:#fbfbfd}.edit-guide{display:flex;align-items:center;gap:11rpx;margin-top:19rpx;padding:14rpx 16rpx;border:1rpx solid rgba(var(--glow-rgb),.12);border-radius:17rpx;color:#7f8595;background:linear-gradient(105deg,rgba(var(--glow-rgb),.07),rgba(255,255,255,.72));font-size:16rpx;line-height:1.45}.guide-spark{display:grid;place-items:center;flex:none;width:33rpx;height:33rpx;border-radius:11rpx;color:#fff;background:linear-gradient(135deg,var(--accent),var(--accent-2));box-shadow:0 7rpx 16rpx rgba(var(--glow-rgb),.2)}
.tag-editor{gap:6rpx 0!important;overflow:visible;padding:12rpx 13rpx!important}.chain-item,.chain-add{position:relative;display:flex;align-items:center;gap:8rpx;min-height:42rpx;margin:3rpx 18rpx 3rpx 0;padding:0 14rpx 0 10rpx;border:1rpx solid rgba(var(--glow-rgb),.22);border-radius:15rpx;color:var(--accent);background:linear-gradient(135deg,rgba(var(--glow-rgb),.1),rgba(255,255,255,.96));box-shadow:0 6rpx 14rpx rgba(var(--glow-rgb),.08);font-size:17rpx;font-weight:800;transition:transform .18s,box-shadow .18s}.chain-item::after,.chain-add::after{content:'';position:absolute;left:100%;top:50%;width:18rpx;height:2rpx;background:linear-gradient(90deg,rgba(var(--glow-rgb),.38),rgba(var(--glow-rgb),.12))}.chain-item:active{transform:scale(.96);box-shadow:0 2rpx 8rpx rgba(var(--glow-rgb),.08)}.chain-node{width:10rpx;height:10rpx;border:3rpx solid var(--accent);border-radius:50%;background:#fff;box-shadow:0 0 0 3rpx rgba(var(--glow-rgb),.08)}.chain-add{justify-content:center;min-width:53rpx;padding:0 10rpx;color:#fff;border-color:transparent;background:linear-gradient(135deg,var(--accent),var(--accent-2));font-size:23rpx}.chain-add .chain-node{border-color:#fff;background:transparent;box-shadow:none}.muscle-chain{color:#58779b;border-color:rgba(88,119,155,.22);background:linear-gradient(135deg,rgba(88,119,155,.1),#fff)}.muscle-chain .chain-node{border-color:#6e8bab}.secondary-chain{color:#8a7098;border-color:rgba(138,112,152,.22);background:linear-gradient(135deg,rgba(138,112,152,.1),#fff)}.secondary-chain .chain-node{border-color:#9a82a7}
.advanced-panel{margin-top:0;padding:5rpx 18rpx 22rpx!important;border:1rpx solid rgba(var(--glow-rgb),.11);border-top:0;border-radius:0 0 23rpx 23rpx!important;background:linear-gradient(180deg,rgba(var(--glow-rgb),.055),rgba(255,255,255,.72))!important}.advanced-toggle{margin-bottom:0}.variant-chain{color:#7a679e;border-color:rgba(122,103,158,.24);background:linear-gradient(135deg,rgba(122,103,158,.12),#fff)}.variant-chain .chain-node{border-color:#8d79ad}.editor-actions{padding-bottom:6rpx}.editor-actions.single{grid-template-columns:1fr}.editor-actions.single .save-button{width:100%}
@media(max-width:700px){.editor-content{padding:27rpx 23rpx calc(38rpx + env(safe-area-inset-bottom))}.editor-card{height:92vh!important}.edit-guide{font-size:15rpx}.chain-item,.chain-add{min-height:40rpx;font-size:16rpx}}
</style>
