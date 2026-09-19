const { HttpError } = require('../utils/response')

function createUsersService(options = {}) {
  const repository = options.usersRepository || require('../repositories/users')

  return {
    async getCurrentUser(userId) {
      const user = await repository.findActiveById(userId)
      if (!user) throw new HttpError(401, 'UNAUTHORIZED', '登录已失效，请重新登录')

      return {
        id: user.id,
        username: user.username,
        avatarUrl: user.avatar_url,
        timezone: user.timezone
      }
    },
    async updateCurrentUser(userId, changes) {
      const current = await repository.findActiveById(userId)
      if (!current) throw new HttpError(401, 'UNAUTHORIZED', '登录已失效，请重新登录')
      if (changes.usernameNormalized !== undefined) {
        const match = await repository.findByNormalizedUsername(changes.usernameNormalized)
        if (match && match.id !== userId) {
          throw new HttpError(409, 'USERNAME_ALREADY_EXISTS', '用户名已存在')
        }
      }
      try {
        const updated = await repository.updateProfile(userId, changes)
        if (!updated) throw new HttpError(401, 'UNAUTHORIZED', '登录已失效，请重新登录')
      } catch (error) {
        if (error.code === 'ER_DUP_ENTRY') {
          throw new HttpError(409, 'USERNAME_ALREADY_EXISTS', '用户名已存在')
        }
        throw error
      }
      return this.getCurrentUser(userId)
    }
  }
}

module.exports = { createUsersService }
