const { randomUUID } = require('node:crypto')
const { HttpError } = require('../utils/response')

function createWechatBindingsService(options = {}) {
  const repository = options.wechatAccountsRepository || require('../repositories/wechatAccounts')
  const usersRepository = options.usersRepository || require('../repositories/users')
  const config = options.wechatConfig || require('../config/wechat').getWechatConfig()
  const exchange = options.exchangeCode || require('../utils/wechatClient').exchangeCode
  const createId = options.createId || randomUUID
  return {
    async status(userId) {
      const account = await repository.findByUserAndApp(userId, config.appId)
      return { bound: Boolean(account), boundAt: account?.created_at || null }
    },
    async bind(userId, { code }) {
      const user = await usersRepository.findActiveById(userId)
      if (!user) throw new HttpError(401, 'UNAUTHORIZED', '登录已失效，请重新登录')
      const identity = await exchange(code, config)
      const owner = await repository.findByOpenId(config.appId, identity.openId)
      if (owner && owner.user_id !== userId) {
        throw new HttpError(409, 'WECHAT_ALREADY_BOUND', '该微信账号已绑定其他账户')
      }
      const current = await repository.findByUserAndApp(userId, config.appId)
      if (current) {
        if (owner?.user_id === userId) return { bound: true, boundAt: current.created_at }
        throw new HttpError(409, 'WECHAT_BINDING_CONFLICT', '当前账户已绑定其他微信账号')
      }
      await repository.bind({ id: createId(), userId, appId: config.appId,
        openId: identity.openId, unionId: identity.unionId })
      return this.status(userId)
    },
    async unbind(userId) {
      const user = await usersRepository.findActiveById(userId)
      if (!user) throw new HttpError(401, 'UNAUTHORIZED', '登录已失效，请重新登录')
      if (!user.password_hash) {
        throw new HttpError(409, 'LAST_LOGIN_METHOD', '当前仅能通过微信登录，暂不能解绑')
      }
      await repository.remove(userId, config.appId)
      return { bound: false, boundAt: null }
    }
  }
}

module.exports = { createWechatBindingsService }
