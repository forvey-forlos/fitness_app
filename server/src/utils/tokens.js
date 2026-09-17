const { createHash, randomBytes, randomUUID } = require('node:crypto')
const jwt = require('jsonwebtoken')

function createAccessToken(userId, config) {
  return jwt.sign({}, config.accessSecret, {
    algorithm: 'HS256',
    subject: userId,
    expiresIn: config.accessTtl,
    jwtid: randomUUID()
  })
}

function createRefreshToken() {
  return randomBytes(48).toString('base64url')
}

function hashRefreshToken(token) {
  return createHash('sha256').update(token, 'utf8').digest()
}

module.exports = { createAccessToken, createRefreshToken, hashRefreshToken }
