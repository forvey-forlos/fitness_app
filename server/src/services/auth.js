const { randomUUID } = require('node:crypto')
const { HttpError } = require('../utils/response')

function usernameExistsError() {
  return new HttpError(409, 'USERNAME_ALREADY_EXISTS', '用户名已被注册')
}

function createAuthService(options = {}) {
  const usersRepository = options.usersRepository || require('../repositories/users')
  const passwordHasher = options.passwordHasher || require('../utils/password')
  const createId = options.createId || randomUUID

  return {
    async register({ username, usernameNormalized, password, timezone }) {
      const existing = await usersRepository.findByNormalizedUsername(usernameNormalized)
      if (existing) throw usernameExistsError()

      const user = {
        id: createId(),
        username,
        usernameNormalized,
        passwordHash: await passwordHasher.hashPassword(password),
        timezone,
        status: 'active'
      }

      try {
        await usersRepository.create(user)
      } catch (error) {
        // The unique index is the final guard against simultaneous registrations.
        if (error.code === 'ER_DUP_ENTRY' &&
            error.sqlMessage?.includes('uq_users_username_normalized')) {
          throw usernameExistsError()
        }
        throw error
      }

      return {
        id: user.id,
        username: user.username,
        avatarUrl: null,
        timezone: user.timezone,
        status: user.status
      }
    }
  }
}

module.exports = { createAuthService }
