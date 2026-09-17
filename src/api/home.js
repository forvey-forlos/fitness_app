import { request, withQuery } from './request'

/** 首页卡片聚合：身体摘要、今日计划、周完成点、动作库数量。 */
export function getHomeSummary({ date, timezone = 'Asia/Shanghai' } = {}) {
  return request({ url: withQuery('/api/v1/home/summary', { date, timezone }) })
}
