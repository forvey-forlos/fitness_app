const { createHash, randomUUID } = require('node:crypto')
const { HttpError } = require('../utils/response')
const { localDate, shiftDate, startOfLocalDate, sqlUtc, readUtc } = require('../utils/bodyTime')

function presentSession(row) {
  return {
    id: row.id, trainingPlanId: row.training_plan_id,
    planDate: row.plan_date, date: row.plan_date,
    planNameSnapshot: row.plan_name_snapshot, title: row.plan_name_snapshot,
    startedAt: readUtc(row.started_at), completedAt: readUtc(row.completed_at),
    durationMinutes: row.duration_minutes, duration: row.duration_minutes,
    status: 'completed', version: row.version, planVersion: row.plan_version,
    createdAt: readUtc(row.created_at)
  }
}

function presentExercise(row) {
  return {
    id: row.id, exerciseId: row.exercise_id,
    exerciseNameSnapshot: row.exercise_name_snapshot,
    categorySnapshot: row.category_snapshot,
    muscleGroupSnapshot: row.muscle_group_snapshot,
    equipmentSnapshot: row.equipment_snapshot,
    sortOrder: row.sort_order, sets: row.sets, reps: row.reps,
    weight: row.weight === null ? null : Number(row.weight),
    restSeconds: row.rest_seconds, notes: row.notes
  }
}

function mondayOf(date) {
  const weekday = new Date(date + 'T00:00:00.000Z').getUTCDay()
  return shiftDate(date, 1 - (weekday || 7))
}

function createTrainingSessionsService(options = {}) {
  const repository = options.trainingSessionsRepository || require('../repositories/trainingSessions')
  const usersRepository = options.usersRepository || require('../repositories/users')
  const now = options.now || (() => new Date())

  async function activeUser(userId) {
    const user = await usersRepository.findActiveById(userId)
    if (!user) throw new HttpError(401, 'UNAUTHORIZED', '登录已失效，请重新登录')
    return user
  }

  async function detail(userId, id) {
    const row = await repository.findOwnedById(userId, id)
    if (!row) throw new HttpError(404, 'NOT_FOUND', '训练历史不存在')
    const exercises = await repository.listExercises(userId, id)
    return { ...presentSession(row), exercises: exercises.map(presentExercise) }
  }

  async function weekly(userId, user, requestedWeekStart) {
    const timezone = user.timezone || 'Asia/Shanghai'
    const weekStart = requestedWeekStart || mondayOf(localDate(now(), timezone))
    const weekEnd = shiftDate(weekStart, 6)
    const startUtc = sqlUtc(startOfLocalDate(weekStart, timezone))
    const endUtc = sqlUtc(startOfLocalDate(shiftDate(weekStart, 7), timezone))
    const records = await repository.listCompletedInRange(userId, startUtc, endUtc)
    const byDate = new Map()
    for (const record of records) {
      const date = localDate(new Date(readUtc(record.completed_at)), timezone)
      if (!byDate.has(date)) byDate.set(date, record.id)
    }
    const days = Array.from({ length: 7 }, (_, index) => {
      const date = shiftDate(weekStart, index)
      return { date, weekday: index + 1, completed: byDate.has(date), recordId: byDate.get(date) || null }
    })
    return { weekStart, weekEnd, completedCount: days.filter((day) => day.completed).length, days }
  }

  async function replay(userId, planId, key, hash, prior, user) {
    if (prior.training_plan_id !== planId || prior.request_hash !== hash) {
      throw new HttpError(409, 'IDEMPOTENCY_CONFLICT', '幂等键已用于不同的完成请求')
    }
    const record = await detail(userId, prior.id)
    const plan = {
      id: planId, date: record.planDate, name: record.planNameSnapshot,
      status: 'completed', version: record.planVersion, completedAt: record.completedAt
    }
    return { plan, trainingRecord: record, weeklyStats: await weekly(userId, user) }
  }

  return {
    async complete(userId, planId, input) {
      const user = await activeUser(userId)
      const hash = createHash('sha256').update(JSON.stringify({
        planId, version: input.version, startedAt: input.startedAt,
        completedAt: input.completedAt
      })).digest('hex')
      const prior = await repository.findByKey(userId, input.idempotencyKey)
      if (prior) return replay(userId, planId, input.idempotencyKey, hash, prior, user)
      const completedAt = input.completedAt || now().toISOString()
      const startedAt = input.startedAt || null
      const recordId = randomUUID()
      let result
      try {
        result = await repository.withTransaction(async (tx) => {
          const plan = await tx.lockPlan(userId, planId)
          if (!plan || plan.deleted_at) throw new HttpError(404, 'NOT_FOUND', '训练计划不存在')
          if (plan.status === 'completed') {
            const completed = await tx.findByPlan(userId, planId)
            if (completed && completed.idempotency_key === input.idempotencyKey) {
              return { duplicate: completed }
            }
            throw new HttpError(409, 'TRAINING_ALREADY_COMPLETED', '训练计划已完成')
          }
          if (plan.version !== input.version) {
            throw new HttpError(409, 'PLAN_VERSION_CONFLICT', '训练计划版本冲突，请重新获取')
          }
          const items = await tx.listPlanExercises(userId, planId)
          if (!items.length) {
            throw new HttpError(422, 'BUSINESS_RULE_ERROR', '训练计划至少需要一个动作才能完成')
          }
          const planSnapshot = { ...plan }
          await tx.insertSession({
            id: recordId, userId, planId, planDate: plan.plan_date,
            name: plan.name, durationMinutes: plan.duration_minutes,
            planVersion: plan.version + 1,
            startedAt: startedAt ? sqlUtc(startedAt) : null,
            completedAt: sqlUtc(completedAt), key: input.idempotencyKey, hash
          })
          await tx.insertExercises(recordId, items.map((item) => ({ ...item, id: randomUUID() })))
          if (!await tx.markCompleted(userId, planId, plan.version, sqlUtc(completedAt))) {
            throw new HttpError(409, 'PLAN_VERSION_CONFLICT', '训练计划版本冲突，请重新获取')
          }
          return { plan: planSnapshot, recordId }
        })
      } catch (error) {
        if (error.code !== 'ER_DUP_ENTRY') throw error
        const existing = await repository.findByKey(userId, input.idempotencyKey)
        if (existing) return replay(userId, planId, input.idempotencyKey, hash, existing, user)
        throw new HttpError(409, 'TRAINING_ALREADY_COMPLETED', '训练计划已完成')
      }
      if (result.duplicate) {
        return replay(userId, planId, input.idempotencyKey, hash, result.duplicate, user)
      }
      const record = await detail(userId, result.recordId)
      return {
        plan: {
          id: planId, date: result.plan.plan_date, name: result.plan.name,
          status: 'completed', version: result.plan.version + 1,
          completedAt: readUtc(completedAt)
        },
        trainingRecord: record,
        weeklyStats: await weekly(userId, user)
      }
    },
    async list(userId, filters) {
      const user = await activeUser(userId)
      const timezone = user.timezone || 'Asia/Shanghai'
      const { rows, total } = await repository.list(userId, {
        page: filters.page, pageSize: filters.pageSize,
        startUtc: filters.startDate ? sqlUtc(startOfLocalDate(filters.startDate, timezone)) : null,
        endUtc: filters.endDate ? sqlUtc(startOfLocalDate(shiftDate(filters.endDate, 1), timezone)) : null
      })
      return {
        items: rows.map(presentSession), page: filters.page, pageSize: filters.pageSize,
        total, hasMore: filters.page * filters.pageSize < total
      }
    },
    async get(userId, id) {
      await activeUser(userId)
      return detail(userId, id)
    },
    async weekly(userId, weekStart, requestedTimezone) {
      const user = await activeUser(userId)
      if (requestedTimezone && requestedTimezone !== (user.timezone || 'Asia/Shanghai')) {
        throw new HttpError(400, 'VALIDATION_ERROR', '时区必须与当前用户资料一致')
      }
      return weekly(userId, user, weekStart)
    },
    weeklyForUser: weekly
  }
}

module.exports = { createTrainingSessionsService }
