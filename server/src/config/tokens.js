function parseTtl(value, name, fallback) {
  const ttl = Number(value === undefined ? fallback : value)
  if (!Number.isSafeInteger(ttl) || ttl <= 0 || ttl > 31536000) {
    throw new Error(`${name} must be a positive integer number of seconds (max 31536000)`)
  }
  return ttl
}

function getTokenConfig() {
  const accessSecret = process.env.JWT_ACCESS_SECRET
  if (typeof accessSecret !== 'string' || Buffer.byteLength(accessSecret, 'utf8') < 32) {
    throw new Error('JWT_ACCESS_SECRET must be set to at least 32 UTF-8 bytes')
  }

  return {
    accessSecret,
    accessTtl: parseTtl(process.env.ACCESS_TOKEN_TTL, 'ACCESS_TOKEN_TTL', 1800),
    refreshTtl: parseTtl(process.env.REFRESH_TOKEN_TTL, 'REFRESH_TOKEN_TTL', 2592000)
  }
}

module.exports = { getTokenConfig }
