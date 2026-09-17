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

复制项目根目录的 `.env.example` 为 `.env.local`，把 `VITE_API_BASE_URL` 改成真实 Sealos HTTPS 域名，不带 `/api/v1`，例如：

```dotenv
VITE_API_BASE_URL=https://your-service.sealos.run
```

`.env.local` 已由 `*.local` 忽略。修改后重启 HBuilderX/Vite。微信小程序发布前，还需在微信平台配置该 HTTPS request 合法域名。

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

## 目前不是全部已联通

当前 `server` 只实现 `GET /api/v1/health` 和 `GET /api/v1/training-plans` 测试列表。只有 `getTrainingPlans()` 对应一个已有业务接口；其余函数是后续接口位置的占位契约。当前 Vue 页面仍使用本地 `uni.setStorageSync`，本次不改变其运行行为。

建议先配置域名并调用 `getTrainingPlans()` 验证网络，再按认证 → 动作/身体 → 训练 → 首页顺序迁移。正式上线前还需实现 Access Token 过期刷新、401 处理、Refresh Token 安全存储；不要把密码写入本地存储。
