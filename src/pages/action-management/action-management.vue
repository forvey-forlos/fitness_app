<template>
  <view class="page" :style="themeStyle">
    <view class="ambient" aria-hidden="true"><view class="body-line line-left"/><view class="body-line line-right"/><view class="soft-orb"/><view class="dot-field"/></view>
    <view class="shell">
      <view class="topbar">
        <view class="back" hover-class="pressed" @tap="goBack"><text>‹</text><text>返回首页</text></view>
        <view class="brand"><view class="brand-mark"/><text>FIT NOTE</text></view>
        <view class="sync-badge"><view class="sync-dot"/><text>主题已同步</text></view>
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
              <view class="action-copy"><text class="action-name">{{ action.name }}</text><view class="action-meta"><text>{{ action.equipment || '徒手' }}</text><text class="source" :class="{ custom: action.custom }">{{ action.custom ? '自定义' : '动作库' }}</text></view></view>
              <view class="row-actions"><text class="edit" @tap="renameAction(action)">编辑</text><text class="remove" @tap="removeAction(action)">×</text></view>
            </view>
          </view>
          <view v-else class="empty"><view class="empty-icon">＋</view><text>这个部位还没有动作</text><text>从动作库选择，或创建自己的动作</text></view>

          <view class="group-buttons">
            <button class="library-button" hover-class="button-pressed" @tap="addFromLibrary(part)"><text>⌕</text> 从动作库添加</button>
            <button class="custom-button" hover-class="button-pressed" @tap="addCustom(part)"><text>＋</text> 自定义动作</button>
          </view>
        </view>
      </view>
      <view class="footer-tip"><text>✓</text><text>动作库变更会自动同步到首页</text></view>
    </view>
  </view>
</template>

<script setup>
import { computed, ref } from 'vue'
import { onLoad, onReady, onShow } from '@dcloudio/uni-app'

const THEME_STORAGE_KEY='fit_note_theme_index'
const ACTION_STORAGE_KEY='fit_note_action_library'
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
const catalog={
  shoulder:[['哑铃推举','哑铃'],['侧平举','哑铃'],['俯身飞鸟','哑铃'],['面拉','绳索'],['阿诺德推举','哑铃']],
  chest:[['平板卧推','杠铃'],['上斜哑铃卧推','哑铃'],['俯卧撑','徒手'],['绳索夹胸','绳索'],['双杠臂屈伸','双杠']],
  back:[['高位下拉','器械'],['杠铃划船','杠铃'],['引体向上','单杠'],['坐姿划船','器械'],['单臂哑铃划船','哑铃']],
  arms:[['哑铃弯举','哑铃'],['绳索下压','绳索'],['锤式弯举','哑铃'],['窄距卧推','杠铃'],['臂屈伸','徒手']],
  abs:[['平板支撑','徒手'],['卷腹','徒手'],['悬垂举腿','单杠'],['俄罗斯转体','负重'],['死虫式','徒手']],
  legs:[['深蹲','杠铃'],['罗马尼亚硬拉','杠铃'],['腿举','器械'],['箭步蹲','哑铃'],['提踵','器械']]
}
const defaultActions=parts.flatMap(part=>catalog[part.key].slice(0,3).map((item,index)=>({id:`preset-${part.key}-${index}`,part:part.key,name:item[0],equipment:item[1],custom:false})))
const savedActions=uni.getStorageSync(ACTION_STORAGE_KEY)
const actions=ref(Array.isArray(savedActions)?savedActions:defaultActions)
const savedTheme=Number(uni.getStorageSync(THEME_STORAGE_KEY))
const themeIndex=ref(Number.isInteger(savedTheme)&&savedTheme>=0&&savedTheme<themes.length?savedTheme:0)
const themeStyle=computed(()=>{const t=themes[themeIndex.value];return{'--accent':t.accent,'--accent-2':t.accent2,'--pale':t.pale,'--pale-2':t.pale2,'--glow-rgb':t.glow}})
const activePartCount=computed(()=>parts.filter(part=>groupActions(part.key).length).length)
const launchOptions=ref({})

if(!Array.isArray(savedActions))uni.setStorageSync(ACTION_STORAGE_KEY,actions.value)
function groupActions(key){return actions.value.filter(item=>item.part===key)}
function persist(){uni.setStorageSync(ACTION_STORAGE_KEY,actions.value)}
function syncTheme(){const value=Number(uni.getStorageSync(THEME_STORAGE_KEY));if(Number.isInteger(value)&&value>=0&&value<themes.length)themeIndex.value=value}
function goBack(){uni.navigateBack({fail:()=>uni.reLaunch({url:'/pages/home/home'})})}
function scrollToPart(key){uni.pageScrollTo({selector:`#group-${key}`,duration:420})}
function addFromLibrary(part){const activeNames=groupActions(part.key).map(item=>item.name),available=catalog[part.key].filter(item=>!activeNames.includes(item[0]));if(!available.length){uni.showToast({title:'该部位动作已全部添加',icon:'none'});return}uni.showActionSheet({itemList:available.map(item=>`${item[0]} · ${item[1]}`),success:({tapIndex})=>{const selected=available[tapIndex];actions.value.push({id:`preset-${part.key}-${Date.now()}`,part:part.key,name:selected[0],equipment:selected[1],custom:false});persist();uni.showToast({title:'已添加',icon:'success'})}})}
function addCustom(part){uni.showModal({title:`添加${part.name}动作`,editable:true,placeholderText:'请输入动作名称',success:result=>{if(!result.confirm)return;const name=String(result.content||'').trim();if(!name){uni.showToast({title:'动作名称不能为空',icon:'none'});return}if(groupActions(part.key).some(item=>item.name===name)){uni.showToast({title:'该动作已存在',icon:'none'});return}actions.value.push({id:`custom-${Date.now()}`,part:part.key,name,equipment:'自定义',custom:true});persist();uni.showToast({title:'创建成功',icon:'success'})}})}
function renameAction(action){uni.showModal({title:'编辑动作名称',editable:true,content:action.name,placeholderText:'请输入动作名称',success:result=>{if(!result.confirm)return;const name=String(result.content||'').trim();if(!name){uni.showToast({title:'名称不能为空',icon:'none'});return}action.name=name;persist()}})}
function removeAction(action){uni.showModal({title:`移除“${action.name}”？`,content:'移除后可再次从动作库添加。',success:result=>{if(!result.confirm)return;actions.value=actions.value.filter(item=>item.id!==action.id);persist()}})}
function choosePartForAdd(){uni.showActionSheet({itemList:parts.map(part=>part.name),success:({tapIndex})=>addFromLibrary(parts[tapIndex])})}
onLoad(options=>{launchOptions.value=options||{}})
onReady(()=>setTimeout(()=>{if(launchOptions.value.part){const name=decodeURIComponent(launchOptions.value.part),part=parts.find(item=>item.name===name||item.key===name);if(part)scrollToPart(part.key)}else if(launchOptions.value.mode==='add')choosePartForAdd()},220))
onShow(syncTheme)
</script>

<style scoped>
@property --accent{syntax:'<color>';inherits:true;initial-value:#7775bd}@property --accent-2{syntax:'<color>';inherits:true;initial-value:#a59bd2}
page{background:#f5f5fa}.page{position:relative;min-height:100vh;overflow:hidden;color:#293044;background:linear-gradient(145deg,var(--pale),var(--pale-2));transition:--accent .7s ease,--accent-2 .7s ease}.ambient{position:absolute;inset:0;overflow:hidden;pointer-events:none}.soft-orb{position:absolute;width:650rpx;height:650rpx;right:-330rpx;top:340rpx;border-radius:48% 52% 38% 62%;background:rgba(var(--glow-rgb),.09);transform:rotate(-18deg)}.body-line{position:absolute;top:190rpx;width:310rpx;height:1050rpx;border:2rpx solid rgba(var(--glow-rgb),.1);border-radius:50%}.line-left{left:-230rpx}.line-right{right:-230rpx}.dot-field{position:absolute;inset:0;opacity:.16;background-image:radial-gradient(rgba(var(--glow-rgb),.55) 1rpx,transparent 1rpx);background-size:35rpx 35rpx;mask-image:linear-gradient(#000,transparent 86%)}.shell{position:relative;z-index:2;padding:calc(var(--status-bar-height) + 22rpx) 28rpx 48rpx}.topbar{display:grid;grid-template-columns:1fr auto 1fr;align-items:center}.back{display:flex;align-items:center;gap:7rpx;color:#697084;font-size:22rpx}.back text:first-child{font-size:45rpx;line-height:1}.brand{display:flex;align-items:center;gap:12rpx;color:#535b6e;font-size:21rpx;font-weight:700;letter-spacing:3rpx}.brand-mark{width:34rpx;height:34rpx;border-radius:70% 30% 70% 30%;background:linear-gradient(135deg,var(--accent) 50%,var(--accent-2) 50%);transform:rotate(-12deg)}.sync-badge{justify-self:end;display:flex;align-items:center;gap:8rpx;padding:10rpx 13rpx;border-radius:20rpx;color:#8d93a2;background:rgba(255,255,255,.6);font-size:17rpx}.sync-dot{width:9rpx;height:9rpx;border-radius:50%;background:var(--accent);box-shadow:0 0 12rpx rgba(var(--glow-rgb),.5)}.hero{display:flex;justify-content:space-between;align-items:flex-end;margin:48rpx 5rpx 28rpx}.eyebrow,.title,.subtitle{display:block}.eyebrow{color:var(--accent);font-size:18rpx;font-weight:700;letter-spacing:4rpx}.title{margin-top:7rpx;font-size:47rpx;font-weight:760}.subtitle{margin-top:9rpx;color:#858c9d;font-size:21rpx}.summary{display:flex;align-items:center;gap:13rpx;padding:14rpx 19rpx;border:1rpx solid rgba(255,255,255,.9);border-radius:22rpx;background:rgba(255,255,255,.67);box-shadow:0 12rpx 28rpx rgba(60,68,98,.07)}.summary-number{color:var(--accent);font-size:38rpx;font-weight:760}.summary text{display:block;font-size:18rpx}.summary text:last-child{margin-top:3rpx;color:#969ba8;font-size:15rpx}
.anatomy-guide{position:relative;display:flex;justify-content:space-between;margin:0 5rpx 24rpx;padding:15rpx 13rpx;border-radius:25rpx;background:rgba(255,255,255,.54)}.guide-line{position:absolute;left:8%;right:8%;top:31rpx;height:2rpx;background:rgba(var(--glow-rgb),.18)}.guide-node{position:relative;z-index:1;display:grid;justify-items:center;gap:7rpx;color:#9399a7;font-size:15rpx}.node-dot{width:34rpx;height:34rpx;display:grid;place-items:center;border:2rpx solid rgba(var(--glow-rgb),.2);border-radius:50%;color:#9298a7;background:#fff;font-size:14rpx}.guide-node.active .node-dot{border-color:var(--accent);color:#fff;background:var(--accent);box-shadow:0 5rpx 15rpx rgba(var(--glow-rgb),.2)}.groups{display:flex;flex-direction:column;gap:20rpx}.group-card{scroll-margin-top:20rpx;padding:28rpx;border:1rpx solid rgba(255,255,255,.9);border-radius:33rpx;background:rgba(255,255,255,.82);box-shadow:0 18rpx 45rpx rgba(48,56,88,.075);backdrop-filter:blur(18rpx)}.group-head,.group-identity{display:flex;align-items:center}.group-head{justify-content:space-between}.group-identity{gap:15rpx}.part-icon{width:60rpx;height:60rpx;display:grid;place-items:center;border-radius:20rpx;color:#fff;background:linear-gradient(135deg,var(--accent),var(--accent-2));font-size:27rpx;box-shadow:0 10rpx 23rpx rgba(var(--glow-rgb),.2)}.shape-1,.shape-4{border-radius:50%}.shape-2,.shape-5{border-radius:24rpx 12rpx 24rpx 12rpx}.order,.group-title,.group-desc{display:block}.order{color:var(--accent);font-size:14rpx;font-weight:700;letter-spacing:2rpx}.group-title{margin-top:3rpx;font-size:28rpx;font-weight:750}.count-pill{padding:8rpx 13rpx;border-radius:16rpx;color:var(--accent);background:var(--pale);font-size:16rpx}.group-desc{margin:16rpx 0 19rpx;color:#9096a5;font-size:18rpx}.action-list{display:grid;gap:10rpx}.action-row{display:flex;align-items:center;gap:14rpx;padding:14rpx;border-radius:20rpx;background:var(--pale-2);transition:transform .22s ease}.row-pressed{transform:scale(.985)}.action-index{width:45rpx;height:45rpx;display:grid;place-items:center;border-radius:14rpx;color:var(--accent);background:#fff;font-size:20rpx;font-weight:700;box-shadow:0 6rpx 16rpx rgba(50,58,88,.06)}.action-copy{flex:1}.action-name{display:block;font-size:21rpx;font-weight:650}.action-meta{display:flex;align-items:center;gap:8rpx;margin-top:3rpx;color:#989da9;font-size:15rpx}.source{padding:2rpx 7rpx;border-radius:8rpx;color:var(--accent);background:var(--pale)}.source.custom{color:#b37d70;background:#fbefeb}.row-actions{display:flex;align-items:center;gap:14rpx}.edit{color:var(--accent);font-size:16rpx}.remove{color:#adb1bc;font-size:27rpx}.empty{display:grid;justify-items:center;padding:30rpx;border:2rpx dashed rgba(var(--glow-rgb),.2);border-radius:21rpx;color:#9ca1ad;font-size:17rpx}.empty text:last-child{margin-top:4rpx;font-size:14rpx}.empty-icon{width:43rpx;height:43rpx;display:grid;place-items:center;margin-bottom:8rpx;border-radius:50%;color:#fff;background:linear-gradient(135deg,var(--accent),var(--accent-2));font-size:24rpx}.group-buttons{display:grid;grid-template-columns:1fr 1fr;gap:11rpx;margin-top:18rpx}.library-button,.custom-button{height:68rpx;border:0;border-radius:20rpx;font-size:18rpx;font-weight:650}.library-button{color:#fff;background:linear-gradient(100deg,var(--accent),var(--accent-2));box-shadow:0 10rpx 24rpx rgba(var(--glow-rgb),.17)}.custom-button{color:var(--accent);background:var(--pale)}.library-button:after,.custom-button:after{border:0}.button-pressed{opacity:.78;transform:scale(.98)}.footer-tip{display:flex;justify-content:center;gap:8rpx;margin-top:25rpx;color:#989eab;font-size:17rpx}.footer-tip text:first-child{color:var(--accent)}.pressed{opacity:.65}
@media(min-width:900px){.shell{width:min(1180px,calc(100% - 70px));margin:auto;padding:28px 0 46px}.back{gap:5px;font-size:11px}.back text:first-child{font-size:29px}.brand{gap:8px;font-size:12px}.brand-mark{width:23px;height:23px}.sync-badge{gap:6px;padding:7px 10px;font-size:10px}.sync-dot{width:6px;height:6px}.hero{margin:44px 4px 27px}.eyebrow{font-size:10px;letter-spacing:3px}.title{font-size:35px}.subtitle{font-size:12px}.summary{gap:10px;padding:10px 15px;border-radius:16px}.summary-number{font-size:27px}.summary text{font-size:11px}.summary text:last-child{font-size:9px}.anatomy-guide{margin:0 4px 20px;padding:12px 40px;border-radius:19px}.guide-line{left:8%;right:8%;top:24px;height:1px}.guide-node{gap:5px;font-size:9px}.node-dot{width:26px;height:26px;border-width:1px;font-size:9px}.groups{display:grid;grid-template-columns:1fr 1fr;align-items:start;gap:18px}.group-card{scroll-margin-top:20px;padding:23px;border-radius:27px}.group-identity{gap:12px}.part-icon{width:46px;height:46px;border-radius:15px;font-size:20px}.order{font-size:8px}.group-title{font-size:21px}.count-pill{padding:5px 10px;font-size:9px}.group-desc{margin:13px 0 15px;font-size:10px}.action-list{gap:8px}.action-row{gap:11px;padding:11px;border-radius:15px}.action-index{width:35px;height:35px;border-radius:11px;font-size:14px}.action-name{font-size:13px}.action-meta{gap:6px;font-size:9px}.source{padding:2px 5px}.row-actions{gap:10px}.edit{font-size:9px}.remove{font-size:19px}.empty{padding:24px;font-size:11px}.empty text:last-child{font-size:9px}.empty-icon{width:33px;height:33px;font-size:18px}.group-buttons{gap:9px;margin-top:15px}.library-button,.custom-button{height:45px;border-radius:14px;font-size:11px}.footer-tip{margin-top:21px;font-size:10px}.group-card:hover{box-shadow:0 25px 58px rgba(48,56,88,.11)}}
</style>
