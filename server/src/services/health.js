const repository = require('../repositories/health')

async function checkDatabase() {
  return repository.checkDatabase()
}

module.exports = { checkDatabase }
