# 前端目录与后端联调导航

项目：`D:\uniapp\my-vue3-project`。本文件只解释 `server/` 之外的前端内容。

## 文件夹与文件各做什么

| 路径 | 意义 |
|---|---|
| `src/api/` | 本次新增的统一请求层和业务接口函数；详见其 README |
| `src/pages/login/login.vue` | 登录表单、协议、记住账户、主题；目前提交仍为本地模拟 |
| `src/pages/register/register.vue` | 注册表单和前端校验；目前提交仍为本地模拟 |
| `src/pages/home/home.vue` | 首页身体数据、今日训练、周圆点、动作库摘要 |
| `src/pages/body-data/body-data.vue` | 身高体重、围度、体成分录入与本地体重历史 |
| `src/pages/action-management/action-management.vue` | 按部位管理动作库 |
| `src/pages/training-plan/training-plan.vue` | 今日部位/动作计划、预期与实际数值、完成提交 |
| `src/pages/training-history/training-history.vue` | 周完成点和历史记录展示 |
| `src/pages/index/index.vue` | uni-app 模板默认页，目前不是启动页 |
| `src/static/` | 页面静态资源，目前主要是模板 logo |
| `src/App.vue` | 应用级生命周期与公共样式入口 |
| `src/main.js` | 创建 Vue/uni-app 实例 |
| `src/pages.json` | 页面路由、启动页、导航栏设置；第一项是登录页 |
| `src/manifest.json` | App/小程序发布配置、AppID 和版本 |
| `src/uni.scss` | uni-app SCSS 默认变量 |
| `src/shime-uni.d.ts`、根目录 `shims-uni.d.ts` | TypeScript/uni-app 类型声明；前者文件名疑似笔误 |
| `docs/backend-api-spec.md` | 已整理的后端接口契约 |
| `docs/frontend-map.md` | 本文件 |
| 根目录 `.env.example` | API 域名示例；复制为不提交的 `.env.local` |
| 根目录 `.gitignore` | Git 忽略规则，包括 `dist`、`node_modules`、`*.local` |
| 根目录 `index.html` | H5 应用 HTML 入口，不是具体业务页 |
| 根目录 `vite.config.js` | Vite/uni-app 编译配置 |
| 根目录 `package.json`、`package-lock.json` | 前端依赖、命令与锁定版本 |
| 根目录 `flora-login-ui.html` | 早期独立登录原型，不参与当前 uni-app 路由 |
| 根目录 `dist/`、`node_modules/` | 构建产物与依赖，不应手工修改 |
| 根目录 `.h5-dev.*.log` | 本地 H5 运行日志 |

## 后端更新后，前端主要看哪里

| 后端修改类型 | 先看 | 再看 |
|---|---|---|
| 域名、前缀、统一响应、鉴权头、超时 | `src/api/request.js`、`.env.local` | 所有请求的错误处理 |
| 登录、注册、Token、协议 | `src/api/auth.js` | 登录/注册页的 `submit()`、协议和本地保存逻辑 |
| 用户资料或主题同步 | `src/api/user.js` | 首页、登录页及其他页面的 `fit_note_theme_index` |
| 身体指标或趋势规则 | `src/api/body.js` | 身体数据页 `editMetric()`、`recordWeight()`；首页 `loadBodyData()`、`makeTrendSeries()` |
| 动作目录或用户动作字段 | `src/api/exercises.js` | 动作管理页 `catalog`、`addFromLibrary()`；训练计划页 `availableParts()`、`addAction()` |
| 训练计划、历史或周统计 | `src/api/training.js` | 训练计划页 `load()`、`persistPlan()`、`completeTraining()`；训练历史页；首页周圆点 |
| 首页聚合数据 | `src/api/home.js` | 首页 `loadBodyData()`、`loadTrainingData()`、`loadActionLibrary()` |
| 页面地址/导航 | `src/pages.json` | 对应页面的 `uni.navigateTo()` 等代码 |
| 微信请求域名/发布配置 | `src/manifest.json` | 微信平台的合法 request 域名设置 |

## 当前本地数据对应关系

| 本地存储键 | 未来接口 |
|---|---|
| `fit_note_remembered_login` | `/auth/login`；当前包含明文密码，接入后必须移除密码 |
| `fit_note_theme_index` | `/users/me/preferences`，可本地优先 |
| `fit_note_body_profile` | `/body/profile`、`/body/measurements` |
| `fit_note_action_library` | `/exercise-catalog`、`/exercises` |
| `fit_note_training_plan` | `/training-plans/{date}` |
| `fit_note_training_history` | `/training-records`、`/training-stats/weekly` |

注意：新增 `src/api/*.js` 不会自动创建后端路由，也不会让页面自动改为请求服务器；下一步必须逐页替换本地读写代码并按真实响应字段联调。根目录的独立 HTML 原型和 `dist/` 也不是应修改的业务源码。
