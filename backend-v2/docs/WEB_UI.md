# Moment Pic Backend V2 Web UI

`GET /` 返回内置单页 Web UI，无 CDN、无独立前端构建链。网页端通过登录 cookie 调用 `/api/v2/*`。

## 首页：刷新图库

相册首页顶部提供“快速刷新”和“完整刷新”按钮：

- 仅管理员可用。
- 当前选择“全部图库”时调用 `POST /api/v2/scan`；选择某个图库时带上 `galleryId`。
- “快速刷新”用于真正导入新增/更新的普通图片，发送 `{ "dryRun": false, "fast": true }`，跳过 archive 深度解析。
- “完整刷新”发送 `{ "dryRun": false, "fast": false }`，包含 zip/cbz、7z/cb7（部署环境有 `7z`/`7zz`/`7za` 时）和 rar/cbr graceful skipped。
- 点击前会弹窗确认：会写入 SQLite，后端会备份 DB，不删除磁盘图片，也不删除历史记录。
- 后端立即返回 `taskId` 和 `queued/running` 状态；页面轮询 `GET /api/v2/scan/:taskId`，显示排队、运行中、完成、失败和错误信息。
- 页面进入 app 后会调用 `GET /api/v2/scan`，如果返回 `latestActive` 或列表中有 `queued/running` task，会恢复轮询，避免刷新浏览器后丢失任务状态。
- 运行中如果接口返回 `progressPhase`，页面显示阶段 `walking`/`folders`/`archives`/`writing`；只有失败或完成时存在真实错误时才显示 `error`。
- 任务完成后自动刷新图库侧栏、相册列表和系统状态。

## 设置页：图库来源文件夹

设置页的“系统”区域提供“添加图库来源文件夹”和来源列表：

- 管理员可填写目录名称和服务器绝对路径，例如 `/mnt/user/photos`。
- 目录名称可留空，后端会从路径末段生成默认名称。
- 表单调用 `POST /api/v2/galleries`。
- 成功后刷新图库侧栏、图库下拉框、系统状态和已登记来源列表，并提示先做 dry-run 扫描预览。
- 失败时显示后端错误，包括重复路径 `409`、相对路径 `400`。
- 普通用户只显示权限提示，不提供可提交按钮；如果直接调用 API，后端返回 `403`。
- 已登记来源显示名称、路径、启用状态、相册数，并提供“扫描预览”“正式导入”“启用/禁用来源”。
- 禁用来源只修改系统记录，不删除磁盘真实图片。

注意：这里填写的是后端/Unraid 服务端路径，不是浏览器本地目录。路径必须位于后端允许的媒体根内，危险路径和 URL/相对路径会被拒绝。

## 设置页：预加载图片数量

设置页“系统”区域提供“预加载图片数量”：

- 管理员可设置网页查看器打开照片时前后各预加载多少张原图。
- 字段对应 `system_config.preload_before` 和 `system_config.preload_after`。
- 表单调用 `PATCH /api/v2/system/config`，请求体为 `{ "preloadBefore": 2, "preloadAfter": 3 }`。
- 两个值都必须是 `0-5` 的整数；越界或非整数返回 `400`。
- 普通用户不能修改；直接调用 API 返回 `403`。
- Web UI 打开单张照片时，会按当前配置预取当前页相邻照片的 original URL。

## 相册和图片操作菜单

相册主页每个 album card 提供 `...` 操作菜单：

- 下载到本地：当前没有相册 zip/打包下载 API，因此 UI 明确提示“不支持批量下载相册；请打开相册后下载单张原图”。
- 分享给普通账户：管理员可选择普通账户，底层调用相册授权接口，把该相册加入用户的 `shared_albums`。
- 生成公开分享链接：调用 `POST /api/v2/public-shares` 创建或复用 album public share，并复制/展示 `/s/:token` 链接。

单张照片查看器的“图片操作”菜单提供：

- 下载到本地：浏览器下载 `/api/v2/assets/:assetId/original`。
- 分享给普通账户：当前普通用户授权是 album 级别，因此会按该照片所在相册授权给普通账户。
- 生成公开分享链接：调用 `POST /api/v2/public-shares` 创建或复用 asset public share，并复制/展示 `/s/:token` 链接。

普通用户不可给他人授权；普通用户创建公开链接仍受自身相册访问权限限制。

## 设置页：分享

设置页“分享”区域仅管理员可用：

- 选择 role=`user` 的普通账户。
- 默认候选为 `/api/v2/favorite-albums` 返回的收藏相册最新 50 个。
- 输入关键词后按 Enter 或中文输入法 compositionend 搜索全库 `/api/v2/albums?page=1&pageSize=50&keyword=...&sortBy=updatedAt&sortOrder=desc`。
- 支持多选相册、全选当前结果、清空选择，分享按钮显示“分享 N 个相册”。
- 展示该用户已分享相册列表，包含相册名称和 ID。
- 每个已分享相册可单独取消分享，调用 `DELETE /api/v2/users/:username/shared-albums/:albumId`。

中文搜索输入使用 `compositionstart`/`compositionend` 保护：输入法组合期间只保存输入值，不触发搜索和面板重渲染，避免组合态被打断。

## 设置页：扫描

设置页“扫描”和来源列表的扫描按钮默认安全 dry-run：

- 来源行“扫描预览”调用 `POST /api/v2/galleries/:id/scan`，请求 `{ "dryRun": true, "fast": false }`，真实读取该服务端目录并在后台任务完成后返回 discovered 计数，但不写 DB。
- “正式导入”会先弹确认，随后发送 `{ "dryRun": false, "fast": false }`；后端任务先备份 SQLite 主文件和 WAL/SHM，再 upsert albums/assets。
- 所有扫描按钮都会先拿到 `taskId`，再轮询 `GET /api/v2/scan/:taskId` 显示排队、运行中、完成或失败。
- 完成状态会显示“跳过未变化”计数；这些文件/entry 已经在 DB 中存在且路径、entry path、大小、mtime 和相册 fingerprint 没变，后端不会重复解析 metadata 或重复 upsert。
- 运行中状态显示 `progressPhase` 阶段；`error` 只用于失败或完成时的部分错误，不用于展示进度。
- 正式导入不删除磁盘文件，也不删除 DB 中本次未发现的历史记录。
- 扫描规则：root 本身和任意层级子目录只要直接包含图片就作为相册；支持常见图片格式；完整扫描会把 archive 作为独立相册导入。zip/cbz 内置可用，7z/cb7 依赖系统 7z 命令，rar/cbr 当前构建 graceful unavailable。archive 内 root 图片和 nested 图片同时存在时，按总 size 选择主体图片组，并忽略目录、非图片、加密 entry 和 `__MACOSX`。
