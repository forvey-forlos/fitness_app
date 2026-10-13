# 训练模板与模板广场

本版支持私人训练模板和公开模板帖；评论、回复与评论点赞暂不实现。

## 数据关系

- `training_plans` 是某一天可编辑、可执行的计划。
- `training_templates` 是用户私有的可复用方案，保存动作、部位、变式、记录方式、目标值和预计组数。
- `template_publications` 是发布时独立保存的公开快照；修改或删除原私人模板不改变已发布内容。
- `training_sessions` 是训练完成后的历史快照，不跟随上述任何内容变化。

导入公开帖时，后端在单个数据库事务里复制快照到当前用户的私人模板、补齐所需的系统动作到该用户的动作库，并增加导入次数。私人模板的 `source_publication_id` 仅作来源标记，不设外键；删除公开帖不删除已导入的副本。创建计划时复制模板内容到当天计划，实际训练组预置为空，不会把上一次实际训练量当作新计划的实际结果。

## 接口

所有接口位于 `/api/v1`，需要登录。私人模板提供 `GET/POST /training-templates`、`GET/PUT/DELETE /training-templates/:id`、`POST /training-templates/:id/create-plan`、`POST /training-templates/:id/publish`。广场提供 `GET /template-community?q=&scope=all|mine|favorites&page=&pageSize=`、`GET/DELETE /template-community/:id`、`PUT /template-community/:id/like`、`PUT /template-community/:id/favorite`、`POST /template-community/:id/import`。点赞和收藏的请求体是 `{ "enabled": true|false }`。

发布和导入前会校验动作仍是可用系统动作及其变式；私人模板修改带 `version` 乐观锁。浏览和互动按当前用户隔离状态，客户端不会直接提交作者 ID、点赞数或下载数。

## 上线顺序与验证

1. 备份数据库并按 `server/migrations/README.md` 执行迁移 017；先部署后端，再发布前端。
2. 在测试环境用两个账号验证：保存→编辑→发布→收藏/点赞→导入→动作库补齐→创建计划→完成训练；然后删除原帖子，确认导入副本与训练历史仍存在。
3. 运行 `cd server && npm test`、`npm run build:h5`、`npm run build:mp-weixin`。编译通过不能替代微信开发者工具及真机交互测试。

公开发布会产生用户生成内容。正式大范围开放前仍应安排内容审核、举报与滥用处理策略；本版只提供基础发布和互动，不提供评论系统，也没有后台审核工作流。
