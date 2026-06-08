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
        grid-template-columns: minmax(180px, 1fr) minmax(140px, 220px) auto;
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
        display: grid;
        overflow: hidden;
        border: 1px solid var(--line);
        border-radius: 8px;
        background: var(--panel-strong);
        color: var(--ink);
        text-align: left;
        box-shadow: 0 8px 18px rgba(50, 43, 31, .07);
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
              <button id="logout-btn" class="btn warn" type="button">退出</button>
            </div>
          </header>

          <div id="albums-view">
            <div class="filters">
              <input id="search-input" class="input" placeholder="搜索相册" autocomplete="off">
              <select id="gallery-select" class="select" aria-label="图库"></select>
              <button id="search-btn" class="btn primary" type="button">搜索</button>
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
        </div>
      </section>
    </div>

    <div id="viewer" class="viewer" aria-hidden="true">
      <div class="viewer-bar">
        <div id="viewer-title" class="viewer-title"></div>
        <div class="toolbar">
          <button id="share-asset-btn" class="btn" type="button">分享图片</button>
          <a id="open-original" class="btn primary" href="#" target="_blank" rel="noopener">原图</a>
          <button id="close-viewer" class="btn" type="button">关闭</button>
        </div>
      </div>
      <div class="viewer-stage">
        <img id="viewer-img" alt="">
      </div>
    </div>

    <script>
      (() => {
        const state = {
          user: null,
          galleries: [],
          galleryId: "",
          albums: [],
          favorites: new Set(),
          albumPage: 1,
          albumPageSize: 24,
          albumPagination: null,
          keyword: "",
          currentAlbum: null,
          assets: [],
          assetPage: 1,
          assetPageSize: 120,
          assetPagination: null,
          currentAsset: null
        };

        const $ = (id) => document.getElementById(id);
        const setText = (id, value) => { $(id).textContent = value == null ? "" : String(value); };
        const setStatus = (id, value, isError = false) => {
          const el = $(id);
          el.textContent = value || "";
          el.classList.toggle("error", Boolean(isError));
        };
        const show = (id, active) => $(id).classList.toggle("hidden", !active);
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
            const card = document.createElement("button");
            card.className = "album-card";
            card.type = "button";
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
            const meta = document.createElement("div");
            meta.className = "album-meta";
            const title = document.createElement("strong");
            title.textContent = (state.favorites.has(album.id) ? "★ " : "") + album.name;
            const detail = document.createElement("span");
            detail.textContent = album.assetCount + " 张 · " + album.sourceType;
            meta.append(title, detail);
            card.append(cover, meta);
            card.addEventListener("click", () => openAlbum(album));
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

        const loadGalleries = async () => {
          const data = await api("/api/v2/galleries");
          state.galleries = data.items || [];
          renderGalleries();
        };

        const loadAlbums = async () => {
          setStatus("albums-status", "正在读取相册...");
          const params = new URLSearchParams({
            page: String(state.albumPage),
            pageSize: String(state.albumPageSize),
            sortBy: "updatedAt",
            sortOrder: "desc"
          });
          if (state.galleryId) params.set("galleryId", state.galleryId);
          if (state.keyword) params.set("keyword", state.keyword);
          try {
            const data = await api("/api/v2/albums?" + params.toString());
            state.albums = data.items || [];
            state.albumPagination = data.pagination;
            setStatus("albums-status", "");
            renderGalleries();
            renderAlbums();
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
            await Promise.all([loadGalleries(), loadFavorites()]);
            await loadAlbums();
          } catch (error) {
            if (error.status === 401) return requireLogin();
            setStatus("albums-status", error.message, true);
          }
        };

        const openAlbum = async (album) => {
          state.currentAlbum = album;
          state.assetPage = 1;
          $("albums-view").classList.add("hidden");
          $("album-view").classList.remove("hidden");
          show("back-btn", true);
          show("favorite-btn", true);
          show("share-album-btn", true);
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
          $("albums-view").classList.remove("hidden");
          $("album-view").classList.add("hidden");
          show("back-btn", false);
          show("favorite-btn", false);
          show("share-album-btn", false);
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
        };

        const openViewer = (asset) => {
          state.currentAsset = asset;
          setText("viewer-title", asset.name);
          $("viewer-img").src = imageUrl(asset.id, "original");
          $("viewer-img").alt = asset.name;
          $("open-original").href = imageUrl(asset.id, "original");
          $("viewer").classList.add("active");
          $("viewer").setAttribute("aria-hidden", "false");
        };

        const closeViewer = () => {
          $("viewer").classList.remove("active");
          $("viewer").setAttribute("aria-hidden", "true");
          $("viewer-img").src = "";
          state.currentAsset = null;
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
        $("viewer").addEventListener("click", (event) => {
          if (event.target === $("viewer")) closeViewer();
        });
        $("share-asset-btn").addEventListener("click", async () => {
          if (!state.currentAsset) return;
          try {
            const url = await createShare("asset", state.currentAsset.id);
            setText("viewer-title", state.currentAsset.name + " · 分享链接已生成 " + url);
          } catch (error) {
            setText("viewer-title", error.message);
          }
        });
        window.addEventListener("keydown", (event) => {
          if (event.key === "Escape") closeViewer();
        });

        enterApp();
      })();
    </script>
  </body>
</html>`;

export const getWebAppHtml = (): string => webAppHtml;
