import { request, withQuery } from './request'

/** 首页聚合；默认不传 date/timezone，由后端按登录用户时区确定今天。 */
export function getHomeSummary({ date, timezone } = {}) {
  return request({ url: withQuery('/api/v1/home/summary', { date, timezone }) })
}
