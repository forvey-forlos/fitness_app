import { request } from './request'
import { getWechatLoginCode } from './wechatAuth'

export function getWechatBindingStatus() {
  return request({ url: '/api/v1/users/me/identities/wechat' })
}

export async function bindWechat() {
  const code = await getWechatLoginCode()
  return request({ url: '/api/v1/users/me/identities/wechat', method: 'POST', data: { code } })
}

export function unbindWechat() {
  return request({ url: '/api/v1/users/me/identities/wechat', method: 'DELETE' })
}
