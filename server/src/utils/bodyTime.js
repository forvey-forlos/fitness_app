const formatterCache = new Map()

function formatter(timezone) {
  if (!formatterCache.has(timezone)) {
    formatterCache.set(timezone, new Intl.DateTimeFormat('en-CA', {
      timeZone: timezone, year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23'
    }))
  }
  return formatterCache.get(timezone)
}

function localParts(instant, timezone) {
  const parts = Object.fromEntries(formatter(timezone).formatToParts(instant)
    .filter((part) => part.type !== 'literal').map((part) => [part.type, Number(part.value)]))
  return parts
}

function localDate(instant, timezone) {
  const parts = localParts(instant, timezone)
  return [parts.year, String(parts.month).padStart(2, '0'), String(parts.day).padStart(2, '0')].join('-')
}

function validDate(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false
  const date = new Date(value + 'T00:00:00.000Z')
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value
}

function shiftDate(date, days) {
  const value = new Date(date + 'T00:00:00.000Z')
  value.setUTCDate(value.getUTCDate() + days)
  return value.toISOString().slice(0, 10)
}

function startOfLocalDate(date, timezone) {
  const desired = Date.parse(date + 'T00:00:00.000Z')
  let candidate = desired
  for (let attempt = 0; attempt < 4; attempt++) {
    const p = localParts(new Date(candidate), timezone)
    const displayed = Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second)
    const delta = desired - displayed
    if (delta === 0) break
    candidate += delta
  }
  if (localDate(new Date(candidate), timezone) !== date) {
    throw new RangeError('The local date does not exist in the selected timezone')
  }
  return new Date(candidate).toISOString()
}

function sqlUtc(iso) {
  return iso.slice(0, 23).replace('T', ' ')
}

function readUtc(value) {
  return value ? value.replace(/(\.\d{3})\d{3}Z$/, '$1Z') : null
}

module.exports = { localDate, validDate, shiftDate, startOfLocalDate, sqlUtc, readUtc }
