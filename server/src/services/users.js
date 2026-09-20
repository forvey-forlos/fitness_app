const { HttpError } = require('../utils/response')

function createUsersService(options = {}) {
  const repository = options.usersRepository || require('../repositories/users')

  return {
    async getCurrentUser(userId) {
      const user = await repository.findActiveById(userId)
      if (!user) throw new HttpError(401, 'UNAUTHORIZED', '登录已失效，请重新登录')

      const displayName = user.display_name ?? user.username
      return {
        id: user.id,
        username: displayName,
        ...(user.display_name !== undefined ? { displayName } : {}),
        ...(user.account_code !== undefined ? { accountCode: user.account_code } : {}),
        avatarUrl: user.avatar_url,
        timezone: user.timezone
      }
    },
    async updateCurrentUser(userId, changes) {
      const current = await repository.findActiveById(userId)
      if (!current) throw new HttpError(401, 'UNAUTHORIZED', '登录已失效，请重新登录')
      const updated = await repository.updateProfile(userId, changes)
      if (!updated) throw new HttpError(401, 'UNAUTHORIZED', '登录已失效，请重新登录')
      return this.getCurrentUser(userId)
    }
  }
}

module.exports = { createUsersService }
