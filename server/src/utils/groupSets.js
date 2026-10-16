function readJson(value, fallback) {
  if (value === null || value === undefined) return fallback
  if (typeof value === 'object') return value
  try { return JSON.parse(value) } catch { return fallback }
}

function count(group) { return group?.set_count ?? 1 }
function total(groups) { return groups.reduce((sum, group) => sum + count(group), 0) }
function legacyPlanned(groups, sets, targetMetrics) {
  const parsed = readJson(groups, null)
  if (Array.isArray(parsed) && parsed.length) return parsed
  return [{ set_count: Number(sets) || 1, values: readJson(targetMetrics, {}) }]
}
function legacyActual(groups) {
  const parsed = readJson(groups, [])
  return Array.isArray(parsed) ? parsed.map(group => ({ ...group, set_count: count(group) })) : []
}
module.exports = { readJson, count, total, legacyPlanned, legacyActual }
