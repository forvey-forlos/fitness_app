const { sendSuccess } = require('../utils/response')

function createUsersController(service) {
  return {
    async me(req, res) {
      const userService = service || require('../services/users').createUsersService()
      const user = await userService.getCurrentUser(req.userId)
      sendSuccess(res, user)
    }
  }
}

module.exports = createUsersController
