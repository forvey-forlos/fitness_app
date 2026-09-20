const { randomInt } = require('node:crypto')

const ACCOUNT_CODE_MIN = 10000000
const ACCOUNT_CODE_MAX_EXCLUSIVE = 100000000

function createAccountCode() {
  return String(randomInt(ACCOUNT_CODE_MIN, ACCOUNT_CODE_MAX_EXCLUSIVE))
}

function createInternalUsername(userId) {
  return `u${String(userId).replace(/-/g, '').slice(0, 29)}`
}

module.exports = { createAccountCode, createInternalUsername }
