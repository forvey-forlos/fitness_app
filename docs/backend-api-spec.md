# FIT NOTE 后端接口需求与联调规范

> 适用项目：`D:\uniapp\my-vue3-project`  
> 前端技术：uni-app + Vue 3 + Vue CLI/Vite，可发布 H5、微信小程序等端  
> 文档版本：v1.0（2026-09-15）  
> 建议 API 前缀：`/api/v1`

## 1. 文档目的

当前项目已完成登录、注册、首页、身体数据、动作管理、训练计划和训练历史的前端原型，业务数据暂时保存在 `uni.setStorageSync`。本文件定义后端需要提供的接口、字段、校验、响应格式和数据表建议，用于把本地模拟数据替换成真实账号数据。

首期后端必须完成：

1. 账号注册、登录、刷新令牌、退出登录。
2. 当前用户资料和主题偏好。
3. 身体指标的当前值及历史记录。
4. 系统动作目录和用户动作库。
5. 每日训练计划草稿、完成提交和训练历史。
6. 首页汇总数据。

## 2. 通用约定

### 2.1 请求地址和协议

- 正式环境必须使用 HTTPS。
- 基础地址示例：`https://api.example.com/api/v1`。
- 请求与响应编码：`UTF-8`。
- 数据格式：`application/json`。
- 时间戳统一使用 ISO 8601 UTC，例如 `2026-09-15T03:20:30.000Z`。
- 业务日期使用用户时区下的 `YYYY-MM-DD`，例如 `2026-09-15`。
- 前端默认时区：`Asia/Shanghai`。
- ID 使用字符串，推荐 UUID/ULID；前端不得依赖自增数字。
- 金额以外的小数通过 JSON number 传输，数据库建议使用 decimal，避免浮点误差。

### 2.2 认证头

```http
Authorization: Bearer <accessToken>
X-Client-Platform: h5 | mp-weixin | app
X-App-Version: 1.0.0
X-Timezone: Asia/Shanghai
```

除注册、登录、刷新令牌、协议读取和忘记密码外，其余接口都需要 Access Token。

### 2.3 统一成功响应

```json
{
  "code": 0,
  "message": "ok",
  "data": {},
  "requestId": "req_01K..."
}
```

列表响应：

```json
{
  "code": 0,
  "message": "ok",
  "data": {
    "items": [],
    "page": 1,
    "pageSize": 20,
    "total": 0,
    "hasMore": false
  },
  "requestId": "req_01K..."
}
```

### 2.4 统一错误响应

```json
{
  "code": "VALIDATION_ERROR",
  "message": "请求参数不合法",
  "errors": [
    { "field": "username", "message": "用户名只能包含数字、英文或汉字，且不能超过 30 个字符" }
  ],
  "requestId": "req_01K..."
}
```

常用 HTTP 状态：

| HTTP | code | 含义 |
|---|---|---|
| 400 | `VALIDATION_ERROR` | 字段校验失败 |
| 401 | `UNAUTHORIZED` | 未登录或 Access Token 失效 |
| 403 | `FORBIDDEN` | 无权限 |
| 404 | `NOT_FOUND` | 数据不存在 |
| 409 | `CONFLICT` | 用户名重复、版本冲突或重复完成 |
| 422 | `BUSINESS_RULE_ERROR` | 不满足业务规则 |
| 429 | `RATE_LIMITED` | 请求过于频繁 |
| 500 | `INTERNAL_ERROR` | 服务端异常 |

### 2.5 幂等和并发

- 所有创建、完成训练、重试敏感接口支持 `Idempotency-Key`。
- 更新接口返回 `version`，后续更新携带 `version` 或 `If-Match`，防止多端覆盖。
- 删除默认软删除。动作被删除后，历史记录中的动作快照必须保留。
- 客户端断网重试时，同一个业务操作必须复用相同的 `Idempotency-Key`。

## 3. 枚举与公共数据结构

### 3.1 训练部位 bodyPart

| 值 | 中文 |
|---|---|
| `shoulder` | 肩部 |
| `chest` | 胸部 |
| `back` | 背部 |
| `arms` | 手臂 |
| `abs` | 腹部 |
| `legs` | 腿部 |

顺序固定为：肩部、胸部、背部、手臂、腹部、腿部。

### 3.2 身体指标 metricKey

| 分类 | metricKey | 中文 | 单位 |
|---|---|---|---|
| 基础 | `height` | 身高 | cm |
| 围度 | `shoulder_width` | 肩宽 | cm |
| 围度 | `chest` | 胸围 | cm |
| 围度 | `waist` | 腰围 | cm |
| 围度 | `hip` | 臀围 | cm |
| 围度 | `upper_arm` | 大臂围 | cm |
| 围度 | `thigh` | 大腿围 | cm |
| 围度 | `calf` | 小腿围 | cm |
| 基础 | `weight` | 体重 | kg |
| 成分 | `body_fat_pct` | 体脂率 | % |
| 成分 | `muscle_pct` | 肌肉率 | % |
| 成分 | `body_water_pct` | 水分率 | % |
| 成分 | `visceral_fat` | 内脏脂肪等级 | level |
| 成分 | `bone_mass` | 骨量 | kg |
| 成分 | `basal_metabolism` | 基础代谢 | kcal |
| 成分 | `protein_pct` | 蛋白质率 | % |
| 成分 | `body_age` | 身体年龄 | year |
| 成分 | `skeletal_muscle_pct` | 骨骼肌率 | % |

首期前端固定要求身高和体重，其他指标由用户自行添加。后端应允许扩展 metricKey，不应把可选指标写死在单列结构中。

### 3.3 训练数值

```json
{
  "kg": 40,
  "reps": 12,
  "sets": 4
}
```

- `kg`：大于等于 0；徒手动作允许为 0。
- `reps`：正整数。
- `sets`：正整数。
- 当前前端判定动作完成的条件：实际 `kg` 已填写且大于等于 0，`reps > 0`，`sets > 0`。

## 4. 接口总览

| 优先级 | 方法 | 路径 | 用途 |
|---|---|---|---|
| P0 | POST | `/auth/register` | 注册 |
| P0 | POST | `/auth/login` | 登录 |
| P0 | POST | `/auth/refresh` | 刷新令牌 |
| P0 | POST | `/auth/logout` | 退出 |
| P1 | POST | `/auth/password/forgot` | 发起找回密码 |
| P1 | POST | `/auth/password/reset` | 重置密码 |
| P0 | GET | `/agreements/current` | 获取当前协议 |
| P0 | GET/PATCH | `/users/me` | 当前用户资料 |
| P1 | GET/PATCH | `/users/me/preferences` | 主题等偏好 |
| P0 | GET | `/body/profile` | 身体数据当前值 |
| P0 | PUT | `/body/profile` | 更新当前身体数据 |
| P0 | POST | `/body/measurements` | 新增单次测量 |
| P0 | GET | `/body/measurements` | 查询趋势数据 |
| P1 | PATCH/DELETE | `/body/measurements/{id}` | 修改或删除测量 |
| P0 | GET | `/exercise-catalog` | 系统动作目录 |
| P0 | GET/POST | `/exercises` | 用户动作库列表/新增 |
| P0 | PATCH/DELETE | `/exercises/{id}` | 编辑/移除动作 |
| P0 | GET/PUT | `/training-plans/{date}` | 获取/保存某日计划 |
| P0 | POST | `/training-plans/{date}/complete` | 完成或更新当日训练 |
| P0 | GET | `/training-records` | 训练历史列表 |
| P0 | GET | `/training-records/{id}` | 训练历史详情 |
| P1 | PATCH/DELETE | `/training-records/{id}` | 修正或删除历史 |
| P0 | GET | `/training-stats/weekly` | 周完成圆点 |
| P1 | GET | `/home/summary` | 首页聚合数据 |

## 5. 认证与账号

### 5.1 注册

`POST /auth/register`

请求：

```json
{
  "username": "健身达人Fit",
  "password": "Fit@2026ab",
  "agreementVersion": "user-2026-09",
  "privacyVersion": "privacy-2026-09",
  "timezone": "Asia/Shanghai"
}
```

校验规则：

- 用户名只允许数字 `0–9`、英文字母 `A–Z/a–z` 和 Unicode Han（汉字）字符，不允许空格、下划线或其他符号。
- 用户名长度为 1–30 个 Unicode 字符，按字符数而非 UTF-8 字节数计算。前后端均按 Unicode 码点统计；数据库使用 `CHAR_LENGTH(username)` 约束。
- 用户名是否区分英文大小写必须统一；建议查重时不区分大小写，展示时保留原始大小写。
- 密码只允许 ASCII 可见字符 `0x21–0x7E`，长度 8–16。
- 密码必须至少包含数字、大写字母、小写字母、特殊字符四类中的两类。
- 密码使用 Argon2id 或 bcrypt 哈希，禁止明文存储和日志记录。
- 注册必须记录用户同意的协议版本、IP、设备信息和时间。

成功响应：

```json
{
  "code": 0,
  "message": "ok",
  "data": {
    "user": {
      "id": "usr_01K...",
      "username": "健身达人Fit",
      "avatarUrl": null,
      "createdAt": "2026-09-15T03:20:30.000Z"
    },
    "accessToken": "eyJ...",
    "accessTokenExpiresIn": 1800,
    "refreshToken": "rt_...",
    "refreshTokenExpiresIn": 2592000
  },
  "requestId": "req_01K..."
}
```

冲突：用户名存在时返回 HTTP 409，`code=USERNAME_ALREADY_EXISTS`。

### 5.2 登录

`POST /auth/login`

```json
{
  "username": "健身达人Fit",
  "password": "Fit@2026ab",
  "deviceId": "client-generated-device-id",
  "platform": "mp-weixin"
}
```

响应与注册相同。账号或密码错误统一返回 `INVALID_CREDENTIALS`，不要暴露用户名是否存在。

安全要求：

- 登录接口按 IP、设备和账号限流。
- 连续失败达到阈值后启用短期冻结或验证码。
- 前端“记住账户和密码”必须调整为“记住账户/保持登录”。
- 禁止继续将密码写入 `fit_note_login`；本地只保存用户名和安全存储中的 Refresh Token。

### 5.3 刷新令牌

`POST /auth/refresh`

```json
{ "refreshToken": "rt_...", "deviceId": "client-generated-device-id" }
```

后端采用 Refresh Token Rotation：每次刷新返回新的 Refresh Token，并立即作废旧令牌。

### 5.4 退出登录

`POST /auth/logout`

```json
{ "refreshToken": "rt_...", "allDevices": false }
```

成功返回 `data: null`。退出后服务端撤销对应刷新令牌，前端清理访问令牌及用户缓存。

### 5.5 忘记与重置密码

`POST /auth/password/forgot`

```json
{ "username": "健身达人Fit" }
```

无论账号是否存在都返回相同提示。由于当前注册页没有手机号/邮箱，正式启用找回密码前必须增加至少一种可验证的恢复渠道；微信小程序也可绑定微信身份作为辅助恢复方式。

`POST /auth/password/reset`

```json
{ "resetToken": "reset_...", "newPassword": "NewFit@2026" }
```

重置成功后撤销该用户全部 Refresh Token。

### 5.6 当前协议

`GET /agreements/current?locale=zh-CN`

```json
{
  "code": 0,
  "message": "ok",
  "data": {
    "userAgreement": {
      "version": "user-2026-09",
      "title": "用户协议",
      "contentUrl": "https://example.com/legal/user-2026-09"
    },
    "privacyPolicy": {
      "version": "privacy-2026-09",
      "title": "隐私政策",
      "contentUrl": "https://example.com/legal/privacy-2026-09"
    }
  },
  "requestId": "req_01K..."
}
```

## 6. 用户资料与偏好

### 6.1 获取当前用户

`GET /users/me`

```json
{
  "code": 0,
  "message": "ok",
  "data": {
    "id": "usr_01K...",
    "username": "健身达人Fit",
    "avatarUrl": null,
    "timezone": "Asia/Shanghai",
    "createdAt": "2026-09-15T03:20:30.000Z",
    "version": 1
  },
  "requestId": "req_01K..."
}
```

`PATCH /users/me` 可修改用户名、头像和时区，用户名校验与注册一致。

### 6.2 主题偏好

`GET /users/me/preferences`、`PATCH /users/me/preferences`

```json
{ "themeIndex": 1 }
```

`themeIndex` 当前允许 `0 | 1 | 2`。主题纯本地使用时该接口不是必须；需要跨设备同步时启用。服务端仅保存主题编号，不保存 CSS 色值。

## 7. 身体数据

### 7.1 获取当前身体档案

`GET /body/profile`

```json
{
  "code": 0,
  "message": "ok",
  "data": {
    "metrics": [
      { "metricKey": "height", "value": 175, "unit": "cm", "measuredAt": "2026-09-15T02:00:00.000Z" },
      { "metricKey": "weight", "value": 70.5, "unit": "kg", "measuredAt": "2026-09-15T02:00:00.000Z" },
      { "metricKey": "chest", "value": 98, "unit": "cm", "measuredAt": "2026-09-14T02:00:00.000Z" },
      { "metricKey": "body_fat_pct", "value": 16.8, "unit": "%", "measuredAt": "2026-09-15T02:00:00.000Z" }
    ],
    "bmi": 23.0,
    "version": 12,
    "updatedAt": "2026-09-15T02:00:00.000Z"
  },
  "requestId": "req_01K..."
}
```

BMI 建议由后端根据最新身高和体重计算：`weightKg / (heightM²)`，保留一位小数。

### 7.2 批量更新身体档案

`PUT /body/profile`

```json
{
  "version": 12,
  "metrics": [
    { "metricKey": "height", "value": 175, "measuredAt": "2026-09-15T02:00:00.000Z" },
    { "metricKey": "weight", "value": 70.5, "measuredAt": "2026-09-15T02:00:00.000Z" }
  ]
}
```

更新 weight 时必须同时生成一条体重测量记录；同一用户、同一 metricKey、同一业务日期默认更新当天最后一条，而不是无限重复插入。

### 7.3 新增单次测量

`POST /body/measurements`

```json
{
  "metricKey": "weight",
  "value": 70.5,
  "unit": "kg",
  "measuredAt": "2026-09-15T02:00:00.000Z",
  "source": "manual"
}
```

`source` 建议枚举：`manual | smart_scale | import`。

### 7.4 查询趋势

`GET /body/measurements?metricKey=weight&from=2026-09-09&to=2026-09-15&granularity=daily`

`GET /body/measurements?metricKey=weight&months=6&granularity=monthly&aggregate=last`

```json
{
  "code": 0,
  "message": "ok",
  "data": {
    "metricKey": "weight",
    "unit": "kg",
    "granularity": "daily",
    "items": [
      { "date": "2026-09-14", "value": 70.8, "measuredAt": "2026-09-14T12:10:00.000Z" },
      { "date": "2026-09-15", "value": 70.5, "measuredAt": "2026-09-15T12:08:00.000Z" }
    ]
  },
  "requestId": "req_01K..."
}
```

首页规则：

- 周趋势返回最近 7 个自然日，没有记录的日期允许缺失或返回 `value: null`。
- 月趋势返回最近 6 个月。
- 月数据取当月最后一次记录，不取平均值。

### 7.5 修改/删除测量

- `PATCH /body/measurements/{measurementId}`
- `DELETE /body/measurements/{measurementId}`

修改或删除最新值后，后端需要重新计算身体档案当前值和 BMI。

## 8. 动作目录与用户动作库

系统动作目录是平台维护的只读数据；用户动作库是用户从系统目录选取或自行创建的动作集合。两者分离可以避免系统动作升级影响用户历史。

### 8.1 获取系统动作目录

`GET /exercise-catalog?bodyPart=chest&keyword=卧推&page=1&pageSize=50`

```json
{
  "code": 0,
  "message": "ok",
  "data": {
    "items": [
      {
        "id": "cat_chest_bench_press",
        "bodyPart": "chest",
        "name": "平板卧推",
        "equipment": "杠铃",
        "enabled": true
      }
    ],
    "page": 1,
    "pageSize": 50,
    "total": 1,
    "hasMore": false
  },
  "requestId": "req_01K..."
}
```

建议系统初始目录至少包含当前前端提供的 30 个动作，每个部位 5 个。目录动作名称、器械和所属部位由后台管理。

### 8.2 获取用户动作库

`GET /exercises?bodyPart=chest&includeArchived=false`

```json
{
  "code": 0,
  "message": "ok",
  "data": {
    "items": [
      {
        "id": "uex_01K...",
        "catalogExerciseId": "cat_chest_bench_press",
        "bodyPart": "chest",
        "name": "平板卧推",
        "equipment": "杠铃",
        "source": "catalog",
        "custom": false,
        "version": 1,
        "createdAt": "2026-09-15T03:20:30.000Z"
      }
    ]
  },
  "requestId": "req_01K..."
}
```

该响应直接替代前端本地键 `fit_note_action_library`。

### 8.3 添加动作

`POST /exercises`

从系统目录添加：

```json
{
  "catalogExerciseId": "cat_chest_bench_press"
}
```

自定义动作：

```json
{
  "bodyPart": "chest",
  "name": "自定义窄距卧推",
  "equipment": "自定义",
  "source": "custom"
}
```

规则：

- 同一用户、同一部位下动作名称不可重复，建议大小写不敏感。
- 自定义名称不能为空，建议限制为 1–40 个字符。
- 从目录添加时，名称、部位和器械由服务端从目录复制，不能信任客户端传值。
- 成功返回完整用户动作对象。

### 8.4 编辑和移除动作

`PATCH /exercises/{exerciseId}`

```json
{
  "name": "杠铃平板卧推",
  "equipment": "杠铃",
  "version": 1
}
```

`DELETE /exercises/{exerciseId}`

删除采用软删除：

- 后续计划的可选列表不再显示。
- 已保存计划可以提示动作已归档。
- 已完成的训练历史必须保留提交时的动作名称、器械和数据快照。

## 9. 每日训练计划

### 9.1 计划数据模型

```json
{
  "id": "plan_01K...",
  "date": "2026-09-15",
  "name": "胸腹训练",
  "duration": 40,
  "status": "draft",
  "parts": [
    {
      "bodyPart": "chest",
      "name": "胸部",
      "shortName": "胸",
      "sortOrder": 1,
      "actions": [
        {
          "planItemId": "pi_01K...",
          "exerciseId": "uex_01K...",
          "name": "平板卧推",
          "equipment": "杠铃",
          "sortOrder": 1,
          "target": { "kg": 40, "reps": 12, "sets": 4 },
          "actual": { "kg": 42.5, "reps": 10, "sets": 4 },
          "completed": true
        }
      ]
    },
    {
      "bodyPart": "abs",
      "name": "腹部",
      "shortName": "腹",
      "sortOrder": 2,
      "actions": []
    }
  ],
  "completedActionCount": 1,
  "totalActionCount": 1,
  "version": 4,
  "updatedAt": "2026-09-15T05:20:30.000Z"
}
```

名称生成规则：

- 未选择部位：`今日训练`。
- 单个部位：例如 `胸部训练`。
- 多个部位：按照计划中的顺序拼接 shortName，例如胸部 + 腹部为 `胸腹训练`。
- 服务端应重新生成名称，不能完全信任客户端传入的 name。
- 当前预计时长规则为 `max(20, 动作数 × 8)` 分钟，后续可改成用户输入。

### 9.2 获取某日计划

`GET /training-plans/2026-09-15`

返回上述计划结构；当日没有计划时可返回：

```json
{
  "code": 0,
  "message": "ok",
  "data": {
    "date": "2026-09-15",
    "name": "今日训练",
    "duration": 20,
    "status": "draft",
    "parts": [],
    "completedActionCount": 0,
    "totalActionCount": 0,
    "version": 0
  },
  "requestId": "req_01K..."
}
```

### 9.3 保存某日计划

`PUT /training-plans/2026-09-15`

```json
{
  "version": 3,
  "parts": [
    {
      "bodyPart": "chest",
      "sortOrder": 1,
      "actions": [
        {
          "exerciseId": "uex_01K...",
          "sortOrder": 1,
          "target": { "kg": 40, "reps": 12, "sets": 4 },
          "actual": { "kg": 42.5, "reps": 10, "sets": 4 }
        }
      ]
    }
  ]
}
```

行为：

- PUT 是按日期的完整覆盖保存，适合当前前端自动保存。
- 同一用户、同一日期只能有一份计划。
- 部位只能从有可用用户动作的部位中选择。
- exerciseId 必须属于当前用户且未归档，或为系统允许继续引用的已归档动作。
- target 可以为空；actual 三项完整时 `completed=true`。
- actual 的 kg 允许 0，reps 和 sets 必须为正整数。
- 跨到新日期时可复制部位、动作和 target，但 actual 必须清空。
- 建议前端输入停止 500–800 ms 后防抖保存，不要每次按键都立即请求。
- 版本冲突返回 HTTP 409 `VERSION_CONFLICT`，并附带服务端最新计划。

成功响应返回服务端标准化后的完整计划。

### 9.4 完成或更新今日训练

`POST /training-plans/2026-09-15/complete`

请求头：

```http
Idempotency-Key: finish-usr_01K-2026-09-15
```

请求：

```json
{
  "version": 4,
  "completedAt": "2026-09-15T05:40:00.000Z",
  "parts": [
    {
      "bodyPart": "chest",
      "sortOrder": 1,
      "actions": [
        {
          "exerciseId": "uex_01K...",
          "sortOrder": 1,
          "target": { "kg": 40, "reps": 12, "sets": 4 },
          "actual": { "kg": 42.5, "reps": 10, "sets": 4 }
        }
      ]
    }
  ]
}
```

服务端校验：

1. 至少有一个动作。
2. 每个动作 actual 的 kg、reps、sets 均已填写。
3. kg 大于等于 0，reps 和 sets 为正整数。
4. 日期不能超出允许编辑窗口；建议允许今天及最近 30 天补录。
5. 首次完成创建训练记录；同一天再次提交更新原记录，不重复计数。
6. 完成时把动作名称、器械、预期值和实际值复制到历史快照。

响应：

```json
{
  "code": 0,
  "message": "ok",
  "data": {
    "plan": {
      "id": "plan_01K...",
      "date": "2026-09-15",
      "name": "胸腹训练",
      "status": "completed",
      "version": 5
    },
    "trainingRecord": {
      "id": "tr_01K...",
      "date": "2026-09-15",
      "title": "胸腹训练",
      "duration": 40,
      "completedAt": "2026-09-15T05:40:00.000Z"
    },
    "weeklyStats": {
      "weekStart": "2026-09-14",
      "weekEnd": "2026-09-20",
      "completedCount": 1,
      "days": [
        { "date": "2026-09-14", "completed": false },
        { "date": "2026-09-15", "completed": true }
      ]
    }
  },
  "requestId": "req_01K..."
}
```

## 10. 训练历史

### 10.1 历史列表

`GET /training-records?from=2026-09-01&to=2026-09-30&page=1&pageSize=20`

```json
{
  "code": 0,
  "message": "ok",
  "data": {
    "items": [
      {
        "id": "tr_01K...",
        "date": "2026-09-15",
        "title": "胸腹训练",
        "duration": 40,
        "completedAt": "2026-09-15T05:40:00.000Z",
        "status": "completed",
        "partSummary": [
          { "bodyPart": "chest", "name": "胸部", "actionCount": 3 },
          { "bodyPart": "abs", "name": "腹部", "actionCount": 2 }
        ]
      }
    ],
    "page": 1,
    "pageSize": 20,
    "total": 1,
    "hasMore": false
  },
  "requestId": "req_01K..."
}
```

列表默认按 `date DESC, completedAt DESC` 排序。

### 10.2 历史详情

`GET /training-records/{recordId}`

```json
{
  "code": 0,
  "message": "ok",
  "data": {
    "id": "tr_01K...",
    "date": "2026-09-15",
    "title": "胸腹训练",
    "duration": 40,
    "completedAt": "2026-09-15T05:40:00.000Z",
    "parts": [
      {
        "bodyPart": "chest",
        "name": "胸部",
        "actions": [
          {
            "exerciseId": "uex_01K...",
            "name": "平板卧推",
            "equipment": "杠铃",
            "target": { "kg": 40, "reps": 12, "sets": 4 },
            "actual": { "kg": 42.5, "reps": 10, "sets": 4 }
          }
        ]
      }
    ],
    "version": 1
  },
  "requestId": "req_01K..."
}
```

### 10.3 修改和删除历史

- `PATCH /training-records/{recordId}`：允许修正标题、时长或动作实际值。
- `DELETE /training-records/{recordId}`：软删除记录。

修改或删除后必须同步刷新周完成统计、首页连续打卡和相关聚合值。

## 11. 周完成统计

`GET /training-stats/weekly?weekStart=2026-09-14&timezone=Asia/Shanghai`

```json
{
  "code": 0,
  "message": "ok",
  "data": {
    "weekStart": "2026-09-14",
    "weekEnd": "2026-09-20",
    "completedCount": 2,
    "days": [
      { "date": "2026-09-14", "weekday": 1, "completed": true, "recordId": "tr_01" },
      { "date": "2026-09-15", "weekday": 2, "completed": true, "recordId": "tr_02" },
      { "date": "2026-09-16", "weekday": 3, "completed": false, "recordId": null },
      { "date": "2026-09-17", "weekday": 4, "completed": false, "recordId": null },
      { "date": "2026-09-18", "weekday": 5, "completed": false, "recordId": null },
      { "date": "2026-09-19", "weekday": 6, "completed": false, "recordId": null },
      { "date": "2026-09-20", "weekday": 7, "completed": false, "recordId": null }
    ]
  },
  "requestId": "req_01K..."
}
```

必须始终返回周一至周日 7 项。一天有至少一条有效 completed 记录即亮起；同一天更新记录不能使 completedCount 重复增加。

## 12. 首页汇总

`GET /home/summary?date=2026-09-15&timezone=Asia/Shanghai`

这是推荐的聚合接口，用一个请求替代首页分别请求身体数据、动作数、今日计划和训练周统计。

```json
{
  "code": 0,
  "message": "ok",
  "data": {
    "user": {
      "id": "usr_01K...",
      "username": "健身达人Fit",
      "avatarUrl": null
    },
    "streakDays": 12,
    "body": {
      "height": 175,
      "weight": 70.5,
      "bmi": 23.0,
      "lastWeightChange": -0.3,
      "latestMeasuredAt": "2026-09-15T02:00:00.000Z"
    },
    "todayPlan": {
      "id": "plan_01K...",
      "date": "2026-09-15",
      "name": "胸腹训练",
      "duration": 40,
      "totalActionCount": 5,
      "completedActionCount": 5,
      "status": "completed"
    },
    "weeklyTraining": {
      "weekStart": "2026-09-14",
      "completedCount": 2,
      "days": [
        { "date": "2026-09-14", "completed": true },
        { "date": "2026-09-15", "completed": true },
        { "date": "2026-09-16", "completed": false },
        { "date": "2026-09-17", "completed": false },
        { "date": "2026-09-18", "completed": false },
        { "date": "2026-09-19", "completed": false },
        { "date": "2026-09-20", "completed": false }
      ]
    },
    "actionLibrary": {
      "totalCount": 18,
      "activePartCount": 6,
      "partCounts": {
        "shoulder": 3,
        "chest": 3,
        "back": 3,
        "arms": 3,
        "abs": 3,
        "legs": 3
      }
    }
  },
  "requestId": "req_01K..."
}
```

体重周/月趋势数据量很小，也可加入 summary；若后续数据扩展，建议继续由独立趋势接口加载。

## 13. 当前前端本地数据与接口映射

| 当前本地键/行为 | 当前内容 | 接入后的接口 | 迁移建议 |
|---|---|---|---|
| `fit_note_login` | 用户名和明文密码 | `POST /auth/login` | 立即停止保存密码；只保留用户名 |
| `fit_note_theme_index` | 主题编号 | `/users/me/preferences` | 可继续本地优先，登录后异步同步 |
| `fit_note_body_profile` | 身高、体重、围度、成分、体重历史 | `/body/profile`、`/body/measurements` | 首次登录可询问是否上传本地数据 |
| `fit_note_action_library` | 用户动作数组 | `/exercises` | 首次同步需用名称+部位去重 |
| `fit_note_training_plan` | 当日训练计划草稿 | `/training-plans/{date}` | 采用日期+版本合并 |
| `fit_note_training_history` | 完成训练快照 | `/training-records` | 使用 clientId/日期防重复导入 |
| 登录页模拟延迟 | 无真实请求 | `POST /auth/login` | 接入统一 request 封装 |
| 注册页模拟延迟 | 无真实请求 | `POST /auth/register` | 注册成功保存 Token 并进入首页 |
| 协议弹窗占位 | 静态提示 | `GET /agreements/current` | 打开正式协议 URL 或协议页面 |

### 13.1 推荐前端请求封装

建议新增：

```text
src/
  api/
    request.js
    auth.js
    user.js
    body.js
    exercises.js
    training.js
    home.js
  stores/
    auth.js
    sync.js
```

`request.js` 负责：

1. 自动拼接 baseURL。
2. 自动添加 Access Token、平台、版本和时区。
3. 401 时只允许一个刷新请求，其余请求排队等待。
4. 刷新失败统一清理会话并跳回登录页。
5. 标准化后端错误为前端 Toast 可使用的消息。
6. 写请求支持 Idempotency-Key。
7. 不记录密码、令牌、身体数据等敏感日志。

### 13.2 页面加载顺序

登录成功：

```text
POST /auth/login
  -> 保存 Access Token/Refresh Token
  -> GET /users/me
  -> GET /home/summary
  -> reLaunch 首页
```

进入训练计划页：

```text
并行 GET /exercises + GET /training-plans/{today}
  -> 用户选择部位和动作
  -> 输入停止后 PUT /training-plans/{today}
  -> POST /training-plans/{today}/complete
  -> 用响应直接更新首页缓存和周统计
```

进入身体数据页：

```text
GET /body/profile
  -> 用户修改数据
  -> PUT /body/profile 或 POST /body/measurements
  -> 重新获取/局部更新首页 BMI 与趋势
```

## 14. 推荐数据库结构

以下是逻辑表，不限制具体数据库。推荐 PostgreSQL。

### 14.1 用户与认证

`users`

- `id` PK
- `username`
- `username_normalized` UNIQUE
- `password_hash`
- `avatar_url`
- `timezone`
- `status`
- `created_at`、`updated_at`、`deleted_at`

`refresh_tokens`

- `id` PK
- `user_id` FK
- `token_hash` UNIQUE
- `device_id`、`platform`
- `expires_at`、`revoked_at`、`created_at`

`agreement_acceptances`

- `id` PK
- `user_id` FK
- `agreement_type`
- `version`
- `accepted_at`
- `ip_address`、`user_agent`

`user_preferences`

- `user_id` PK/FK
- `theme_index`
- `version`
- `updated_at`

### 14.2 身体数据

`body_measurements`

- `id` PK
- `user_id` FK
- `metric_key`
- `value` decimal
- `unit`
- `source`
- `measured_at`
- `business_date`
- `created_at`、`updated_at`、`deleted_at`

索引：

- `(user_id, metric_key, measured_at DESC)`
- `(user_id, metric_key, business_date)`

无需单独保存 BMI；可计算或作为缓存字段保存，并在身高/体重变化时重算。

### 14.3 动作

`exercise_catalog`

- `id` PK
- `body_part`
- `name`
- `equipment`
- `enabled`
- `sort_order`

`user_exercises`

- `id` PK
- `user_id` FK
- `catalog_exercise_id` nullable
- `body_part`
- `name`
- `equipment`
- `source`
- `version`
- `created_at`、`updated_at`、`deleted_at`

唯一索引建议：`(user_id, body_part, lower(name)) WHERE deleted_at IS NULL`。

### 14.4 训练计划

`training_plans`

- `id` PK
- `user_id` FK
- `plan_date`
- `name`
- `duration_minutes`
- `status`：draft/completed
- `version`
- `created_at`、`updated_at`、`completed_at`

唯一索引：`(user_id, plan_date)`。

`training_plan_parts`

- `id` PK
- `plan_id` FK
- `body_part`
- `sort_order`

`training_plan_items`

- `id` PK
- `plan_part_id` FK
- `exercise_id` FK
- `exercise_name_snapshot`
- `equipment_snapshot`
- `target_kg`、`target_reps`、`target_sets`
- `actual_kg`、`actual_reps`、`actual_sets`
- `completed`
- `sort_order`

### 14.5 训练历史

可以在训练完成后冻结 training_plans 和 items 作为历史，也可以创建独立快照表。为避免后续编辑计划影响历史，推荐独立表：

`training_records`

- `id` PK
- `user_id` FK
- `source_plan_id` FK
- `record_date`
- `title`
- `duration_minutes`
- `completed_at`
- `version`
- `created_at`、`updated_at`、`deleted_at`

`training_record_items`

- `id` PK
- `record_id` FK
- `body_part`
- `part_name_snapshot`
- `exercise_id` nullable
- `exercise_name_snapshot`
- `equipment_snapshot`
- 六个 target/actual 数值字段
- `part_sort_order`、`action_sort_order`

唯一索引建议：`(user_id, record_date) WHERE deleted_at IS NULL`，与当前“一天一条完成记录”的前端规则一致。

## 15. 安全、隐私与合规

1. 所有接口必须 HTTPS，禁止 Token 出现在 URL。
2. 密码只能传给注册、登录、重置密码接口。
3. 密码哈希推荐 Argon2id；使用 bcrypt 时 cost 至少 12，并根据服务器性能压测调整。
4. Refresh Token 在数据库只保存哈希；客户端优先使用系统安全存储。
5. 微信小程序端不要把长期令牌明文写入普通日志。
6. 身高、体重、体脂等属于敏感个人数据，日志、监控和错误信息需要脱敏。
7. 用户只能访问自己 userId 下的数据；服务端不能相信客户端传来的 userId。
8. 协议同意记录不可由普通资料更新接口覆盖。
9. 删除账号时需定义数据保留期、撤销令牌和异步清理流程。
10. 导出、删除个人数据属于后续合规接口，建议预留 `/users/me/export` 和 `DELETE /users/me`。
11. 接口日志记录 requestId、状态码、耗时，不记录密码、完整 Token 和身体指标原值。
12. CORS 只允许正式 H5 域名；微信端配置合法 request 域名。

## 16. 缓存、离线与多端同步

- 首页 summary 可按用户缓存 10–30 秒；身体/动作/训练写入后主动失效。
- 动作目录可缓存较长时间，并通过 `ETag` 或 catalogVersion 更新。
- 用户数据响应均返回 `updatedAt` 和 `version`。
- 前端本地数据作为离线缓存，而不是唯一数据源。
- 离线写操作保存 `clientMutationId`、业务日期和创建时间，联网后按顺序重放。
- 服务端通过 Idempotency-Key 防止完成训练、添加测量等操作重复。
- 多端冲突时：
  - 未完成计划：提示用户选择服务端版本或本地版本。
  - 已完成历史：默认保留服务端记录，需显式编辑。
  - 身体测量：不同 measuredAt 可并存；同一测量 ID 用 version 控制。

## 17. 错误码建议

| code | 场景 |
|---|---|
| `USERNAME_ALREADY_EXISTS` | 用户名已注册 |
| `INVALID_CREDENTIALS` | 账号或密码错误 |
| `ACCOUNT_LOCKED` | 登录失败次数过多 |
| `TOKEN_EXPIRED` | Access/Refresh Token 过期 |
| `TOKEN_REUSED` | Refresh Token 重放 |
| `AGREEMENT_VERSION_EXPIRED` | 协议版本已更新 |
| `METRIC_NOT_SUPPORTED` | 身体指标不支持 |
| `INVALID_MEASUREMENT_VALUE` | 身体数值范围不合法 |
| `EXERCISE_ALREADY_EXISTS` | 动作重复 |
| `EXERCISE_ARCHIVED` | 动作已归档 |
| `PLAN_VERSION_CONFLICT` | 训练计划版本冲突 |
| `PLAN_EMPTY` | 计划没有动作 |
| `PLAN_ACTION_INCOMPLETE` | 实际三项未填写完整 |
| `TRAINING_ALREADY_COMPLETED` | 重复完成且接口不允许更新 |
| `RECORD_EDIT_WINDOW_CLOSED` | 超出历史可编辑期限 |

## 18. 后端实现优先级

### P0：前端可完成真实闭环

1. 数据库迁移及用户表。
2. 注册、登录、刷新、退出、协议接口。
3. 身体档案和体重趋势。
4. 动作目录及用户动作增删改查。
5. 每日计划获取、自动保存、完成。
6. 历史列表、详情和周统计。
7. 首页 summary。

### P1：可用性和多端完善

1. 找回密码及手机号/邮箱/微信身份绑定。
2. 主题偏好跨设备同步。
3. 历史记录修正、删除。
4. 离线同步、版本冲突提示。
5. 管理后台维护系统动作目录和协议。

### P2：后续扩展

1. 智能体脂秤接入和数据导入。
2. 训练模板、周期计划和提醒。
3. 数据导出、账号注销。
4. 图片头像与对象存储。
5. 训练统计、排行榜或社交能力。

## 19. 联调验收清单

- [ ] 用户名可使用数字、英文和汉字；30 个汉字通过，31 个字符被拒绝，空格和下划线被拒绝。
- [ ] 密码规则由后端再次校验，不能只依赖前端。
- [ ] 用户名重复返回 409 和稳定业务错误码。
- [ ] Access Token 过期时能无感刷新，刷新失败回登录页。
- [ ] 本地不再保存明文密码。
- [ ] 登录用户之间的身体、动作、计划和历史数据完全隔离。
- [ ] 同一天多次记录体重时，周图取当天最后一次。
- [ ] 月趋势取当月最后一次体重，返回最近 6 个月。
- [ ] 删除动作不影响历史中的动作快照。
- [ ] 训练计划只列出用户动作库中对应部位的动作。
- [ ] 胸部与腹部组合后，服务端返回标题“胸腹训练”。
- [ ] 徒手动作允许实际重量为 0 kg。
- [ ] actual 三项完整后动作 completed=true。
- [ ] 当日完成训练后首页圆点立即亮起。
- [ ] 同一天重复提交完成接口不会产生两条历史。
- [ ] 历史详情包含部位、动作、预期和实际六项数值。
- [ ] 周统计固定返回周一至周日 7 项。
- [ ] H5 CORS、微信小程序 request 合法域名均已配置。
- [ ] 所有错误响应都包含 requestId。

## 20. 建议交付物

后端开发完成时建议同时提供：

1. OpenAPI 3.1 文件：`openapi.yaml`。
2. 本地/测试/正式环境 baseURL。
3. 数据库 migration 和系统动作 seed。
4. Postman/Apifox 集合。
5. 测试账号与初始化数据。
6. 错误码清单和变更记录。

文档中的 JSON 字段名建议作为前后端最终契约。若后端需要更名，应先同步修改 OpenAPI 和前端类型，避免页面各自做字段转换。
