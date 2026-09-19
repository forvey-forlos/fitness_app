const { createHash, randomUUID } = require('node:crypto')
const { HttpError } = require('../utils/response')
const { localDate, shiftDate, startOfLocalDate, readUtc } = require('../utils/bodyTime')
const { metrics } = require('../validators/bodyMeasurements')

const columns = {
  weight: 'weight', waist: 'waist', chest: 'chest', hip: 'hip',
  shoulderWidth: 'shoulder_width', thigh: 'thigh', upperArm: 'upper_arm', calf: 'calf'
}

function present(row) {
  const data = { id: row.id, measuredAt: readUtc(row.measured_at) }
  for (const key of metrics) data[key] = row[columns[key]] === null ? null : Number(row[columns[key]])
  return {
    ...data, version: row.version,
    createdAt: readUtc(row.created_at), updatedAt: readUtc(row.updated_at)
  }
}

function notFound() {
  return new HttpError(404, 'NOT_FOUND', '测量记录不存在')
}

function conflict() {
  return new HttpError(409, 'VERSION_CONFLICT', '测量记录版本冲突，请重新获取')
}

function createBodyMeasurementsService(options = {}) {
  const repository = options.bodyMeasurementsRepository || require('../repositories/bodyMeasurements')
  const usersRepository = options.usersRepository || require('../repositories/users')
  const now = options.now || (() => new Date())

  async function activeUser(userId) {
    const user = await usersRepository.findActiveById(userId)
    if (!user) throw new HttpError(401, 'UNAUTHORIZED', '登录已失效，请重新登录')
    return user
  }

  async function weightTrendForUser(userId, user, range) {
    const today = localDate(now(), user.timezone)
    let first
    let endDate
    if (range === 'week') {
      first = shiftDate(today, -6)
      endDate = shiftDate(today, 1)
    } else {
      const [year, month] = today.split('-').map(Number)
      first = new Date(Date.UTC(year, month - 6, 1)).toISOString().slice(0, 10)
      endDate = new Date(Date.UTC(year, month, 1)).toISOString().slice(0, 10)
    }
    const rows = await repository.listWeights(
      userId, startOfLocalDate(first, user.timezone),
      startOfLocalDate(endDate, user.timezone)
    )
    const latestByPeriod = new Map()
    for (const row of rows) {
      const day = localDate(new Date(row.measured_at), user.timezone)
      const period = range === 'week' ? day : day.slice(0, 7)
      latestByPeriod.set(period, {
        date: period, value: Number(row.weight), measuredAt: readUtc(row.measured_at)
      })
    }
    const items = [...latestByPeriod.values()]
    const points = items.map(({ date, value }) => ({ date, value }))
    const current = items.length ? items.at(-1).value : null
    const change = items.length > 1
      ? Math.round((current - items[0].value) * 100) / 100 : null
    return {
      metricKey: 'weight', unit: 'kg',
      granularity: range === 'week' ? 'daily' : 'monthly',
      current, change, points, items
    }
  }

  return {
    async create(userId, input) {
      await activeUser(userId)
      const payload = { measuredAt: input.measuredAt }
      for (const key of metrics) payload[key] = input[key]
      const requestHash = createHash('sha256').update(JSON.stringify(payload)).digest('hex')
      const record = {
        ...payload, id: randomUUID(), userId,
        idempotencyKey: input.idempotencyKey, requestHash
      }
      try {
        await repository.create(record)
      } catch (error) {
        if (error.code !== 'ER_DUP_ENTRY' || !input.idempotencyKey) throw error
        const prior = await repository.findByIdempotencyKey(userId, input.idempotencyKey)
        if (!prior || prior.deleted_at || prior.request_hash !== requestHash) {
          throw new HttpError(409, 'CONFLICT', '幂等键已用于其他测量记录')
        }
        return { measurement: present(prior), created: false }
      }
      return { measurement: present(await repository.findOwnedById(userId, record.id)), created: true }
    },
    async list(userId, query) {
      const user = await activeUser(userId)
      const start = query.startDate ? startOfLocalDate(query.startDate, user.timezone) : null
      const end = query.endDate ? startOfLocalDate(shiftDate(query.endDate, 1), user.timezone) : null
      const { rows, total } = await repository.list(userId, { ...query, start, end })
      return {
        items: rows.map(present), page: query.page, pageSize: query.pageSize,
        total, hasMore: query.page * query.pageSize < total
      }
    },
    async update(userId, id, input) {
      await activeUser(userId)
      if (!await repository.findOwnedById(userId, id)) throw notFound()
      if (!await repository.update(userId, id, input.version, input)) throw conflict()
      return present(await repository.findOwnedById(userId, id))
    },
    async remove(userId, id) {
      await activeUser(userId)
      const current = await repository.findOwnedById(userId, id)
      if (!current) throw notFound()
      if (!await repository.softDelete(userId, id, current.version)) throw conflict()
      return { id, deleted: true }
    },
    async weightTrend(userId, range) {
      const user = await activeUser(userId)
      return weightTrendForUser(userId, user, range)
    },
    weightTrendForUser
  }
}

module.exports = { createBodyMeasurementsService, presentBodyMeasurement: present }
