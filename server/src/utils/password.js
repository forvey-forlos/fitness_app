const bcrypt = require('bcryptjs')

const BCRYPT_ROUNDS = 12

async function hashPassword(password) {
  return bcrypt.hash(password, BCRYPT_ROUNDS)
}

module.exports = { hashPassword }
