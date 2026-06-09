# Main import preflight

本页记录正式主 v2 SQLite 导入前的本地安全检查、备份和回滚流程。此流程只面向 `MomentPicBackendV2` 后端，不修改 Android，不连接 Unraid，不部署服务。

## 默认只读检查

```bash
npm run preflight:main-import
```

默认路径：

- legacy DB：优先 `MOMENTPIC_LEGACY_DB_PATH`，否则 `data/legacy-real-dryrun.sqlite`
- 目标主 DB：优先 `MOMENTPIC_DB_PATH`，否则 `data/momentpic-v2.sqlite`
- archive 抽样 DB：`data/momentpic-v2-import-test.sqlite`，不存在时回退 legacy DB

也可以显式指定：

```bash
npm run preflight:main-import -- \
  --legacy-db /path/to/legacy.sqlite \
  --target-db /path/to/momentpic-v2.sqlite
```

默认模式不会写目标 DB，不会创建 migration，不会执行 `import:legacy`，也不会备份文件。它检查：

- legacy DB 是否存在、大小、`PRAGMA integrity_check` 和核心三表 `library_roots`、`albums`、`assets`
- 目标主 DB 路径解析、主文件与 `-wal`、`-shm` sidecar 状态；目标 DB 存在时只读执行 integrity check
- 目标 DB 所在目录或最近已存在父目录的读写/搜索权限，以及文件系统可用空间
- `MOMENTPIC_PATH_PREFIX_MAP`、`MOMENTPIC_THUMBNAIL_CACHE_DIR`、`MOMENTPIC_ARCHIVE_ENTRY_MAX_BYTES` 当前建议值
- `/mnt/user` 是否挂载，以及 archive 样本路径在原路径或映射路径下是否仍然不可读

本机没有 `/mnt/user` 挂载时，archive 检查会显示 blocked，但脚本仍以 0 退出，便于把本地 preflight 结果作为安全记录。正式导入前必须在具备真实媒体只读挂载的环境重新跑同一检查，或明确接受 archive 读取在上线前仍未被真实样本验证的风险。

## 备份模式

只有显式传入 `--backup-only` 或 `--prepare-backup` 才会复制目标 DB 文件：

```bash
npm run preflight:main-import -- \
  --legacy-db /path/to/legacy.sqlite \
  --target-db /path/to/momentpic-v2.sqlite \
  --backup-only
```

备份内容：

- `/path/to/momentpic-v2.sqlite`
- `/path/to/momentpic-v2.sqlite-wal`
- `/path/to/momentpic-v2.sqlite-shm`

默认备份目录是：

```text
data/main-import-backups/main-import-YYYYMMDDHHMMSS/
```

可通过 `--backup-dir <path>` 指定备份根目录。备份模式只复制已存在文件，不删除、不移动、不覆盖原文件；目标 DB 不存在时会安全输出 `nothing copied`。

验证备份模式时请使用临时 target DB，例如：

```bash
MOMENTPIC_DB_PATH=/tmp/momentpic-preflight-target.sqlite npm run migrate
npm run preflight:main-import -- \
  --legacy-db data/legacy-real-dryrun.sqlite \
  --target-db /tmp/momentpic-preflight-target.sqlite \
  --backup-only \
  --backup-dir /tmp/momentpic-preflight-backups
```

不要为了测试脚本去备份真实主库。

## 进入正式导入的条件

进入 `import:legacy` 前应同时满足：

- legacy DB `integrity_check` 为 `ok`，核心三表存在且计数符合预期
- `npm run import:legacy:test -- --legacy-db ...` 隔离演练已通过
- `npm run check:archive-samples -- --legacy-db ... --imported-db ...` 在有真实媒体挂载的环境至少验证过一小批可读 archive entry，或已记录未验证风险
- `MOMENTPIC_PATH_PREFIX_MAP` 明确写入部署环境，不依赖含糊的默认假设
- `MOMENTPIC_THUMBNAIL_CACHE_DIR` 指向可写缓存目录，且不与 SQLite 主库混放到需要频繁清理的位置
- `MOMENTPIC_ARCHIVE_ENTRY_MAX_BYTES` 与生产内存预算匹配
- 已安排停写窗口，确认没有服务、脚本或人工操作会同时写目标主 DB
- 已在停写窗口内执行 `--backup-only` 并保留备份目录

正式导入命令需要人工执行，preflight 只会打印建议命令，不会自动运行：

```bash
MOMENTPIC_DB_PATH=/path/to/momentpic-v2.sqlite npm run import:legacy -- --legacy-db /path/to/legacy.sqlite
```

## 回滚

导入后如果需要回滚：

1. 停止所有会写目标 v2 SQLite 的服务或脚本。
2. 保留失败后的主库文件用于排查，不要直接删除。
3. 用导入前备份目录里的主文件和 sidecar 替换当前目标 DB、`-wal`、`-shm`。
4. 启动服务前重新执行只读 preflight，确认目标 DB integrity 为 `ok`。
5. 启动后跑 smoke/API 抽样。

不要通过删除部分表、手工 update 或再次导入来模拟回滚。主库回滚只使用停写窗口内的完整 DB 文件备份。

## 禁忌

- 不在 preflight 阶段执行正式主库导入。
- 不在有写入流量时备份 SQLite 主库。
- 不删除、不重命名真实主库或 sidecar。
- 不把明文密码、密钥、cookie secret 写入文档或日志。
- 不从本脚本 SSH/patch Unraid、重启服务或发布部署。
- 不修改 Android。

