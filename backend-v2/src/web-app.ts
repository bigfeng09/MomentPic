const webAppHtml = String.raw`<!doctype html>
<html lang="zh-CN">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
    <title>Moment Pic</title>
    <style>
      :root {
        color-scheme: light;
        --paper: #f7f3ea;
        --panel: #fffdf8;
        --panel-strong: #ffffff;
        --ink: #26231d;
        --muted: #716a5d;
        --line: #e2dacd;
        --accent: #2f6f5e;
        --accent-ink: #ffffff;
        --warm: #b7743a;
        --danger: #a13f32;
        --shadow: 0 18px 44px rgba(50, 43, 31, .12);
        font-family: ui-serif, Georgia, "Times New Roman", serif;
      }

      * { box-sizing: border-box; }
      body {
        margin: 0;
        min-height: 100vh;
        background:
          linear-gradient(135deg, rgba(247, 243, 234, .96), rgba(238, 232, 219, .92)),
          repeating-linear-gradient(90deg, rgba(38, 35, 29, .025) 0 1px, transparent 1px 8px);
        color: var(--ink);
      }

      button, input, select {
        font: inherit;
      }

      button {
        border: 0;
        cursor: pointer;
      }

      .app {
        min-height: 100vh;
      }

      .shell {
        width: min(1180px, calc(100% - 28px));
        margin: 0 auto;
        padding: 18px 0 40px;
      }

      .topbar {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 14px;
        min-height: 58px;
      }

      .brand {
        display: flex;
        align-items: center;
        gap: 11px;
        min-width: 0;
      }

      .mark {
        display: grid;
        place-items: center;
        width: 42px;
        height: 42px;
        border: 1px solid var(--line);
        border-radius: 8px;
        background: var(--panel-strong);
        box-shadow: 0 8px 20px rgba(50, 43, 31, .08);
        color: var(--accent);
        font-size: 22px;
        line-height: 1;
      }

      .brand h1 {
        margin: 0;
        font-size: clamp(22px, 4vw, 34px);
        letter-spacing: 0;
        line-height: 1;
      }

      .brand p {
        margin: 4px 0 0;
        color: var(--muted);
        font-size: 13px;
      }

      .toolbar {
        display: flex;
        align-items: center;
        justify-content: flex-end;
        flex-wrap: wrap;
        gap: 8px;
      }

      .btn {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        gap: 7px;
        min-height: 38px;
        padding: 0 13px;
        border: 1px solid var(--line);
        border-radius: 7px;
        background: var(--panel-strong);
        color: var(--ink);
        text-decoration: none;
        white-space: nowrap;
      }

      .btn.primary {
        border-color: var(--accent);
        background: var(--accent);
        color: var(--accent-ink);
      }

      .btn.warn {
        color: var(--danger);
      }

      .btn.active {
        border-color: var(--accent);
        background: #e7f0eb;
        color: #173d34;
      }

      .btn.small {
        min-height: 32px;
        padding: 0 10px;
        font-size: 13px;
      }

      .btn.icon {
        width: 34px;
        min-height: 34px;
        padding: 0;
        font-size: 20px;
        line-height: 1;
      }

      .btn:disabled {
        cursor: default;
        opacity: .52;
      }

      .screen {
        display: none;
      }

      .screen.active {
        display: block;
      }

      .login-wrap {
        display: grid;
        place-items: center;
        min-height: calc(100vh - 90px);
        padding: 22px 0;
      }

      .login-card {
        width: min(420px, 100%);
        padding: 26px;
        border: 1px solid var(--line);
        border-radius: 8px;
        background: rgba(255, 253, 248, .94);
        box-shadow: var(--shadow);
      }

      .login-card h2 {
        margin: 0 0 8px;
        font-size: 30px;
        letter-spacing: 0;
      }

      .login-card p {
        margin: 0 0 22px;
        color: var(--muted);
      }

      .field {
        display: grid;
        gap: 7px;
        margin: 0 0 14px;
      }

      .field span {
        color: var(--muted);
        font-size: 13px;
      }

      .input, .select {
        width: 100%;
        min-height: 42px;
        border: 1px solid var(--line);
        border-radius: 7px;
        background: #fff;
        color: var(--ink);
        padding: 0 12px;
        outline: none;
      }

      .input:focus, .select:focus {
        border-color: var(--accent);
        box-shadow: 0 0 0 3px rgba(47, 111, 94, .15);
      }

      .filters {
        display: grid;
        grid-template-columns: minmax(180px, 1fr) minmax(140px, 220px) auto auto;
        gap: 10px;
        margin: 22px 0 18px;
      }

      .status {
        min-height: 22px;
        margin: 12px 0;
        color: var(--muted);
      }

      .status.error {
        color: var(--danger);
      }

      .layout {
        display: grid;
        grid-template-columns: 250px minmax(0, 1fr);
        gap: 16px;
        align-items: start;
      }

      .side, .panel {
        border: 1px solid var(--line);
        border-radius: 8px;
        background: rgba(255, 253, 248, .88);
      }

      .side {
        padding: 10px;
        position: sticky;
        top: 10px;
      }

      .side h2, .panel-head h2 {
        margin: 0;
        font-size: 18px;
      }

      .side h2 {
        padding: 6px 7px 10px;
      }

      .gallery-list {
        display: grid;
        gap: 6px;
      }

      .gallery-item {
        display: grid;
        gap: 2px;
        width: 100%;
        padding: 10px;
        border-radius: 7px;
        background: transparent;
        color: var(--ink);
        text-align: left;
      }

      .gallery-item.active {
        background: #e7f0eb;
        color: #173d34;
      }

      .gallery-item small {
        color: var(--muted);
      }

      .panel {
        min-width: 0;
        padding: 14px;
      }

      .panel-head {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 12px;
        margin: 0 0 12px;
      }

      .panel-head p {
        margin: 4px 0 0;
        color: var(--muted);
        font-size: 13px;
      }

      .album-grid {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(190px, 1fr));
        gap: 12px;
      }

      .album-card {
        position: relative;
        display: grid;
        overflow: hidden;
        border: 1px solid var(--line);
        border-radius: 8px;
        background: var(--panel-strong);
        color: var(--ink);
        text-align: left;
        box-shadow: 0 8px 18px rgba(50, 43, 31, .07);
      }

      .album-open {
        display: grid;
        width: 100%;
        border: 0;
        background: transparent;
        color: inherit;
        text-align: left;
      }

      .album-menu-btn {
        position: absolute;
        top: 8px;
        left: 8px;
        z-index: 4;
        background: rgba(255, 253, 248, .94);
        box-shadow: 0 8px 18px rgba(50, 43, 31, .14);
      }

      .action-menu {
        position: fixed;
        z-index: 60;
        display: none;
        min-width: 210px;
        padding: 6px;
        border: 1px solid var(--line);
        border-radius: 8px;
        background: var(--panel-strong);
        box-shadow: var(--shadow);
      }

      .action-menu.active {
        display: grid;
        gap: 4px;
      }

      .action-menu button {
        width: 100%;
        min-height: 36px;
        padding: 0 10px;
        border-radius: 6px;
        background: transparent;
        color: var(--ink);
        text-align: left;
      }

      .action-menu button:hover,
      .action-menu button:focus {
        background: #f0e9dc;
        outline: none;
      }

      .cover {
        position: relative;
        aspect-ratio: 4 / 3;
        background: linear-gradient(145deg, #dfe8df, #f6ecd9);
      }

      .cover img {
        display: block;
        width: 100%;
        height: 100%;
        object-fit: cover;
      }

      .cover .fallback {
        position: absolute;
        inset: 0;
        display: grid;
        place-items: center;
        color: rgba(38, 35, 29, .42);
        font-size: 34px;
      }

      .album-meta {
        min-width: 0;
        padding: 11px;
      }

      .album-meta strong {
        display: block;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
        font-size: 16px;
      }

      .album-meta span {
        display: block;
        margin-top: 5px;
        color: var(--muted);
        font-size: 13px;
      }

      .badge {
        display: inline-flex;
        align-items: center;
        min-height: 24px;
        padding: 0 8px;
        border-radius: 999px;
        background: rgba(47, 111, 94, .1);
        color: #173d34;
        font-size: 12px;
        white-space: nowrap;
      }

      .cover-badge {
        position: absolute;
        top: 8px;
        right: 8px;
        background: rgba(255, 253, 248, .92);
      }

      .settings-layout {
        display: grid;
        grid-template-columns: 210px minmax(0, 1fr);
        gap: 14px;
      }

      .tabs {
        display: grid;
        gap: 7px;
      }

      .settings-section {
        display: none;
      }

      .settings-section.active {
        display: grid;
        gap: 14px;
      }

      .section-grid {
        display: grid;
        grid-template-columns: repeat(2, minmax(0, 1fr));
        gap: 12px;
      }

      .info-box {
        display: grid;
        gap: 6px;
        min-width: 0;
        padding: 12px;
        border: 1px solid var(--line);
        border-radius: 8px;
        background: var(--panel-strong);
      }

      .info-box strong {
        font-size: 14px;
      }

      .info-box span, .info-box code {
        overflow-wrap: anywhere;
        color: var(--muted);
        font-size: 13px;
      }

      .info-box .help-text {
        line-height: 1.5;
      }

      .library-row {
        display: grid;
        grid-template-columns: minmax(120px, 200px) minmax(0, 1fr) auto auto;
        align-items: center;
        gap: 8px;
        padding: 10px;
        border: 1px solid var(--line);
        border-radius: 8px;
        background: var(--panel-strong);
      }

      .library-row strong,
      .library-row code {
        overflow-wrap: anywhere;
      }

      .action-row, .form-row {
        display: flex;
        align-items: center;
        flex-wrap: wrap;
        gap: 8px;
      }

      .form-row {
        align-items: end;
      }

      .form-row .field {
        min-width: min(210px, 100%);
        flex: 1;
        margin: 0;
      }

      .table-list {
        display: grid;
        gap: 8px;
      }

      .list-row {
        display: grid;
        grid-template-columns: minmax(0, 1fr) auto auto;
        align-items: center;
        gap: 8px;
        padding: 10px;
        border: 1px solid var(--line);
        border-radius: 8px;
        background: var(--panel-strong);
      }

      .list-row.share-row {
        grid-template-columns: minmax(0, 1fr) auto;
      }

      .share-search-results {
        max-height: 320px;
        overflow: auto;
      }

      .share-result-row {
        width: 100%;
        grid-template-columns: minmax(0, 1fr) auto;
        color: var(--text);
        cursor: pointer;
        text-align: left;
      }

      .share-result-row.active {
        border-color: var(--accent);
        background: #e7f0eb;
      }

      .share-check {
        width: 18px;
        height: 18px;
        accent-color: var(--accent);
      }

      .list-row strong {
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }

      .mono {
        font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", monospace;
      }

      .pager {
        display: flex;
        align-items: center;
        justify-content: center;
        flex-wrap: wrap;
        gap: 8px;
        margin-top: 16px;
      }

      .asset-grid {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(132px, 1fr));
        gap: 8px;
      }

      .asset-tile {
        position: relative;
        display: block;
        overflow: hidden;
        aspect-ratio: 1 / 1;
        border: 1px solid var(--line);
        border-radius: 7px;
        background: #eee8dc;
      }

      .asset-tile img {
        display: block;
        width: 100%;
        height: 100%;
        object-fit: cover;
        transition: transform .18s ease;
      }

      .asset-tile:hover img {
        transform: scale(1.025);
      }

      .asset-tile::after {
        content: "查看";
        position: absolute;
        right: 7px;
        bottom: 7px;
        padding: 3px 7px;
        border-radius: 999px;
        background: rgba(255, 253, 248, .9);
        color: var(--ink);
        font-size: 12px;
        opacity: 0;
        transition: opacity .18s ease;
      }

      .asset-tile:hover::after {
        opacity: 1;
      }

      .viewer {
        position: fixed;
        inset: 0;
        z-index: 30;
        display: none;
        grid-template-rows: auto 1fr;
        background: rgba(22, 21, 18, .92);
        color: #fff;
      }

      .viewer.active {
        display: grid;
      }

      .viewer-bar {
        position: relative;
        z-index: 3;
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 12px;
        padding: 12px;
      }

      .viewer-title {
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }

      .viewer-stage {
        position: relative;
        display: grid;
        place-items: center;
        min-height: 0;
        padding: 0 12px 18px;
      }

      .viewer-stage img {
        display: block;
        max-width: 100%;
        max-height: 100%;
        object-fit: contain;
        pointer-events: none;
        position: relative;
        z-index: 1;
      }

      .viewer-nav-zone {
        position: absolute;
        top: 0;
        bottom: 18px;
        z-index: 2;
        display: grid;
        place-items: center;
        width: 50%;
        border: 0;
        background: transparent;
        color: #fff;
        font-size: 36px;
        opacity: .18;
        transition: opacity .16s ease, background .16s ease;
      }

      .viewer-nav-zone:hover,
      .viewer-nav-zone:focus-visible {
        background: rgba(255, 255, 255, .06);
        opacity: .82;
      }

      .viewer-nav-zone:disabled {
        cursor: default;
        opacity: 0;
      }

      .viewer-prev-zone {
        left: 0;
      }

      .viewer-next-zone {
        right: 0;
      }

      .modal {
        position: fixed;
        inset: 0;
        z-index: 40;
        display: none;
        place-items: center;
        padding: 18px;
        background: rgba(22, 21, 18, .45);
      }

      .modal.active {
        display: grid;
      }

      .dialog {
        width: min(440px, 100%);
        padding: 16px;
        border: 1px solid var(--line);
        border-radius: 8px;
        background: var(--panel-strong);
        box-shadow: var(--shadow);
      }

      .dialog h3 {
        margin: 0 0 12px;
        font-size: 20px;
      }

      .dialog p {
        margin: 0 0 12px;
        color: var(--muted);
        line-height: 1.45;
      }

      .empty {
        display: grid;
        place-items: center;
        min-height: 180px;
        border: 1px dashed var(--line);
        border-radius: 8px;
        color: var(--muted);
        text-align: center;
      }

      .hidden {
        display: none !important;
      }

      @media (max-width: 760px) {
        .shell {
          width: min(100% - 20px, 1180px);
          padding-top: 10px;
        }

        .topbar {
          align-items: flex-start;
          flex-direction: column;
        }

        .toolbar {
          width: 100%;
          justify-content: flex-start;
        }

        .filters {
          grid-template-columns: 1fr;
        }

        .layout {
          grid-template-columns: 1fr;
        }

        .settings-layout, .section-grid {
          grid-template-columns: 1fr;
        }

        .library-row {
          grid-template-columns: 1fr;
        }

        .side {
          position: static;
        }

        .album-grid {
          grid-template-columns: repeat(auto-fill, minmax(152px, 1fr));
        }

        .asset-grid {
          grid-template-columns: repeat(3, minmax(0, 1fr));
        }
      }
    </style>
  </head>
  <body>
    <div id="app" class="app">
      <section id="login-screen" class="screen active">
        <div class="login-wrap">
          <form id="login-form" class="login-card" autocomplete="on">
            <h2>Moment Pic</h2>
            <p>登录后浏览本机图库、相册和公开分享。</p>
            <label class="field">
              <span>用户名</span>
              <input id="username" class="input" name="username" autocomplete="username" required>
            </label>
            <label class="field">
              <span>密码</span>
              <input id="password" class="input" name="password" type="password" autocomplete="current-password" required>
            </label>
            <button class="btn primary" type="submit">登录</button>
            <div id="login-status" class="status" role="status"></div>
          </form>
        </div>
      </section>

      <section id="main-screen" class="screen">
        <div class="shell">
          <header class="topbar">
            <div class="brand">
              <div class="mark" aria-hidden="true">◧</div>
              <div>
                <h1>Moment Pic</h1>
                <p id="user-line">图库</p>
              </div>
            </div>
            <div class="toolbar">
              <button id="back-btn" class="btn hidden" type="button">返回相册</button>
              <button id="favorite-btn" class="btn hidden" type="button">收藏</button>
              <button id="share-album-btn" class="btn hidden" type="button">分享相册</button>
              <button id="home-btn" class="btn active" type="button">相册</button>
              <button id="settings-btn" class="btn" type="button">设置</button>
              <button id="logout-btn" class="btn warn" type="button">退出</button>
            </div>
          </header>

          <div id="albums-view">
            <div class="filters">
              <input id="search-input" class="input" placeholder="搜索相册" autocomplete="off">
              <select id="gallery-select" class="select" aria-label="图库"></select>
              <button id="search-btn" class="btn primary" type="button">搜索</button>
              <button id="favorite-filter-btn" class="btn" type="button">收藏</button>
            </div>
            <div class="layout">
              <aside class="side">
                <h2>图库</h2>
                <div id="gallery-list" class="gallery-list"></div>
              </aside>
              <main class="panel">
                <div class="panel-head">
                  <div>
                    <h2>相册</h2>
                    <p id="album-count">正在读取...</p>
                  </div>
                </div>
                <div id="albums-status" class="status" role="status"></div>
                <div id="album-grid" class="album-grid"></div>
                <div class="pager">
                  <button id="prev-page" class="btn" type="button">上一页</button>
                  <span id="page-info" class="status"></span>
                  <button id="next-page" class="btn" type="button">下一页</button>
                </div>
              </main>
            </div>
          </div>

          <div id="album-view" class="panel hidden">
            <div class="panel-head">
              <div>
                <h2 id="album-title">相册</h2>
                <p id="album-subtitle"></p>
              </div>
            </div>
            <div id="assets-status" class="status" role="status"></div>
            <div id="asset-grid" class="asset-grid"></div>
            <div class="pager">
              <button id="prev-assets" class="btn" type="button">上一页</button>
              <span id="asset-page-info" class="status"></span>
              <button id="next-assets" class="btn" type="button">下一页</button>
            </div>
          </div>

          <div id="settings-view" class="panel hidden">
            <div class="panel-head">
              <div>
                <h2>设置</h2>
                <p id="settings-summary">系统、账户、分享、缓存、扫描与版本状态</p>
              </div>
              <button id="refresh-settings-btn" class="btn" type="button">刷新</button>
            </div>
            <div class="settings-layout">
              <aside class="side">
                <div class="tabs">
                  <button class="btn active" data-settings-tab="system" type="button">系统</button>
                  <button class="btn" data-settings-tab="account" type="button">账户</button>
                  <button class="btn" data-settings-tab="share" type="button">分享</button>
                  <button class="btn" data-settings-tab="cache" type="button">缓存</button>
                  <button class="btn" data-settings-tab="scan" type="button">扫描</button>
                  <button class="btn" data-settings-tab="about" type="button">关于</button>
                </div>
              </aside>
              <main>
                <div id="settings-status" class="status" role="status"></div>
                <section id="settings-system" class="settings-section active">
                  <div id="gallery-add-panel" class="info-box"></div>
                  <div id="system-grid" class="section-grid"></div>
                  <div id="library-roots-panel" class="table-list"></div>
                </section>
                <section id="settings-account" class="settings-section">
                  <div id="account-panel" class="table-list"></div>
                </section>
                <section id="settings-share" class="settings-section">
                  <div id="share-panel" class="table-list"></div>
                </section>
                <section id="settings-cache" class="settings-section">
                  <div class="action-row">
                    <button id="cache-prune-dryrun-btn" class="btn" type="button">清理预览</button>
                    <button id="cache-warmup-dryrun-btn" class="btn" type="button">预热预览</button>
                    <button id="cache-warmup-run-btn" class="btn primary" type="button">小批量预热</button>
                  </div>
                  <div id="cache-result" class="table-list"></div>
                </section>
                <section id="settings-scan" class="settings-section">
                  <div class="info-box">
                    <strong>真实扫描导入</strong>
                    <span class="help-text">每个图库来源默认先 dry-run 扫描预览；正式导入必须 dryRun=false，并会先备份 SQLite 主文件与 WAL/SHM。禁用来源只修改系统记录，不删除磁盘真实图片。</span>
                  </div>
                  <div class="action-row">
                    <button id="scan-dryrun-btn" class="btn primary" type="button">扫描当前来源 dry-run</button>
                  </div>
                  <div id="scan-result" class="table-list"></div>
                </section>
                <section id="settings-about" class="settings-section">
                  <div id="about-panel" class="table-list"></div>
                </section>
              </main>
            </div>
          </div>
        </div>
      </section>
    </div>

    <div id="viewer" class="viewer" aria-hidden="true">
      <div class="viewer-bar">
        <div id="viewer-title" class="viewer-title"></div>
        <div class="toolbar">
          <button id="share-asset-btn" class="btn" type="button">图片操作</button>
          <a id="open-original" class="btn primary" href="#" target="_blank" rel="noopener">打开原图</a>
          <button id="close-viewer" class="btn" type="button">关闭</button>
        </div>
      </div>
      <div class="viewer-stage">
        <button id="viewer-prev-zone" class="viewer-nav-zone viewer-prev-zone" type="button" aria-label="上一张">‹</button>
        <img id="viewer-img" alt="">
        <button id="viewer-next-zone" class="viewer-nav-zone viewer-next-zone" type="button" aria-label="下一张">›</button>
      </div>
    </div>

    <div id="action-menu" class="action-menu" role="menu" aria-hidden="true"></div>

    <div id="share-dialog" class="modal" aria-hidden="true">
      <div class="dialog" role="dialog" aria-modal="true" aria-labelledby="share-dialog-title">
        <h3 id="share-dialog-title">分享给普通账户</h3>
        <p id="share-dialog-help"></p>
        <label class="field">
          <span>普通账户</span>
          <select id="share-dialog-user" class="select"></select>
        </label>
        <div class="action-row">
          <button id="share-dialog-confirm" class="btn primary" type="button">分享</button>
          <button id="share-dialog-cancel" class="btn" type="button">取消</button>
        </div>
      </div>
    </div>

    <script>
      (() => {
        const state = {
          user: null,
          userProfile: null,
          galleries: [],
          galleryId: "",
          albums: [],
          favorites: new Set(),
          favoriteOnly: false,
          albumPage: 1,
          albumPageSize: 24,
          albumPagination: null,
          keyword: "",
          currentAlbum: null,
          assets: [],
          assetPage: 1,
          assetPageSize: 120,
          assetPagination: null,
          currentAsset: null,
          view: "albums",
          settingsTab: "system",
          systemStatus: null,
          users: [],
          selectedUser: "",
          selectedShareUser: "",
          sharedAlbumIds: new Set(),
          sharedAlbums: [],
          shareAlbumKeyword: "",
          shareAlbumResults: [],
          shareAlbumPagination: null,
          shareAlbumSearchLoading: false,
          shareAlbumSearchTimer: null,
          selectedShareAlbumIds: new Set(),
          shareAlbumSearchComposing: false,
          pendingUserShare: null
        };

        const $ = (id) => document.getElementById(id);
        const setText = (id, value) => { $(id).textContent = value == null ? "" : String(value); };
        const setStatus = (id, value, isError = false) => {
          const el = $(id);
          el.textContent = value || "";
          el.classList.toggle("error", Boolean(isError));
        };
        const show = (id, active) => $(id).classList.toggle("hidden", !active);
        const formatBytes = (bytes) => {
          const value = Number(bytes || 0);
          if (!Number.isFinite(value) || value <= 0) return "0 B";
          const units = ["B", "KiB", "MiB", "GiB"];
          let size = value;
          let unit = 0;
          while (size >= 1024 && unit < units.length - 1) {
            size /= 1024;
            unit += 1;
          }
          return (unit === 0 ? String(Math.round(size)) : size.toFixed(1)) + " " + units[unit];
        };
        const stringify = (value) => {
          if (value == null) return "";
          if (typeof value === "string") return value;
          try { return JSON.stringify(value, null, 2); } catch { return String(value); }
        };
        const api = async (url, options = {}) => {
          const response = await fetch(url, {
            credentials: "include",
            headers: { "content-type": "application/json", ...(options.headers || {}) },
            ...options
          });
          const text = await response.text();
          let payload = {};
          if (text) {
            try { payload = JSON.parse(text); } catch { payload = { message: text }; }
          }
          if (!response.ok || payload.code !== 0) {
            const error = new Error(payload.message || "请求失败");
            error.status = response.status;
            throw error;
          }
          return payload.data;
        };

        const makeInfoBox = (title, value, code = false) => {
          const box = document.createElement("div");
          box.className = "info-box";
          const strong = document.createElement("strong");
          strong.textContent = title;
          const detail = document.createElement(code ? "code" : "span");
          if (code) detail.className = "mono";
          detail.textContent = value == null || value === "" ? "—" : String(value);
          box.append(strong, detail);
          return box;
        };

        const makeResultBox = (title, value) => {
          const box = document.createElement("div");
          box.className = "info-box";
          const strong = document.createElement("strong");
          strong.textContent = title;
          const pre = document.createElement("code");
          pre.className = "mono";
          pre.style.whiteSpace = "pre-wrap";
          pre.textContent = stringify(value);
          box.append(strong, pre);
          return box;
        };

        const renderLibraryRootsPanel = () => {
          const panel = $("library-roots-panel");
          panel.textContent = "";
          panel.appendChild(makeInfoBox("图库来源文件夹", state.galleries.length + " 个来源；禁用只停用系统记录，不删除磁盘真实图片"));
          if (!state.galleries.length) {
            panel.appendChild(makeInfoBox("提示", "还没有已登记的图库来源文件夹"));
            return;
          }
          for (const gallery of state.galleries) {
            const row = document.createElement("div");
            row.className = "library-row";
            const name = document.createElement("strong");
            name.textContent = gallery.name;
            const galleryPath = document.createElement("code");
            galleryPath.className = "mono";
            galleryPath.textContent = gallery.path;
            const count = document.createElement("span");
            count.className = "badge";
            count.textContent = (gallery.enabled ? "启用 · " : "已禁用 · ") + gallery.albumCount + " 个相册";
            const actions = document.createElement("div");
            actions.className = "action-row";
            const dryRun = document.createElement("button");
            dryRun.className = "btn small";
            dryRun.type = "button";
            dryRun.textContent = "扫描预览";
            dryRun.addEventListener("click", () => scanGalleryRoot(gallery.id, true));
            const toggle = document.createElement("button");
            toggle.className = gallery.enabled ? "btn warn small" : "btn small";
            toggle.type = "button";
            toggle.textContent = gallery.enabled ? "禁用来源" : "启用来源";
            toggle.addEventListener("click", () => toggleGalleryRoot(gallery, !gallery.enabled));
            const run = document.createElement("button");
            run.className = "btn primary small";
            run.type = "button";
            run.textContent = "正式导入";
            run.disabled = !gallery.enabled;
            run.addEventListener("click", () => scanGalleryRoot(gallery.id, false));
            actions.append(dryRun, toggle, run);
            row.append(name, galleryPath, count, actions);
            panel.appendChild(row);
          }
        };

        const renderGalleryAddPanel = () => {
          const panel = $("gallery-add-panel");
          panel.textContent = "";
          const title = document.createElement("strong");
          title.textContent = "添加图库来源文件夹";
          const help = document.createElement("span");
          help.className = "help-text";
          help.textContent = "这里填的是后端/Unraid 服务端路径，不是浏览器本地目录；新增只登记来源，默认先扫描预览，不会删除磁盘真实图片。";
          panel.append(title, help);

          if (state.user?.role !== "admin") {
            const notice = document.createElement("span");
            notice.className = "help-text";
            notice.textContent = "当前账号不是管理员，不能添加图库来源文件夹。请联系管理员处理。";
            panel.appendChild(notice);
            return;
          }

          const form = document.createElement("form");
          form.id = "gallery-add-form";
          form.className = "form-row";
          const nameField = document.createElement("label");
          nameField.className = "field";
          nameField.innerHTML = '<span>目录名称（可选）</span><input id="new-gallery-name" class="input" autocomplete="off" placeholder="Unraid Photos">';
          const pathField = document.createElement("label");
          pathField.className = "field";
          pathField.innerHTML = '<span>服务器绝对路径</span><input id="new-gallery-path" class="input mono" autocomplete="off" placeholder="/example/photos" required>';
          const submit = document.createElement("button");
          submit.id = "add-gallery-btn";
          submit.className = "btn primary";
          submit.type = "submit";
          submit.textContent = "添加来源";
          form.append(nameField, pathField, submit);
          form.addEventListener("submit", addGalleryRoot);
          panel.appendChild(form);
        };

        const setMainView = (view) => {
          state.view = view;
          $("albums-view").classList.toggle("hidden", view !== "albums");
          $("album-view").classList.toggle("hidden", view !== "album");
          $("settings-view").classList.toggle("hidden", view !== "settings");
          $("home-btn").classList.toggle("active", view !== "settings");
          $("settings-btn").classList.toggle("active", view === "settings");
          const inAlbum = view === "album" && Boolean(state.currentAlbum);
          show("back-btn", inAlbum);
          show("favorite-btn", inAlbum);
          show("share-album-btn", inAlbum);
          if (view === "settings") loadSettings();
        };

        const setSettingsTab = (tab) => {
          state.settingsTab = tab;
          document.querySelectorAll("[data-settings-tab]").forEach((button) => {
            button.classList.toggle("active", button.dataset.settingsTab === tab);
          });
          ["system", "account", "share", "cache", "scan", "about"].forEach((name) => {
            $("settings-" + name).classList.toggle("active", name === tab);
          });
          if (tab === "account") renderAccountPanel();
          if (tab === "share") {
            renderSharePanel();
            if (state.user?.role === "admin" && !state.shareAlbumResults.length && !state.shareAlbumSearchLoading) {
              loadShareAlbumResults().then(renderSharePanel).catch((error) => setStatus("settings-status", error.message, true));
            }
          }
          if (tab === "about") renderAboutPanel();
        };

        const updateFavoriteFilterButton = () => {
          $("favorite-filter-btn").classList.toggle("active", state.favoriteOnly);
          $("favorite-filter-btn").textContent = state.favoriteOnly ? "全部相册" : "收藏";
        };

        const switchScreen = (name) => {
          $("login-screen").classList.toggle("active", name === "login");
          $("main-screen").classList.toggle("active", name === "main");
        };

        const imageUrl = (assetId, variant) => "/api/v2/assets/" + encodeURIComponent(assetId) + "/" + variant;

        const shareUrl = (path) => {
          const origin = window.location.origin || "";
          return origin + path;
        };

        const writeClipboard = async (text) => {
          if (navigator.clipboard && window.isSecureContext) {
            await navigator.clipboard.writeText(text);
            return true;
          }
          window.prompt("分享链接", text);
          return false;
        };

        const closeActionMenu = () => {
          const menu = $("action-menu");
          menu.classList.remove("active");
          menu.setAttribute("aria-hidden", "true");
          menu.textContent = "";
        };

        const showActionMenu = (anchor, actions) => {
          const menu = $("action-menu");
          menu.textContent = "";
          for (const action of actions) {
            const item = document.createElement("button");
            item.type = "button";
            item.setAttribute("role", "menuitem");
            item.textContent = action.label;
            item.addEventListener("click", async () => {
              closeActionMenu();
              try {
                await action.run();
              } catch (error) {
                setStatus(state.view === "album" ? "assets-status" : "albums-status", error.message || "操作失败", true);
              }
            });
            menu.appendChild(item);
          }
          const rect = anchor.getBoundingClientRect();
          const top = Math.min(window.innerHeight - 10, rect.bottom + 6);
          const left = Math.max(10, Math.min(window.innerWidth - 224, rect.left));
          menu.style.top = top + "px";
          menu.style.left = left + "px";
          menu.classList.add("active");
          menu.setAttribute("aria-hidden", "false");
        };

        const findAlbumById = (albumId) => {
          if (state.currentAlbum?.id === albumId) return state.currentAlbum;
          return state.albums.find((album) => album.id === albumId) || null;
        };

        const downloadOriginal = (asset) => {
          const link = document.createElement("a");
          link.href = imageUrl(asset.id, "original");
          link.download = asset.name || "momentpic-original";
          link.rel = "noopener";
          document.body.appendChild(link);
          link.click();
          link.remove();
        };

        const ensureShareUsers = async () => {
          if (state.user?.role !== "admin") throw new Error("只有管理员可以分享给普通账户");
          if (!state.users.length) await loadUsers();
          return state.users.filter((user) => user.role !== "admin");
        };

        const openUserShareDialog = async ({ albumId, albumName, sourceLabel }) => {
          try {
            const users = await ensureShareUsers();
            if (!users.length) {
              return setStatus(state.view === "album" ? "assets-status" : "albums-status", "没有可分享的普通账户，请先在设置中创建 user 账号。", true);
            }
            state.pendingUserShare = { albumId, albumName };
            const select = $("share-dialog-user");
            select.textContent = "";
            for (const user of users) {
              const option = document.createElement("option");
              option.value = user.username;
              option.textContent = user.username;
              select.appendChild(option);
            }
            select.value = state.selectedShareUser && users.some((user) => user.username === state.selectedShareUser)
              ? state.selectedShareUser
              : users[0].username;
            setText(
              "share-dialog-help",
              sourceLabel + " 将按相册授权给普通账户：" + albumName + "（" + albumId + "）。"
            );
            $("share-dialog").classList.add("active");
            $("share-dialog").setAttribute("aria-hidden", "false");
          } catch (error) {
            setStatus(state.view === "album" ? "assets-status" : "albums-status", error.message, true);
          }
        };

        const closeUserShareDialog = () => {
          $("share-dialog").classList.remove("active");
          $("share-dialog").setAttribute("aria-hidden", "true");
          state.pendingUserShare = null;
        };

        const shareAlbumToUser = async (username, albumId) => {
          await api(
            "/api/v2/users/" + encodeURIComponent(username) + "/shared-albums/" + encodeURIComponent(albumId),
            { method: "PUT", body: JSON.stringify({ shared: true }) }
          );
          if (username === state.selectedShareUser) await loadSharedAlbums(username);
        };

        const albumActions = (album) => [
          {
            label: "下载到本地",
            run: async () => setStatus("albums-status", "当前不支持批量下载相册；请打开相册后在单张照片菜单下载原图。", true)
          },
          {
            label: "分享给普通账户",
            run: async () => openUserShareDialog({ albumId: album.id, albumName: album.name, sourceLabel: "相册" })
          },
          {
            label: "生成公开分享链接",
            run: async () => {
              const url = await createShare("album", album.id);
              setStatus("albums-status", "公开分享链接已生成：" + url);
            }
          }
        ];

        const assetActions = (asset) => [
          {
            label: "下载到本地",
            run: async () => downloadOriginal(asset)
          },
          {
            label: "分享给普通账户",
            run: async () => {
              const album = findAlbumById(asset.albumId);
              await openUserShareDialog({
                albumId: asset.albumId,
                albumName: album?.name || asset.albumId,
                sourceLabel: "单张照片会按所在相册授权"
              });
            }
          },
          {
            label: "生成公开分享链接",
            run: async () => {
              const url = await createShare("asset", asset.id);
              setText("viewer-title", asset.name + " · 分享链接已生成 " + url);
            }
          }
        ];

        const renderGalleries = () => {
          const select = $("gallery-select");
          select.textContent = "";
          const allOption = document.createElement("option");
          allOption.value = "";
          allOption.textContent = "全部图库";
          select.appendChild(allOption);
          const list = $("gallery-list");
          list.textContent = "";

          const renderButton = (gallery) => {
            const btn = document.createElement("button");
            btn.className = "gallery-item" + ((gallery?.id || "") === state.galleryId ? " active" : "");
            btn.type = "button";
            const name = document.createElement("strong");
            name.textContent = gallery ? gallery.name : "全部图库";
            const meta = document.createElement("small");
            meta.textContent = gallery ? gallery.albumCount + " 个相册" : "所有可访问相册";
            btn.append(name, meta);
            btn.addEventListener("click", () => {
              state.galleryId = gallery?.id || "";
              select.value = state.galleryId;
              state.albumPage = 1;
              loadAlbums();
            });
            list.appendChild(btn);
          };

          renderButton(null);
          for (const gallery of state.galleries) {
            const option = document.createElement("option");
            option.value = gallery.id;
            option.textContent = gallery.name;
            select.appendChild(option);
            renderButton(gallery);
          }
          select.value = state.galleryId;
        };

        const renderAlbums = () => {
          const grid = $("album-grid");
          grid.textContent = "";
          const page = state.albumPagination;
          setText("album-count", page ? page.total + " 个相册" : "");
          setText("page-info", page ? page.page + " / " + Math.max(1, page.totalPages) : "");
          $("prev-page").disabled = !page || page.page <= 1;
          $("next-page").disabled = !page || page.page >= page.totalPages;

          if (state.albums.length === 0) {
            const empty = document.createElement("div");
            empty.className = "empty";
            empty.textContent = "没有找到相册";
            grid.appendChild(empty);
            return;
          }

          for (const album of state.albums) {
            const card = document.createElement("div");
            card.className = "album-card";
            const open = document.createElement("button");
            open.className = "album-open";
            open.type = "button";
            const menuButton = document.createElement("button");
            menuButton.className = "btn icon album-menu-btn";
            menuButton.type = "button";
            menuButton.title = "相册操作";
            menuButton.setAttribute("aria-label", "相册操作");
            menuButton.textContent = "⋯";
            const cover = document.createElement("div");
            cover.className = "cover";
            if (album.coverAssetId) {
              const img = document.createElement("img");
              img.loading = "lazy";
              img.alt = album.name;
              img.src = imageUrl(album.coverAssetId, "thumbnail");
              cover.appendChild(img);
            } else {
              const fallback = document.createElement("div");
              fallback.className = "fallback";
              fallback.textContent = "◧";
              cover.appendChild(fallback);
            }
            if (state.favorites.has(album.id)) {
              const badge = document.createElement("span");
              badge.className = "badge cover-badge";
              badge.textContent = "收藏";
              cover.appendChild(badge);
            }
            const meta = document.createElement("div");
            meta.className = "album-meta";
            const title = document.createElement("strong");
            title.textContent = (state.favorites.has(album.id) ? "★ " : "") + album.name;
            const detail = document.createElement("span");
            detail.textContent = album.assetCount + " 张 · " + album.sourceType;
            meta.append(title, detail);
            open.append(cover, meta);
            open.addEventListener("click", () => openAlbum(album));
            menuButton.addEventListener("click", (event) => {
              event.stopPropagation();
              showActionMenu(menuButton, albumActions(album));
            });
            card.append(open, menuButton);
            grid.appendChild(card);
          }
        };

        const loadMe = async () => {
          const data = await api("/api/v2/me");
          state.user = data.user;
          setText("user-line", state.user ? state.user.username + " · " + state.user.role : "图库");
        };

        const loadFavorites = async () => {
          const data = await api("/api/v2/favorite-albums");
          state.favorites = new Set((data.items || []).map((album) => album.id));
        };

        const loadSystemStatus = async () => {
          state.systemStatus = await api("/api/v2/system/status");
          state.userProfile = state.systemStatus.user;
          return state.systemStatus;
        };

        const loadGalleries = async () => {
          const data = await api("/api/v2/galleries");
          state.galleries = data.items || [];
          renderGalleries();
        };

        const loadAlbums = async () => {
          setStatus("albums-status", "正在读取相册...");
          try {
            if (state.favoriteOnly) {
              const data = await api("/api/v2/favorite-albums");
              let items = data.items || [];
              if (state.galleryId) items = items.filter((album) => album.galleryId === state.galleryId);
              if (state.keyword) {
                const keyword = state.keyword.toLowerCase();
                items = items.filter((album) => String(album.name || "").toLowerCase().includes(keyword));
              }
              const total = items.length;
              const totalPages = Math.max(1, Math.ceil(total / state.albumPageSize));
              state.albumPage = Math.min(state.albumPage, totalPages);
              const start = (state.albumPage - 1) * state.albumPageSize;
              state.albums = items.slice(start, start + state.albumPageSize);
              state.albumPagination = { page: state.albumPage, pageSize: state.albumPageSize, total, totalPages };
            } else {
              const params = new URLSearchParams({
                page: String(state.albumPage),
                pageSize: String(state.albumPageSize),
                sortBy: "updatedAt",
                sortOrder: "desc"
              });
              if (state.galleryId) params.set("galleryId", state.galleryId);
              if (state.keyword) params.set("keyword", state.keyword);
              const data = await api("/api/v2/albums?" + params.toString());
              state.albums = data.items || [];
              state.albumPagination = data.pagination;
            }
            setStatus("albums-status", "");
            renderGalleries();
            renderAlbums();
            updateFavoriteFilterButton();
          } catch (error) {
            if (error.status === 401) return requireLogin();
            setStatus("albums-status", error.message, true);
          }
        };

        const requireLogin = () => {
          switchScreen("login");
          $("password").value = "";
        };

        const enterApp = async () => {
          switchScreen("main");
          try {
            await loadMe();
            await Promise.all([loadGalleries(), loadFavorites(), loadSystemStatus()]);
            await loadAlbums();
          } catch (error) {
            if (error.status === 401) return requireLogin();
            setStatus("albums-status", error.message, true);
          }
        };

        const openAlbum = async (album) => {
          state.currentAlbum = album;
          state.assetPage = 1;
          setMainView("album");
          setText("album-title", album.name);
          setText("album-subtitle", album.assetCount + " 张 · " + album.sourceType);
          updateFavoriteButton();
          await loadAssets();
        };

        const updateFavoriteButton = () => {
          if (!state.currentAlbum) return;
          $("favorite-btn").textContent = state.favorites.has(state.currentAlbum.id) ? "取消收藏" : "收藏";
        };

        const backToAlbums = () => {
          state.currentAlbum = null;
          state.assets = [];
          setMainView("albums");
          closeViewer();
          renderAlbums();
        };

        const loadAssets = async () => {
          if (!state.currentAlbum) return;
          setStatus("assets-status", "正在读取图片...");
          const params = new URLSearchParams({ page: String(state.assetPage), pageSize: String(state.assetPageSize) });
          try {
            const data = await api("/api/v2/albums/" + encodeURIComponent(state.currentAlbum.id) + "/assets?" + params.toString());
            state.assets = data.items || [];
            state.assetPagination = data.pagination;
            renderAssets();
            setStatus("assets-status", "");
          } catch (error) {
            setStatus("assets-status", error.message, true);
          }
        };

        const renderAssets = () => {
          const grid = $("asset-grid");
          grid.textContent = "";
          const page = state.assetPagination;
          setText("asset-page-info", page ? page.page + " / " + Math.max(1, page.totalPages) : "");
          $("prev-assets").disabled = !page || page.page <= 1;
          $("next-assets").disabled = !page || page.page >= page.totalPages;

          if (state.assets.length === 0) {
            const empty = document.createElement("div");
            empty.className = "empty";
            empty.textContent = "这个相册没有图片";
            grid.appendChild(empty);
            return;
          }

          for (const asset of state.assets) {
            const tile = document.createElement("button");
            tile.className = "asset-tile";
            tile.type = "button";
            const img = document.createElement("img");
            img.loading = "lazy";
            img.alt = asset.name;
            img.src = imageUrl(asset.id, "thumbnail");
            tile.appendChild(img);
            tile.addEventListener("click", () => openViewer(asset));
            grid.appendChild(tile);
          }
          if (state.currentAsset) updateViewerNav();
        };

        const preloadNeighborAssets = (asset) => {
          const config = state.systemStatus?.systemConfig || {};
          const before = Math.max(0, Math.min(5, Number(config.preloadBefore ?? 0)));
          const after = Math.max(0, Math.min(5, Number(config.preloadAfter ?? 0)));
          const index = state.assets.findIndex((item) => item.id === asset.id);
          if (index < 0 || before + after <= 0) return;
          const candidates = [];
          for (let offset = 1; offset <= before; offset += 1) {
            if (state.assets[index - offset]) candidates.push(state.assets[index - offset]);
          }
          for (let offset = 1; offset <= after; offset += 1) {
            if (state.assets[index + offset]) candidates.push(state.assets[index + offset]);
          }
          for (const item of candidates) {
            const image = new Image();
            image.src = imageUrl(item.id, "original");
          }
        };

        const openViewer = (asset) => {
          state.currentAsset = asset;
          setText("viewer-title", asset.name);
          $("viewer-img").src = imageUrl(asset.id, "original");
          $("viewer-img").alt = asset.name;
          $("open-original").href = imageUrl(asset.id, "original");
          $("viewer").classList.add("active");
          $("viewer").setAttribute("aria-hidden", "false");
          updateViewerNav();
          preloadNeighborAssets(asset);
        };

        const closeViewer = () => {
          $("viewer").classList.remove("active");
          $("viewer").setAttribute("aria-hidden", "true");
          $("viewer-img").src = "";
          state.currentAsset = null;
          updateViewerNav();
        };

        const updateViewerNav = () => {
          const index = state.assets.findIndex((item) => item.id === state.currentAsset?.id);
          const page = state.assetPagination;
          $("viewer-prev-zone").disabled = index <= 0 && (!page || page.page <= 1);
          $("viewer-next-zone").disabled = index < 0 || (index >= state.assets.length - 1 && (!page || page.page >= page.totalPages));
        };

        const changeViewerAsset = async (direction) => {
          if (!state.currentAsset) return;
          const index = state.assets.findIndex((item) => item.id === state.currentAsset.id);
          if (index < 0) return;
          const nextAsset = state.assets[index + direction];
          if (nextAsset) {
            openViewer(nextAsset);
            return;
          }
          const page = state.assetPagination;
          if (direction < 0 && page && page.page > 1) {
            state.assetPage -= 1;
            await loadAssets();
            if (state.assets.length) openViewer(state.assets[state.assets.length - 1]);
            return;
          }
          if (direction > 0 && page && page.page < page.totalPages) {
            state.assetPage += 1;
            await loadAssets();
            if (state.assets.length) openViewer(state.assets[0]);
            return;
          }
          updateViewerNav();
        };

        const createShare = async (type, targetId) => {
          const data = await api("/api/v2/public-shares", {
            method: "POST",
            body: JSON.stringify({ type, targetId })
          });
          const url = shareUrl(data.url);
          await writeClipboard(url);
          return url;
        };

        const loadUsers = async () => {
          if (state.user?.role !== "admin") return [];
          const data = await api("/api/v2/users");
          state.users = data.items || [];
          if (!state.selectedUser && state.users.length) state.selectedUser = state.users[0].username;
          if (!state.selectedShareUser && state.users.length) state.selectedShareUser = state.users.find((user) => user.role !== "admin")?.username || state.users[0].username;
          return state.users;
        };

        const makePreloadSettingsBox = (config) => {
          const box = document.createElement("div");
          box.className = "info-box";
          const title = document.createElement("strong");
          title.textContent = "预加载图片数量";
          const help = document.createElement("span");
          help.className = "help-text";
          help.textContent = "控制网页查看器打开照片时，前后各预加载多少张原图，范围 0-5。";
          box.append(title, help);

          if (state.user?.role !== "admin") {
            const value = document.createElement("span");
            value.textContent = "当前设置：前 " + (config.preloadBefore ?? "—") + " / 后 " + (config.preloadAfter ?? "—");
            box.appendChild(value);
            return box;
          }

          const row = document.createElement("div");
          row.className = "form-row";
          const beforeField = document.createElement("label");
          beforeField.className = "field";
          beforeField.innerHTML = '<span>向前预加载</span><input id="preload-before-input" class="input" type="number" min="0" max="5" step="1">';
          const afterField = document.createElement("label");
          afterField.className = "field";
          afterField.innerHTML = '<span>向后预加载</span><input id="preload-after-input" class="input" type="number" min="0" max="5" step="1">';
          const save = document.createElement("button");
          save.className = "btn primary";
          save.type = "button";
          save.textContent = "保存预加载";
          row.append(beforeField, afterField, save);
          box.appendChild(row);
          setTimeout(() => {
            $("preload-before-input").value = String(config.preloadBefore ?? 0);
            $("preload-after-input").value = String(config.preloadAfter ?? 0);
          }, 0);
          save.addEventListener("click", async () => {
            const preloadBefore = Number($("preload-before-input").value);
            const preloadAfter = Number($("preload-after-input").value);
            try {
              await api("/api/v2/system/config", {
                method: "PATCH",
                body: JSON.stringify({ preloadBefore, preloadAfter })
              });
              await loadSystemStatus();
              renderSystemPanel();
              setStatus("settings-status", "预加载设置已保存");
            } catch (error) {
              setStatus("settings-status", error.message, true);
            }
          });
          return box;
        };

        const renderSystemPanel = () => {
          renderGalleryAddPanel();
          renderLibraryRootsPanel();
          const grid = $("system-grid");
          grid.textContent = "";
          const status = state.systemStatus;
          if (!status) {
            grid.appendChild(makeInfoBox("状态", "尚未读取"));
            return;
          }
          const cache = status.cacheStatus || {};
          const archive = status.archiveReadiness || {};
          const config = status.systemConfig || {};
          grid.append(
            makeInfoBox("Backend URL", status.backendUrl, true),
            makeInfoBox("Health", (status.health?.status || "unknown") + " · " + (status.health?.version || "v2")),
            makeInfoBox("登录用户", (status.user?.username || "") + " · " + (status.user?.role || "")),
            makeInfoBox("Archive readiness", archive.zip?.status || "unknown"),
            makeInfoBox("Cache status", (cache.files || 0) + " files · " + formatBytes(cache.bytes || 0)),
            makeInfoBox("图库数据", (status.counts?.galleries || 0) + " 图库 · " + (status.counts?.albums || 0) + " 相册 · " + (status.counts?.assets || 0) + " 图片"),
            makeInfoBox("轮询", config.enablePolling ? "开启 · " + config.pollingInterval + " ms" : "关闭"),
            makePreloadSettingsBox(config),
            makeInfoBox("最近扫描", status.scan ? status.scan.status + " · " + status.scan.taskId : "无记录", true),
            makeInfoBox("运行限制", "thumbnail " + status.runtime?.thumbnailMaxSize + "px · archive entry " + formatBytes(status.runtime?.archiveEntryMaxBytes))
          );
        };

        async function addGalleryRoot(event) {
          event.preventDefault();
          if (state.user?.role !== "admin") {
            setStatus("settings-status", "当前账号不是管理员，不能添加图库来源文件夹。", true);
            return;
          }
          const name = $("new-gallery-name").value.trim();
          const libraryPath = $("new-gallery-path").value.trim();
          if (!libraryPath) return setStatus("settings-status", "服务器绝对路径不能为空", true);
          $("add-gallery-btn").disabled = true;
          setStatus("settings-status", "正在添加相册库目录...");
          try {
            const data = await api("/api/v2/galleries", {
              method: "POST",
              body: JSON.stringify({ name, path: libraryPath })
            });
            await loadGalleries();
            await loadSettings();
            const item = data.item || {};
            setStatus(
              "settings-status",
              "图库来源文件夹已添加：" + (item.name || name || libraryPath) + "。默认请先 dry-run 扫描预览。"
            );
          } catch (error) {
            $("add-gallery-btn").disabled = false;
            setStatus("settings-status", "后端错误 " + (error.status || "") + "：" + error.message, true);
          }
        }

        const toggleGalleryRoot = async (gallery, enabled) => {
          if (state.user?.role !== "admin") return setStatus("settings-status", "只有管理员可以管理图库来源", true);
          if (!enabled && !window.confirm("禁用来源 " + gallery.name + "？只停用系统记录，不删除磁盘真实图片。")) return;
          try {
            await api("/api/v2/galleries/" + encodeURIComponent(gallery.id), {
              method: "PATCH",
              body: JSON.stringify({ enabled })
            });
            await loadGalleries();
            await loadSettings();
            setStatus("settings-status", enabled ? "图库来源已启用：" + gallery.name : "图库来源已禁用：" + gallery.name);
          } catch (error) {
            setStatus("settings-status", error.message, true);
          }
        };

        const scanGalleryRoot = async (galleryId, dryRun) => {
          const gallery = state.galleries.find((item) => item.id === galleryId);
          if (!gallery) return setStatus("settings-status", "请选择一个图库来源", true);
          if (state.user?.role !== "admin") return setStatus("settings-status", "只有管理员可以扫描导入", true);
          if (!dryRun) {
            const confirmed = window.confirm(
              "正式导入来源 " + gallery.name + "？将使用 dryRun=false 写入 SQLite；执行前后端会备份 DB，不会删除磁盘图片，也不会删除历史记录。"
            );
            if (!confirmed) return;
          }
          try {
            const data = await api("/api/v2/galleries/" + encodeURIComponent(galleryId) + "/scan", {
              method: "POST",
              body: JSON.stringify({ dryRun })
            });
            $("scan-result").textContent = "";
            $("scan-result").appendChild(makeResultBox(dryRun ? "扫描 dry-run 预览" : "正式扫描导入", data));
            await loadGalleries();
            await loadSystemStatus();
            renderSystemPanel();
            setStatus("settings-status", dryRun ? "扫描预览完成：" + gallery.name : "正式导入完成：" + gallery.name);
          } catch (error) {
            setStatus("settings-status", error.message, true);
          }
        };

        const renderAccountPanel = () => {
          const panel = $("account-panel");
          panel.textContent = "";
          const profile = state.systemStatus?.user || state.userProfile || state.user;
          panel.appendChild(makeInfoBox("当前账号", (profile?.username || "") + " · " + (profile?.role || "")));
          if (profile?.passwordResetRequired) panel.appendChild(makeInfoBox("密码状态", "该账号需要管理员重置密码"));
          if (state.user?.role !== "admin") {
            panel.appendChild(makeInfoBox("账户管理", "普通用户只能查看当前账号信息；如需改密请联系管理员"));
            return;
          }

          const form = document.createElement("div");
          form.className = "info-box";
          const title = document.createElement("strong");
          title.textContent = "添加 / 更新 / 重置密码";
          const row = document.createElement("div");
          row.className = "form-row";
          const usernameField = document.createElement("label");
          usernameField.className = "field";
          usernameField.innerHTML = '<span>用户名</span><input id="settings-user-name" class="input" autocomplete="off">';
          const passwordField = document.createElement("label");
          passwordField.className = "field";
          passwordField.innerHTML = '<span>新密码（更新角色可留空）</span><input id="settings-user-password" class="input" type="password" autocomplete="new-password">';
          const roleField = document.createElement("label");
          roleField.className = "field";
          roleField.innerHTML = '<span>角色</span><select id="settings-user-role" class="select"><option value="user">user</option><option value="admin">admin</option></select>';
          const save = document.createElement("button");
          save.className = "btn primary";
          save.type = "button";
          save.textContent = "保存";
          const remove = document.createElement("button");
          remove.className = "btn warn";
          remove.type = "button";
          remove.textContent = "删除";
          row.append(usernameField, passwordField, roleField, save, remove);
          form.append(title, row);
          panel.appendChild(form);

          const fillUser = (user) => {
            state.selectedUser = user.username;
            $("settings-user-name").value = user.username;
            $("settings-user-password").value = "";
            $("settings-user-role").value = user.role;
          };

          const selected = state.users.find((user) => user.username === state.selectedUser) || state.users[0];
          if (selected) setTimeout(() => fillUser(selected), 0);

          save.addEventListener("click", async () => {
            const username = $("settings-user-name").value.trim();
            const password = $("settings-user-password").value;
            const role = $("settings-user-role").value;
            if (!username) return setStatus("settings-status", "用户名不能为空", true);
            const existing = state.users.find((user) => user.username === state.selectedUser);
            if (!existing && !password) return setStatus("settings-status", "新增用户必须填写密码", true);
            await api(existing ? "/api/v2/users/" + encodeURIComponent(existing.username) : "/api/v2/users", {
              method: existing ? "PATCH" : "POST",
              body: JSON.stringify({ username, password, role })
            });
            setStatus("settings-status", "用户已保存");
            await loadUsers();
            state.selectedUser = username;
            renderAccountPanel();
          });

          remove.addEventListener("click", async () => {
            const selectedUser = state.users.find((user) => user.username === state.selectedUser);
            if (!selectedUser) return;
            if (!window.confirm("删除用户 " + selectedUser.username + "？")) return;
            await api("/api/v2/users/" + encodeURIComponent(selectedUser.username), { method: "DELETE", body: "{}" });
            state.selectedUser = "";
            setStatus("settings-status", "用户已删除");
            await loadUsers();
            renderAccountPanel();
          });

          const list = document.createElement("div");
          list.className = "table-list";
          for (const user of state.users) {
            const row = document.createElement("div");
            row.className = "list-row";
            const name = document.createElement("strong");
            name.textContent = user.username;
            const role = document.createElement("span");
            role.className = "badge";
            role.textContent = user.role + (user.passwordResetRequired ? " · 需重置密码" : "");
            const edit = document.createElement("button");
            edit.className = "btn small";
            edit.type = "button";
            edit.textContent = "选择";
            edit.addEventListener("click", () => fillUser(user));
            row.append(name, role, edit);
            list.appendChild(row);
          }
          panel.appendChild(list);
        };

        const loadSharedAlbums = async (username) => {
          if (!username || state.user?.role !== "admin") return;
          const data = await api("/api/v2/users/" + encodeURIComponent(username) + "/shared-albums");
          state.sharedAlbumIds = new Set(data.albumIds || []);
          state.sharedAlbums = data.items || [];
        };

        const loadShareAlbumResults = async (keyword = state.shareAlbumKeyword) => {
          if (state.user?.role !== "admin") return;
          state.shareAlbumSearchLoading = true;
          try {
            const normalizedKeyword = String(keyword || "").trim();
            state.shareAlbumKeyword = normalizedKeyword;
            if (normalizedKeyword) {
              const params = new URLSearchParams({
                page: "1",
                pageSize: "50",
                keyword: normalizedKeyword,
                sortBy: "updatedAt",
                sortOrder: "desc"
              });
              const data = await api("/api/v2/albums?" + params.toString());
              state.shareAlbumResults = data.items || [];
              state.shareAlbumPagination = data.pagination || null;
            } else {
              const data = await api("/api/v2/favorite-albums");
              state.shareAlbumResults = (data.items || []).slice(0, 50);
              state.shareAlbumPagination = null;
            }
          } finally {
            state.shareAlbumSearchLoading = false;
          }
        };

        const renderSharePanel = () => {
          const panel = $("share-panel");
          panel.textContent = "";
          if (state.user?.role !== "admin") {
            panel.appendChild(makeInfoBox("分享设置", "普通用户只能访问管理员授权的相册"));
            return;
          }
          const shareUsers = state.users.filter((user) => user.role !== "admin");
          if (!shareUsers.length) {
            panel.appendChild(makeInfoBox("用户", "没有可选普通账户；请先在账户设置中创建 role=user 的账号"));
            return;
          }
          if (!state.selectedShareUser || !shareUsers.some((user) => user.username === state.selectedShareUser)) {
            state.selectedShareUser = shareUsers[0].username;
          }
          const box = document.createElement("div");
          box.className = "info-box";
          const title = document.createElement("strong");
          title.textContent = "分享相册给普通账户";
          const row = document.createElement("div");
          row.className = "form-row";
          const userField = document.createElement("label");
          userField.className = "field";
          const select = document.createElement("select");
          select.id = "share-user-select";
          select.className = "select";
          for (const user of shareUsers) {
            const option = document.createElement("option");
            option.value = user.username;
            option.textContent = user.username;
            select.appendChild(option);
          }
          select.value = state.selectedShareUser;
          const label = document.createElement("span");
          label.textContent = "普通账户";
          userField.append(label, select);

          const albumField = document.createElement("label");
          albumField.className = "field";
          const albumLabel = document.createElement("span");
          albumLabel.textContent = "搜索相册";
          const albumSearch = document.createElement("input");
          albumSearch.id = "share-album-search";
          albumSearch.className = "input";
          albumSearch.autocomplete = "off";
          albumSearch.placeholder = "输入相册名关键词";
          albumSearch.value = state.shareAlbumKeyword;
          albumField.append(albumLabel, albumSearch);
          const share = document.createElement("button");
          share.className = "btn primary";
          share.type = "button";
          share.textContent = "分享 " + state.selectedShareAlbumIds.size + " 个相册";
          share.disabled = state.selectedShareAlbumIds.size === 0 || state.shareAlbumSearchLoading;
          row.append(userField, albumField, share);
          const help = document.createElement("span");
          help.className = "help-text";
          help.textContent = "默认显示收藏相册最新 50 个；输入关键词搜索全库相册，最多 50 条；中文输入 compositionstart/compositionend 期间不触发搜索重渲染。";
          const selected = document.createElement("span");
          selected.className = "help-text";
          selected.textContent = state.selectedShareAlbumIds.size > 0
            ? "当前已选择 " + state.selectedShareAlbumIds.size + " 个相册"
            : (state.shareAlbumSearchLoading ? "正在搜索相册..." : "没有可分享的搜索结果");
          box.append(title, help, row, selected);
          panel.appendChild(box);

          select.addEventListener("change", async () => {
            state.selectedShareUser = select.value;
            await loadSharedAlbums(state.selectedShareUser);
            renderSharePanel();
          });
          albumSearch.addEventListener("compositionstart", () => {
            state.shareAlbumSearchComposing = true;
            if (state.shareAlbumSearchTimer) window.clearTimeout(state.shareAlbumSearchTimer);
          });
          albumSearch.addEventListener("compositionend", async () => {
            state.shareAlbumSearchComposing = false;
            state.shareAlbumKeyword = albumSearch.value.trim();
            if (state.shareAlbumSearchTimer) window.clearTimeout(state.shareAlbumSearchTimer);
            try {
              await loadShareAlbumResults(state.shareAlbumKeyword);
              renderSharePanel();
            } catch (error) {
              setStatus("settings-status", error.message, true);
            }
          });
          albumSearch.addEventListener("input", () => {
            state.shareAlbumKeyword = albumSearch.value.trim();
            if (state.shareAlbumSearchComposing) return;
          });
          albumSearch.addEventListener("keydown", async (event) => {
            if (event.key !== "Enter") return;
            event.preventDefault();
            if (state.shareAlbumSearchComposing) return;
            if (state.shareAlbumSearchTimer) window.clearTimeout(state.shareAlbumSearchTimer);
            try {
              await loadShareAlbumResults(albumSearch.value);
              renderSharePanel();
            } catch (error) {
              setStatus("settings-status", error.message, true);
            }
          });
          share.addEventListener("click", async () => {
            if (!state.selectedShareUser || state.selectedShareAlbumIds.size === 0) return;
            for (const albumId of state.selectedShareAlbumIds) {
              await shareAlbumToUser(state.selectedShareUser, albumId);
            }
            await loadSharedAlbums(state.selectedShareUser);
            setStatus("settings-status", "已分享 " + state.selectedShareAlbumIds.size + " 个相册给 " + state.selectedShareUser);
            renderSharePanel();
          });

          const resultList = document.createElement("div");
          resultList.className = "table-list share-search-results";
          resultList.appendChild(makeInfoBox(
            state.shareAlbumKeyword ? "搜索结果" : "收藏相册最新 50 个",
            state.shareAlbumSearchLoading
              ? "正在搜索相册..."
              : (state.shareAlbumKeyword
                ? "从 /api/v2/albums?page=1&pageSize=50&keyword=...&sortBy=updatedAt&sortOrder=desc 读取；输入关键词搜索全库相册，最多 50 条；结果最多显示前 50 条"
                : "从 /api/v2/favorite-albums 读取；默认显示收藏相册最新 50 个")
          ));
          const selectActions = document.createElement("div");
          selectActions.className = "action-row";
          const selectCurrent = document.createElement("button");
          selectCurrent.className = "btn small";
          selectCurrent.type = "button";
          selectCurrent.textContent = "全选当前结果";
          selectCurrent.disabled = state.shareAlbumResults.length === 0;
          selectCurrent.addEventListener("click", () => {
            for (const album of state.shareAlbumResults) state.selectedShareAlbumIds.add(album.id);
            renderSharePanel();
          });
          const clearSelection = document.createElement("button");
          clearSelection.className = "btn warn small";
          clearSelection.type = "button";
          clearSelection.textContent = "清空选择";
          clearSelection.disabled = state.selectedShareAlbumIds.size === 0;
          clearSelection.addEventListener("click", () => {
            state.selectedShareAlbumIds.clear();
            renderSharePanel();
          });
          selectActions.append(selectCurrent, clearSelection);
          resultList.appendChild(selectActions);
          if (state.shareAlbumResults.length) {
            for (const album of state.shareAlbumResults) {
              const item = document.createElement("button");
              item.className = "list-row share-row share-result-row";
              item.classList.toggle("active", state.selectedShareAlbumIds.has(album.id));
              item.type = "button";
              const name = document.createElement("div");
              const strong = document.createElement("strong");
              strong.textContent = album.name;
              const code = document.createElement("code");
              code.className = "mono";
              code.textContent = album.id;
              name.append(strong, code);
              const check = document.createElement("input");
              check.className = "share-check";
              check.type = "checkbox";
              check.checked = state.selectedShareAlbumIds.has(album.id);
              check.setAttribute("aria-label", "选择相册 " + album.name);
              item.append(name, check);
              item.addEventListener("click", () => {
                if (state.selectedShareAlbumIds.has(album.id)) state.selectedShareAlbumIds.delete(album.id);
                else state.selectedShareAlbumIds.add(album.id);
                renderSharePanel();
              });
              resultList.appendChild(item);
            }
          } else if (!state.shareAlbumSearchLoading) {
            resultList.appendChild(makeInfoBox(
              "提示",
              state.shareAlbumKeyword ? "没有匹配相册，请换一个关键词搜索全库相册" : "暂无收藏相册，可输入关键词搜索全库相册"
            ));
          }
          panel.appendChild(resultList);

          const list = document.createElement("div");
          list.className = "table-list";
          list.appendChild(makeInfoBox("已分享给 " + state.selectedShareUser, state.sharedAlbumIds.size + " 个相册"));
          if (state.sharedAlbums.length) {
            for (const album of state.sharedAlbums) {
              const item = document.createElement("div");
              item.className = "list-row share-row";
              const name = document.createElement("div");
              const strong = document.createElement("strong");
              strong.textContent = album.name;
              const code = document.createElement("code");
              code.className = "mono";
              code.textContent = album.id;
              name.append(strong, code);
              const remove = document.createElement("button");
              remove.className = "btn warn small";
              remove.type = "button";
              remove.textContent = "取消分享";
              remove.addEventListener("click", async () => {
                await api(
                  "/api/v2/users/" + encodeURIComponent(state.selectedShareUser) + "/shared-albums/" + encodeURIComponent(album.id),
                  { method: "DELETE", body: "{}" }
                );
                await loadSharedAlbums(state.selectedShareUser);
                setStatus("settings-status", "已取消分享：" + album.name);
                renderSharePanel();
              });
              item.append(name, remove);
              list.appendChild(item);
            }
          } else {
            list.appendChild(makeInfoBox("提示", "该账户还没有已分享相册"));
          }
          panel.appendChild(list);
        };

        const renderAboutPanel = () => {
          const panel = $("about-panel");
          panel.textContent = "";
          panel.append(
            makeInfoBox("参考旧版设置", "system_config 轮询/预加载、多用户、相册分享、收藏相册、公开链接、图库扫描"),
            makeInfoBox("Web UI", "单文件、无 CDN、cookie 登录、收藏与 Android 服务端收藏表同步"),
            makeInfoBox("安全边界", "设置页不显示 auth secret、密码 hash、数据库路径或媒体绝对路径"),
            makeInfoBox("版本", state.systemStatus?.health?.version || "v2")
          );
        };

        const loadSettings = async () => {
          setStatus("settings-status", "正在读取设置...");
          try {
            await loadSystemStatus();
            if (state.user?.role === "admin") {
              await loadUsers();
              await loadSharedAlbums(state.selectedShareUser);
              await loadShareAlbumResults();
            }
            renderSystemPanel();
            renderAccountPanel();
            renderSharePanel();
            renderAboutPanel();
            setStatus("settings-status", "");
          } catch (error) {
            if (error.status === 401) return requireLogin();
            setStatus("settings-status", error.message, true);
          }
        };

        $("login-form").addEventListener("submit", async (event) => {
          event.preventDefault();
          setStatus("login-status", "正在登录...");
          try {
            await api("/api/v2/auth/login", {
              method: "POST",
              body: JSON.stringify({ username: $("username").value, password: $("password").value })
            });
            setStatus("login-status", "");
            await enterApp();
          } catch (error) {
            setStatus("login-status", error.message, true);
          }
        });

        $("logout-btn").addEventListener("click", async () => {
          try { await api("/api/v2/auth/logout", { method: "POST", body: "{}" }); } catch {}
          requireLogin();
        });

        $("home-btn").addEventListener("click", () => {
          if (state.currentAlbum) setMainView("album");
          else setMainView("albums");
        });
        $("settings-btn").addEventListener("click", () => setMainView("settings"));
        $("refresh-settings-btn").addEventListener("click", loadSettings);
        document.querySelectorAll("[data-settings-tab]").forEach((button) => {
          button.addEventListener("click", () => setSettingsTab(button.dataset.settingsTab));
        });

        $("search-btn").addEventListener("click", () => {
          state.keyword = $("search-input").value.trim();
          state.albumPage = 1;
          loadAlbums();
        });
        $("search-input").addEventListener("keydown", (event) => {
          if (event.key === "Enter") $("search-btn").click();
        });
        $("gallery-select").addEventListener("change", () => {
          state.galleryId = $("gallery-select").value;
          state.albumPage = 1;
          loadAlbums();
        });
        $("favorite-filter-btn").addEventListener("click", () => {
          state.favoriteOnly = !state.favoriteOnly;
          state.albumPage = 1;
          updateFavoriteFilterButton();
          loadAlbums();
        });
        $("prev-page").addEventListener("click", () => {
          if (state.albumPage <= 1) return;
          state.albumPage -= 1;
          loadAlbums();
        });
        $("next-page").addEventListener("click", () => {
          if (!state.albumPagination || state.albumPage >= state.albumPagination.totalPages) return;
          state.albumPage += 1;
          loadAlbums();
        });
        $("back-btn").addEventListener("click", backToAlbums);
        $("favorite-btn").addEventListener("click", async () => {
          if (!state.currentAlbum) return;
          const favored = state.favorites.has(state.currentAlbum.id);
          await api("/api/v2/favorite-albums/" + encodeURIComponent(state.currentAlbum.id), {
            method: favored ? "DELETE" : "POST",
            body: "{}"
          });
          if (favored) state.favorites.delete(state.currentAlbum.id);
          else state.favorites.add(state.currentAlbum.id);
          updateFavoriteButton();
          renderAlbums();
          if (state.favoriteOnly && favored) loadAlbums();
        });
        $("share-album-btn").addEventListener("click", async () => {
          if (!state.currentAlbum) return;
          try {
            const url = await createShare("album", state.currentAlbum.id);
            setStatus("assets-status", "分享链接已生成：" + url);
          } catch (error) {
            setStatus("assets-status", error.message, true);
          }
        });
        $("prev-assets").addEventListener("click", () => {
          if (state.assetPage <= 1) return;
          state.assetPage -= 1;
          loadAssets();
        });
        $("next-assets").addEventListener("click", () => {
          if (!state.assetPagination || state.assetPage >= state.assetPagination.totalPages) return;
          state.assetPage += 1;
          loadAssets();
        });
        $("close-viewer").addEventListener("click", closeViewer);
        $("viewer-prev-zone").addEventListener("click", async (event) => {
          event.stopPropagation();
          await changeViewerAsset(-1);
        });
        $("viewer-next-zone").addEventListener("click", async (event) => {
          event.stopPropagation();
          await changeViewerAsset(1);
        });
        $("viewer").addEventListener("click", (event) => {
          if (event.target === $("viewer")) closeViewer();
        });
        $("share-asset-btn").addEventListener("click", async (event) => {
          if (!state.currentAsset) return;
          event.stopPropagation();
          showActionMenu($("share-asset-btn"), assetActions(state.currentAsset));
        });
        $("share-dialog-cancel").addEventListener("click", closeUserShareDialog);
        $("share-dialog").addEventListener("click", (event) => {
          if (event.target === $("share-dialog")) closeUserShareDialog();
        });
        $("share-dialog-confirm").addEventListener("click", async () => {
          if (!state.pendingUserShare) return;
          const username = $("share-dialog-user").value;
          try {
            await shareAlbumToUser(username, state.pendingUserShare.albumId);
            state.selectedShareUser = username;
            setStatus(
              state.view === "album" ? "assets-status" : "albums-status",
              "已分享相册给 " + username + "：" + state.pendingUserShare.albumName
            );
            closeUserShareDialog();
            if (state.settingsTab === "share") renderSharePanel();
          } catch (error) {
            setStatus(state.view === "album" ? "assets-status" : "albums-status", error.message, true);
          }
        });
        document.addEventListener("keydown", async (event) => {
          if (!$("viewer").classList.contains("active") || $("share-dialog").classList.contains("active")) return;
          if (event.key === "ArrowLeft") {
            event.preventDefault();
            await changeViewerAsset(-1);
          }
          if (event.key === "ArrowRight") {
            event.preventDefault();
            await changeViewerAsset(1);
          }
        });
        $("cache-prune-dryrun-btn").addEventListener("click", async () => {
          try {
            const data = await api("/api/v2/cache/thumbnails/prune", { method: "POST", body: JSON.stringify({ dryRun: true, maxFiles: 1000 }) });
            $("cache-result").textContent = "";
            $("cache-result").appendChild(makeResultBox("清理预览", data));
            await loadSettings();
          } catch (error) {
            setStatus("settings-status", error.message, true);
          }
        });
        $("cache-warmup-dryrun-btn").addEventListener("click", async () => {
          try {
            const data = await api("/api/v2/cache/thumbnails/warmup", {
              method: "POST",
              body: JSON.stringify({ dryRun: true, limit: 10, albumId: state.currentAlbum?.id || undefined })
            });
            $("cache-result").textContent = "";
            $("cache-result").appendChild(makeResultBox("预热预览", data));
          } catch (error) {
            setStatus("settings-status", error.message, true);
          }
        });
        $("cache-warmup-run-btn").addEventListener("click", async () => {
          try {
            const data = await api("/api/v2/cache/thumbnails/warmup", {
              method: "POST",
              body: JSON.stringify({ dryRun: false, limit: 1, albumId: state.currentAlbum?.id || undefined })
            });
            $("cache-result").textContent = "";
            $("cache-result").appendChild(makeResultBox("小批量预热", data));
            await loadSettings();
          } catch (error) {
            setStatus("settings-status", error.message, true);
          }
        });
        $("scan-dryrun-btn").addEventListener("click", async () => {
          try {
            const data = await api("/api/v2/scan", { method: "POST", body: JSON.stringify({ dryRun: true, galleryId: state.galleryId || undefined }) });
            $("scan-result").textContent = "";
            $("scan-result").appendChild(makeResultBox("扫描 dry-run", data));
            await loadSettings();
          } catch (error) {
            setStatus("settings-status", error.message, true);
          }
        });
        window.addEventListener("keydown", (event) => {
          if (event.key === "Escape") closeViewer();
        });
        document.addEventListener("click", (event) => {
          if (!$("action-menu").contains(event.target)) closeActionMenu();
        });

        enterApp();
      })();
    </script>
  </body>
</html>`;

export const getWebAppHtml = (): string => webAppHtml;
