# src/api：前端接口层

本目录只定义前端如何请求后端，不创建后端路由，也不直接管理页面 UI。所有接口路径依据 [接口规范](../../docs/backend-api-spec.md) 编写。

| 文件 | 负责的接口 |
|---|---|
| `request.js` | 域名、URL 拼接、`uni.request`、Bearer Token、超时、统一响应和错误 |
| `auth.js` | 注册、登录、令牌刷新/退出、协议、找回密码 |
| `user.js` | 用户资料、主题偏好 |
| `body.js` | 身体档案、测量记录和趋势 |
| `exercises.js` | 系统动作目录、用户动作库 |
| `training.js` | 训练计划、完成提交、历史、每周统计 |
| `home.js` | 首页汇总 |

## 配置域名

API 地址不包含 `/api/v1`。项目按 Vite mode 区分环境：

```dotenv
# .env.development（仅本机开发）
VITE_API_BASE_URL=http://localhost:3000

# .env.production（H5、App、微信小程序正式构建）
VITE_API_BASE_URL=https://api.fityloop.com
```

`.env.local` 已由 `*.local` 忽略，可用于开发者自己的本地覆盖。为了避免误发布，`request.js` 在生产构建中固定使用 `https://api.fityloop.com`。修改环境文件后需要重启 HBuilderX/Vite。微信小程序发布前，还需在微信平台配置该 HTTPS request 和 uploadFile 合法域名。

## 返回值约定

`request()` 返回 Promise，把后端 `{ code: 0, message: 'ok', data }` 解包为 `data`。失败会抛出 Error，附带 `statusCode`、`code`、`requestId`、`errors`。页面决定如何 Toast、重试或跳转。

```js
import { getTrainingPlans } from '@/api/training'

try {
  const plans = await getTrainingPlans()
  // plans 就是服务端响应中的 data
} catch (error) {
  uni.showToast({ title: error.message, icon: 'none' })
}
```

## 当前联通范围

注册、普通登录、微信登录、Token 刷新、用户资料、头像、身体数据、动作库、训练计划、训练完成、训练历史、周统计和首页聚合均通过本目录中的统一请求层访问正式后端。训练计划页面允许保存未提交的本地草稿，但正式业务数据仍以后端和 MySQL 为准；不要把密码写入本地存储。
