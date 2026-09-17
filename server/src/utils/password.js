const bcrypt = require('bcryptjs')

const BCRYPT_ROUNDS = 12
// A hash of a public dummy value; used only to balance failed-login timing.
const DUMMY_HASH = '$2b$12$qO8FGDhVU5JO6qQUebitsemR9DnBGP4e.KSukSgx2ooWO5tOprRjq'

async function hashPassword(password) {
  return bcrypt.hash(password, BCRYPT_ROUNDS)
}

async function verifyPassword(password, hash) {
  return bcrypt.compare(password, hash || DUMMY_HASH)
}

module.exports = { hashPassword, verifyPassword }
