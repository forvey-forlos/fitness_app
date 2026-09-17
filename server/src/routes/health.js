const { Router } = require('express')
const createHealthController = require('../controllers/health')

function createHealthRoutes(service) {
  const controller = createHealthController(service)
  const v1 = Router()
  const legacy = Router()

  v1.get('/health', controller.health)
  v1.get('/db-test', controller.database)
  legacy.get('/health', controller.legacyHealth)
  legacy.get('/db-test', controller.legacyDatabase)

  return { v1, legacy }
}

module.exports = createHealthRoutes
