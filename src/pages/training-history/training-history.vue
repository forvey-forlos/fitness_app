<template>
  <view class="page" :style="themeStyle">
    <view class="orb" /><view class="shell">
      <view class="topbar"><button class="back" hover-class="pressed" @tap="goBack">‹</button><view><text class="kicker">TRAINING LOG</text><text class="title">训练历史</text></view><view class="theme-mark" /></view>
      <view class="week-card">
        <view class="week-head"><view><text class="week-title">本周完成</text><text class="week-range">{{ weekRange }}</text></view><text class="score">{{ completedCount }}<small>/7</small></text></view>
        <view class="dots"><view v-for="day in weekDays" :key="day.key" class="day" :class="{ today:day.today }"><view class="dot" :class="{ done:day.done }">{{ day.done?'✓':'' }}</view><text>{{ day.label }}</text><text>{{ day.dateLabel }}</text></view></view>
      </view>
      <view class="history-card"><view class="list-head"><text>完成记录</text><text>共 {{ historyTotal }} 次</text></view>
        <view v-if="loading" class="empty"><view>⌁</view><text>正在加载训练记录</text><text>请稍候</text></view>
        <view v-else-if="loadError" class="empty"><view>!</view><text>训练记录加载失败</text><text>{{ loadError }}</text><button hover-class="pressed" @tap="load">重新加载</button></view>
        <view v-else-if="history.length" class="history-list">
          <view v-for="item in history" :key="item.id" class="record" @tap="loadDetail(item)">
            <view class="record-main"><view class="record-icon">✓</view><view class="record-copy"><text>{{ item.title }}</text><text>{{ formatDate(item.date) }} · {{ item.duration }} 分钟</text></view><text class="complete-label">已完成</text><text class="history-delete" @tap.stop="removeHistory(item)">删除</text></view>
            <view v-if="detailLoadingId===item.id" class="record-details"><text class="week-range">正在加载详情…</text></view>
            <view v-else-if="details[item.id]" class="record-details">
              <view class="history-part">
                <view class="history-part-head"><text>{{ details[item.id].planNameSnapshot }}</text><text>{{ details[item.id].exercises.length }} 个动作</text></view>
                <view v-for="action in details[item.id].exercises" :key="action.id" class="history-action"><text>{{ action.exerciseNameSnapshot }}</text><text>{{ formatSnapshot(action) }}</text></view>
                <view v-if="!details[item.id].exercises.length" class="history-action"><text>没有动作快照</text><text>—</text></view>
              </view>
            </view>
          </view>
        </view>
        <view v-else class="empty"><view>○</view><text>还没有训练记录</text><text>完成今日训练后，记录会出现在这里</text><button hover-class="pressed" @tap="goPlan">前往训练计划</button></view>
        <button class="export-entry" hover-class="pressed" @tap="openExport"><view><text>⇩</text></view><text>训练数据导出</text><text>选择记录并生成 AI 可读文件 ›</text></button>
      </view>
    </view>
    <view v-if="exportVisible" class="export-overlay" @tap="closeExport">
      <view class="export-dialog" @tap.stop>
        <view class="export-head"><view><text>训练数据导出</text><text>选择内容，预览后保存文件</text></view><text class="export-close" @tap="closeExport">×</text></view>
        <scroll-view scroll-y class="export-scroll">
          <view class="export-section">
            <text class="export-section-title">导出格式</text>
            <view class="format-grid">
              <view class="format-option" :class="{active:exportFormat==='md'}" @tap="exportFormat='md'"><text>Markdown</text><text>.md · 保留标题和列表排版</text></view>
              <view class="format-option" :class="{active:exportFormat==='txt'}" @tap="exportFormat='txt'"><text>纯文本</text><text>.txt · 兼容性最高</text></view>
            </view>
          </view>
          <view class="export-section">
            <view class="export-section-head"><text class="export-section-title">导出内容</text><text>可多选</text></view>
            <view class="content-options">
              <view v-for="option in exportContentOptions" :key="option.key" class="content-option" @tap="toggleExportContent(option.key)"><view class="check-circle" :class="{checked:exportContent[option.key]}">{{ exportContent[option.key]?'✓':'' }}</view><text>{{ option.name }}</text></view>
            </view>
          </view>
          <view class="export-section">
            <view class="export-section-head"><text class="export-section-title">训练历史范围</text><text>已选 {{ selectedHistoryIds.length }} 项</text></view>
            <view v-if="!history.length" class="export-empty">暂无可导出的训练历史</view>
            <view v-else-if="history.length<=30" class="export-history-list">
              <view v-for="item in history" :key="'export-'+item.id" class="export-history-item" @tap="toggleHistorySelection(item.id)"><view><text>{{ formatDate(item.date) }}</text><text>{{ item.title }}</text></view><view class="check-circle" :class="{checked:isHistorySelected(item.id)}">{{ isHistorySelected(item.id)?'✓':'' }}</view></view>
            </view>
            <view v-else class="month-list">
              <view v-for="month in exportMonthGroups" :key="month.key" class="month-group">
                <view class="month-head" @tap="toggleMonthExpanded(month.key)"><text class="month-arrow" :class="{expanded:isMonthExpanded(month.key)}">›</text><view><text>{{ month.label }}</text><text>{{ month.items.length }} 次训练</text></view><view class="check-circle" :class="{checked:monthSelectionState(month)==='all',partial:monthSelectionState(month)==='partial'}" @tap.stop="toggleMonthSelection(month)">{{ monthSelectionState(month)==='all'?'✓':monthSelectionState(month)==='partial'?'−':'' }}</view></view>
                <view v-if="isMonthExpanded(month.key)" class="export-history-list month-items">
                  <view v-for="item in month.items" :key="'month-'+item.id" class="export-history-item" @tap="toggleHistorySelection(item.id)"><view><text>{{ formatDate(item.date) }}</text><text>{{ item.title }}</text></view><view class="check-circle" :class="{checked:isHistorySelected(item.id)}">{{ isHistorySelected(item.id)?'✓':'' }}</view></view>
                </view>
              </view>
            </view>
          </view>
          <view class="export-section preview-section">
            <view class="export-section-head"><text class="export-section-title">预览</text><text>{{ exportFormat==='md'?'Markdown':'纯文本' }}</text></view>
            <view class="preview-paper"><text v-if="exportPreviewLoading">正在整理训练数据…</text><text v-else-if="exportPreviewError" class="preview-error">{{ exportPreviewError }}</text><text v-else-if="!selectedHistoryIds.length">勾选训练记录后，这里会生成导出预览。</text><text v-else selectable>{{ exportPreview }}</text></view>
          </view>
        </scroll-view>
        <view class="export-footer"><button :disabled="exporting||!selectedHistoryIds.length" hover-class="pressed" @tap="exportTrainingData">{{ exporting?'正在生成文件…':'导出数据' }}</button></view>
      </view>
    </view>
  </view>
</template>

<script setup>
import { computed,ref } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import { USER_KEY } from '../../api/request'
import { deleteTrainingHistory, getTrainingExportData, getTrainingHistory, getWeeklyTrainingStats, listTrainingHistory } from '../../api/training'
import { recordMethodName } from '../../constants/exercise-meta'
import { buildTrainingExport, saveTrainingExportFile, shareTrainingExportFile, trainingExportFilename } from '../../utils/training-export'
const THEME_KEY='fit_note_theme_index'
const themes=[{accent:'#7775bd',accent2:'#a59bd2',pale:'#f1f0f9',pale2:'#faf9fd',glow:'119,117,189'},{accent:'#5f9fa5',accent2:'#8bbdaf',pale:'#edf6f5',pale2:'#f8fbfa',glow:'95,159,165'},{accent:'#bd8073',accent2:'#cda56f',pale:'#faf1ed',pale2:'#fdf9f5',glow:'189,128,115'}]
const themeIndex=ref(0),history=ref([])
const historyTotal=ref(0),weekStats=ref({weekStart:'',weekEnd:'',completedCount:0,currentStreak:0,days:[]})
const details=ref({}),detailLoadingId=ref(''),loading=ref(false),loadError=ref('')
const exportVisible=ref(false),exportFormat=ref('md'),exportContent=ref({actions:true,plan:true,actual:true})
const selectedHistoryIds=ref([]),expandedMonths=ref([]),exportRecords=ref([])
const exportPreviewLoading=ref(false),exportPreviewError=ref(''),exporting=ref(false)
const exportContentOptions=[{key:'actions',name:'动作'},{key:'plan',name:'计划量'},{key:'actual',name:'实际训练量'}]
let exportPreviewTimer=null,exportRequestVersion=0
const themeStyle=computed(()=>{const t=themes[themeIndex.value];return{'--accent':t.accent,'--accent-2':t.accent2,'--pale':t.pale,'--pale-2':t.pale2,'--glow-rgb':t.glow}})
const todayKey=computed(()=>{const d=new Date();return [d.getFullYear(),String(d.getMonth()+1).padStart(2,'0'),String(d.getDate()).padStart(2,'0')].join('-')})
const weekDays=computed(()=>Array.isArray(weekStats.value.days)?weekStats.value.days.map((day,index)=>({key:day.date||String(index),label:['一','二','三','四','五','六','日'][index],dateLabel:day.date?day.date.slice(5).replace('-','/'):'--/--',today:day.date===todayKey.value,done:day.completed===true})):[])
const completedCount=computed(()=>Number(weekStats.value.completedCount||0))
const currentStreak=computed(()=>Number(weekStats.value.currentStreak||0))
const weekRange=computed(()=>weekStats.value.weekStart&&weekStats.value.weekEnd?`${weekStats.value.weekStart.slice(5).replace('-','/')} — ${weekStats.value.weekEnd.slice(5).replace('-','/')} · 连续 ${currentStreak.value} 天`:'本周暂无统计')
const exportMonthGroups=computed(()=>{
  const groups=new Map()
  history.value.forEach(item=>{
    const key=String(item.date||item.planDate||'').slice(0,7)||'unknown'
    if(!groups.has(key))groups.set(key,[])
    groups.get(key).push(item)
  })
  return [...groups.entries()].map(([key,items])=>{const [year,month]=key.split('-');return{key,label:key==='unknown'?'日期未知':`${year}年${Number(month)}月`,items}})
})
const selectedExportRecords=computed(()=>{
  const selected=new Set(selectedHistoryIds.value),byId=new Map(exportRecords.value.map(item=>[item.id,item]))
  return history.value.filter(item=>selected.has(item.id)).map(item=>byId.get(item.id)).filter(Boolean)
})
const exportNickname=computed(()=>{const user=uni.getStorageSync(USER_KEY)||{};return user.displayName||user.username||user.accountCode||'用户'})
const exportPreview=computed(()=>buildTrainingExport({format:exportFormat.value,nickname:exportNickname.value,records:selectedExportRecords.value,include:exportContent.value}))
function formatDate(value){
  const [y,m,d]=String(value||'').split('-')
  return y&&m&&d?`${y}年${Number(m)}月${Number(d)}日`:'日期未知'
}
function formatSnapshot(action){
  if(Array.isArray(action.recordMethods)&&action.recordMethods.length&&Array.isArray(action.actualGroups)&&action.actualGroups.length){
    const latest=action.actualGroups[action.actualGroups.length-1]?.values||{}
    const summary=action.recordMethods.map(method=>`${recordMethodName(method)} ${latest[method]??'--'}`).join(' / ')
    return `${action.actualGroups.length} 组 · ${summary}`
  }
  const target=action.target||{kg:action.weight,reps:action.reps,sets:action.sets}
  const actual=action.actual||{}
  const value=(input,fallback='--')=>input===null||input===undefined?fallback:input
  return `目标 ${value(target.kg)}kg/${value(target.reps)}个/${value(target.sets)}组 · 实际 ${value(actual.kg)}kg/${value(actual.reps)}个/${value(actual.sets)}组${action.notes?' · '+action.notes:''}`
}
async function loadHistory(query={}){
  const items=[],request={...query,page:1,pageSize:20}
  let total=0
  for(;;){
    const result=await listTrainingHistory(request)
    items.push(...(Array.isArray(result?.items)?result.items:[]))
    total=Number(result?.total||items.length)
    if(!result?.hasMore)break
    request.page+=1
  }
  history.value=items
  historyTotal.value=total
}
async function load(){
  if(loading.value)return
  const ti=Number(uni.getStorageSync(THEME_KEY));themeIndex.value=Number.isInteger(ti)&&themes[ti]?ti:0
  loading.value=true;loadError.value=''
  try{
    const [,weekly]=await Promise.all([loadHistory(),getWeeklyTrainingStats()])
    weekStats.value={weekStart:weekly?.weekStart||'',weekEnd:weekly?.weekEnd||'',completedCount:Number(weekly?.completedCount||0),currentStreak:Number(weekly?.currentStreak||0),days:Array.isArray(weekly?.days)?weekly.days:[]}
  }catch(error){loadError.value=error?.message||'网络请求失败'}
  finally{loading.value=false}
}
async function loadDetail(item){
  if(details.value[item.id]||detailLoadingId.value)return
  detailLoadingId.value=item.id
  try{
    const detail=await getTrainingHistory(item.id)
    details.value={...details.value,[item.id]:{...detail,exercises:Array.isArray(detail?.exercises)?detail.exercises:[]}}
  }catch(error){
    const title=error?.code==='NOT_FOUND'?'训练历史不存在':(error?.message||'历史详情加载失败')
    uni.showToast({title,icon:'none'})
  }finally{detailLoadingId.value=''}
}
function removeHistory(item){uni.showModal({title:'删除训练历史？',content:'删除后该记录不会再参与历史列表和训练统计。',success:async result=>{if(!result.confirm)return;try{await deleteTrainingHistory(item.id);history.value=history.value.filter(value=>value.id!==item.id);historyTotal.value=Math.max(0,historyTotal.value-1);const next={...details.value};delete next[item.id];details.value=next;weekStats.value=await getWeeklyTrainingStats();uni.showToast({title:'已删除',icon:'success'})}catch(error){uni.showToast({title:error?.message||'删除失败',icon:'none'})}}})}
function openExport(){
  exportVisible.value=true;exportFormat.value='md';exportContent.value={actions:true,plan:true,actual:true}
  selectedHistoryIds.value=[];exportRecords.value=[];exportPreviewError.value=''
  expandedMonths.value=exportMonthGroups.value.slice(0,1).map(month=>month.key)
}
function closeExport(){if(exporting.value)return;exportVisible.value=false;if(exportPreviewTimer)clearTimeout(exportPreviewTimer)}
function toggleExportContent(key){
  const next={...exportContent.value,[key]:!exportContent.value[key]}
  if(!Object.values(next).some(Boolean)){uni.showToast({title:'至少选择一项导出内容',icon:'none'});return}
  exportContent.value=next
}
function isHistorySelected(id){return selectedHistoryIds.value.includes(id)}
function toggleHistorySelection(id){
  selectedHistoryIds.value=isHistorySelected(id)?selectedHistoryIds.value.filter(value=>value!==id):[...selectedHistoryIds.value,id]
  scheduleExportPreview()
}
function isMonthExpanded(key){return expandedMonths.value.includes(key)}
function toggleMonthExpanded(key){expandedMonths.value=isMonthExpanded(key)?expandedMonths.value.filter(value=>value!==key):[...expandedMonths.value,key]}
function monthSelectionState(month){const count=month.items.filter(item=>isHistorySelected(item.id)).length;return count===month.items.length?'all':count?'partial':'none'}
function toggleMonthSelection(month){
  const ids=month.items.map(item=>item.id),remove=monthSelectionState(month)==='all',next=new Set(selectedHistoryIds.value)
  ids.forEach(id=>remove?next.delete(id):next.add(id))
  if(next.size>500){uni.showToast({title:'单次最多导出 500 条记录',icon:'none'});return}
  selectedHistoryIds.value=[...next];scheduleExportPreview()
}
function scheduleExportPreview(){
  if(exportPreviewTimer)clearTimeout(exportPreviewTimer)
  exportPreviewTimer=setTimeout(()=>{exportPreviewTimer=null;refreshExportPreview()},180)
}
async function refreshExportPreview(){
  const ids=[...selectedHistoryIds.value],version=++exportRequestVersion
  if(!ids.length){exportRecords.value=[];exportPreviewError.value='';exportPreviewLoading.value=false;return[]}
  exportPreviewLoading.value=true;exportPreviewError.value=''
  try{
    const result=await getTrainingExportData(ids)
    const records=Array.isArray(result?.records)?result.records:[]
    if(version===exportRequestVersion)exportRecords.value=records
    return records
  }catch(error){if(version===exportRequestVersion)exportPreviewError.value=error?.message||'训练数据读取失败';throw error}
  finally{if(version===exportRequestVersion)exportPreviewLoading.value=false}
}
async function exportTrainingData(){
  if(exporting.value)return
  if(!selectedHistoryIds.value.length){uni.showToast({title:'请先选择训练记录',icon:'none'});return}
  if(!Object.values(exportContent.value).some(Boolean)){uni.showToast({title:'请至少选择一项导出内容',icon:'none'});return}
  exporting.value=true
  try{
    if(exportPreviewTimer){clearTimeout(exportPreviewTimer);exportPreviewTimer=null}
    const records=await refreshExportPreview()
    const content=buildTrainingExport({format:exportFormat.value,nickname:exportNickname.value,records,include:exportContent.value})
    const filename=trainingExportFilename(records,exportFormat.value)
    const saved=await saveTrainingExportFile(filename,content)
    if(saved.platform==='h5')uni.showToast({title:'文件已开始下载',icon:'success'})
    else if(saved.platform==='clipboard')uni.showToast({title:'当前平台已复制导出内容',icon:'success'})
    else if(saved.platform==='mp-weixin')uni.showModal({title:'导出成功',content:`文件已保存：${filename}\n可直接转发文件，或关闭后重新导出。`,cancelText:'关闭',confirmText:'转发文件',success:async result=>{if(result.confirm)try{await shareTrainingExportFile(saved.savedPath,filename)}catch(error){uni.showToast({title:error?.message||'文件转发失败',icon:'none'})}}})
    else uni.showModal({title:'导出成功',content:`文件已保存：${filename}\n可复制内容后粘贴给 AI。`,cancelText:'关闭',confirmText:'复制内容',success:result=>{if(result.confirm)uni.setClipboardData({data:content})}})
  }catch(error){uni.showToast({title:error?.message||'导出失败，请稍后重试',icon:'none'})}
  finally{exporting.value=false}
}
function goBack(){uni.navigateBack({delta:1})}
function goPlan(){uni.redirectTo({url:'/pages/training-plan/training-plan'})}
onShow(load)
</script>

<style scoped>
page{background:#f6f5fa}.page{position:relative;min-height:100vh;overflow:hidden;color:#2b3142;background:linear-gradient(145deg,var(--pale),var(--pale-2))}.orb{position:absolute;width:590rpx;height:590rpx;top:-310rpx;right:-260rpx;border-radius:50%;background:rgba(var(--glow-rgb),.1)}.shell{position:relative;z-index:1;width:100%;padding:calc(var(--status-bar-height) + 25rpx) 28rpx 50rpx}.topbar{display:flex;align-items:center;gap:18rpx}.back{width:64rpx;height:64rpx;margin:0;padding:0;border:0;border-radius:20rpx;color:var(--accent);background:rgba(255,255,255,.72);font-size:43rpx;line-height:58rpx}.back:after,.empty button:after{border:0}.pressed{opacity:.8;transform:scale(.98)}.kicker,.title{display:block}.kicker{color:var(--accent);font-size:16rpx;font-weight:750;letter-spacing:3rpx}.title{font-size:31rpx;font-weight:760}.theme-mark{width:22rpx;height:22rpx;margin-left:auto;border:6rpx solid rgba(255,255,255,.8);border-radius:50%;background:var(--accent);box-shadow:0 6rpx 18rpx rgba(var(--glow-rgb),.25)}.week-card,.history-card{margin-top:28rpx;padding:29rpx;border:1rpx solid rgba(255,255,255,.9);border-radius:32rpx;background:rgba(255,255,255,.78);box-shadow:0 20rpx 50rpx rgba(53,61,92,.08)}.week-head,.list-head{display:flex;justify-content:space-between;align-items:center}.week-title,.week-range{display:block}.week-title{font-size:28rpx;font-weight:750}.week-range{margin-top:4rpx;color:#999fac;font-size:17rpx}.score{color:var(--accent);font-size:44rpx;font-weight:780}.score small{font-size:20rpx}.dots{display:flex;justify-content:space-between;margin-top:28rpx}.day{display:grid;justify-items:center;gap:8rpx;color:#a0a5b0;font-size:15rpx}.day text:last-child{font-size:13rpx}.day.today{color:var(--accent);font-weight:700}.dot{width:43rpx;height:43rpx;display:grid;place-items:center;border:3rpx solid rgba(var(--glow-rgb),.25);border-radius:50%;color:#fff;font-size:19rpx}.dot.done{border-color:var(--accent);background:linear-gradient(135deg,var(--accent),var(--accent-2));box-shadow:0 8rpx 20rpx rgba(var(--glow-rgb),.25)}.day.today .dot:not(.done){border-color:var(--accent)}.list-head text:first-child{font-size:27rpx;font-weight:750}.list-head text:last-child{color:#999fac;font-size:17rpx}.history-list{display:grid;gap:13rpx;margin-top:22rpx}.record{padding:18rpx;border-radius:21rpx;background:var(--pale-2)}.record-main,.record-icon{display:flex;align-items:center}.record-main{gap:15rpx}.record-icon{width:45rpx;height:45rpx;justify-content:center;flex:none;border-radius:15rpx;color:#fff;background:var(--accent);font-size:18rpx}.record-copy{flex:1}.record-copy text{display:block;font-size:20rpx;font-weight:650}.record-copy text:last-child{margin-top:3rpx;color:#999fac;font-size:15rpx;font-weight:400}.complete-label{color:var(--accent);font-size:16rpx}.record-details{display:grid;gap:10rpx;margin-top:15rpx;padding-top:14rpx;border-top:1rpx solid rgba(var(--glow-rgb),.14)}.history-part{padding:11rpx;border-radius:15rpx;background:#fff}.history-part-head,.history-action{display:flex;justify-content:space-between}.history-part-head{color:#4f576a;font-size:16rpx;font-weight:700}.history-part-head text:last-child{color:var(--accent);font-size:13rpx}.history-action{margin-top:7rpx;color:#858c9d;font-size:14rpx}.history-action text:last-child{color:#555d70}.empty{display:grid;justify-items:center;padding:65rpx 0 35rpx;color:#9aa0ad}.empty view{color:var(--accent);font-size:68rpx}.empty text{font-size:21rpx;font-weight:650}.empty text:nth-child(3){margin-top:7rpx;font-size:16rpx;font-weight:400}.empty button{height:66rpx;margin-top:25rpx;padding:0 32rpx;border:0;border-radius:20rpx;color:var(--accent);background:var(--pale);font-size:19rpx;font-weight:700}@media(min-width:900px){.shell{width:min(900px,calc(100% - 60px));margin:auto;padding-top:32px}.week-card,.history-card{border-radius:25px;padding:25px}.history-list{grid-template-columns:1fr 1fr;align-items:start}}
.shell,.week-card,.history-card,.record{box-sizing:border-box}.topbar,.week-head,.list-head,.record-main{min-width:0}.record-copy{min-width:0}.record-copy text{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}@media(max-width:899px){.shell{width:100%;padding-left:28rpx;padding-right:28rpx}.week-card,.history-card{width:100%;max-width:100%}.score,.complete-label{flex:none}.dots{gap:5rpx}.day{min-width:0}.dot{width:39rpx;height:39rpx}}
.history-delete{flex:none;color:#b36b75;font-size:15rpx}
.export-entry{display:grid;grid-template-columns:50rpx minmax(0,1fr) auto;align-items:center;gap:13rpx;width:100%;height:auto;margin:22rpx 0 0;padding:17rpx 18rpx;border:1rpx solid rgba(var(--glow-rgb),.16);border-radius:21rpx;color:#3f4658;background:linear-gradient(135deg,#fff,var(--pale-2));line-height:1.3;text-align:left}.export-entry::after{border:0}.export-entry view{width:45rpx;height:45rpx;display:grid;place-items:center;border-radius:15rpx;color:#fff;background:linear-gradient(135deg,var(--accent),var(--accent-2));font-size:22rpx}.export-entry>text:nth-child(2){font-size:19rpx;font-weight:750}.export-entry>text:last-child{color:#969caa;font-size:14rpx;font-weight:400;text-align:right}
.export-overlay{position:fixed;z-index:90;inset:0;display:flex;align-items:center;justify-content:center;padding:26rpx;background:rgba(35,38,52,.46);backdrop-filter:blur(8px)}.export-dialog{display:flex;flex-direction:column;width:min(710rpx,700px);max-height:91vh;box-sizing:border-box;border:1rpx solid rgba(255,255,255,.9);border-radius:32rpx;background:#f9f9fc;box-shadow:0 32rpx 90rpx rgba(31,35,52,.27);overflow:hidden}.export-head{display:flex;align-items:flex-start;justify-content:space-between;padding:27rpx 28rpx 20rpx;background:rgba(255,255,255,.88)}.export-head>view text{display:block}.export-head>view text:first-child{font-size:30rpx;font-weight:850}.export-head>view text:last-child{margin-top:5rpx;color:#9298a6;font-size:16rpx}.export-close{width:46rpx;height:46rpx;display:grid;place-items:center;flex:none;border-radius:50%;color:#858b9a;background:#edeef2;font-size:29rpx}.export-scroll{flex:1;min-height:0;padding:0 24rpx 25rpx;box-sizing:border-box}.export-section{margin-top:18rpx;padding:20rpx;border:1rpx solid rgba(var(--glow-rgb),.11);border-radius:23rpx;background:#fff}.export-section-title{font-size:21rpx;font-weight:800}.export-section-head{display:flex;align-items:center;justify-content:space-between}.export-section-head>text:last-child{color:#9298a6;font-size:14rpx}.format-grid{display:grid;grid-template-columns:1fr 1fr;gap:11rpx;margin-top:14rpx}.format-option{padding:16rpx;border:2rpx solid transparent;border-radius:17rpx;background:var(--pale-2)}.format-option.active{border-color:var(--accent);background:var(--pale);box-shadow:0 7rpx 18rpx rgba(var(--glow-rgb),.11)}.format-option text{display:block}.format-option text:first-child{color:#4c5365;font-size:18rpx;font-weight:750}.format-option.active text:first-child{color:var(--accent)}.format-option text:last-child{margin-top:4rpx;color:#969caa;font-size:12rpx}.content-options{display:flex;flex-wrap:wrap;gap:10rpx;margin-top:14rpx}.content-option{display:flex;align-items:center;gap:8rpx;padding:10rpx 13rpx;border-radius:16rpx;background:var(--pale-2);color:#52596b;font-size:16rpx;font-weight:650}.check-circle{width:31rpx;height:31rpx;display:grid;place-items:center;flex:none;box-sizing:border-box;border:3rpx solid rgba(var(--glow-rgb),.25);border-radius:50%;color:#fff;font-size:16rpx;font-weight:800;transition:transform .18s ease,background .18s ease}.check-circle.checked{border-color:var(--accent);background:linear-gradient(135deg,var(--accent),var(--accent-2));box-shadow:0 6rpx 15rpx rgba(var(--glow-rgb),.2)}.check-circle.partial{border-color:var(--accent);color:var(--accent);background:var(--pale)}.export-history-list{display:grid;gap:8rpx;margin-top:14rpx}.export-history-item{display:flex;align-items:center;justify-content:space-between;gap:14rpx;padding:13rpx 14rpx;border-radius:16rpx;background:var(--pale-2)}.export-history-item>view:first-child{min-width:0}.export-history-item text{display:block;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.export-history-item text:first-child{color:#8e95a4;font-size:13rpx}.export-history-item text:last-child{margin-top:3rpx;color:#444b5e;font-size:17rpx;font-weight:700}.month-list{display:grid;gap:10rpx;margin-top:14rpx}.month-group{border-radius:18rpx;background:var(--pale-2);overflow:hidden}.month-head{display:grid;grid-template-columns:30rpx minmax(0,1fr) 34rpx;align-items:center;gap:10rpx;padding:14rpx}.month-head>view:nth-child(2) text{display:block}.month-head>view:nth-child(2) text:first-child{font-size:18rpx;font-weight:750}.month-head>view:nth-child(2) text:last-child{margin-top:2rpx;color:#969caa;font-size:13rpx}.month-arrow{color:var(--accent);font-size:28rpx;transform:rotate(0);transition:transform .2s ease}.month-arrow.expanded{transform:rotate(90deg)}.month-items{margin:0;padding:0 9rpx 9rpx}.month-items .export-history-item{background:#fff}.export-empty{padding:38rpx 0 20rpx;color:#979daa;font-size:16rpx;text-align:center}.preview-paper{max-height:420rpx;margin-top:14rpx;padding:20rpx;border:1rpx solid rgba(var(--glow-rgb),.12);border-radius:18rpx;overflow:auto;color:#545b6d;background:#fbfbfd;font-family:ui-monospace,SFMono-Regular,Consolas,monospace;font-size:14rpx;line-height:1.75;white-space:pre-wrap;word-break:break-word}.preview-paper>text{white-space:pre-wrap}.preview-error{color:#b36b75}.export-footer{padding:17rpx 24rpx calc(17rpx + env(safe-area-inset-bottom));border-top:1rpx solid rgba(var(--glow-rgb),.1);background:#fff}.export-footer button{height:70rpx;margin:0;border:0;border-radius:21rpx;color:#fff;background:linear-gradient(100deg,var(--accent),var(--accent-2));font-size:20rpx;font-weight:800;line-height:70rpx;box-shadow:0 12rpx 28rpx rgba(var(--glow-rgb),.2)}.export-footer button::after{border:0}.export-footer button[disabled]{opacity:.48}
@media(min-width:900px){.export-dialog{border-radius:26px}.export-head{padding:22px 24px 16px}.export-scroll{padding:0 20px 20px}.export-section{padding:18px;border-radius:18px}.preview-paper{max-height:330px;font-size:13px}.export-footer{padding:14px 20px}.export-footer button{height:52px;line-height:52px}.export-history-list{grid-template-columns:1fr 1fr}.month-items{grid-template-columns:1fr 1fr}}
</style>
