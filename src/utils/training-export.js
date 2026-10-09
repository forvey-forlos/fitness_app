import { recordMethodName, recordMethodUnit } from '../constants/exercise-meta'

function hasValue(value) {
  return value !== null && value !== undefined && value !== ''
}

function displayValue(method, value) {
  if (!hasValue(value)) return '未记录'
  const unit = recordMethodUnit(method)
  return `${recordMethodName(method)} ${value}${unit ? ` ${unit}` : ''}`
}

function metricSummary(methods, values) {
  return methods.map((method) => displayValue(method, values?.[method])).join(' · ')
}

function actualVolume(action) {
  if (!Array.isArray(action.actualGroups) || !action.actualGroups.length) return null
  let found = false
  const total = action.actualGroups.reduce((sum, group) => {
    if (!hasValue(group?.values?.weight) || !hasValue(group?.values?.reps)) return sum
    const weight = Number(group?.values?.weight)
    const reps = Number(group?.values?.reps)
    if (!Number.isFinite(weight) || !Number.isFinite(reps)) return sum
    found = true
    return sum + weight * reps
  }, 0)
  return found ? Math.round(total * 100) / 100 : null
}

function recordDate(record) {
  return String(record.planDate || record.date || '').slice(0, 10)
}

function recordTitle(record) {
  return String(record.planNameSnapshot || record.title || '未命名训练')
}

function actionName(action, index, includeAction) {
  if (!includeAction) return `动作 ${index + 1}`
  const variant = action.exerciseVariantNameSnapshot ? `（${action.exerciseVariantNameSnapshot}）` : ''
  return `${action.exerciseNameSnapshot || '未命名动作'}${variant}`
}

function markdownRecord(record, options) {
  const lines = [`## ${recordDate(record)} · ${recordTitle(record)}`]
  if (hasValue(record.durationMinutes ?? record.duration)) lines.push(`训练时长：${record.durationMinutes ?? record.duration} 分钟`)
  lines.push('')
  const exercises = Array.isArray(record.exercises) ? record.exercises : []
  exercises.forEach((action, index) => {
    const methods = Array.isArray(action.recordMethods) && action.recordMethods.length ? action.recordMethods : ['weight', 'reps']
    lines.push(`### ${index + 1}. ${actionName(action, index, options.actions)}`)
    if (options.plan) {
      const setText = hasValue(action.sets) ? ` · 预计 ${action.sets} 组` : ''
      lines.push(`- 计划量：${metricSummary(methods, action.targetMetrics || action.target || {})}${setText}`)
    }
    if (options.actual) {
      const groups = Array.isArray(action.actualGroups) ? action.actualGroups : []
      if (groups.length) {
        lines.push('- 实际训练量：')
        groups.forEach((group, groupIndex) => lines.push(`  - 第 ${groupIndex + 1} 组：${metricSummary(methods, group.values || {})}`))
        const volume = actualVolume(action)
        if (volume !== null) lines.push(`  - 重量训练总量：${volume} kg`)
      } else {
        const actual = action.actual || {}
        lines.push(`- 实际训练量：重量 ${actual.kg ?? '未记录'} kg · 次数 ${actual.reps ?? '未记录'} · 组数 ${actual.sets ?? '未记录'}`)
      }
    }
    if (action.notes) lines.push(`- 备注：${action.notes}`)
    lines.push('')
  })
  if (!exercises.length) lines.push('本次训练没有动作数据。', '')
  return lines.join('\n').trim()
}

function textRecord(record, options) {
  const lines = [`${recordDate(record)}  ${recordTitle(record)}`]
  if (hasValue(record.durationMinutes ?? record.duration)) lines.push(`训练时长：${record.durationMinutes ?? record.duration} 分钟`)
  const exercises = Array.isArray(record.exercises) ? record.exercises : []
  exercises.forEach((action, index) => {
    const methods = Array.isArray(action.recordMethods) && action.recordMethods.length ? action.recordMethods : ['weight', 'reps']
    lines.push('', `${index + 1}. ${actionName(action, index, options.actions)}`)
    if (options.plan) {
      const setText = hasValue(action.sets) ? `；预计 ${action.sets} 组` : ''
      lines.push(`   计划量：${metricSummary(methods, action.targetMetrics || action.target || {})}${setText}`)
    }
    if (options.actual) {
      const groups = Array.isArray(action.actualGroups) ? action.actualGroups : []
      if (groups.length) {
        lines.push('   实际训练量：')
        groups.forEach((group, groupIndex) => lines.push(`   第 ${groupIndex + 1} 组：${metricSummary(methods, group.values || {})}`))
        const volume = actualVolume(action)
        if (volume !== null) lines.push(`   重量训练总量：${volume} kg`)
      } else {
        const actual = action.actual || {}
        lines.push(`   实际训练量：重量 ${actual.kg ?? '未记录'} kg；次数 ${actual.reps ?? '未记录'}；组数 ${actual.sets ?? '未记录'}`)
      }
    }
    if (action.notes) lines.push(`   备注：${action.notes}`)
  })
  if (!exercises.length) lines.push('本次训练没有动作数据。')
  return lines.join('\n')
}

export function buildTrainingExport({ format = 'md', nickname = '用户', records = [], include = {} } = {}) {
  const options = { actions: include.actions !== false, plan: include.plan !== false, actual: include.actual !== false }
  const ordered = [...records].sort((a, b) => {
    const dateCompare = recordDate(a).localeCompare(recordDate(b))
    return dateCompare || String(a.completedAt || '').localeCompare(String(b.completedAt || ''))
  })
  const first = `用户昵称：${String(nickname || '用户').trim() || '用户'}`
  const lastRecord = ordered[ordered.length - 1]
  if (format === 'txt') {
    const range = ordered.length ? `${recordDate(ordered[0])} 至 ${recordDate(lastRecord)}` : '未选择'
    return [first, '', 'FityLoop 训练数据导出', `记录范围：${range}`, `训练次数：${ordered.length} 次`, '', ordered.map((record) => textRecord(record, options)).join('\n\n--------------------------------\n\n')].join('\n').trim()
  }
  const range = ordered.length ? `${recordDate(ordered[0])} 至 ${recordDate(lastRecord)}` : '未选择'
  return [first, '', '# FityLoop 训练数据导出', '', `- 记录范围：${range}`, `- 训练次数：${ordered.length} 次`, '', '---', '', ordered.map((record) => markdownRecord(record, options)).join('\n\n---\n\n')].join('\n').trim()
}

export function trainingExportFilename(records, format = 'md') {
  const dates = (Array.isArray(records) ? records : []).map(recordDate).filter(Boolean).sort()
  const lastDate = dates[dates.length - 1]
  const now = new Date()
  const today = [now.getFullYear(), String(now.getMonth() + 1).padStart(2, '0'), String(now.getDate()).padStart(2, '0')].join('-')
  const range = dates.length ? (dates[0] === lastDate ? dates[0] : `${dates[0]}_${lastDate}`) : today
  return `fityloop-training-${range}.${format === 'txt' ? 'txt' : 'md'}`
}

export async function saveTrainingExportFile(filename, content) {
  // #ifdef H5
  const blob = new Blob(['\ufeff', content], { type: 'text/plain;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  link.style.display = 'none'
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  setTimeout(() => URL.revokeObjectURL(url), 1000)
  return { platform: 'h5', savedPath: filename }
  // #endif

  // #ifdef MP-WEIXIN
  const filePath = `${wx.env.USER_DATA_PATH}/${filename}`
  const manager = uni.getFileSystemManager()
  await new Promise((resolve, reject) => manager.writeFile({
    filePath, data: content, encoding: 'utf8', success: resolve,
    fail: (error) => reject(new Error(error?.errMsg || '文件写入失败'))
  }))
  return { platform: 'mp-weixin', savedPath: filePath }
  // #endif

  // #ifdef APP-PLUS
  const savedPath = await new Promise((resolve, reject) => {
    plus.io.requestFileSystem(plus.io.PRIVATE_DOC, (fileSystem) => {
      fileSystem.root.getFile(filename, { create: true }, (entry) => {
        entry.createWriter((writer) => {
          writer.onwrite = () => resolve(entry.toLocalURL())
          writer.onerror = (error) => reject(new Error(error?.message || '文件写入失败'))
          writer.write(content)
        }, reject)
      }, reject)
    }, reject)
  })
  return { platform: 'app', savedPath }
  // #endif

  // #ifndef H5
  // #ifndef MP-WEIXIN
  // #ifndef APP-PLUS
  await new Promise((resolve, reject) => uni.setClipboardData({ data: content, success: resolve, fail: reject }))
  return { platform: 'clipboard', savedPath: '' }
  // #endif
  // #endif
  // #endif
}

export async function shareTrainingExportFile(savedPath, filename) {
  // #ifdef MP-WEIXIN
  await new Promise((resolve, reject) => wx.shareFileMessage({
    filePath: savedPath, fileName: filename, success: resolve,
    fail: (error) => reject(new Error(error?.errMsg || '文件转发失败'))
  }))
  return
  // #endif
  throw new Error('当前平台暂不支持直接转发文件')
}
