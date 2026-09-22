const { HttpError } = require('../utils/response')

function readArray(value, fallback = []) {
  if (Array.isArray(value)) return value
  if (typeof value === 'string') { try { const parsed = JSON.parse(value); if (Array.isArray(parsed)) return parsed } catch (_) {} }
  return fallback
}

function present(row) {
  const legacyPart = row.category === 'abs' ? 'core' : row.category
  return {
    id: row.id,
    name: row.resolved_name || row.default_display_name_zh || row.name,
    standardName: row.standard_name_en,
    defaultDisplayName: row.default_display_name_zh || row.name,
    personalDisplayName: row.personal_display_name,
    aliases: readArray(row.aliases, []),
    category: row.category, bodyPart: legacyPart, muscleGroup: row.muscle_group,
    equipment: row.equipment, movementType: row.movement_type || 'strength',
    bodyParts: readArray(row.body_parts, [legacyPart]),
    recordMethods: readArray(row.record_methods, ['weight', 'reps']),
    primaryMuscles: readArray(row.primary_muscles, [row.muscle_group]),
    secondaryMuscles: readArray(row.secondary_muscles, []),
    variants: readArray(row.normalized_variants, []),
    sortOrder: Number(row.sort_order || 0), isSystem: true, custom: false,
    inLibrary: Boolean(row.in_library), version: Number(row.preference_version || 0),
    createdAt: row.created_at?.replace(/(\.\d{3})\d{3}Z$/, '$1Z') || null,
    updatedAt: row.updated_at?.replace(/(\.\d{3})\d{3}Z$/, '$1Z') || null
  }
}

function notFound() { return new HttpError(404, 'NOT_FOUND', '系统动作不存在') }

function createExercisesService(options = {}) {
  const repository = options.exercisesRepository || require('../repositories/exercises')
  const usersRepository = options.usersRepository || require('../repositories/users')
  async function requireActiveUser(userId) {
    if (!await usersRepository.findActiveById(userId)) throw new HttpError(401, 'UNAUTHORIZED', '登录已失效，请重新登录')
  }
  async function systemExercise(userId, id) {
    const row = await repository.findVisibleById(userId, id)
    if (!row || !row.is_system) throw notFound()
    return row
  }
  return {
    async list(userId, filters) {
      await requireActiveUser(userId)
      const { rows, total } = await repository.list(userId, filters)
      return { items: rows.map(present), page: filters.page, pageSize: filters.pageSize,
        total, hasMore: filters.page * filters.pageSize < total }
    },
    async get(userId, id) {
      await requireActiveUser(userId)
      return present(await systemExercise(userId, id))
    },
    async create(userId) {
      await requireActiveUser(userId)
      throw new HttpError(405, 'CUSTOM_EXERCISES_DISABLED', '当前版本暂不支持创建全新动作，请从系统动作库添加')
    },
    async addToLibrary(userId, id) {
      await requireActiveUser(userId)
      await systemExercise(userId, id)
      await repository.addToLibrary(userId, id)
      return present(await systemExercise(userId, id))
    },
    async update(userId, id, input) {
      await requireActiveUser(userId)
      const current = await systemExercise(userId, id)
      if (!current.in_library) throw new HttpError(409, 'EXERCISE_NOT_IN_LIBRARY', '请先将动作加入个人动作库')
      if (!await repository.updatePreference(userId, id, input.version, input.displayName, input.displayNameNormalized)) {
        throw new HttpError(409, 'VERSION_CONFLICT', '个人动作名称版本冲突，请重新获取')
      }
      return present(await systemExercise(userId, id))
    },
    async remove(userId, id) {
      await requireActiveUser(userId)
      await systemExercise(userId, id)
      if (!await repository.removeFromLibrary(userId, id)) throw new HttpError(404, 'NOT_FOUND', '动作不在个人动作库中')
      return { id, deleted: true }
    }
  }
}

module.exports = { createExercisesService, presentExercise: present }
