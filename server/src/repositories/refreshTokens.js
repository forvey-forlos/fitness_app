function createRefreshTokensRepository(pool) {
  return {
    async create(token) {
      await pool.execute(
        `INSERT INTO refresh_tokens
          (id, user_id, token_hash, device_id, platform, expires_at,
           rotated_from_token_id, rotated_at, revoked_at, created_at)
         VALUES (?, ?, ?, ?, ?, ?, NULL, NULL, NULL, UTC_TIMESTAMP(3))`,
        [token.id, token.userId, token.tokenHash, token.deviceId, token.platform,
          token.expiresAt.toISOString().slice(0, 23).replace('T', ' ')]
      )
    }
  }
}

async function create(token) {
  return createRefreshTokensRepository(require('../config/db')).create(token)
}

module.exports = { create, createRefreshTokensRepository }
