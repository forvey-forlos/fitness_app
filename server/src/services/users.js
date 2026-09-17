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
    }
  }
}

module.exports = { createUsersService }
