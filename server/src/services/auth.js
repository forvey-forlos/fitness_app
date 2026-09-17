const { randomUUID } = require('node:crypto')
const { HttpError } = require('../utils/response')

function usernameExistsError() {
  return new HttpError(409, 'USERNAME_ALREADY_EXISTS', '用户名已被注册')
}

function invalidCredentialsError() {
  return new HttpError(401, 'INVALID_CREDENTIALS', '用户名或密码错误')
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
    },

    async login({ usernameNormalized, password, deviceId, platform }) {
      const user = await usersRepository.findForLogin(usernameNormalized)
      const eligible = Boolean(user && user.status === 'active' && user.deleted_at === null)
      const validPassword = await passwordHasher.verifyPassword(
        password, eligible ? user.password_hash : null
      )
      if (!eligible || !validPassword) throw invalidCredentialsError()

      const tokenConfig = options.tokenConfig || require('../config/tokens').getTokenConfig()
      const tokenUtils = options.tokenUtils || require('../utils/tokens')
      const refreshTokensRepository = options.refreshTokensRepository ||
        require('../repositories/refreshTokens')

      const accessToken = tokenUtils.createAccessToken(user.id, tokenConfig)
      const refreshToken = tokenUtils.createRefreshToken()
      const tokenHash = tokenUtils.hashRefreshToken(refreshToken)

      await refreshTokensRepository.create({
        id: createId(),
        userId: user.id,
        tokenHash,
        deviceId,
        platform,
        expiresAt: new Date(Date.now() + tokenConfig.refreshTtl * 1000)
      })

      return {
        user: {
          id: user.id,
          username: user.username,
          avatarUrl: user.avatar_url,
          timezone: user.timezone
        },
        accessToken,
        accessTokenExpiresIn: tokenConfig.accessTtl,
        refreshToken,
        refreshTokenExpiresIn: tokenConfig.refreshTtl
      }
    },

    async refresh({ refreshToken, deviceId }) {
      const tokenConfig = options.tokenConfig || require('../config/tokens').getTokenConfig()
      const tokenUtils = options.tokenUtils || require('../utils/tokens')
      const repository = options.refreshTokensRepository || require('../repositories/refreshTokens')
      const oldHash = tokenUtils.hashRefreshToken(refreshToken)
      const nextRefreshToken = tokenUtils.createRefreshToken()
      const nextHash = tokenUtils.hashRefreshToken(nextRefreshToken)
      let accessToken

      await repository.withLockedToken(oldHash, async (transaction) => {
        const old = transaction.token
        if (!old) throw new HttpError(401, 'UNAUTHORIZED', 'Refresh Token 无效')
        if (old.rotated_at) throw new HttpError(401, 'TOKEN_REUSED', 'Refresh Token 已被使用')
        if (old.revoked_at) throw new HttpError(401, 'UNAUTHORIZED', 'Refresh Token 已撤销')
        if (old.expired) throw new HttpError(401, 'TOKEN_EXPIRED', 'Refresh Token 已过期')
        if (old.user_status !== 'active' || old.user_deleted_at !== null) {
          throw new HttpError(401, 'UNAUTHORIZED', '用户已失效')
        }
        if (deviceId && old.device_id && deviceId !== old.device_id) {
          throw new HttpError(401, 'UNAUTHORIZED', '设备不匹配')
        }

        accessToken = tokenUtils.createAccessToken(old.user_id, tokenConfig)
        const rotated = await transaction.markRotated(old.id)
        if (!rotated) throw new HttpError(401, 'TOKEN_REUSED', 'Refresh Token 已被使用')
        await transaction.insertSuccessor({
          id: createId(),
          userId: old.user_id,
          tokenHash: nextHash,
          deviceId: deviceId || old.device_id,
          platform: old.platform,
          expiresAt: new Date(Date.now() + tokenConfig.refreshTtl * 1000)
        }, old.id)
      })

      return {
        accessToken,
        accessTokenExpiresIn: tokenConfig.accessTtl,
        refreshToken: nextRefreshToken,
        refreshTokenExpiresIn: tokenConfig.refreshTtl
      }
    },

    async logout({ refreshToken }) {
      const tokenUtils = options.tokenUtils || require('../utils/tokens')
      const repository = options.refreshTokensRepository || require('../repositories/refreshTokens')
      await repository.revokeByHash(tokenUtils.hashRefreshToken(refreshToken))
    }
  }
}

module.exports = { createAuthService }
