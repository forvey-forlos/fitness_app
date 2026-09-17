const repository = require('../repositories/trainingPlans')

async function listPlans() {
  return repository.findAll()
}

module.exports = { listPlans }
