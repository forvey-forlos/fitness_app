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
    },

    async withLockedToken(tokenHash, callback) {
      const connection = await pool.getConnection()
      let inTransaction = false
      try {
        await connection.beginTransaction()
        inTransaction = true
        const [rows] = await connection.execute(
          `SELECT rt.id, rt.user_id, rt.device_id, rt.platform,
                  rt.rotated_at, rt.revoked_at,
                  (rt.expires_at <= UTC_TIMESTAMP(3)) AS expired,
                  u.status AS user_status, u.deleted_at AS user_deleted_at
           FROM refresh_tokens rt JOIN users u ON u.id = rt.user_id
           WHERE rt.token_hash = ? LIMIT 1 FOR UPDATE`,
          [tokenHash]
        )
        const transaction = {
          token: rows[0] || null,
          async markRotated(id) {
            const [result] = await connection.execute(
              `UPDATE refresh_tokens SET rotated_at = UTC_TIMESTAMP(3)
               WHERE id = ? AND rotated_at IS NULL`,
              [id]
            )
            return result.affectedRows === 1
          },
          async insertSuccessor(token, previousId) {
            await connection.execute(
              `INSERT INTO refresh_tokens
                (id, user_id, token_hash, device_id, platform, expires_at,
                 rotated_from_token_id, rotated_at, revoked_at, created_at)
               VALUES (?, ?, ?, ?, ?, ?, ?, NULL, NULL, UTC_TIMESTAMP(3))`,
              [token.id, token.userId, token.tokenHash, token.deviceId, token.platform,
                token.expiresAt.toISOString().slice(0, 23).replace('T', ' '), previousId]
            )
          }
        }
        const result = await callback(transaction)
        await connection.commit()
        inTransaction = false
        return result
      } catch (error) {
        if (inTransaction) await connection.rollback()
        throw error
      } finally {
        connection.release()
      }
    },

    async revokeByHash(tokenHash) {
      await pool.execute(
        `UPDATE refresh_tokens SET revoked_at = UTC_TIMESTAMP(3)
         WHERE token_hash = ? AND revoked_at IS NULL`,
        [tokenHash]
      )
    }
  }
}

async function create(token) {
  return createRefreshTokensRepository(require('../config/db')).create(token)
}

async function withLockedToken(tokenHash, callback) {
  return createRefreshTokensRepository(require('../config/db')).withLockedToken(tokenHash, callback)
}

async function revokeByHash(tokenHash) {
  return createRefreshTokensRepository(require('../config/db')).revokeByHash(tokenHash)
}

module.exports = { create, withLockedToken, revokeByHash, createRefreshTokensRepository }
