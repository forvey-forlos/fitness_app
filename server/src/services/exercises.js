const { createHash, randomUUID } = require('node:crypto')
const { HttpError } = require('../utils/response')
const { groupCategory } = require('../validators/exercises')

function present(row) {
  return {
    id: row.id,
    name: row.name,
    category: row.category,
    bodyPart: row.category,
    muscleGroup: row.muscle_group,
    equipment: row.equipment,
    isSystem: Boolean(row.is_system),
    custom: !Boolean(row.is_system),
    version: row.version,
    createdAt: row.created_at.replace(/(\.\d{3})\d{3}Z$/, '$1Z'),
    updatedAt: row.updated_at.replace(/(\.\d{3})\d{3}Z$/, '$1Z')
  }
}

function notFound() {
  return new HttpError(404, 'NOT_FOUND', '动作不存在')
}

function duplicate() {
  return new HttpError(409, 'EXERCISE_ALREADY_EXISTS', '当前训练部位下已存在同名动作')
}

function createExercisesService(options = {}) {
  const repository = options.exercisesRepository || require('../repositories/exercises')
  const usersRepository = options.usersRepository || require('../repositories/users')

  async function requireActiveUser(userId) {
    if (!await usersRepository.findActiveById(userId)) {
      throw new HttpError(401, 'UNAUTHORIZED', '登录已失效，请重新登录')
    }
  }

  async function requireEditable(userId, id) {
    const exercise = await repository.findVisibleById(userId, id)
    if (!exercise) throw notFound()
    if (exercise.is_system) throw new HttpError(403, 'FORBIDDEN', '系统动作不可修改')
    return exercise
  }

  return {
    async list(userId, filters) {
      await requireActiveUser(userId)
      const { rows, total } = await repository.list(userId, filters)
      return {
        items: rows.map(present), page: filters.page, pageSize: filters.pageSize,
        total, hasMore: filters.page * filters.pageSize < total
      }
    },
    async get(userId, id) {
      await requireActiveUser(userId)
      const exercise = await repository.findVisibleById(userId, id)
      if (!exercise) throw notFound()
      return present(exercise)
    },
    async create(userId, input) {
      await requireActiveUser(userId)
      const payload = {
        name: input.name, nameNormalized: input.nameNormalized,
        category: input.category, muscleGroup: input.muscleGroup,
        equipment: input.equipment
      }
      const requestHash = createHash('sha256').update(JSON.stringify(payload)).digest('hex')
      if (input.idempotencyKey) {
        const prior = await repository.findByIdempotencyKey(userId, input.idempotencyKey)
        if (prior) {
          if (prior.deleted_at || prior.request_hash !== requestHash) {
            throw new HttpError(409, 'CONFLICT', '幂等键已用于其他动作')
          }
          return { exercise: present(prior), created: false }
        }
      }
      if (await repository.findByNormalizedName(userId, input.category, input.nameNormalized)) {
        throw duplicate()
      }
      const record = {
        ...payload, id: randomUUID(), ownerUserId: userId,
        idempotencyKey: input.idempotencyKey, requestHash
      }
      try {
        await repository.create(record)
      } catch (error) {
        if (error.code !== 'ER_DUP_ENTRY') throw error
        if (input.idempotencyKey) {
          const prior = await repository.findByIdempotencyKey(userId, input.idempotencyKey)
          if (prior) {
            if (prior.deleted_at || prior.request_hash !== requestHash) {
              throw new HttpError(409, 'CONFLICT', '幂等键已用于其他动作')
            }
            return { exercise: present(prior), created: false }
          }
        }
        throw duplicate()
      }
      return { exercise: present(await repository.findVisibleById(userId, record.id)), created: true }
    },
    async update(userId, id, input) {
      await requireActiveUser(userId)
      const current = await requireEditable(userId, id)
      const category = input.category || current.category
      const muscleGroup = input.muscleGroup || current.muscle_group
      if (groupCategory[muscleGroup] !== category) {
        throw new HttpError(400, 'VALIDATION_ERROR', '目标肌群与训练部位不匹配', [
          { field: 'muscleGroup', message: '目标肌群与训练部位不匹配' }
        ])
      }
      const normalized = input.nameNormalized || current.name_normalized
      if (input.name !== undefined || input.category !== undefined) {
        const match = await repository.findByNormalizedName(userId, category, normalized)
        if (match && match.id !== id) throw duplicate()
      }
      try {
        if (!await repository.update(userId, id, input.version, input)) {
          throw new HttpError(409, 'VERSION_CONFLICT', '动作版本冲突，请重新获取')
        }
      } catch (error) {
        if (error.code === 'ER_DUP_ENTRY') throw duplicate()
        throw error
      }
      return present(await repository.findVisibleById(userId, id))
    },
    async remove(userId, id) {
      await requireActiveUser(userId)
      const current = await requireEditable(userId, id)
      if (!await repository.softDelete(userId, id, current.version)) {
        throw new HttpError(409, 'VERSION_CONFLICT', '动作版本冲突，请重新获取')
      }
      return { id, deleted: true }
    }
  }
}

module.exports = { createExercisesService }
