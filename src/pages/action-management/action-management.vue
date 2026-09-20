<template>
  <view class="page" :style="themeStyle">
    <view class="ambient" aria-hidden="true"><view class="body-line line-left"/><view class="body-line line-right"/><view class="soft-orb"/><view class="dot-field"/></view>
    <view class="shell">
      <view class="topbar">
        <view class="back" hover-class="pressed" @tap="goBack"><text>‹</text><text>返回首页</text></view>
        <view class="brand"><view class="brand-mark"/><text>FIT NOTE</text></view>
        <view class="sync-badge"><view class="sync-dot"/><text>{{ syncText }}</text></view>
      </view>

      <view class="hero">
        <view><text class="eyebrow">MOVEMENT LIBRARY</text><text class="title">动作管理</text><text class="subtitle">从上到下整理训练动作，建立你的专属动作库</text></view>
        <view class="summary"><view class="summary-number">{{ actions.length }}</view><view><text>已收录动作</text><text>{{ activePartCount }} 个训练部位</text></view></view>
      </view>

      <view class="anatomy-guide">
        <view class="guide-line"/>
        <view v-for="(part,index) in parts" :key="part.key" class="guide-node" :class="{ active: groupActions(part.key).length }" @tap="scrollToPart(part.key)">
          <view class="node-dot">{{ index + 1 }}</view><text>{{ part.name }}</text>
        </view>
      </view>

      <view class="groups">
        <view v-for="(part,index) in parts" :id="`group-${part.key}`" :key="part.key" class="group-card">
          <view class="group-head">
            <view class="group-identity"><view class="part-icon" :class="`shape-${index}`">{{ part.icon }}</view><view><text class="order">0{{ index + 1 }} · {{ part.english }}</text><text class="group-title">{{ part.name }}</text></view></view>
            <view class="count-pill">{{ groupActions(part.key).length }} 个动作</view>
          </view>
          <text class="group-desc">{{ part.description }}</text>

          <view v-if="groupActions(part.key).length" class="action-list">
            <view v-for="action in groupActions(part.key)" :key="action.id" class="action-row" hover-class="row-pressed">
              <view class="action-index">{{ action.name.slice(0,1) }}</view>
              <view class="action-copy"><text class="action-name">{{ action.name }}</text><view class="action-meta"><text>{{ equipmentName(action.equipment) }}</text><text class="source" :class="{ custom: isCustomAction(action) }">{{ isCustomAction(action) ? '自定义' : '系统动作' }}</text></view></view>
              <view v-if="isCustomAction(action)" class="row-actions"><text class="edit" @tap.stop="renameAction(action)">编辑</text><text class="remove" @tap.stop="removeAction(action)">×</text></view>
              <view v-else class="row-actions"><text class="edit">只读</text></view>
            </view>
          </view>
          <view v-else class="empty"><view class="empty-icon">＋</view><text>这个部位还没有动作</text><text>从动作库选择，或创建自己的动作</text></view>

          <view class="group-buttons">
            <button class="library-button" hover-class="button-pressed" @tap="filterLibrary(part)"><text>⌕</text> 搜索 / 筛选</button>
            <button class="custom-button" hover-class="button-pressed" @tap="addCustom(part)"><text>＋</text> 自定义动作</button>
          </view>
        </view>
      </view>
      <view class="footer-tip" @tap="loadExercises()"><text>{{ loadError ? '!' : '✓' }}</text><text>{{ loadError || filterDescription }}</text></view>
    </view>
  </view>
</template>

<script setup>
import { computed, ref } from 'vue'
import { onLoad, onReady, onShow } from '@dcloudio/uni-app'
import { createExercise, deleteExercise, getExercises, updateExercise } from '../../api/exercises'

const THEME_STORAGE_KEY='fit_note_theme_index'
const themes=[
  {accent:'#7775bd',accent2:'#a59bd2',pale:'#f1f0f9',pale2:'#faf9fd',glow:'119,117,189'},
  {accent:'#5f9fa5',accent2:'#8bbdaf',pale:'#edf6f5',pale2:'#f8fbfa',glow:'95,159,165'},
  {accent:'#bd8073',accent2:'#cda56f',pale:'#faf1ed',pale2:'#fdf9f5',glow:'189,128,115'}
]
const parts=[
  {key:'shoulder',name:'肩部',english:'SHOULDERS',icon:'▽',description:'稳定肩关节，塑造清晰肩部线条'},
  {key:'chest',name:'胸部',english:'CHEST',icon:'◇',description:'发展胸大肌力量与上肢推力'},
  {key:'back',name:'背部',english:'BACK',icon:'⌁',description:'强化背部肌群，改善身体姿态'},
  {key:'arms',name:'手臂',english:'ARMS',icon:'↯',description:'训练肱二头肌、肱三头肌与前臂'},
  {key:'abs',name:'腹部',english:'CORE',icon:'◎',description:'提升核心稳定与躯干控制能力'},
  {key:'legs',name:'腿部',english:'LEGS',icon:'△',description:'建立下肢力量、稳定性与爆发力'}
]
const muscleOptions={
  shoulder:[['shoulder','肩部']],chest:[['chest','胸部']],back:[['back','背部']],
  arms:[['biceps','肱二头肌'],['triceps','肱三头肌']],
  abs:[['core','核心']],legs:[['legs','腿部'],['glutes','臀部']]
}
const equipmentOptions=[
  ['barbell','杠铃'],['dumbbell','哑铃'],['machine','器械'],['cable','绳索'],
  ['bodyweight','徒手'],['other','其他']
]
const actions=ref([])
const savedTheme=Number(uni.getStorageSync(THEME_STORAGE_KEY))
const themeIndex=ref(Number.isInteger(savedTheme)&&savedTheme>=0&&savedTheme<themes.length?savedTheme:0)
const themeStyle=computed(()=>{const t=themes[themeIndex.value];return{'--accent':t.accent,'--accent-2':t.accent2,'--pale':t.pale,'--pale-2':t.pale2,'--glow-rgb':t.glow}})
const activePartCount=computed(()=>parts.filter(part=>groupActions(part.key).length).length)
const launchOptions=ref({})
const filters=ref({})
const loading=ref(false)
const mutating=ref(false)
const loadError=ref('')
const syncText=computed(()=>mutating.value?'正在保存':loading.value?'正在同步':loadError.value?'同步失败':'云端已同步')
const filterDescription=computed(()=>{
  const values=filters.value
  if(!Object.keys(values).length)return'系统动作与自定义动作均来自当前账号'
  const labels=[]
  if(values.category)labels.push(parts.find(part=>part.key===values.category)?.name||values.category)
  if(values.muscleGroup)labels.push(muscleOptions[values.category]?.find(item=>item[0]===values.muscleGroup)?.[1]||values.muscleGroup)
  if(values.equipment)labels.push(equipmentName(values.equipment))
  if(values.keyword)labels.push('“'+values.keyword+'”')
  return '当前筛选：'+labels.join(' · ')
})

function groupActions(key){return actions.value.filter(item=>item.category===key)}
function isCustomAction(action){return action?.custom===true||action?.isSystem===false}
function equipmentName(value){return equipmentOptions.find(item=>item[0]===value)?.[1]||value||'其他'}
function syncTheme(){const value=Number(uni.getStorageSync(THEME_STORAGE_KEY));if(Number.isInteger(value)&&value>=0&&value<themes.length)themeIndex.value=value}
function goBack(){uni.navigateBack({fail:()=>uni.reLaunch({url:'/pages/home/home'})})}
function scrollToPart(key){uni.pageScrollTo({selector:`#group-${key}`,duration:420})}
function showError(error,fallback='请求失败'){
  loadError.value=error?.message||fallback
  const title=error?.code==='EXERCISE_ALREADY_EXISTS'?'当前部位已存在同名动作':loadError.value
  uni.showToast({title,icon:'none'})
}
async function loadExercises(nextFilters=filters.value){
  if(loading.value)return
  loading.value=true;loadError.value=''
  try{
    const query={...nextFilters,page:1,pageSize:100},items=[]
    for(;;){
      const result=await getExercises(query)
      items.push(...(Array.isArray(result?.items)?result.items:[]))
      if(!result?.hasMore)break
      query.page+=1
    }
    filters.value={...nextFilters}
    actions.value=items
  }catch(error){showError(error,'动作库加载失败')}
  finally{loading.value=false}
}
function filterLibrary(part){
  uni.showActionSheet({itemList:['显示全部动作','搜索名称','按目标肌群','按器械'],success:({tapIndex})=>{
    if(tapIndex===0){loadExercises({});return}
    if(tapIndex===1){
      uni.showModal({title:`搜索${part.name}动作`,editable:true,placeholderText:'输入动作名称关键词',success:result=>{
        if(!result.confirm)return
        const keyword=String(result.content||'').trim()
        if(!keyword){uni.showToast({title:'请输入搜索关键词',icon:'none'});return}
        loadExercises({category:part.key,keyword})
      }})
      return
    }
    if(tapIndex===2){
      const options=muscleOptions[part.key]
      uni.showActionSheet({itemList:options.map(item=>item[1]),success:({tapIndex:index})=>loadExercises({category:part.key,muscleGroup:options[index][0]})})
      return
    }
    uni.showActionSheet({itemList:equipmentOptions.map(item=>item[1]),success:({tapIndex:index})=>loadExercises({category:part.key,equipment:equipmentOptions[index][0]})})
  }})
}
function addCustom(part){
  const muscles=muscleOptions[part.key]
  const chooseEquipment=muscleGroup=>uni.showActionSheet({itemList:equipmentOptions.map(item=>item[1]),success:({tapIndex})=>{
    const equipment=equipmentOptions[tapIndex][0]
    uni.showModal({title:`添加${part.name}动作`,editable:true,placeholderText:'请输入动作名称',success:async result=>{
      if(!result.confirm)return
      const name=String(result.content||'').trim()
      if(!name){uni.showToast({title:'动作名称不能为空',icon:'none'});return}
      mutating.value=true
      try{
        const key='exercise-'+Date.now()+'-'+Math.random().toString(36).slice(2,10)
        await createExercise({name,category:part.key,muscleGroup,equipment},key)
        await loadExercises(filters.value)
        uni.showToast({title:'创建成功',icon:'success'})
      }catch(error){showError(error,'动作创建失败')}
      finally{mutating.value=false}
    }})
  }})
  if(muscles.length===1){chooseEquipment(muscles[0][0]);return}
  uni.showActionSheet({itemList:muscles.map(item=>item[1]),success:({tapIndex})=>chooseEquipment(muscles[tapIndex][0])})
}
function renameAction(action){
  if(!isCustomAction(action)){uni.showToast({title:'系统动作不可编辑',icon:'none'});return}
  uni.showModal({title:'编辑动作名称',editable:true,content:action.name,placeholderText:'请输入动作名称',success:async result=>{
    if(!result.confirm)return
    const name=String(result.content||'').trim()
    if(!name){uni.showToast({title:'名称不能为空',icon:'none'});return}
    mutating.value=true
    try{await updateExercise(action.id,{name,version:action.version});await loadExercises(filters.value);uni.showToast({title:'修改成功',icon:'success'})}
    catch(error){showError(error,'动作修改失败')}
    finally{mutating.value=false}
  }})
}
function removeAction(action){
  if(!isCustomAction(action)){uni.showToast({title:'系统动作不可删除',icon:'none'});return}
  uni.showModal({title:`删除“${action.name}”？`,content:'删除后该动作将不再出现在动作库中。',success:async result=>{
    if(!result.confirm)return
    mutating.value=true
    try{await deleteExercise(action.id);await loadExercises(filters.value);uni.showToast({title:'已删除',icon:'success'})}
    catch(error){showError(error,'动作删除失败')}
    finally{mutating.value=false}
  }})
}
function choosePartForAdd(){uni.showActionSheet({itemList:parts.map(part=>part.name),success:({tapIndex})=>scrollToPart(parts[tapIndex].key)})}
onLoad(options=>{launchOptions.value=options||{}})
onReady(()=>setTimeout(()=>{if(launchOptions.value.part){const name=decodeURIComponent(launchOptions.value.part),part=parts.find(item=>item.name===name||item.key===name);if(part)scrollToPart(part.key)}},220))
onShow(()=>{syncTheme();loadExercises()})
</script>

<style scoped>
@property --accent{syntax:'<color>';inherits:true;initial-value:#7775bd}@property --accent-2{syntax:'<color>';inherits:true;initial-value:#a59bd2}
page{background:#f5f5fa}.page{position:relative;min-height:100vh;overflow:hidden;color:#293044;background:linear-gradient(145deg,var(--pale),var(--pale-2));transition:--accent .7s ease,--accent-2 .7s ease}.ambient{position:absolute;inset:0;overflow:hidden;pointer-events:none}.soft-orb{position:absolute;width:650rpx;height:650rpx;right:-330rpx;top:340rpx;border-radius:48% 52% 38% 62%;background:rgba(var(--glow-rgb),.09);transform:rotate(-18deg)}.body-line{position:absolute;top:190rpx;width:310rpx;height:1050rpx;border:2rpx solid rgba(var(--glow-rgb),.1);border-radius:50%}.line-left{left:-230rpx}.line-right{right:-230rpx}.dot-field{position:absolute;inset:0;opacity:.16;background-image:radial-gradient(rgba(var(--glow-rgb),.55) 1rpx,transparent 1rpx);background-size:35rpx 35rpx;mask-image:linear-gradient(#000,transparent 86%)}.shell{position:relative;z-index:2;padding:calc(var(--status-bar-height) + 22rpx) 28rpx 48rpx}.topbar{display:grid;grid-template-columns:1fr auto 1fr;align-items:center}.back{display:flex;align-items:center;gap:7rpx;color:#697084;font-size:22rpx}.back text:first-child{font-size:45rpx;line-height:1}.brand{display:flex;align-items:center;gap:12rpx;color:#535b6e;font-size:21rpx;font-weight:700;letter-spacing:3rpx}.brand-mark{width:34rpx;height:34rpx;border-radius:70% 30% 70% 30%;background:linear-gradient(135deg,var(--accent) 50%,var(--accent-2) 50%);transform:rotate(-12deg)}.sync-badge{justify-self:end;display:flex;align-items:center;gap:8rpx;padding:10rpx 13rpx;border-radius:20rpx;color:#8d93a2;background:rgba(255,255,255,.6);font-size:17rpx}.sync-dot{width:9rpx;height:9rpx;border-radius:50%;background:var(--accent);box-shadow:0 0 12rpx rgba(var(--glow-rgb),.5)}.hero{display:flex;justify-content:space-between;align-items:flex-end;margin:48rpx 5rpx 28rpx}.eyebrow,.title,.subtitle{display:block}.eyebrow{color:var(--accent);font-size:18rpx;font-weight:700;letter-spacing:4rpx}.title{margin-top:7rpx;font-size:47rpx;font-weight:760}.subtitle{margin-top:9rpx;color:#858c9d;font-size:21rpx}.summary{display:flex;align-items:center;gap:13rpx;padding:14rpx 19rpx;border:1rpx solid rgba(255,255,255,.9);border-radius:22rpx;background:rgba(255,255,255,.67);box-shadow:0 12rpx 28rpx rgba(60,68,98,.07)}.summary-number{color:var(--accent);font-size:38rpx;font-weight:760}.summary text{display:block;font-size:18rpx}.summary text:last-child{margin-top:3rpx;color:#969ba8;font-size:15rpx}
.anatomy-guide{position:relative;display:flex;justify-content:space-between;margin:0 5rpx 24rpx;padding:15rpx 13rpx;border-radius:25rpx;background:rgba(255,255,255,.54)}.guide-line{position:absolute;left:8%;right:8%;top:31rpx;height:2rpx;background:rgba(var(--glow-rgb),.18)}.guide-node{position:relative;z-index:1;display:grid;justify-items:center;gap:7rpx;color:#9399a7;font-size:15rpx}.node-dot{width:34rpx;height:34rpx;display:grid;place-items:center;border:2rpx solid rgba(var(--glow-rgb),.2);border-radius:50%;color:#9298a7;background:#fff;font-size:14rpx}.guide-node.active .node-dot{border-color:var(--accent);color:#fff;background:var(--accent);box-shadow:0 5rpx 15rpx rgba(var(--glow-rgb),.2)}.groups{display:flex;flex-direction:column;gap:20rpx}.group-card{scroll-margin-top:20rpx;padding:28rpx;border:1rpx solid rgba(255,255,255,.9);border-radius:33rpx;background:rgba(255,255,255,.82);box-shadow:0 18rpx 45rpx rgba(48,56,88,.075);backdrop-filter:blur(18rpx)}.group-head,.group-identity{display:flex;align-items:center}.group-head{justify-content:space-between}.group-identity{gap:15rpx}.part-icon{width:60rpx;height:60rpx;display:grid;place-items:center;border-radius:20rpx;color:#fff;background:linear-gradient(135deg,var(--accent),var(--accent-2));font-size:27rpx;box-shadow:0 10rpx 23rpx rgba(var(--glow-rgb),.2)}.shape-1,.shape-4{border-radius:50%}.shape-2,.shape-5{border-radius:24rpx 12rpx 24rpx 12rpx}.order,.group-title,.group-desc{display:block}.order{color:var(--accent);font-size:14rpx;font-weight:700;letter-spacing:2rpx}.group-title{margin-top:3rpx;font-size:28rpx;font-weight:750}.count-pill{padding:8rpx 13rpx;border-radius:16rpx;color:var(--accent);background:var(--pale);font-size:16rpx}.group-desc{margin:16rpx 0 19rpx;color:#9096a5;font-size:18rpx}.action-list{display:grid;gap:10rpx}.action-row{display:flex;align-items:center;gap:14rpx;padding:14rpx;border-radius:20rpx;background:var(--pale-2);transition:transform .22s ease}.row-pressed{transform:scale(.985)}.action-index{width:45rpx;height:45rpx;display:grid;place-items:center;border-radius:14rpx;color:var(--accent);background:#fff;font-size:20rpx;font-weight:700;box-shadow:0 6rpx 16rpx rgba(50,58,88,.06)}.action-copy{flex:1}.action-name{display:block;font-size:21rpx;font-weight:650}.action-meta{display:flex;align-items:center;gap:8rpx;margin-top:3rpx;color:#989da9;font-size:15rpx}.source{padding:2rpx 7rpx;border-radius:8rpx;color:var(--accent);background:var(--pale)}.source.custom{color:#b37d70;background:#fbefeb}.row-actions{display:flex;align-items:center;gap:14rpx}.edit{color:var(--accent);font-size:16rpx}.remove{color:#adb1bc;font-size:27rpx}.empty{display:grid;justify-items:center;padding:30rpx;border:2rpx dashed rgba(var(--glow-rgb),.2);border-radius:21rpx;color:#9ca1ad;font-size:17rpx}.empty text:last-child{margin-top:4rpx;font-size:14rpx}.empty-icon{width:43rpx;height:43rpx;display:grid;place-items:center;margin-bottom:8rpx;border-radius:50%;color:#fff;background:linear-gradient(135deg,var(--accent),var(--accent-2));font-size:24rpx}.group-buttons{display:grid;grid-template-columns:1fr 1fr;gap:11rpx;margin-top:18rpx}.library-button,.custom-button{height:68rpx;border:0;border-radius:20rpx;font-size:18rpx;font-weight:650}.library-button{color:#fff;background:linear-gradient(100deg,var(--accent),var(--accent-2));box-shadow:0 10rpx 24rpx rgba(var(--glow-rgb),.17)}.custom-button{color:var(--accent);background:var(--pale)}.library-button:after,.custom-button:after{border:0}.button-pressed{opacity:.78;transform:scale(.98)}.footer-tip{display:flex;justify-content:center;gap:8rpx;margin-top:25rpx;color:#989eab;font-size:17rpx}.footer-tip text:first-child{color:var(--accent)}.pressed{opacity:.65}
@media(min-width:900px){.shell{width:min(1180px,calc(100% - 70px));margin:auto;padding:28px 0 46px}.back{gap:5px;font-size:11px}.back text:first-child{font-size:29px}.brand{gap:8px;font-size:12px}.brand-mark{width:23px;height:23px}.sync-badge{gap:6px;padding:7px 10px;font-size:10px}.sync-dot{width:6px;height:6px}.hero{margin:44px 4px 27px}.eyebrow{font-size:10px;letter-spacing:3px}.title{font-size:35px}.subtitle{font-size:12px}.summary{gap:10px;padding:10px 15px;border-radius:16px}.summary-number{font-size:27px}.summary text{font-size:11px}.summary text:last-child{font-size:9px}.anatomy-guide{margin:0 4px 20px;padding:12px 40px;border-radius:19px}.guide-line{left:8%;right:8%;top:24px;height:1px}.guide-node{gap:5px;font-size:9px}.node-dot{width:26px;height:26px;border-width:1px;font-size:9px}.groups{display:grid;grid-template-columns:1fr 1fr;align-items:start;gap:18px}.group-card{scroll-margin-top:20px;padding:23px;border-radius:27px}.group-identity{gap:12px}.part-icon{width:46px;height:46px;border-radius:15px;font-size:20px}.order{font-size:8px}.group-title{font-size:21px}.count-pill{padding:5px 10px;font-size:9px}.group-desc{margin:13px 0 15px;font-size:10px}.action-list{gap:8px}.action-row{gap:11px;padding:11px;border-radius:15px}.action-index{width:35px;height:35px;border-radius:11px;font-size:14px}.action-name{font-size:13px}.action-meta{gap:6px;font-size:9px}.source{padding:2px 5px}.row-actions{gap:10px}.edit{font-size:9px}.remove{font-size:19px}.empty{padding:24px;font-size:11px}.empty text:last-child{font-size:9px}.empty-icon{width:33px;height:33px;font-size:18px}.group-buttons{gap:9px;margin-top:15px}.library-button,.custom-button{height:45px;border-radius:14px;font-size:11px}.footer-tip{margin-top:21px;font-size:10px}.group-card:hover{box-shadow:0 25px 58px rgba(48,56,88,.11)}}
</style>
