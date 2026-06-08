# MomentPic V2

> **AI 生成/辅助开发声明与责任说明**
>
> 本项目主要由 AI 助手在用户指导下完成、生成、重构和部署验证，包含对原 MomentPic 使用场景、数据结构和迁移需求的延续说明。代码、文档、迁移脚本、部署模板和客户端实现都可能存在缺陷、遗漏或不适合你的环境之处。使用者应在使用、部署、迁移或二次开发前自行审查代码、测试功能、备份数据并承担相应风险。
>
> 本项目涉及自托管相册、SQLite 数据库、媒体文件读取、用户权限、公开分享 token、文件系统扫描导入和 Android 客户端连接。生产环境使用前，必须备份旧库和新库、修改所有默认密码和密钥、验证媒体目录权限、核对路径映射和扫描根目录配置，并确认公开分享和普通用户授权符合你的隐私要求。作者/维护者不对数据丢失、隐私泄露、误配置、误扫描、第三方部署环境问题或由本项目使用造成的其他损失承担责任。

MomentPic V2 是一个自托管相册与图片库项目，包含 Node.js 后端、内置 Web 管理界面和 Android 客户端源码。它基于原 MomentPic 的使用场景、数据结构和迁移需求继续开发，目标是在保留旧图库/相册/资源/用户授权关系的基础上，提供更安全、更容易部署和维护的新版本。

> 本仓库是对外发布用的脱敏源码仓库，只包含源码、Docker/部署模板和说明文档。不包含私有数据库、媒体文件、`.env`、Android 签名文件、APK/AAB、备份包或任何真实密钥。

## 功能列表

- 自托管 Backend V2，提供图库、相册、资源、收藏、分享、缓存、扫描和系统状态 API。
- 内置 Web UI，可登录浏览相册/图片，管理用户、分享、图库来源文件夹、扫描和缓存。
- Android 客户端源码，可构建 debug APK 并连接到自己的后端服务。
- 支持从旧 MomentPic SQLite 数据库迁移核心数据。
- 支持普通图片文件读取、缩略图生成与本地缓存。
- 支持 zip/cbz 内图片资源读取和缩略图生成；rar/7z 等格式当前会明确返回不支持。
- 支持管理员登记服务端图库来源文件夹，并通过 dry-run 预览扫描结果后再正式导入。
- 支持运行时路径映射，用于把旧数据库里的历史媒体路径映射到当前容器或服务器可读路径。
- 支持公开分享 token、相册分享、普通账号授权访问和收藏相册同步。

## 技术栈

- Backend：Node.js 22+、TypeScript、Fastify、SQLite、sharp、yauzl。
- Web UI：Backend 内置单文件 Web 界面，无独立前端构建链。
- Android：Kotlin/Java Gradle Android 项目。
- 部署：Docker / Docker Compose，支持使用 GHCR 镜像或从源码构建镜像。

## 仓库结构

```text
backend-v2/   Backend V2 源码、Dockerfile、docker-compose.yml、迁移/导入脚本
android/      Android 客户端源码
docs/         发布脱敏与补充说明
```

## Docker Compose 快速部署

### 方式一：使用 GHCR 镜像

当前发布镜像：

```text
ghcr.io/bigfeng09/momentpic-backend-v2:latest
ghcr.io/bigfeng09/momentpic-backend-v2:20260608-223938
```

示例目录：

```bash
mkdir -p /opt/momentpic-v2/data
mkdir -p /opt/momentpic-v2/media
cd /opt/momentpic-v2
```

创建 `.env`：

```bash
cat > .env <<'EOF'
MOMENTPIC_ADMIN_USERNAME=admin
MOMENTPIC_ADMIN_PASSWORD=<请替换为强管理员密码>
MOMENTPIC_AUTH_SECRET=<请替换为长随机密钥>
MOMENTPIC_SEED_DEMO=false
MOMENTPIC_PATH_PREFIX_MAP=[]
MOMENTPIC_THUMBNAIL_CACHE_DIR=/app/data/thumbnails
MOMENTPIC_THUMBNAIL_MAX_SIZE=640
EOF
```

创建 `docker-compose.yml`：

```yaml
services:
  momentpic-backend-v2:
    image: ghcr.io/bigfeng09/momentpic-backend-v2:20260608-223938
    container_name: momentpic-backend-v2
    restart: unless-stopped
    ports:
      - "3211:3211"
    env_file:
      - .env
    environment:
      HOST: "0.0.0.0"
      PORT: "3211"
      MOMENTPIC_DB_PATH: "/app/data/momentpic-v2.sqlite"
      MOMENTPIC_LIBRARY_ALLOWED_ROOTS: "/app/media"
    volumes:
      - /opt/momentpic-v2/data:/app/data
      - /opt/momentpic-v2/media:/app/media:ro
```

启动：

```bash
docker compose up -d
curl http://你的服务器IP:3211/api/v2/health
```

浏览器打开：

```text
http://你的服务器IP:3211
```

### GHCR private 说明

GitHub Container Registry 的包如果仍是 private，未登录或未授权的机器会拉取失败。需要公开发布时，请在 GitHub 仓库或 package 设置中把对应 GHCR package visibility 调整为 public；如果保持 private，请先登录：

```bash
echo <你的GitHubToken> | docker login ghcr.io -u <你的GitHub用户名> --password-stdin
docker compose pull
docker compose up -d
```

## 从源码构建 Backend V2

```bash
git clone https://github.com/bigfeng09/MomentPic.git
cd MomentPic/backend-v2
cp .env.example .env
npm install
npm run typecheck
npm run smoke
npm run build
npm start
```

也可以本地构建 Docker 镜像：

```bash
cd backend-v2
docker build -t momentpic-backend-v2:local .
```

如果使用仓库内 `backend-v2/docker-compose.yml`，请按自己的服务器情况修改 `.env`、媒体挂载路径和 `MOMENTPIC_LIBRARY_ALLOWED_ROOTS`，不要直接使用私有环境里的路径。

## Android App 下载

本仓库默认提供 Android 源码，不把 APK 直接提交到源码树。

获取 debug APK 的推荐方式：

1. 在 GitHub 仓库页面打开 Actions，手动运行 Android debug APK workflow，完成后从构建产物 `MomentPicAndroid-debug-apk` 下载。
2. 如果维护者发布了 GitHub Release，也可以从 Releases 下载对应 APK。
3. 也可以自己 clone 仓库后本地构建：

```bash
cd android
./gradlew :app:assembleDebug
```

构建产物位于：

```text
android/app/build/outputs/apk/debug/app-debug.apk
```

debug APK 未经应用商店审核，也不是正式发布签名包。安装和使用前，请自行确认 APK 来源、安全性、后端服务地址、网络环境和服务端权限配置。

## Android 源码构建与使用

准备 Android SDK 和 JDK 后：

```bash
cd android
bash ./gradlew :app:assembleDebug
```

debug APK 输出位置：

```text
android/app/build/outputs/apk/debug/app-debug.apk
```

安装到手机后，在应用内把后端地址设置为：

```text
http://你的服务器IP:3211
```

Android 客户端支持连接 Backend V2 后浏览相册/图片、查看资源、下载单张原图、使用分享与收藏相关能力。调试环境可使用 Android 模拟器访问宿主机的地址；真实手机需要填写可从手机访问到的服务器地址。

## 图库来源文件夹管理

Backend V2 的图库来源文件夹指的是服务端或容器内可读取的目录，不是浏览器本地目录。建议统一把媒体挂载到容器内固定路径，例如：

```text
/app/media
```

Compose 示例中：

```yaml
volumes:
  - /opt/momentpic-v2/media:/app/media:ro
environment:
  MOMENTPIC_LIBRARY_ALLOWED_ROOTS: "/app/media"
```

管理员登录 Web UI 后，可以在设置页登记图库来源文件夹，例如：

```text
/app/media/family
/app/media/travel
```

扫描建议流程：

1. 先执行 dry-run，只预览将新增、更新、跳过的相册和资源数量，不写入数据库。
2. 确认样本、数量和路径映射正确后，再显式执行正式导入。
3. 正式导入前后端会先备份 SQLite 主文件及 sidecar 文件；导入只 upsert 发现的相册/资源，不删除磁盘文件，也不删除数据库中本次未发现的历史记录。

## 路径映射说明

旧 MomentPic 数据库中可能保存了旧服务器上的绝对媒体路径。迁移到 Docker 或新服务器后，这些路径通常需要映射到当前运行环境可读的路径。

推荐使用 `MOMENTPIC_PATH_PREFIX_MAP`：

```bash
MOMENTPIC_PATH_PREFIX_MAP='[{"from":"/旧服务媒体根/","to":"/app/media/"}]'
```

也支持简单格式：

```bash
MOMENTPIC_PATH_PREFIX_MAP='/旧服务媒体根/=/app/media/'
```

读取原图或缩略图时，后端会先尝试数据库原始路径；如果文件不存在，再按路径映射查找。数据库中的原始路径不会被改写，便于审计迁移来源。映射错误时可以把变量设为 `[]` 并重启服务回滚。

## 旧 MomentPic 数据迁移

旧库导入面向原 MomentPic SQLite 数据结构，主要迁移：

- `library_roots` 到 V2 `library_roots`，API 对外称为 galleries。
- `albums` 到 V2 `albums`。
- `assets` 到 V2 `assets`。
- `shared_albums` 到 V2 `shared_albums`。
- `favorite_albums` 到 V2 `favorite_albums`，只迁移关系，不复制旧快照字段。
- `public_shares` 到 V2 `public_shares`，保留旧 token。
- `users` 会安全迁移普通用户记录，但不会复制旧明文密码；迁移后的用户需要管理员重置密码。

建议流程：

```bash
cd backend-v2
npm install
npm run build
npm run verify:legacy -- --legacy-db /opt/momentpic-v2/import/legacy.sqlite
npm run import:legacy -- --legacy-db /opt/momentpic-v2/import/legacy.sqlite --dry-run
npm run import:legacy:test -- --legacy-db /opt/momentpic-v2/import/legacy.sqlite
```

确认测试导入无误后，再导入主库：

```bash
MOMENTPIC_DB_PATH=/opt/momentpic-v2/data/momentpic-v2.sqlite npm run import:legacy -- --legacy-db /opt/momentpic-v2/import/legacy.sqlite
```

正式导入前还可以执行主库 preflight：

```bash
npm run preflight:main-import -- --legacy-db /opt/momentpic-v2/import/legacy.sqlite --target-db /opt/momentpic-v2/data/momentpic-v2.sqlite
```

注意事项：

- 不要把旧 SQLite、WAL/SHM、备份库或媒体文件提交到 git。
- 迁移前先备份旧库和 V2 主库。
- 旧用户密码不会被复制，管理员需要为普通用户重置密码。
- 迁移是 upsert，不会删除 V2 中已有但旧库不存在的记录。
- 缩略图缓存建议迁移后由 V2 重新生成。

## 安全配置说明

上线前至少修改：

```bash
MOMENTPIC_ADMIN_PASSWORD=<请替换为强管理员密码>
MOMENTPIC_AUTH_SECRET=<请替换为长随机密钥>
```

安全建议：

- 不要提交 `.env`、真实密码、token、SQLite 数据库、媒体文件、签名文件和构建产物。
- `MOMENTPIC_AUTH_SECRET` 应使用长随机值，并只保存在部署环境。
- 媒体目录建议以只读方式挂载到容器。
- `MOMENTPIC_LIBRARY_ALLOWED_ROOTS` 只填写允许扫描的媒体根目录，不要设置为系统根目录。
- 对公网开放时建议放在反向代理之后，并启用 HTTPS。
- GHCR 如果保持 private，请使用最小权限 token 登录拉取；如果要给外部用户直接部署，请把镜像设为 public。

## 当前限制

- rar/cbr/7z/cb7 等非 zip archive 当前不做真实解压读取，会返回不支持。
- 文件系统扫描的第一版只主动导入普通图片文件，不主动导入 zip/cbz 包内资源。
- 相册批量 zip 下载接口尚未实现。
- 缩略图预热是小批量同步执行，不是后台任务队列。
- 该仓库不包含任何私有媒体、旧数据库、生产 `.env`、Android 签名配置或已构建 APK。

## 项目来源与更新说明

本项目基于 MomentPic 继续开发。继续沿用的核心场景包括：

- 个人/家庭图片库自托管管理。
- 服务端登记图库来源文件夹，按相册和资源浏览。
- Android 客户端访问私有相册服务。
- 旧 SQLite 数据库中的图库、相册、资源、收藏、分享和用户关系迁移。
- 旧媒体路径迁移到新服务器或容器路径的映射需求。

相比原 MomentPic，本仓库当前主要更新：

- 新增 Backend V2：Node.js 22 + TypeScript + Fastify + SQLite。
- 新增更安全的登录态、管理员账号 seed、scrypt 密码 hash 和 auth secret 配置。
- 新增旧库 verify、dry-run、测试导入、主库 preflight、正式导入脚本。
- 新增路径前缀映射，不直接改写旧数据库里的原始路径。
- 新增内置 Web UI，用于相册浏览、分享、用户管理、扫描、缓存和系统状态查看。
- 新增图库来源文件夹管理、扫描 dry-run 与受保护的正式导入流程。
- 新增缩略图缓存生命周期接口和 zip/cbz 图片读取能力。
- 新增 Docker Compose 和 GHCR 镜像部署流程。
- 发布仓库经过脱敏整理，移除真实路径、密钥、私有数据库、媒体文件和构建产物。

更多后端细节见 [backend-v2/README.md](backend-v2/README.md)，发布脱敏说明见 [docs/RELEASE_SANITIZATION.md](docs/RELEASE_SANITIZATION.md)。
