const { createHash, randomUUID } = require('node:crypto')
const { HttpError } = require('../utils/response')

const partNames = {
  shoulder: ['肩部', '肩'], chest: ['胸部', '胸'],
  back: ['背部', '背'], arms: ['手臂', '臂'],
  abs: ['腹部', '腹'], legs: ['腿部', '腿']
}

function iso(value) {
  return value ? value.replace(/(\.\d{3})\d{3}Z$/, '$1Z') : null
}

function summary(row) {
  return {
    id: row.id, planDate: row.plan_date, date: row.plan_date,
    name: row.name, durationMinutes: row.duration_minutes,
    duration: row.duration_minutes, status: row.status, version: row.version,
    createdAt: iso(row.created_at), updatedAt: iso(row.updated_at),
    completedAt: iso(row.completed_at)
  }
}

function presentItem(row) {
  return {
    id: row.id, exerciseId: row.exercise_id, sortOrder: row.sort_order,
    sets: row.sets, reps: row.reps,
    weight: row.weight === null ? null : Number(row.weight),
    restSeconds: row.rest_seconds, notes: row.notes,
    createdAt: iso(row.created_at), updatedAt: iso(row.updated_at),
    exercise: {
      id: row.exercise_id, name: row.exercise_name,
      category: row.exercise_category, bodyPart: row.exercise_category,
      muscleGroup: row.exercise_muscle_group,
      equipment: row.exercise_equipment,
      isSystem: Boolean(row.exercise_is_system),
      archived: Boolean(row.exercise_deleted_at)
    }
  }
}

function generatedName(items, exercisesById) {
  const categories = []
  for (const item of items) {
    const category = exercisesById.get(item.exerciseId).category
    if (!categories.includes(category)) categories.push(category)
  }
  if (categories.length === 0) return '今日训练'
  if (categories.length === 1) return partNames[categories[0]][0] + '训练'
  return categories.map((category) => partNames[category][1]).join('') + '训练'
}

function createTrainingPlansService(options = {}) {
  const repository = options.trainingPlansRepository || require('../repositories/trainingPlans')
  const exercisesRepository = options.exercisesRepository || require('../repositories/exercises')
  const usersRepository = options.usersRepository || require('../repositories/users')

  async function requireActiveUser(userId) {
    if (!await usersRepository.findActiveById(userId)) {
      throw new HttpError(401, 'UNAUTHORIZED', '登录已失效，请重新登录')
    }
  }

  async function requireExercises(userId, items) {
    const byId = new Map()
    for (const item of items) {
      if (byId.has(item.exerciseId)) continue
      const exercise = await exercisesRepository.findVisibleById(userId, item.exerciseId)
      if (!exercise) {
        throw new HttpError(422, 'EXERCISE_UNAVAILABLE', '动作不存在或不可用于当前用户')
      }
      byId.set(item.exerciseId, exercise)
    }
    return byId
  }

  async function detail(userId, row) {
    const items = await repository.listExercises(userId, row.id)
    return { ...summary(row), exercises: items.map(presentItem) }
  }

  return {
    async list(userId, filters) {
      await requireActiveUser(userId)
      const { rows, total } = await repository.list(userId, filters)
      const items = filters.date
        ? await Promise.all(rows.map((row) => detail(userId, row)))
        : rows.map(summary)
      return {
        items, page: filters.page, pageSize: filters.pageSize,
        total, hasMore: filters.page * filters.pageSize < total
      }
    },
    async get(userId, id) {
      await requireActiveUser(userId)
      const row = await repository.findOwnedById(userId, id)
      if (!row) throw new HttpError(404, 'NOT_FOUND', '训练计划不存在')
      return detail(userId, row)
    },
    async create(userId, input) {
      await requireActiveUser(userId)
      const sorted = [...input.exercises].sort((a, b) => a.sortOrder - b.sortOrder)
      const payload = {
        planDate: input.planDate, name: input.name,
        durationMinutes: input.durationMinutes, exercises: sorted
      }
      const requestHash = createHash('sha256').update(JSON.stringify(payload)).digest('hex')
      if (input.idempotencyKey) {
        const prior = await repository.findByIdempotencyKey(userId, input.idempotencyKey)
        if (prior) {
          if (prior.deleted_at || prior.request_hash !== requestHash) {
            throw new HttpError(409, 'CONFLICT', '幂等键已用于其他计划')
          }
          return { plan: await detail(userId, prior), created: false }
        }
      }
      const byId = await requireExercises(userId, sorted)
      const record = {
        id: randomUUID(), userId, planDate: input.planDate,
        name: input.name || generatedName(sorted, byId),
        durationMinutes: input.durationMinutes ?? Math.max(20, sorted.length * 8),
        idempotencyKey: input.idempotencyKey, requestHash
      }
      const items = sorted.map((item) => ({ ...item, id: randomUUID() }))
      try {
        await repository.create(record, items)
      } catch (error) {
        if (error.code !== 'ER_DUP_ENTRY') throw error
        if (input.idempotencyKey) {
          const prior = await repository.findByIdempotencyKey(userId, input.idempotencyKey)
          if (prior) {
            if (prior.deleted_at || prior.request_hash !== requestHash) {
              throw new HttpError(409, 'CONFLICT', '幂等键已用于其他计划')
            }
            return { plan: await detail(userId, prior), created: false }
          }
        }
        throw new HttpError(409, 'PLAN_DATE_CONFLICT', '该日期已有训练计划')
      }
      return {
        plan: await detail(userId, await repository.findOwnedById(userId, record.id)),
        created: true
      }
    },
    async update(userId, id, input) {
      await requireActiveUser(userId)
      const current = await repository.findOwnedById(userId, id)
      if (!current) throw new HttpError(404, 'NOT_FOUND', '训练计划不存在')
      if (current.status !== 'draft') {
        throw new HttpError(422, 'BUSINESS_RULE_ERROR', '已完成计划不可在此接口修改')
      }
      if (current.version !== input.version) {
        throw new HttpError(409, 'PLAN_VERSION_CONFLICT', '训练计划版本冲突，请重新获取')
      }
      const sorted = [...input.exercises].sort((a, b) => a.sortOrder - b.sortOrder)
      const byId = await requireExercises(userId, sorted)
      const record = {
        planDate: input.planDate,
        name: input.name || generatedName(sorted, byId),
        durationMinutes: input.durationMinutes ?? Math.max(20, sorted.length * 8)
      }
      const items = sorted.map((item) => ({ ...item, id: randomUUID() }))
      try {
        if (!await repository.update(userId, id, input.version, record, items)) {
          throw new HttpError(409, 'PLAN_VERSION_CONFLICT', '训练计划版本冲突，请重新获取')
        }
      } catch (error) {
        if (error.code === 'ER_DUP_ENTRY') {
          throw new HttpError(409, 'PLAN_DATE_CONFLICT', '该日期已有训练计划')
        }
        throw error
      }
      return detail(userId, await repository.findOwnedById(userId, id))
    },
    async remove(userId, id) {
      await requireActiveUser(userId)
      const current = await repository.findOwnedById(userId, id)
      if (!current) throw new HttpError(404, 'NOT_FOUND', '训练计划不存在')
      if (!await repository.softDelete(userId, id, current.version)) {
        throw new HttpError(409, 'PLAN_VERSION_CONFLICT', '训练计划版本冲突，请重新获取')
      }
      return { id, deleted: true }
    }
  }
}

module.exports = {
  createTrainingPlansService,
  presentTrainingPlan: summary,
  presentTrainingPlanExercise: presentItem
}
