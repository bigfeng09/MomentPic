# 2026-06-08 16:43 服务进度与推理等级记录

## 用户要求
- “让这两个服务也记录一下任务进度，然后改为中”。

## 当前理解
这里的“两个服务”按当时本机正在运行的两个 MomentPic BackendV2 服务记录：

1. `PORT=3000` 临时测试库服务
2. `PORT=3001` 主库服务

未停止、未重启、未部署、未修改数据库，仅记录状态。

## 服务 1：MomentPic BackendV2 测试库服务

- 端口：`3000`
- 监听：`HOST=0.0.0.0`
- 运行入口：`npm start` -> `node dist/src/index.js`
- 数据库：`data/momentpic-v2-import-test.sqlite`
- Demo seed：`MOMENTPIC_SEED_DEMO=false`
- 路径映射：`/example/media/moment/` -> `/mnt/moment-download/download/moment/download/`
- 日志：`/tmp/momentpic-v2-lan.log`
- 用途：测试库 / LAN 临时验证服务。
- 注意：该服务不一定代表正式主库状态。

## 服务 2：MomentPic BackendV2 主库服务

- 端口：`3001`
- 监听：`HOST=0.0.0.0`
- 运行入口：`npm run start` -> `node dist/src/index.js`
- 数据库：`data/momentpic-v2.sqlite`
- Demo seed：`MOMENTPIC_SEED_DEMO=false`
- 路径映射：`/example/media/moment/` -> `/mnt/moment-download/download/moment/download/`
- 日志：`/tmp/momentpic-backendv2-3001.log`
- 用途：本机主库验证服务。
- 注意：这仍是本机运行服务，不等于 Unraid / Docker 已部署。

## 当前项目进度摘要
- BackendV2 已完成旧库导入、路径映射、folder/zip 图片 original/thumbnail、缩略图缓存、正式导入前 preflight、Web UI 设置/分享/扫描说明/菜单等本地源码切片。
- 最近 Web UI 修改已通过：`npm run typecheck`、`npm run smoke`、`npm run build`。
- 线上/Unraid Docker 尚未部署这些最新 Web UI 改动。
- 当前两个本机服务仍在运行；本记录没有改变其运行状态。

## 推理等级
- 本机 Codex CLI 配置已改为：`model_reasoning_effort = "medium"`。
- 当前小维/运维助手会话状态显示：`Think: medium`。
- Codex 飞书助手最近 trace 元数据也显示：`thinkLevel: "medium"`。

## 后续建议
- 继续开发/验证时优先通过 SSH + Codex CLI，避免飞书会话再次堆到 512k。
- 飞书侧只发送短任务和短结果；长日志写入文件，再只汇报路径和摘要。
- 若要线上生效，下一步需要走部署闭环：构建镜像/compose、启动、验证、反代和入口更新。
