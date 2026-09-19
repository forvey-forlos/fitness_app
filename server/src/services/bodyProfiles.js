const { HttpError } = require('../utils/response')

const fields = [
  ['height', 'height'], ['weight', 'weight'], ['waist', 'waist'],
  ['chest', 'chest'], ['hip', 'hip'], ['shoulderWidth', 'shoulder_width'],
  ['thigh', 'thigh'], ['upperArm', 'upper_arm'], ['calf', 'calf']
]

function toIso(value) {
  return value ? value.replace(/(\.\d{3})\d{3}Z$/, '$1Z') : null
}

function present(row) {
  const data = {}
  for (const [publicName, column] of fields) {
    data[publicName] = row && row[column] !== null ? Number(row[column]) : null
  }
  data.bmi = data.height !== null && data.weight !== null
    ? Math.round(data.weight / ((data.height / 100) ** 2) * 10) / 10 : null
  data.version = row ? row.version : 0
  data.createdAt = row ? toIso(row.created_at) : null
  data.updatedAt = row ? toIso(row.updated_at) : null
  return data
}

function createBodyProfilesService(options = {}) {
  const repository = options.bodyProfilesRepository || require('../repositories/bodyProfiles')
  const usersRepository = options.usersRepository || require('../repositories/users')
  async function requireActiveUser(userId) {
    if (!await usersRepository.findActiveById(userId)) {
      throw new HttpError(401, 'UNAUTHORIZED', '登录已失效，请重新登录')
    }
  }
  return {
    async getProfile(userId) {
      await requireActiveUser(userId)
      return present(await repository.findByUserId(userId))
    },
    async putProfile(userId, input) {
      await requireActiveUser(userId)
      const values = fields.map(([publicName]) => input[publicName])
      try {
        if (input.version === 0) {
          await repository.create(userId, values)
        } else if (!await repository.update(userId, input.version, values)) {
          throw new HttpError(409, 'VERSION_CONFLICT', '身体档案版本冲突，请重新获取')
        }
      } catch (error) {
        if (error.code === 'ER_DUP_ENTRY') {
          throw new HttpError(409, 'VERSION_CONFLICT', '身体档案版本冲突，请重新获取')
        }
        throw error
      }
      return present(await repository.findByUserId(userId))
    }
  }
}

module.exports = { createBodyProfilesService, presentBodyProfile: present }
