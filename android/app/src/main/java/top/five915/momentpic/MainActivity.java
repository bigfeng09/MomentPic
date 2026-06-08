package top.five915.momentpic;

import android.app.Activity;
import android.app.AlertDialog;
import android.content.Context;
import android.content.ClipData;
import android.content.ClipboardManager;
import android.graphics.Bitmap;
import android.graphics.BitmapFactory;
import android.graphics.Canvas;
import android.graphics.Color;
import android.graphics.Paint;
import android.graphics.Path;
import android.graphics.RectF;
import android.graphics.Typeface;
import android.graphics.drawable.GradientDrawable;
import android.os.AsyncTask;
import android.os.Build;
import android.os.Bundle;
import android.os.Environment;
import android.provider.MediaStore;
import android.content.ContentValues;
import android.net.Uri;
import android.util.LruCache;
import android.view.Gravity;
import android.view.KeyEvent;
import android.view.MotionEvent;
import android.view.ScaleGestureDetector;
import android.view.View;
import android.view.ViewGroup;
import android.view.Window;
import android.view.WindowManager;
import android.view.inputmethod.EditorInfo;
import android.widget.Button;
import android.widget.EditText;
import android.widget.FrameLayout;
import android.widget.GridLayout;
import android.widget.HorizontalScrollView;
import android.widget.ImageView;
import android.widget.LinearLayout;
import android.widget.ProgressBar;
import android.widget.ScrollView;
import android.widget.Switch;
import android.widget.TextView;
import android.widget.Toast;

import org.json.JSONArray;
import org.json.JSONObject;

import java.io.BufferedInputStream;
import java.io.BufferedReader;
import java.io.InputStream;
import java.io.InputStreamReader;
import java.io.OutputStream;
import java.io.File;
import java.io.FileOutputStream;
import java.net.HttpURLConnection;
import java.net.URLEncoder;
import java.net.URL;
import java.util.ArrayList;
import java.util.Collections;
import java.util.HashMap;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

public class MainActivity extends Activity {
    private static final String PREFS = "moment_pic_native";
    private static final String KEY_BASE_URL = "base_url";
    private static final String KEY_USER = "username";
    private static final String KEY_ROLE = "role";
    private static final String KEY_FAVORITES = "favorite_assets";
    private static final String KEY_FAVORITE_ALBUMS = "favorite_albums";
    private static final String KEY_FAVORITES_MIGRATED = "favorite_account_migration_done";
    private static final String KEY_SEARCH_HISTORY = "search_history";
    private static final String KEY_NEW_ALBUM_IDS = "new_album_ids";
    private static final String KEY_DARK_MODE = "dark_mode";
    private static final String DEFAULT_BASE_URL = "http://10.0.2.2:3211";
    private static final String TAG_ALL = "全部";
    private static final String TAG_FAVORITES = "收藏";
    private static final String FAVORITES_ALBUM_ID = "__favorites__";
    private static final String[] TAGS = {TAG_ALL, TAG_FAVORITES, "私房", "人像", "写真", "美女", "模特", "girl", "cos", "lingerie", "portrait"};
    private static final int COLOR_BG_LIGHT = 0xFFFFFAF2;
    private static final int COLOR_SURFACE_LIGHT = 0xFFFFFFFF;
    private static final int COLOR_SURFACE_TINT_LIGHT = 0xFFF7F0E8;
    private static final int COLOR_PRIMARY_LIGHT = 0xFFC45163;
    private static final int COLOR_PRIMARY_DARK_LIGHT = 0xFFB84356;
    private static final int COLOR_TEXT_LIGHT = 0xFF211F1A;
    private static final int COLOR_MUTED_LIGHT = 0xFF7F706B;
    private static final int COLOR_STROKE_LIGHT = 0xFFE8DDD3;
    private static final int COLOR_FAVORITE_LIGHT = 0xFFAA4658;
    private static final int COLOR_BG_DARK = 0xFF111315;
    private static final int COLOR_SURFACE_DARK = 0xFF1A1D21;
    private static final int COLOR_SURFACE_TINT_DARK = 0xFF24282E;
    private static final int COLOR_PRIMARY_DARK_MODE = 0xFFE46C82;
    private static final int COLOR_PRIMARY_DARK_DARK_MODE = 0xFFFF879B;
    private static final int COLOR_TEXT_DARK = 0xFFF2F0EC;
    private static final int COLOR_MUTED_DARK = 0xFFB7ADA8;
    private static final int COLOR_STROKE_DARK = 0xFF343941;
    private static final int COLOR_FAVORITE_DARK = 0xFFFF7E98;
    private static final String SORT_NORMAL = "";
    private static final String SORT_NEW = "新增";
    private static final String ICON_SEARCH = "search";
    private static final String ICON_MENU = "menu";
    private static final String ICON_GRID = "grid";
    private static final String ICON_HEART = "heart";
    private static final String ICON_USER = "user";
    private static final String ICON_BACK = "back";
    private static final String ICON_CLOSE = "close";
    private static final String ICON_ZOOM_RESET = "zoom_reset";
    private static final String ICON_ZOOM_IN = "zoom_in";
    private static final String SCREEN_LOGIN = "login";
    private static final String SCREEN_ALBUMS = "albums";
    private static final String SCREEN_ASSETS = "assets";
    private static final String SCREEN_VIEWER = "viewer";
    private static final String SCREEN_SETTINGS = "settings";
    private static final String SCREEN_USER_MANAGER = "user_manager";
    private static final String SCREEN_ACCOUNT_DETAIL = "account_detail";

    private FrameLayout root;
    private MomentApi api;
    private ImageLoader imageLoader;
    private String baseUrl;
    private String username;
    private String role;
    private String activeTag = TAG_ALL;
    private String searchKeyword = "";
    private String activeSort = SORT_NORMAL;
    private List<Album> albums = new ArrayList<>();
    private List<Asset> assets = new ArrayList<>();
    private List<Asset> favoriteAssets = new ArrayList<>();
    private List<Album> favoriteAlbums = new ArrayList<>();
    private List<String> searchHistory = new ArrayList<>();
    private List<String> newAlbumIds = new ArrayList<>();
    private List<UserAccount> userAccounts = new ArrayList<>();
    private List<GallerySource> gallerySources = new ArrayList<>();
    private Album currentAlbum;
    private ScrollView albumScrollView;
    private ScrollView assetScrollView;
    private int currentAssetIndex = 0;
    private int albumScrollY = 0;
    private int assetScrollY = 0;
    private int albumPage = 1;
    private int assetPage = 1;
    private boolean loading = false;
    private boolean albumsHasMore = true;
    private boolean assetsHasMore = true;
    private boolean albumsLoadedOnce = false;
    private boolean assetsLoadedOnce = false;
    private boolean viewerOpen = false;
    private boolean scanningLibrary = false;
    private boolean loadingGallerySources = false;
    private boolean gallerySourcesLoaded = false;
    private boolean darkMode = false;
    private String activeGalleryPrefix = "";
    private String currentScreen = SCREEN_LOGIN;
    private String currentAccountDetailUser = "";

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        darkMode = getSharedPreferences(PREFS, MODE_PRIVATE).getBoolean(KEY_DARK_MODE, false);
        configureWindow();
        root = new FrameLayout(this);
        setContentView(root);

        baseUrl = getSharedPreferences(PREFS, MODE_PRIVATE).getString(KEY_BASE_URL, DEFAULT_BASE_URL);
        username = getSharedPreferences(PREFS, MODE_PRIVATE).getString(KEY_USER, "admin");
        role = getSharedPreferences(PREFS, MODE_PRIVATE).getString(KEY_ROLE, "user");
        api = new MomentApi(baseUrl);
        imageLoader = new ImageLoader();
        loadFavorites();
        loadSearchHistory();
        loadNewAlbumIds();
        showLogin();
    }

    private void configureWindow() {
        Window window = getWindow();
        window.clearFlags(WindowManager.LayoutParams.FLAG_FULLSCREEN
                | WindowManager.LayoutParams.FLAG_LAYOUT_NO_LIMITS
                | WindowManager.LayoutParams.FLAG_TRANSLUCENT_STATUS
                | WindowManager.LayoutParams.FLAG_TRANSLUCENT_NAVIGATION);
        window.setStatusBarColor(colorBg());
        window.setNavigationBarColor(colorSurface());
        window.getDecorView().setOnSystemUiVisibilityChangeListener(null);
        int visibility = 0;
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            if (!darkMode) visibility |= View.SYSTEM_UI_FLAG_LIGHT_STATUS_BAR;
        }
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            if (!darkMode) visibility |= View.SYSTEM_UI_FLAG_LIGHT_NAVIGATION_BAR;
        }
        window.getDecorView().setSystemUiVisibility(visibility);
    }

    private void enterImmersiveMode() {
        Window window = getWindow();
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.LOLLIPOP) {
            window.setStatusBarColor(Color.BLACK);
            window.setNavigationBarColor(Color.BLACK);
        }
        View decor = window.getDecorView();
        int flags = View.SYSTEM_UI_FLAG_FULLSCREEN
                | View.SYSTEM_UI_FLAG_HIDE_NAVIGATION
                | View.SYSTEM_UI_FLAG_IMMERSIVE_STICKY
                | View.SYSTEM_UI_FLAG_LAYOUT_FULLSCREEN
                | View.SYSTEM_UI_FLAG_LAYOUT_HIDE_NAVIGATION
                | View.SYSTEM_UI_FLAG_LAYOUT_STABLE;
        decor.setSystemUiVisibility(flags);
        decor.setOnSystemUiVisibilityChangeListener(visibility -> {
            if (viewerOpen && (visibility & View.SYSTEM_UI_FLAG_FULLSCREEN) == 0) {
                decor.postDelayed(() -> {
                    if (viewerOpen) enterImmersiveMode();
                }, 500);
            }
        });
    }

    private void restoreSystemBars() {
        configureWindow();
    }

    private int colorBg() {
        return darkMode ? COLOR_BG_DARK : COLOR_BG_LIGHT;
    }

    private int colorSurface() {
        return darkMode ? COLOR_SURFACE_DARK : COLOR_SURFACE_LIGHT;
    }

    private int colorSurfaceTint() {
        return darkMode ? COLOR_SURFACE_TINT_DARK : COLOR_SURFACE_TINT_LIGHT;
    }

    private int colorPrimary() {
        return darkMode ? COLOR_PRIMARY_DARK_MODE : COLOR_PRIMARY_LIGHT;
    }

    private int colorPrimaryDark() {
        return darkMode ? COLOR_PRIMARY_DARK_DARK_MODE : COLOR_PRIMARY_DARK_LIGHT;
    }

    private int colorText() {
        return darkMode ? COLOR_TEXT_DARK : COLOR_TEXT_LIGHT;
    }

    private int colorMuted() {
        return darkMode ? COLOR_MUTED_DARK : COLOR_MUTED_LIGHT;
    }

    private int colorStroke() {
        return darkMode ? COLOR_STROKE_DARK : COLOR_STROKE_LIGHT;
    }

    private int colorFavorite() {
        return darkMode ? COLOR_FAVORITE_DARK : COLOR_FAVORITE_LIGHT;
    }

    private void refreshCurrentScreen() {
        if (SCREEN_VIEWER.equals(currentScreen)) {
            showViewer(currentAssetIndex);
        } else if (SCREEN_ASSETS.equals(currentScreen) && currentAlbum != null) {
            showAssets();
        } else if (SCREEN_ACCOUNT_DETAIL.equals(currentScreen) && !currentAccountDetailUser.isEmpty()) {
            showAccountShareDetail(currentAccountDetailUser);
        } else if (SCREEN_USER_MANAGER.equals(currentScreen)) {
            showUserShareManager();
        } else if (SCREEN_SETTINGS.equals(currentScreen)) {
            showSettings();
        } else if (SCREEN_ALBUMS.equals(currentScreen)) {
            showAlbums(false);
        } else {
            showLogin();
        }
    }

    private void showLogin() {
        currentScreen = SCREEN_LOGIN;
        viewerOpen = false;
        restoreSystemBars();
        root.removeAllViews();

        LinearLayout page = new LinearLayout(this);
        page.setOrientation(LinearLayout.VERTICAL);
        page.setGravity(Gravity.CENTER_HORIZONTAL);
        page.setPadding(dp(22), statusBarHeight() + dp(42), dp(22), navigationBarHeight() + dp(22));
        page.setBackgroundColor(colorBg());

        TextView title = text("Moment Pic", 32, colorPrimaryDark(), true);
        title.setGravity(Gravity.CENTER);
        page.addView(title, matchWrap());

        TextView subtitle = text("原生相册客户端", 15, colorMuted(), false);
        subtitle.setGravity(Gravity.CENTER);
        LinearLayout.LayoutParams subtitleParams = matchWrap();
        subtitleParams.setMargins(0, dp(6), 0, dp(24));
        page.addView(subtitle, subtitleParams);

        EditText urlInput = input("服务地址", baseUrl);
        EditText userInput = input("账号", username);
        EditText passInput = input("密码", "change-me-admin-password");
        passInput.setInputType(android.text.InputType.TYPE_CLASS_TEXT | android.text.InputType.TYPE_TEXT_VARIATION_PASSWORD);
        page.addView(urlInput, inputParams());
        page.addView(userInput, inputParams());
        page.addView(passInput, inputParams());

        Button login = primaryButton("登录");
        login.setOnClickListener(v -> {
            String url = normalizeUrl(urlInput.getText().toString());
            String user = userInput.getText().toString().trim();
            String pass = passInput.getText().toString();
            if (url.isEmpty() || user.isEmpty() || pass.isEmpty()) {
                toast("服务地址、账号、密码都要填");
                return;
            }
            login.setEnabled(false);
            login.setText("登录中...");
            baseUrl = url;
            username = user;
            api = new MomentApi(baseUrl);
            resetGalleryState();
            new LoginTask(user, pass, ok -> {
                login.setEnabled(true);
                login.setText("登录");
                if (ok) {
                    role = api.role;
                    getSharedPreferences(PREFS, MODE_PRIVATE).edit()
                            .putString(KEY_BASE_URL, baseUrl)
                            .putString(KEY_USER, username)
                            .putString(KEY_ROLE, role)
                            .apply();
                    loadFavorites();
                    new PullFavoriteAlbumsTask(() -> showAlbums(true)).execute();
                }
            }).execute();
        });
        LinearLayout.LayoutParams loginParams = matchWrap();
        loginParams.setMargins(0, dp(12), 0, 0);
        page.addView(login, loginParams);

        root.addView(page, fullScreen());
    }

    private void showSettings() {
        currentScreen = SCREEN_SETTINGS;
        currentAlbum = null;
        viewerOpen = false;
        restoreSystemBars();
        root.removeAllViews();

        LinearLayout page = basePage();
        page.addView(settingsHeader());

        ScrollView scroll = new ScrollView(this);
        LinearLayout content = new LinearLayout(this);
        content.setOrientation(LinearLayout.VERTICAL);
        content.setPadding(dp(18), dp(8), dp(18), navigationBarHeight() + dp(24));
        scroll.addView(content);

        TextView accountTitle = text("连接设置", 18, colorText(), true);
        content.addView(accountTitle, matchWrap());

        EditText urlInput = input("服务地址", baseUrl);
        EditText userInput = input("账号", username);
        LinearLayout.LayoutParams urlParams = matchWrapWithTop(12);
        urlParams.height = dp(50);
        content.addView(urlInput, urlParams);
        LinearLayout.LayoutParams userParams = matchWrapWithTop(10);
        userParams.height = dp(50);
        content.addView(userInput, userParams);

        Button save = primaryButton("保存设置");
        save.setOnClickListener(v -> {
            baseUrl = normalizeUrl(urlInput.getText().toString());
            username = userInput.getText().toString().trim();
            api = new MomentApi(baseUrl);
            resetGalleryState();
            getSharedPreferences(PREFS, MODE_PRIVATE).edit()
                    .putString(KEY_BASE_URL, baseUrl)
                    .putString(KEY_USER, username)
                    .apply();
            loadFavorites();
            new PullFavoriteAlbumsTask(null).execute();
            toast("设置已保存");
            showAlbums(true);
        });
        LinearLayout.LayoutParams saveParams = matchWrapWithTop(14);
        saveParams.height = dp(46);
        content.addView(save, saveParams);

        TextView appearanceTitle = text("外观", 18, colorText(), true);
        LinearLayout.LayoutParams appearanceTitleParams = matchWrapWithTop(26);
        content.addView(appearanceTitle, appearanceTitleParams);

        LinearLayout darkRow = new LinearLayout(this);
        darkRow.setOrientation(LinearLayout.HORIZONTAL);
        darkRow.setGravity(Gravity.CENTER_VERTICAL);
        darkRow.setPadding(dp(14), dp(10), dp(12), dp(10));
        darkRow.setBackground(roundedBackground(colorSurface(), colorStroke(), 14));

        LinearLayout darkCopy = new LinearLayout(this);
        darkCopy.setOrientation(LinearLayout.VERTICAL);
        TextView darkTitle = text("夜间模式", 15, colorText(), true);
        darkCopy.addView(darkTitle, matchWrap());
        TextView darkHint = text("开启后使用深色背景和文字配色", 12, colorMuted(), false);
        LinearLayout.LayoutParams darkHintParams = matchWrapWithTop(5);
        darkCopy.addView(darkHint, darkHintParams);
        darkRow.addView(darkCopy, new LinearLayout.LayoutParams(0, ViewGroup.LayoutParams.WRAP_CONTENT, 1));

        Switch darkSwitch = new Switch(this);
        darkSwitch.setText("");
        darkSwitch.setChecked(darkMode);
        darkSwitch.setOnCheckedChangeListener((buttonView, isChecked) -> {
            if (darkMode == isChecked) return;
            darkMode = isChecked;
            getSharedPreferences(PREFS, MODE_PRIVATE).edit()
                    .putBoolean(KEY_DARK_MODE, darkMode)
                    .apply();
            toast(darkMode ? "夜间模式已开启" : "夜间模式已关闭");
            refreshCurrentScreen();
        });
        darkRow.setOnClickListener(v -> darkSwitch.setChecked(!darkSwitch.isChecked()));
        darkRow.addView(darkSwitch, new LinearLayout.LayoutParams(ViewGroup.LayoutParams.WRAP_CONTENT, dp(44)));
        LinearLayout.LayoutParams darkParams = matchWrapWithTop(12);
        content.addView(darkRow, darkParams);

        TextView dataTitle = text("数据管理", 18, colorText(), true);
        LinearLayout.LayoutParams dataTitleParams = matchWrapWithTop(26);
        content.addView(dataTitle, dataTitleParams);

        if ("admin".equals(role)) {
            Button manageUsers = secondaryButton("账户与分享管理");
            manageUsers.setOnClickListener(v -> new LoadUsersTask(false, () -> showUserShareManager()).execute());
            LinearLayout.LayoutParams manageParams = matchWrapWithTop(12);
            manageParams.height = dp(46);
            content.addView(manageUsers, manageParams);
        }

        Button clearCache = secondaryButton("清除图片缓存");
        clearCache.setOnClickListener(v -> {
            imageLoader.clear();
            toast("图片缓存已清除");
        });
        LinearLayout.LayoutParams cacheParams = matchWrapWithTop(12);
        cacheParams.height = dp(46);
        content.addView(clearCache, cacheParams);

        Button clearSearch = secondaryButton("清空搜索历史");
        clearSearch.setOnClickListener(v -> {
            searchHistory.clear();
            searchKeyword = "";
            saveSearchHistory();
            toast("搜索历史已清空");
        });
        LinearLayout.LayoutParams searchParams = matchWrapWithTop(10);
        searchParams.height = dp(46);
        content.addView(clearSearch, searchParams);

        Button logout = secondaryButton("退出登录");
        logout.setTextColor(colorFavorite());
        logout.setOnClickListener(v -> showLogin());
        LinearLayout.LayoutParams logoutParams = matchWrapWithTop(24);
        logoutParams.height = dp(46);
        content.addView(logout, logoutParams);

        page.addView(scroll, new LinearLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, 0, 1));
        root.addView(page, fullScreen());
    }

    private void showUserShareManager() {
        currentScreen = SCREEN_USER_MANAGER;
        currentAccountDetailUser = "";
        viewerOpen = false;
        restoreSystemBars();
        root.removeAllViews();

        LinearLayout page = basePage();
        page.addView(topBar("账户与分享", () -> showSettings(), null));

        ScrollView scroll = new ScrollView(this);
        LinearLayout content = new LinearLayout(this);
        content.setOrientation(LinearLayout.VERTICAL);
        content.setPadding(dp(18), dp(8), dp(18), navigationBarHeight() + dp(24));
        scroll.addView(content);

        TextView userTitle = text("普通账户", 18, colorText(), true);
        content.addView(userTitle, matchWrap());
        TextView userHint = text("可创建多个普通账户；下方可改密码或删除账户。首页相册右下角 ⋮ 可管理分享。", 12, colorMuted(), false);
        content.addView(userHint, matchWrapWithTop(8));
        EditText userInput = input("普通账号", "user1");
        EditText passInput = input("密码", "123456");
        content.addView(userInput, inputParams());
        content.addView(passInput, inputParams());
        Button createUser = primaryButton("新增创建账户");
        createUser.setOnClickListener(v -> {
            String targetUser = userInput.getText().toString().trim();
            String targetPass = passInput.getText().toString();
            if (targetUser.isEmpty() || targetPass.isEmpty()) {
                toast("账号和密码都要填");
                return;
            }
            new SaveUserTask(targetUser, targetPass, ok -> {
                toast(ok ? "账户已创建/更新" : "账户创建失败");
                if (ok) new LoadUsersTask(false, () -> showUserShareManager()).execute();
            }).execute();
        });
        LinearLayout.LayoutParams createUserParams = matchWrapWithTop(8);
        createUserParams.height = dp(46);
        content.addView(createUser, createUserParams);
        Button refreshUsers = secondaryButton("刷新普通账户列表");
        refreshUsers.setOnClickListener(v -> new LoadUsersTask(false, () -> showUserShareManager()).execute());
        LinearLayout.LayoutParams refreshParams = matchWrapWithTop(8);
        refreshParams.height = dp(44);
        content.addView(refreshUsers, refreshParams);

        TextView listTitle = text("已创建账户", 16, colorText(), true);
        LinearLayout.LayoutParams listTitleParams = matchWrapWithTop(22);
        content.addView(listTitle, listTitleParams);
        int normalCount = 0;
        for (UserAccount account : userAccounts) {
            if ("admin".equals(account.username)) continue;
            normalCount++;
            LinearLayout row = new LinearLayout(this);
            row.setOrientation(LinearLayout.HORIZONTAL);
            row.setGravity(Gravity.CENTER_VERTICAL);
            row.setPadding(dp(12), dp(8), dp(8), dp(8));
            row.setBackground(roundedBackground(colorSurface(), colorStroke(), 12));
            TextView name = text(account.username + "  ›", 15, colorText(), true);
            name.setGravity(Gravity.CENTER_VERTICAL);
            row.setOnClickListener(v -> showAccountShareDetail(account.username));
            name.setOnClickListener(v -> showAccountShareDetail(account.username));
            row.addView(name, new LinearLayout.LayoutParams(0, dp(42), 1));
            Button changePass = secondaryButton("编辑");
            changePass.setTextSize(12);
            changePass.setOnClickListener(v -> showEditUserDialog(account.username));
            row.addView(changePass, new LinearLayout.LayoutParams(dp(76), dp(40)));
            Button delete = secondaryButton("删除");
            delete.setTextSize(12);
            delete.setTextColor(colorFavorite());
            delete.setOnClickListener(v -> confirmDeleteUser(account.username));
            LinearLayout.LayoutParams deleteParams = new LinearLayout.LayoutParams(dp(64), dp(40));
            deleteParams.setMargins(dp(8), 0, 0, 0);
            row.addView(delete, deleteParams);
            LinearLayout.LayoutParams rowParams = matchWrapWithTop(8);
            content.addView(row, rowParams);
        }
        if (normalCount == 0) {
            TextView empty = text(userAccounts.isEmpty() ? "正在加载账户列表..." : "还没有普通账户", 13, colorMuted(), false);
            content.addView(empty, matchWrapWithTop(10));
        }

        TextView shareTitle = text("备用分享方式", 18, colorText(), true);
        LinearLayout.LayoutParams shareTitleParams = matchWrapWithTop(28);
        content.addView(shareTitle, shareTitleParams);
        TextView hint = text("推荐在首页每个相册右下角 ⋮ 管理分享。这里也可按相册ID/保存路径/相册名关键词批量分享。", 12, colorMuted(), false);
        content.addView(hint, matchWrapWithTop(8));
        EditText shareUserInput = input("目标账号", "user1");
        EditText albumIdsInput = input("相册ID、保存路径或相册名关键词，逗号分隔", "");
        content.addView(shareUserInput, inputParams());
        content.addView(albumIdsInput, inputParams());
        Button saveShare = primaryButton("保存分享列表");
        saveShare.setOnClickListener(v -> {
            String targetUser = shareUserInput.getText().toString().trim();
            String rawIds = albumIdsInput.getText().toString().trim();
            if (targetUser.isEmpty()) {
                toast("目标账号不能为空");
                return;
            }
            new SaveSharedAlbumsTask(targetUser, rawIds, ok -> toast(ok ? "分享已保存" : "分享保存失败")).execute();
        });
        LinearLayout.LayoutParams saveShareParams = matchWrapWithTop(8);
        saveShareParams.height = dp(46);
        content.addView(saveShare, saveShareParams);

        page.addView(scroll, new LinearLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, 0, 1));
        root.addView(page, fullScreen());
        if (userAccounts.isEmpty()) new LoadUsersTask(false, () -> showUserShareManager()).execute();
    }

    private void showEditUserDialog(String targetUser) {
        LinearLayout form = new LinearLayout(this);
        form.setOrientation(LinearLayout.VERTICAL);
        form.setPadding(dp(8), dp(8), dp(8), 0);
        EditText usernameInput = input("账户名", targetUser);
        EditText passInput = input("新密码", "");
        passInput.setInputType(android.text.InputType.TYPE_CLASS_TEXT | android.text.InputType.TYPE_TEXT_VARIATION_PASSWORD);
        form.addView(usernameInput, inputParams());
        form.addView(passInput, inputParams());
        new AlertDialog.Builder(this)
                .setTitle("编辑账户")
                .setView(form)
                .setPositiveButton("保存", (dialog, which) -> {
                    String nextUser = usernameInput.getText().toString().trim();
                    String pass = passInput.getText().toString();
                    if (nextUser.isEmpty() || pass.isEmpty()) {
                        toast("账户名和密码都不能为空");
                        return;
                    }
                    new UpdateUserTask(targetUser, nextUser, pass, ok -> {
                        toast(ok ? "账户已更新" : "账户更新失败");
                        if (ok) new LoadUsersTask(false, () -> showUserShareManager()).execute();
                    }).execute();
                })
                .setNegativeButton("取消", null)
                .show();
    }

    private void confirmDeleteUser(String targetUser) {
        new AlertDialog.Builder(this)
                .setTitle("删除账户")
                .setMessage("确定删除普通账户 " + targetUser + "？\n该账户的分享和收藏也会删除。")
                .setPositiveButton("删除", (dialog, which) -> new DeleteUserTask(targetUser, ok -> {
                    toast(ok ? "账户已删除" : "删除失败");
                    if (ok) new LoadUsersTask(false, () -> showUserShareManager()).execute();
                }).execute())
                .setNegativeButton("取消", null)
                .show();
    }

    private void showAccountShareDetail(String targetUser) {
        currentScreen = SCREEN_ACCOUNT_DETAIL;
        currentAccountDetailUser = targetUser;
        viewerOpen = false;
        root.removeAllViews();

        LinearLayout page = basePage();
        page.addView(topBar(targetUser + " 的分享", () -> showUserShareManager(), null));

        ScrollView scroll = new ScrollView(this);
        LinearLayout content = new LinearLayout(this);
        content.setOrientation(LinearLayout.VERTICAL);
        content.setPadding(dp(18), dp(8), dp(18), navigationBarHeight() + dp(24));
        scroll.addView(content);

        TextView hint = text("这里显示已分享给该账户的相册；点“取消分享”会立即移除该账户访问权限。", 12, colorMuted(), false);
        content.addView(hint, matchWrapWithTop(8));
        TextView loading = text("正在加载已分享相册...", 14, colorMuted(), false);
        content.addView(loading, matchWrapWithTop(18));

        page.addView(scroll, new LinearLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, 0, 1));
        root.addView(page, fullScreen());
        new LoadSharedAlbumsDetailTask(targetUser).execute();
    }

    private void renderAccountShareDetail(String targetUser, List<Album> sharedAlbums) {
        currentScreen = SCREEN_ACCOUNT_DETAIL;
        currentAccountDetailUser = targetUser;
        viewerOpen = false;
        root.removeAllViews();

        LinearLayout page = basePage();
        page.addView(topBar(targetUser + " 的分享", () -> showUserShareManager(), null));

        ScrollView scroll = new ScrollView(this);
        LinearLayout content = new LinearLayout(this);
        content.setOrientation(LinearLayout.VERTICAL);
        content.setPadding(dp(18), dp(8), dp(18), navigationBarHeight() + dp(24));
        scroll.addView(content);

        TextView summary = text("已分享 " + sharedAlbums.size() + " 个相册", 16, colorText(), true);
        content.addView(summary, matchWrapWithTop(8));
        if (sharedAlbums.isEmpty()) {
            TextView empty = text("还没有分享相册给这个账户", 14, colorMuted(), false);
            content.addView(empty, matchWrapWithTop(16));
        }
        for (Album album : sharedAlbums) {
            LinearLayout row = new LinearLayout(this);
            row.setOrientation(LinearLayout.HORIZONTAL);
            row.setGravity(Gravity.CENTER_VERTICAL);
            row.setPadding(dp(12), dp(8), dp(8), dp(8));
            row.setBackground(roundedBackground(colorSurface(), colorStroke(), 12));
            LinearLayout texts = new LinearLayout(this);
            texts.setOrientation(LinearLayout.VERTICAL);
            TextView name = text(album.name, 14, colorText(), true);
            texts.addView(name, matchWrap());
            String path = album.sourcePath == null || album.sourcePath.isEmpty() ? album.id : album.sourcePath;
            TextView pathView = text(path, 11, colorMuted(), false);
            pathView.setSingleLine(true);
            texts.addView(pathView, matchWrapWithTop(4));
            row.addView(texts, new LinearLayout.LayoutParams(0, ViewGroup.LayoutParams.WRAP_CONTENT, 1));
            Button cancel = secondaryButton("取消分享");
            cancel.setTextSize(12);
            cancel.setTextColor(colorFavorite());
            cancel.setOnClickListener(v -> new RemoveSingleShareTask(targetUser, album.id, ok -> {
                toast(ok ? "已取消分享" : "取消失败");
                if (ok) showAccountShareDetail(targetUser);
            }).execute());
            row.addView(cancel, new LinearLayout.LayoutParams(dp(92), dp(40)));
            content.addView(row, matchWrapWithTop(8));
        }

        page.addView(scroll, new LinearLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, 0, 1));
        root.addView(page, fullScreen());
    }

    private View settingsHeader() {
        LinearLayout bar = new LinearLayout(this);
        bar.setGravity(Gravity.CENTER_VERTICAL);
        bar.setPadding(dp(16), statusBarHeight() + dp(18), dp(16), dp(10));

        View back = iconButtonView(ICON_BACK, colorText(), "返回");
        back.setOnClickListener(v -> showAlbums(false));
        bar.addView(back, new LinearLayout.LayoutParams(dp(42), dp(42)));

        TextView title = text("我的", 22, colorText(), true);
        title.setGravity(Gravity.CENTER_VERTICAL);
        LinearLayout.LayoutParams titleParams = new LinearLayout.LayoutParams(0, dp(42), 1);
        titleParams.setMargins(dp(6), 0, 0, 0);
        bar.addView(title, titleParams);
        return bar;
    }

    private void showAlbums(boolean reset) {
        currentScreen = SCREEN_ALBUMS;
        viewerOpen = false;
        if (reset) {
            albums.clear();
            albumPage = 1;
            albumsHasMore = true;
            albumsLoadedOnce = false;
            albumScrollY = 0;
        }
        if (isFavoritesTag()) {
            albums.clear();
            if (!favoriteAssets.isEmpty()) albums.add(favoriteImagesAlbum());
            albums.addAll(favoriteAlbums);
            sortAlbums();
            albumsHasMore = false;
            albumsLoadedOnce = true;
        }

        root.removeAllViews();
        LinearLayout page = basePage();
        page.addView(albumHeader());

        ScrollView scroll = new ScrollView(this);
        albumScrollView = scroll;
        attachPullToRefresh(scroll);
        LinearLayout content = new LinearLayout(this);
        content.setOrientation(LinearLayout.VERTICAL);
        content.setPadding(dp(14), dp(8), dp(14), dp(18));
        scroll.addView(content);

        if (isFavoritesTag()) {
            content.addView(favoritesOverview());
        }

        GridLayout grid = new GridLayout(this);
        grid.setColumnCount(2);
        content.addView(grid, matchWrap());
        for (Album album : albums) {
            grid.addView(albumCard(album), gridItemParams());
        }

        if (loading) {
            ProgressBar bar = new ProgressBar(this);
            content.addView(bar, centeredParams(dp(44), dp(44)));
        } else if (!isFavoritesTag() && isNewSort() && newAlbumIds.isEmpty()) {
            content.addView(emptyState("本次没有新增或更新", "点击“刷新图库”后，这里只显示本次新增或内容发生变化的相册。"));
        } else if (isFavoritesTag() && favoriteAssets.isEmpty() && favoriteAlbums.isEmpty()) {
            content.addView(emptyState("还没有收藏", "收藏图片或相册后，就会出现在这里。"));
        } else if (albumsLoadedOnce && albums.isEmpty()) {
            String title = isNewSort() ? "没有匹配的新增或更新内容" : "没找到相册";
            String message = isNewSort() ? "本次新增或更新里没有匹配当前搜索或标签的相册。" : "换个关键词，或者点“全部”看看。";
            content.addView(emptyState(title, message));
        } else if (albumsHasMore) {
            Button more = secondaryButton("加载更多");
            more.setOnClickListener(v -> {
                saveAlbumScroll();
                loadAlbums(false);
            });
            content.addView(more, matchWrapWithTop(12));
        }

        page.addView(scroll, new LinearLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, 0, 1));
        page.addView(bottomNav(), new LinearLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, navigationBarHeight() + dp(72)));
        root.addView(page, fullScreen());
        scroll.post(() -> scroll.scrollTo(0, albumScrollY));

        if (!isFavoritesTag() && !albumsLoadedOnce && albums.isEmpty() && !loading) {
            loadAlbums(true);
        } else {
            loadGallerySourcesIfNeeded();
        }
    }

    private View albumHeader() {
        LinearLayout wrap = new LinearLayout(this);
        wrap.setOrientation(LinearLayout.VERTICAL);
        wrap.setPadding(dp(16), statusBarHeight() + dp(12), dp(16), dp(8));

        LinearLayout titleRow = new LinearLayout(this);
        titleRow.setGravity(Gravity.CENTER_VERTICAL);
        TextView heading = text(currentGalleryTitle(), 20, colorText(), true);
        heading.setSingleLine(true);
        heading.setGravity(Gravity.CENTER_VERTICAL);
        heading.setOnClickListener(v -> showGallerySwitcher());
        titleRow.addView(heading, new LinearLayout.LayoutParams(0, dp(40), 1));

        View searchTop = iconButtonView(ICON_SEARCH, colorText(), "搜索");
        searchTop.setOnClickListener(v -> toast("在搜索栏输入关键词"));
        titleRow.addView(searchTop, new LinearLayout.LayoutParams(dp(36), dp(40)));

        View menu = iconButtonView(ICON_MENU, colorText(), "设置");
        menu.setOnClickListener(v -> showSettings());
        LinearLayout.LayoutParams menuParams = new LinearLayout.LayoutParams(dp(30), dp(40));
        menuParams.setMargins(dp(4), 0, 0, 0);
        titleRow.addView(menu, menuParams);
        wrap.addView(titleRow, matchWrap());

        LinearLayout searchBox = new LinearLayout(this);
        searchBox.setOrientation(LinearLayout.HORIZONTAL);
        searchBox.setGravity(Gravity.CENTER_VERTICAL);
        searchBox.setPadding(dp(12), 0, dp(6), 0);
        searchBox.setBackground(roundedBackground(colorSurfaceTint(), colorStroke(), 20));

        View searchIcon = iconView(ICON_SEARCH, colorMuted(), "搜索");
        searchBox.addView(searchIcon, new LinearLayout.LayoutParams(dp(24), dp(38)));

        EditText search = searchInput("搜索相册", searchKeyword);
        search.setOnEditorActionListener((v, actionId, event) -> {
            boolean enter = event != null && event.getKeyCode() == KeyEvent.KEYCODE_ENTER && event.getAction() == KeyEvent.ACTION_UP;
            if (actionId == EditorInfo.IME_ACTION_SEARCH || enter) {
                runSearch(search.getText().toString());
                return true;
            }
            return false;
        });
        searchBox.addView(search, new LinearLayout.LayoutParams(0, dp(38), 1));

        TextView clearHistory = text("×", 20, colorMuted(), true);
        clearHistory.setGravity(Gravity.CENTER);
        boolean canClearSearch = !searchKeyword.isEmpty() || !searchHistory.isEmpty();
        clearHistory.setEnabled(canClearSearch);
        clearHistory.setAlpha(canClearSearch ? 1f : 0.35f);
        clearHistory.setOnClickListener(v -> {
            if (!search.getText().toString().trim().isEmpty() || !searchKeyword.isEmpty()) {
                search.setText("");
                searchKeyword = "";
                showAlbums(true);
            } else {
                searchHistory.clear();
                saveSearchHistory();
                showAlbums(false);
            }
        });
        searchBox.addView(clearHistory, new LinearLayout.LayoutParams(dp(34), dp(38)));
        LinearLayout.LayoutParams searchParams = matchWrap();
        searchParams.setMargins(0, dp(8), 0, 0);
        wrap.addView(searchBox, searchParams);

        if (!searchHistory.isEmpty()) {
            HorizontalScrollView historyScroller = new HorizontalScrollView(this);
            historyScroller.setHorizontalScrollBarEnabled(false);
            LinearLayout historyChips = new LinearLayout(this);
            historyChips.setOrientation(LinearLayout.HORIZONTAL);
            for (String item : searchHistory) {
                TextView chip = headerPill(item, false);
                chip.setTextSize(12);
                chip.setOnClickListener(v -> runSearch(item));
                LinearLayout.LayoutParams params = new LinearLayout.LayoutParams(ViewGroup.LayoutParams.WRAP_CONTENT, dp(30));
                params.setMargins(0, 0, dp(8), 0);
                historyChips.addView(chip, params);
            }
            historyScroller.addView(historyChips);
            LinearLayout.LayoutParams historyParams = matchWrap();
            historyParams.setMargins(0, dp(8), 0, 0);
            wrap.addView(historyScroller, historyParams);
        }

        LinearLayout actionRow = new LinearLayout(this);
        actionRow.setOrientation(LinearLayout.HORIZONTAL);
        actionRow.setGravity(Gravity.CENTER_VERTICAL);

        TextView scan = headerPill(scanningLibrary ? "扫描中..." : "刷新图库 ↻", false);
        scan.setEnabled(!scanningLibrary);
        scan.setAlpha(scanningLibrary ? 0.6f : 1f);
        scan.setOnClickListener(v -> refreshLibrary());
        actionRow.addView(scan, new LinearLayout.LayoutParams(0, dp(36), 1));

        LinearLayout.LayoutParams actionParams = matchWrap();
        actionParams.setMargins(0, dp(10), 0, 0);
        wrap.addView(actionRow, actionParams);

        HorizontalScrollView scroller = new HorizontalScrollView(this);
        scroller.setHorizontalScrollBarEnabled(false);
        LinearLayout chips = new LinearLayout(this);
        chips.setOrientation(LinearLayout.HORIZONTAL);
        chips.setPadding(0, 0, 0, 0);
        for (String tag : TAGS) {
            TextView chip = headerPill(tag, tag.equals(activeTag));
            chip.setOnClickListener(v -> {
                activeTag = tag;
                showAlbums(true);
            });
            LinearLayout.LayoutParams params = new LinearLayout.LayoutParams(ViewGroup.LayoutParams.WRAP_CONTENT, dp(32));
            params.setMargins(0, 0, dp(8), 0);
            chips.addView(chip, params);
        }
        scroller.addView(chips);
        LinearLayout.LayoutParams chipParams = matchWrap();
        chipParams.setMargins(0, dp(10), 0, 0);
        wrap.addView(scroller, chipParams);

        LinearLayout summaryRow = new LinearLayout(this);
        summaryRow.setGravity(Gravity.CENTER_VERTICAL);
        summaryRow.setPadding(0, 0, 0, 0);
        String summaryText = isNewSort() ? "新增/更新 " + albums.size() + " 个相册" : "共 " + albums.size() + " 个相册";
        TextView summary = text(summaryText, 12, colorMuted(), false);
        summaryRow.addView(summary, new LinearLayout.LayoutParams(0, dp(26), 1));
        TextView order = text("按更新时间⌄", 12, colorMuted(), false);
        order.setGravity(Gravity.RIGHT | Gravity.CENTER_VERTICAL);
        summaryRow.addView(order, new LinearLayout.LayoutParams(ViewGroup.LayoutParams.WRAP_CONTENT, dp(26)));
        LinearLayout.LayoutParams summaryParams = matchWrap();
        summaryParams.setMargins(0, dp(8), 0, 0);
        wrap.addView(summaryRow, summaryParams);

        return wrap;
    }

    private View favoritesOverview() {
        LinearLayout panel = new LinearLayout(this);
        panel.setOrientation(LinearLayout.VERTICAL);
        panel.setPadding(dp(16), dp(14), dp(16), dp(14));
        panel.setBackground(roundedBackground(colorSurface(), colorStroke(), 14));

        LinearLayout titleRow = new LinearLayout(this);
        titleRow.setGravity(Gravity.CENTER_VERTICAL);
        IconView heart = new IconView(this, ICON_HEART, colorFavorite(), true);
        titleRow.addView(heart, new LinearLayout.LayoutParams(dp(24), dp(24)));

        TextView title = text("收藏中心", 17, colorText(), true);
        LinearLayout.LayoutParams titleParams = new LinearLayout.LayoutParams(0, ViewGroup.LayoutParams.WRAP_CONTENT, 1);
        titleParams.setMargins(dp(8), 0, 0, 0);
        titleRow.addView(title, titleParams);

        TextView total = text((favoriteAssets.size() + favoriteAlbums.size()) + " 项", 12, colorMuted(), true);
        total.setGravity(Gravity.CENTER);
        total.setPadding(dp(10), 0, dp(10), 0);
        total.setBackground(roundedBackground(colorSurfaceTint(), colorStroke(), 13));
        titleRow.addView(total, new LinearLayout.LayoutParams(ViewGroup.LayoutParams.WRAP_CONTENT, dp(26)));
        panel.addView(titleRow, matchWrap());

        LinearLayout stats = new LinearLayout(this);
        stats.setOrientation(LinearLayout.HORIZONTAL);
        LinearLayout.LayoutParams statsParams = matchWrapWithTop(12);
        panel.addView(stats, statsParams);
        stats.addView(favoriteStat("收藏图片", String.valueOf(favoriteAssets.size())), new LinearLayout.LayoutParams(0, dp(58), 1));
        LinearLayout.LayoutParams albumParams = new LinearLayout.LayoutParams(0, dp(58), 1);
        albumParams.setMargins(dp(10), 0, 0, 0);
        stats.addView(favoriteStat("收藏相册", String.valueOf(favoriteAlbums.size())), albumParams);

        TextView hint = text("收藏按账号保存；系统备份恢复后，卸载重装仍可找回", 12, colorMuted(), false);
        LinearLayout.LayoutParams hintParams = matchWrapWithTop(10);
        panel.addView(hint, hintParams);

        LinearLayout.LayoutParams panelParams = matchWrap();
        panelParams.setMargins(dp(6), 0, dp(6), dp(12));
        panel.setLayoutParams(panelParams);
        return panel;
    }

    private View favoriteStat(String label, String value) {
        LinearLayout block = new LinearLayout(this);
        block.setOrientation(LinearLayout.VERTICAL);
        block.setGravity(Gravity.CENTER_VERTICAL);
        block.setPadding(dp(12), 0, dp(12), 0);
        block.setBackground(roundedBackground(colorSurfaceTint(), colorStroke(), 12));

        TextView valueView = text(value, 20, colorPrimaryDark(), true);
        block.addView(valueView, matchWrap());
        TextView labelView = text(label, 12, colorMuted(), false);
        LinearLayout.LayoutParams labelParams = matchWrapWithTop(5);
        block.addView(labelView, labelParams);
        return block;
    }

    private View albumCard(Album album) {
        FrameLayout card = new FrameLayout(this);
        card.setBackground(roundedBackground(colorSurface(), colorStroke(), 12));
        ImageView cover = new ImageView(this);
        cover.setScaleType(ImageView.ScaleType.CENTER_CROP);
        cover.setBackgroundColor(colorSurfaceTint());
        card.addView(cover, fullFrame());
        imageLoader.load(cover, api.absolute(album.coverUrl), api.cookieHeader);

        LinearLayout overlay = new LinearLayout(this);
        overlay.setOrientation(LinearLayout.VERTICAL);
        overlay.setPadding(dp(12), dp(8), dp(34), dp(10));
        overlay.setBackgroundColor(Color.argb(120, 0, 0, 0));
        FrameLayout.LayoutParams overlayParams = new FrameLayout.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT,
                ViewGroup.LayoutParams.WRAP_CONTENT,
                Gravity.BOTTOM
        );
        card.addView(overlay, overlayParams);

        TextView name = text(album.name, 15, Color.WHITE, true);
        name.setMaxLines(2);
        overlay.addView(name, matchWrap());

        TextView count = text(album.countLabel(), 13, Color.WHITE, false);
        LinearLayout.LayoutParams countParams = matchWrap();
        countParams.setMargins(0, dp(4), 0, 0);
        overlay.addView(count, countParams);

        if (!isFavoriteImagesAlbum(album)) {
            TextView favorite = text(isFavorite(album) ? "♥" : "♡", 10, Color.WHITE, true);
            favorite.setGravity(Gravity.CENTER);
            favorite.setFocusable(true);
            favorite.setClickable(true);
            favorite.setOnClickListener(v -> {
                saveAlbumScroll();
                toggleFavoriteAlbum(album);
                showAlbums(false);
            });
            FrameLayout.LayoutParams favParams = new FrameLayout.LayoutParams(dp(36), dp(36), Gravity.TOP | Gravity.RIGHT);
            favParams.setMargins(0, dp(2), dp(2), 0);
            card.addView(favorite, favParams);
        }

        TextView more = text("⋮", 26, Color.WHITE, true);
        more.setGravity(Gravity.CENTER);
        more.setFocusable(true);
        more.setClickable(true);
        more.setOnClickListener(v -> showAlbumMoreDialog(album));
        FrameLayout.LayoutParams moreParams = new FrameLayout.LayoutParams(dp(34), dp(44), Gravity.BOTTOM | Gravity.RIGHT);
        moreParams.setMargins(0, 0, dp(2), dp(2));
        card.addView(more, moreParams);

        card.setOnClickListener(v -> {
            saveAlbumScroll();
            currentAlbum = album;
            assetScrollY = 0;
            assets.clear();
            assetPage = 1;
            if (isFavoritesAlbum()) {
                assets.addAll(favoriteAssets);
                assetsHasMore = false;
                assetsLoadedOnce = true;
            } else {
                assetsHasMore = true;
                assetsLoadedOnce = false;
            }
            showAssets();
        });
        return card;
    }

    private void copyText(String label, String text) {
        ClipboardManager clipboard = (ClipboardManager) getSystemService(Context.CLIPBOARD_SERVICE);
        if (clipboard != null) clipboard.setPrimaryClip(ClipData.newPlainText(label, text));
        toast("链接已复制");
    }

    private void showAlbumMoreDialog(Album album) {
        List<String> actions = new ArrayList<>();
        actions.add("下载相册到本地");
        actions.add("生成公开分享链接");
        if ("admin".equals(role)) actions.add("分享给普通账户");
        String[] items = actions.toArray(new String[0]);
        new AlertDialog.Builder(this)
                .setTitle(album.name)
                .setItems(items, (dialog, which) -> {
                    String action = items[which];
                    if ("下载相册到本地".equals(action)) new DownloadAlbumTask(album).execute();
                    else if ("生成公开分享链接".equals(action)) new CreatePublicShareTask("album", album.id).execute();
                    else showShareAlbumDialog(album);
                })
                .setNegativeButton("取消", null)
                .show();
    }

    private void showShareAlbumDialog(Album album) {
        if (!"admin".equals(role)) {
            toast("只有管理员可以分享相册");
            return;
        }
        new LoadAlbumSharesTask(album).execute();
    }

    private void showShareAlbumDialogWithState(Album album, List<String> users, Set<String> sharedUsers) {
        if (users.isEmpty()) {
            toast("请先在设置里创建普通账户");
            return;
        }
        String[] items = users.toArray(new String[0]);
        boolean[] checked = new boolean[items.length];
        for (int i = 0; i < items.length; i++) checked[i] = sharedUsers.contains(items[i]);
        new AlertDialog.Builder(this)
                .setTitle("分享相册：" + album.name)
                .setMultiChoiceItems(items, checked, (dialog, which, isChecked) -> checked[which] = isChecked)
                .setPositiveButton("确认", (dialog, which) -> {
                    Set<String> next = new HashSet<>();
                    for (int i = 0; i < items.length; i++) if (checked[i]) next.add(items[i]);
                    new SaveAlbumSharesTask(album, users, next, ok -> toast(ok ? "分享设置已保存" : "分享设置保存失败")).execute();
                })
                .setNegativeButton("取消", null)
                .show();
    }

    private void showAssets() {
        currentScreen = SCREEN_ASSETS;
        viewerOpen = false;
        root.removeAllViews();
        LinearLayout page = basePage();
        page.addView(topBar(currentAlbum.name, () -> {
            saveAssetScroll();
            currentAlbum = null;
            showAlbums(false);
        }, null));
        if ("admin".equals(role) && !isFavoritesAlbum()) {
            TextView albumId = text("ID: " + currentAlbum.id, 11, colorMuted(), false);
            albumId.setGravity(Gravity.CENTER);
            page.addView(albumId, matchWrap());
        }
        if (!isFavoritesAlbum()) {
            Button albumFavorite = secondaryButton(isFavorite(currentAlbum) ? "♥ 已收藏此相册" : "♡ 收藏此相册");
            albumFavorite.setTextColor(isFavorite(currentAlbum) ? colorFavorite() : colorMuted());
            albumFavorite.setFocusable(true);
            albumFavorite.setClickable(true);
            albumFavorite.setOnClickListener(v -> {
                saveAssetScroll();
                toggleFavoriteAlbum(currentAlbum);
                showAssets();
            });
            LinearLayout.LayoutParams favParams = matchWrap();
            favParams.setMargins(dp(14), 0, dp(14), dp(8));
            page.addView(albumFavorite, favParams);
        }

        ScrollView scroll = new ScrollView(this);
        assetScrollView = scroll;
        LinearLayout content = new LinearLayout(this);
        content.setOrientation(LinearLayout.VERTICAL);
        content.setPadding(dp(10), dp(10), dp(10), navigationBarHeight() + dp(90));
        scroll.addView(content);

        GridLayout grid = new GridLayout(this);
        grid.setColumnCount(2);
        content.addView(grid, matchWrap());
        for (int i = 0; i < assets.size(); i++) {
            grid.addView(assetTile(assets.get(i), i), assetGridParams());
        }

        if (loading) {
            ProgressBar bar = new ProgressBar(this);
            content.addView(bar, centeredParams(dp(44), dp(44)));
        } else if (assetsLoadedOnce && assets.isEmpty()) {
            String title = isFavoritesAlbum() ? "还没有收藏" : "这个相册暂时没有图片";
            String message = isFavoritesAlbum() ? "在全屏看图时点心型收藏图片。" : "返回相册列表试试其他内容。";
            content.addView(emptyState(title, message));
        } else if (!isFavoritesAlbum() && assetsHasMore) {
            Button more = secondaryButton("加载更多");
            more.setOnClickListener(v -> {
                saveAssetScroll();
                loadAssets(false);
            });
            content.addView(more, matchWrapWithTop(12));
        }

        page.addView(scroll, new LinearLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, 0, 1));
        root.addView(page, fullScreen());
        scroll.post(() -> scroll.scrollTo(0, assetScrollY));

        if (!isFavoritesAlbum() && !assetsLoadedOnce && assets.isEmpty() && !loading) {
            loadAssets(true);
        }
    }

    private View assetTile(Asset asset, int index) {
        ImageView image = new ImageView(this);
        image.setScaleType(ImageView.ScaleType.CENTER_CROP);
        image.setBackgroundColor(colorSurfaceTint());
        imageLoader.load(image, api.absolute(asset.thumbnailUrl), api.cookieHeader);
        image.setOnClickListener(v -> {
            saveAssetScroll();
            showViewer(index);
        });
        return image;
    }

    private void showViewer(int index) {
        currentScreen = SCREEN_VIEWER;
        if (assets.isEmpty()) {
            showAssets();
            return;
        }
        viewerOpen = true;
        enterImmersiveMode();
        currentAssetIndex = index;
        if (currentAssetIndex < 0) currentAssetIndex = 0;
        if (currentAssetIndex >= assets.size()) currentAssetIndex = assets.size() - 1;
        root.removeAllViews();

        FrameLayout viewer = new FrameLayout(this);
        viewer.setBackgroundColor(Color.BLACK);
        ImageView image = new ImageView(this);
        image.setScaleType(ImageView.ScaleType.FIT_CENTER);
        viewer.addView(image, fullScreen());

        FrameLayout topChrome = new FrameLayout(this);
        View topScrim = new View(this);
        topScrim.setBackground(viewerTopScrimBackground());
        topChrome.addView(topScrim, new FrameLayout.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT,
                dp(118),
                Gravity.TOP
        ));

        View close = viewerTopIcon(ICON_CLOSE, "关闭");
        close.setOnClickListener(v -> showAssets());
        FrameLayout.LayoutParams closeParams = new FrameLayout.LayoutParams(dp(44), dp(44), Gravity.TOP | Gravity.LEFT);
        closeParams.setMargins(dp(8), dp(35), 0, 0);
        topChrome.addView(close, closeParams);

        TextView counter = text("", 12, Color.argb(198, 255, 255, 255), false);
        counter.setGravity(Gravity.CENTER);
        counter.setSingleLine(true);
        counter.setShadowLayer(dp(2), 0, dp(1), Color.argb(160, 0, 0, 0));
        FrameLayout.LayoutParams counterParams = new FrameLayout.LayoutParams(
                ViewGroup.LayoutParams.WRAP_CONTENT,
                dp(44),
                Gravity.TOP | Gravity.CENTER_HORIZONTAL
        );
        counterParams.setMargins(0, dp(35), 0, 0);
        topChrome.addView(counter, counterParams);

        TextView favorite = viewerTopTextButton("♡");
        favorite.setTextSize(24);
        FrameLayout.LayoutParams favoriteParams = new FrameLayout.LayoutParams(dp(44), dp(44), Gravity.TOP | Gravity.RIGHT);
        favoriteParams.setMargins(0, dp(35), dp(52), 0);
        topChrome.addView(favorite, favoriteParams);
        View more = viewerTopIconPlain(ICON_MENU, "更多");
        FrameLayout.LayoutParams moreParams = new FrameLayout.LayoutParams(dp(44), dp(44), Gravity.TOP | Gravity.RIGHT);
        moreParams.setMargins(0, dp(35), dp(8), 0);
        topChrome.addView(more, moreParams);
        viewer.addView(topChrome, new FrameLayout.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT,
                dp(118),
                Gravity.TOP
        ));

        final float minZoom = 1f;
        final float maxZoom = 4f;
        final float[] zoom = {minZoom};
        final float[] downX = {0f};
        final float[] downY = {0f};
        final float[] lastTouchX = {0f};
        final float[] lastTouchY = {0f};
        final long[] lastTapTime = {0L};
        final float[] lastTapX = {0f};
        final float[] lastTapY = {0f};
        final boolean[] moved = {false};
        final boolean[] multiTouch = {false};
        final boolean[] chromeVisible = {true};
        final int touchSlop = dp(4);
        final int doubleTapSlop = dp(48);
        final long doubleTapTimeout = 300L;
        final int sideTapWidth = dp(96);

        Runnable clampImagePan = () -> {
            if (zoom[0] <= minZoom) {
                image.setTranslationX(0f);
                image.setTranslationY(0f);
                return;
            }
            float maxX = image.getWidth() * (zoom[0] - minZoom) / 2f;
            float maxY = image.getHeight() * (zoom[0] - minZoom) / 2f;
            image.setTranslationX(clamp(image.getTranslationX(), -maxX, maxX));
            image.setTranslationY(clamp(image.getTranslationY(), -maxY, maxY));
        };

        Runnable resetZoom = () -> {
            zoom[0] = minZoom;
            image.setScaleX(minZoom);
            image.setScaleY(minZoom);
            image.setTranslationX(0f);
            image.setTranslationY(0f);
            image.setPivotX(image.getWidth() / 2f);
            image.setPivotY(image.getHeight() / 2f);
        };

        ScaleGestureDetector scaleDetector = new ScaleGestureDetector(this, new ScaleGestureDetector.SimpleOnScaleGestureListener() {
            @Override
            public boolean onScale(ScaleGestureDetector detector) {
                float nextZoom = clamp(zoom[0] * detector.getScaleFactor(), minZoom, maxZoom);
                zoom[0] = nextZoom;
                image.setPivotX(detector.getFocusX());
                image.setPivotY(detector.getFocusY());
                image.setScaleX(nextZoom);
                image.setScaleY(nextZoom);
                clampImagePan.run();
                return true;
            }
        });

        Runnable render = () -> {
            Asset asset = assets.get(currentAssetIndex);
            counter.setText(String.format(Locale.CHINA, "%d / %d", currentAssetIndex + 1, assets.size()));
            favorite.setText(isFavorite(asset) ? "♥" : "♡");
            favorite.setTextColor(isFavorite(asset) ? 0xFFFFCCD6 : Color.WHITE);
            resetZoom.run();
            imageLoader.load(image, api.absolute(asset.originalUrl), api.cookieHeader);
            preloadViewerImage(currentAssetIndex - 1);
            preloadViewerImage(currentAssetIndex + 1);
            preloadViewerImage(currentAssetIndex + 2);
        };

        Runnable previousAction = () -> {
            if (currentAssetIndex > 0) {
                currentAssetIndex--;
                render.run();
            } else {
                toast("已经是第一张");
            }
        };

        Runnable nextAction = () -> {
            if (currentAssetIndex < assets.size() - 1) {
                currentAssetIndex++;
                render.run();
            } else if (!isFavoritesAlbum() && assetsHasMore && !loading) {
                loadAssets(false, () -> {
                    if (currentAssetIndex < assets.size() - 1) {
                        currentAssetIndex++;
                        render.run();
                    } else {
                        toast("已经是最后一张");
                    }
                });
            } else {
                toast("已经是最后一张");
            }
        };

        FrameLayout bottomChrome = new FrameLayout(this);
        View bottomScrim = new View(this);
        bottomScrim.setBackground(viewerBottomScrimBackground());
        bottomChrome.addView(bottomScrim, new FrameLayout.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT,
                dp(96),
                Gravity.BOTTOM
        ));

        LinearLayout bottomBar = new LinearLayout(this);
        bottomBar.setOrientation(LinearLayout.HORIZONTAL);
        bottomBar.setGravity(Gravity.CENTER);
        bottomBar.setPadding(dp(18), dp(10), dp(18), dp(18));
        FrameLayout.LayoutParams bottomParams = new FrameLayout.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT,
                ViewGroup.LayoutParams.WRAP_CONTENT,
                Gravity.BOTTOM
        );

        Runnable setChromeVisible = () -> {
            float alpha = chromeVisible[0] ? 1f : 0f;
            topChrome.setVisibility(View.VISIBLE);
            bottomChrome.setVisibility(View.VISIBLE);
            topChrome.animate().alpha(alpha).setDuration(160).start();
            bottomChrome.animate().alpha(alpha).setDuration(160).start();
            topChrome.setClickable(chromeVisible[0]);
            bottomChrome.setClickable(chromeVisible[0]);
            if (!chromeVisible[0]) {
                topChrome.postDelayed(() -> {
                    if (!chromeVisible[0]) topChrome.setVisibility(View.GONE);
                }, 170);
                bottomChrome.postDelayed(() -> {
                    if (!chromeVisible[0]) bottomChrome.setVisibility(View.GONE);
                }, 170);
            }
        };

        Runnable toggleChrome = () -> {
            chromeVisible[0] = !chromeVisible[0];
            setChromeVisible.run();
            enterImmersiveMode();
        };

        image.setOnTouchListener((v, event) -> {
            scaleDetector.onTouchEvent(event);
            int action = event.getActionMasked();
            if (action == MotionEvent.ACTION_DOWN) {
                moved[0] = false;
                multiTouch[0] = false;
                downX[0] = event.getX();
                downY[0] = event.getY();
                lastTouchX[0] = event.getX();
                lastTouchY[0] = event.getY();
                return true;
            }
            if (action == MotionEvent.ACTION_POINTER_DOWN) {
                multiTouch[0] = true;
                return true;
            }
            if (action == MotionEvent.ACTION_MOVE && zoom[0] > minZoom && event.getPointerCount() == 1) {
                float dx = event.getX() - lastTouchX[0];
                float dy = event.getY() - lastTouchY[0];
                if (Math.abs(dx) > touchSlop || Math.abs(dy) > touchSlop) moved[0] = true;
                image.setTranslationX(image.getTranslationX() + dx);
                image.setTranslationY(image.getTranslationY() + dy);
                clampImagePan.run();
                lastTouchX[0] = event.getX();
                lastTouchY[0] = event.getY();
                return true;
            }
            if (action == MotionEvent.ACTION_UP) {
                float swipeX = event.getX() - downX[0];
                float swipeY = event.getY() - downY[0];
                if (!multiTouch[0] && zoom[0] <= minZoom && Math.abs(swipeX) > dp(72) && Math.abs(swipeX) > Math.abs(swipeY) * 1.4f) {
                    if (swipeX > 0) previousAction.run();
                    else nextAction.run();
                    return true;
                }
                if (!moved[0] && !multiTouch[0] && zoom[0] > minZoom) {
                    long now = event.getEventTime();
                    float tapDx = event.getX() - lastTapX[0];
                    float tapDy = event.getY() - lastTapY[0];
                    boolean isDoubleTap = now - lastTapTime[0] <= doubleTapTimeout
                            && Math.abs(tapDx) <= doubleTapSlop
                            && Math.abs(tapDy) <= doubleTapSlop;
                    if (isDoubleTap) {
                        resetZoom.run();
                        lastTapTime[0] = 0L;
                    } else {
                        lastTapTime[0] = now;
                        lastTapX[0] = event.getX();
                        lastTapY[0] = event.getY();
                    }
                    return true;
                }
                if (!moved[0] && !multiTouch[0] && zoom[0] <= minZoom) {
                    if (event.getX() <= sideTapWidth) previousAction.run();
                    else if (event.getX() >= v.getWidth() - sideTapWidth) nextAction.run();
                    else toggleChrome.run();
                    v.performClick();
                }
                return true;
            }
            if (action == MotionEvent.ACTION_CANCEL) return true;
            return true;
        });
        image.setOnClickListener(v -> {
        });
        image.setOnLongClickListener(v -> {
            if (zoom[0] > minZoom) return true;
            previousAction.run();
            return true;
        });
        favorite.setOnClickListener(v -> {
            Asset asset = assets.get(currentAssetIndex);
            if (isFavoritesAlbum() && isFavorite(asset)) {
                removeFavorite(asset);
                assets.remove(currentAssetIndex);
                if (assets.isEmpty()) {
                    showAssets();
                    return;
                }
                if (currentAssetIndex >= assets.size()) currentAssetIndex = assets.size() - 1;
                render.run();
                return;
            }
            toggleFavorite(asset);
            render.run();
        });

        View grid = viewerToolIcon(ICON_GRID, "返回九宫格");
        grid.setOnClickListener(v -> showAssets());
        bottomBar.addView(grid, new LinearLayout.LayoutParams(0, dp(44), 1));

        View zoomOut = viewerToolIcon(ICON_ZOOM_RESET, "恢复大小");
        zoomOut.setOnClickListener(v -> {
            resetZoom.run();
            toast("已恢复原始大小");
        });
        bottomBar.addView(zoomOut, new LinearLayout.LayoutParams(0, dp(44), 1));

        View zoomIn = viewerToolIcon(ICON_ZOOM_IN, "放大");
        zoomIn.setOnClickListener(v -> {
            zoom[0] = clamp(zoom[0] * 1.2f, minZoom, maxZoom);
            image.setPivotX(image.getWidth() / 2f);
            image.setPivotY(image.getHeight() / 2f);
            image.setScaleX(zoom[0]);
            image.setScaleY(zoom[0]);
            clampImagePan.run();
        });
        bottomBar.addView(zoomIn, new LinearLayout.LayoutParams(0, dp(44), 1));

        more.setOnClickListener(v -> {
            if (assets.isEmpty() || currentAssetIndex < 0 || currentAssetIndex >= assets.size()) {
                toast("当前没有图片");
                return;
            }
            Asset asset = assets.get(currentAssetIndex);
            new AlertDialog.Builder(this)
                    .setTitle("图片操作")
                    .setItems(new String[]{"下载到本地", "生成公开分享链接"}, (dialog, which) -> {
                        if (which == 0) new DownloadAssetTask(asset).execute();
                        else new CreatePublicShareTask("asset", asset.id).execute();
                    })
                    .setNegativeButton("取消", null)
                    .show();
        });

        bottomChrome.addView(bottomBar, bottomParams);
        viewer.addView(bottomChrome, new FrameLayout.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT,
                dp(96),
                Gravity.BOTTOM
        ));

        root.addView(viewer, fullScreen());
        render.run();
    }

    private void preloadViewerImage(int index) {
        if (index < 0 || index >= assets.size()) return;
        Asset asset = assets.get(index);
        String url = asset.originalUrl == null || asset.originalUrl.trim().isEmpty()
                ? asset.thumbnailUrl
                : asset.originalUrl;
        imageLoader.preload(api.absolute(url), api.cookieHeader);
    }

    private void loadAlbums(boolean reset) {
        if (isFavoritesTag()) {
            showAlbums(reset);
            return;
        }
        if (loading) return;
        if (!reset) saveAlbumScroll();
        loading = true;
        if (reset) {
            albumPage = 1;
            albums.clear();
            albumsHasMore = true;
            albumsLoadedOnce = false;
            albumScrollY = 0;
        }
        showAlbums(false);
        String keyword = TAG_ALL.equals(activeTag) ? searchKeyword : joinKeywords(searchKeyword, activeTag);
        if (isNewSort()) {
            if (newAlbumIds.isEmpty()) {
                loading = false;
                albumsHasMore = false;
                albumsLoadedOnce = true;
                showAlbums(false);
                return;
            }
            new NewAlbumsTask(keyword, activeGalleryPrefix, result -> {
                loading = false;
                albumsLoadedOnce = true;
                if (result != null) {
                    albums.addAll(result.items);
                    albumsHasMore = false;
                } else {
                    albumsHasMore = false;
                }
                showAlbums(false);
            }).execute();
            return;
        }
        new AlbumsTask(albumPage, keyword, albumSortBy(), albumSortOrder(), activeGalleryPrefix, result -> {
            loading = false;
            albumsLoadedOnce = true;
            if (result != null) {
                albums.addAll(result.items);
                sortAlbums();
                albumsHasMore = albums.size() < result.total;
                albumPage++;
            } else {
                albumsHasMore = false;
            }
            showAlbums(false);
        }).execute();
    }

    private void loadAssets(boolean reset) {
        loadAssets(reset, null);
    }

    private void loadAssets(boolean reset, Runnable after) {
        if (loading || currentAlbum == null) return;
        if (isFavoritesAlbum()) {
            assets.clear();
            assets.addAll(favoriteAssets);
            assetsHasMore = false;
            assetsLoadedOnce = true;
            if (after != null) after.run();
            else showAssets();
            return;
        }
        if (!reset && after == null) saveAssetScroll();
        loading = true;
        if (reset) {
            assetPage = 1;
            assets.clear();
            assetsHasMore = true;
            assetsLoadedOnce = false;
            assetScrollY = 0;
        }
        if (after == null) showAssets();
        new AssetsTask(currentAlbum.id, assetPage, result -> {
            loading = false;
            assetsLoadedOnce = true;
            if (result != null) {
                assets.addAll(result.items);
                assetsHasMore = assets.size() < result.total;
                assetPage++;
            } else {
                assetsHasMore = false;
            }
            if (after != null) after.run();
            else showAssets();
        }).execute();
    }

    private void refreshLibrary() {
        if (scanningLibrary) return;
        scanningLibrary = true;
        showAlbums(false);
        toast("开始扫描图库");
        new ScanLibraryTask(result -> {
            scanningLibrary = false;
            if (result != null && result.ok) {
                newAlbumIds.clear();
                newAlbumIds.addAll(result.newAlbumIds);
                saveNewAlbumIds();
                activeSort = SORT_NEW;
                toast("扫描完成，新增/更新 " + newAlbumIds.size() + " 个相册");
                showAlbums(true);
            } else {
                showAlbums(false);
            }
        }).execute();
    }

    private String joinKeywords(String search, String tag) {
        if (search == null || search.trim().isEmpty()) return tag;
        return search.trim() + " " + tag;
    }

    private String albumSortBy() {
        return "updatedAt";
    }

    private String albumSortOrder() {
        return "desc";
    }

    private void runSearch(String keyword) {
        searchKeyword = keyword == null ? "" : keyword.trim();
        if (!searchKeyword.isEmpty()) addSearchHistory(searchKeyword);
        showAlbums(true);
    }

    private void sortAlbums() {
        if (albums.size() < 2) return;
        Collections.sort(albums, (left, right) -> compareDesc(left.sortTime, right.sortTime));
    }

    private int compareDesc(String left, String right) {
        String a = left == null ? "" : left;
        String b = right == null ? "" : right;
        return b.compareTo(a);
    }

    private boolean isNewSort() {
        return SORT_NEW.equals(activeSort);
    }

    private void resetGalleryState() {
        gallerySources.clear();
        activeGalleryPrefix = "";
        loadingGallerySources = false;
        gallerySourcesLoaded = false;
    }

    private String currentGalleryTitle() {
        for (GallerySource source : gallerySources) {
            if (source.prefixKey.equals(activeGalleryPrefix)) return source.name;
        }
        return serverTitle();
    }

    private String serverTitle() {
        try {
            String host = new URL(baseUrl).getHost();
            return host == null || host.trim().isEmpty() ? "Moment Pic" : host.trim();
        } catch (Exception ignored) {
            return "Moment Pic";
        }
    }

    private void showGallerySwitcher() {
        if (gallerySources.size() <= 1) {
            toast("当前只有一个图库");
            loadGallerySourcesIfNeeded();
            return;
        }
        String[] names = new String[gallerySources.size()];
        int checked = 0;
        for (int i = 0; i < gallerySources.size(); i++) {
            GallerySource source = gallerySources.get(i);
            names[i] = source.name;
            if (source.prefixKey.equals(activeGalleryPrefix)) checked = i;
        }
        new AlertDialog.Builder(this)
                .setTitle("切换图库")
                .setSingleChoiceItems(names, checked, (dialog, which) -> {
                    GallerySource source = gallerySources.get(which);
                    if (!source.prefixKey.equals(activeGalleryPrefix)) {
                        activeGalleryPrefix = source.prefixKey;
                        showAlbums(true);
                    }
                    dialog.dismiss();
                })
                .show();
    }

    private void loadGallerySourcesIfNeeded() {
        if (loading || isFavoritesTag() || gallerySourcesLoaded || loadingGallerySources || api == null) return;
        loadingGallerySources = true;
        new GallerySourcesTask().execute();
    }

    private void applyGallerySources(List<GallerySource> sources) {
        if (sources != null && !sources.isEmpty()) {
            gallerySources.clear();
            gallerySources.addAll(sources);
        } else if (gallerySources.isEmpty()) {
            gallerySources.add(new GallerySource(serverTitle(), ""));
        }
        boolean activeExists = activeGalleryPrefix.isEmpty();
        for (GallerySource source : gallerySources) {
            if (source.prefixKey.equals(activeGalleryPrefix)) {
                activeExists = true;
                break;
            }
        }
        if (!activeExists) activeGalleryPrefix = "";
    }

    private List<GallerySource> inferGallerySources(List<Album> sourceAlbums) {
        List<List<String>> paths = new ArrayList<>();
        for (Album album : sourceAlbums) {
            List<String> segments = pathSegments(album == null ? null : album.sourcePath);
            if (!segments.isEmpty()) paths.add(segments);
        }
        List<GallerySource> result = new ArrayList<>();
        if (paths.isEmpty()) return result;

        int common = commonPrefixLength(paths);
        if (common < maxPathLength(paths)) {
            LinkedHashMap<String, Integer> counts = new LinkedHashMap<>();
            LinkedHashMap<String, String> prefixes = new LinkedHashMap<>();
            for (List<String> segments : paths) {
                if (segments.size() <= common) continue;
                String name = segments.get(common);
                String prefix = joinSegments(segments, common + 1);
                counts.put(name, counts.containsKey(name) ? counts.get(name) + 1 : 1);
                if (!prefixes.containsKey(name)) prefixes.put(name, prefix);
            }
            boolean hasRepeatedGroup = false;
            for (Integer count : counts.values()) {
                if (count > 1) {
                    hasRepeatedGroup = true;
                    break;
                }
            }
            if (counts.size() > 1 && counts.size() < paths.size() && hasRepeatedGroup) {
                for (String name : counts.keySet()) result.add(new GallerySource(name, prefixes.get(name)));
                return result;
            }
        }

        String name = common > 0 ? paths.get(0).get(common - 1) : serverTitle();
        result.add(new GallerySource(name, ""));
        return result;
    }

    private static List<String> pathSegments(String path) {
        List<String> segments = new ArrayList<>();
        if (path == null) return segments;
        String normalized = path.trim().replace('\\', '/');
        for (String part : normalized.split("/")) {
            String item = part.trim();
            if (!item.isEmpty()) segments.add(item);
        }
        return segments;
    }

    private static int commonPrefixLength(List<List<String>> paths) {
        if (paths.isEmpty()) return 0;
        int limit = paths.get(0).size();
        for (List<String> path : paths) limit = Math.min(limit, path.size());
        int common = 0;
        while (common < limit) {
            String value = paths.get(0).get(common);
            for (int i = 1; i < paths.size(); i++) {
                if (!value.equals(paths.get(i).get(common))) return common;
            }
            common++;
        }
        return common;
    }

    private static int maxPathLength(List<List<String>> paths) {
        int max = 0;
        for (List<String> path : paths) max = Math.max(max, path.size());
        return max;
    }

    private static String joinSegments(List<String> segments, int count) {
        StringBuilder builder = new StringBuilder();
        for (int i = 0; i < count && i < segments.size(); i++) {
            if (builder.length() > 0) builder.append('/');
            builder.append(segments.get(i));
        }
        return builder.toString();
    }

    private static boolean sourcePathMatchesPrefix(String sourcePath, String prefixKey) {
        if (prefixKey == null || prefixKey.trim().isEmpty()) return true;
        String key = joinSegments(pathSegments(sourcePath), Integer.MAX_VALUE);
        return key.equals(prefixKey) || key.startsWith(prefixKey + "/");
    }

    private static boolean galleryMatches(Album album, String galleryId) {
        if (galleryId == null || galleryId.trim().isEmpty()) return true;
        return album != null && galleryId.trim().equals(album.galleryId);
    }

    private void loadSearchHistory() {
        searchHistory.clear();
        String raw = getSharedPreferences(PREFS, MODE_PRIVATE).getString(KEY_SEARCH_HISTORY, "[]");
        try {
            JSONArray array = new JSONArray(raw);
            for (int i = 0; i < array.length(); i++) {
                String item = array.optString(i).trim();
                if (!item.isEmpty() && !searchHistory.contains(item)) searchHistory.add(item);
            }
        } catch (Exception ignored) {
            searchHistory.clear();
        }
    }

    private void addSearchHistory(String keyword) {
        searchHistory.remove(keyword);
        searchHistory.add(0, keyword);
        while (searchHistory.size() > 10) searchHistory.remove(searchHistory.size() - 1);
        saveSearchHistory();
    }

    private void saveSearchHistory() {
        JSONArray array = new JSONArray();
        for (String item : searchHistory) array.put(item);
        getSharedPreferences(PREFS, MODE_PRIVATE).edit()
                .putString(KEY_SEARCH_HISTORY, array.toString())
                .apply();
    }

    private void loadNewAlbumIds() {
        newAlbumIds.clear();
        String raw = getSharedPreferences(PREFS, MODE_PRIVATE).getString(KEY_NEW_ALBUM_IDS, "[]");
        try {
            JSONArray array = new JSONArray(raw);
            for (int i = 0; i < array.length(); i++) {
                String item = array.optString(i).trim();
                if (!item.isEmpty() && !newAlbumIds.contains(item)) newAlbumIds.add(item);
            }
        } catch (Exception ignored) {
            newAlbumIds.clear();
        }
    }

    private void saveNewAlbumIds() {
        JSONArray array = new JSONArray();
        for (String item : newAlbumIds) array.put(item);
        getSharedPreferences(PREFS, MODE_PRIVATE).edit()
                .putString(KEY_NEW_ALBUM_IDS, array.toString())
                .apply();
    }

    private void loadFavorites() {
        favoriteAssets.clear();
        android.content.SharedPreferences prefs = getSharedPreferences(PREFS, MODE_PRIVATE);
        String favoritesKey = accountScopedKey(KEY_FAVORITES);
        boolean migrateFavorites = shouldMigrateLegacyFavorites(prefs, favoritesKey);
        String raw = prefs.getString(favoritesKey, prefs.getString(KEY_FAVORITES, "[]"));
        try {
            JSONArray array = new JSONArray(raw);
            for (int i = 0; i < array.length(); i++) {
                Asset asset = Asset.from(array.getJSONObject(i));
                if (!assetKey(asset).isEmpty()) favoriteAssets.add(asset);
            }
            if (migrateFavorites) saveAccountScopedValue(KEY_FAVORITES, raw);
        } catch (Exception ignored) {
            favoriteAssets.clear();
        }

        favoriteAlbums.clear();
        String favoriteAlbumsKey = accountScopedKey(KEY_FAVORITE_ALBUMS);
        boolean migrateFavoriteAlbums = shouldMigrateLegacyFavorites(prefs, favoriteAlbumsKey);
        String albumRaw = prefs.getString(favoriteAlbumsKey, prefs.getString(KEY_FAVORITE_ALBUMS, "[]"));
        try {
            JSONArray array = new JSONArray(albumRaw);
            for (int i = 0; i < array.length(); i++) {
                Album album = Album.from(array.getJSONObject(i));
                if (!albumKey(album).isEmpty()) favoriteAlbums.add(album);
            }
            if (migrateFavoriteAlbums) saveAccountScopedValue(KEY_FAVORITE_ALBUMS, albumRaw);
        } catch (Exception ignored) {
            favoriteAlbums.clear();
        }
        if (migrateFavorites || migrateFavoriteAlbums) {
            prefs.edit().putBoolean(KEY_FAVORITES_MIGRATED, true).apply();
        }
    }

    private void saveFavorites() {
        JSONArray array = new JSONArray();
        try {
            for (Asset asset : favoriteAssets) {
                JSONObject item = new JSONObject();
                item.put("id", asset.id);
                item.put("name", asset.name);
                item.put("thumbnailUrl", asset.thumbnailUrl);
                item.put("originalUrl", asset.originalUrl);
                array.put(item);
            }
        } catch (Exception ignored) {
        }
        saveAccountScopedValue(KEY_FAVORITES, array.toString());
    }

    private void saveFavoriteAlbums() {
        JSONArray array = new JSONArray();
        try {
            for (Album album : favoriteAlbums) {
                JSONObject item = new JSONObject();
                item.put("id", album.id);
                item.put("name", album.name);
                item.put("assetCount", album.assetCount);
                item.put("archiveCount", album.archiveCount);
                item.put("coverUrl", album.coverUrl);
                item.put("sourcePath", album.sourcePath);
                item.put("sortTime", album.sortTime);
                array.put(item);
            }
        } catch (Exception ignored) {
        }
        saveAccountScopedValue(KEY_FAVORITE_ALBUMS, array.toString());
    }

    private boolean shouldMigrateLegacyFavorites(android.content.SharedPreferences prefs, String scopedKey) {
        return !prefs.getBoolean(KEY_FAVORITES_MIGRATED, false)
                && !prefs.contains(scopedKey)
                && (prefs.contains(KEY_FAVORITES) || prefs.contains(KEY_FAVORITE_ALBUMS));
    }

    private void saveAccountScopedValue(String key, String value) {
        getSharedPreferences(PREFS, MODE_PRIVATE).edit()
                .putString(accountScopedKey(key), value)
                .apply();
    }

    private String accountScopedKey(String key) {
        String url = baseUrl == null ? "" : baseUrl.trim().toLowerCase(Locale.ROOT);
        String user = username == null ? "" : username.trim().toLowerCase(Locale.ROOT);
        if (url.isEmpty() && user.isEmpty()) return key;
        return key + "::" + url + "::" + user;
    }

    private boolean isFavorite(Asset asset) {
        return findFavoriteIndex(asset) >= 0;
    }

    private void toggleFavorite(Asset asset) {
        int index = findFavoriteIndex(asset);
        if (index >= 0) {
            favoriteAssets.remove(index);
            toast("已取消收藏");
        } else {
            favoriteAssets.add(0, copyAsset(asset));
            toast("已收藏");
        }
        saveFavorites();
    }

    private void removeFavorite(Asset asset) {
        int index = findFavoriteIndex(asset);
        if (index >= 0) {
            favoriteAssets.remove(index);
            saveFavorites();
            toast("已取消收藏");
        }
    }

    private boolean isFavorite(Album album) {
        return findFavoriteAlbumIndex(album) >= 0;
    }

    private void toggleFavoriteAlbum(Album album) {
        int index = findFavoriteAlbumIndex(album);
        if (index >= 0) {
            favoriteAlbums.remove(index);
            toast("已取消收藏相册");
        } else {
            favoriteAlbums.add(0, copyAlbum(album));
            toast("已收藏相册");
        }
        saveFavoriteAlbums();
        new PushFavoriteAlbumsTask().execute();
    }

    private int findFavoriteAlbumIndex(Album album) {
        String key = albumKey(album);
        if (key.isEmpty()) return -1;
        for (int i = 0; i < favoriteAlbums.size(); i++) {
            if (key.equals(albumKey(favoriteAlbums.get(i)))) return i;
        }
        return -1;
    }

    private int findFavoriteIndex(Asset asset) {
        String key = assetKey(asset);
        if (key.isEmpty()) return -1;
        for (int i = 0; i < favoriteAssets.size(); i++) {
            if (key.equals(assetKey(favoriteAssets.get(i)))) return i;
        }
        return -1;
    }

    private String assetKey(Asset asset) {
        if (asset == null) return "";
        if (asset.id != null && !asset.id.trim().isEmpty()) return asset.id;
        if (asset.originalUrl != null && !asset.originalUrl.trim().isEmpty()) return asset.originalUrl;
        if (asset.thumbnailUrl != null && !asset.thumbnailUrl.trim().isEmpty()) return asset.thumbnailUrl;
        return "";
    }

    private Asset copyAsset(Asset source) {
        Asset copy = new Asset();
        copy.id = source.id;
        copy.name = source.name;
        copy.thumbnailUrl = source.thumbnailUrl;
        copy.originalUrl = source.originalUrl;
        return copy;
    }

    private Album copyAlbum(Album source) {
        Album copy = new Album();
        copy.id = source.id;
        copy.galleryId = source.galleryId;
        copy.name = source.name;
        copy.assetCount = source.assetCount;
        copy.archiveCount = source.archiveCount;
        copy.coverUrl = source.coverUrl;
        copy.coverAssetId = source.coverAssetId;
        copy.sourcePath = source.sourcePath;
        copy.sortTime = source.sortTime;
        return copy;
    }

    private String albumKey(Album album) {
        if (album == null) return "";
        if (album.id != null && !album.id.trim().isEmpty()) return album.id;
        return album.name == null ? "" : album.name.trim();
    }

    private boolean albumChanged(Album before, Album after) {
        if (before == null || after == null) return true;
        if (before.assetCount != after.assetCount) return true;
        if (before.archiveCount != after.archiveCount) return true;
        String beforeTime = before.sortTime == null ? "" : before.sortTime;
        String afterTime = after.sortTime == null ? "" : after.sortTime;
        return !beforeTime.equals(afterTime);
    }

    private Album favoriteImagesAlbum() {
        Album album = new Album();
        album.id = FAVORITES_ALBUM_ID;
        album.name = "收藏图片";
        album.assetCount = favoriteAssets.size();
        album.archiveCount = 0;
        if (!favoriteAssets.isEmpty()) {
            Asset first = favoriteAssets.get(0);
            album.coverUrl = first.thumbnailUrl == null || first.thumbnailUrl.isEmpty() ? first.originalUrl : first.thumbnailUrl;
        }
        return album;
    }

    private boolean isFavoritesTag() {
        return TAG_FAVORITES.equals(activeTag);
    }

    private boolean isFavoritesAlbum() {
        return currentAlbum != null && FAVORITES_ALBUM_ID.equals(currentAlbum.id);
    }

    private boolean isFavoriteImagesAlbum(Album album) {
        return album != null && FAVORITES_ALBUM_ID.equals(album.id);
    }

    private void saveAlbumScroll() {
        if (albumScrollView != null) albumScrollY = albumScrollView.getScrollY();
    }

    private void saveAssetScroll() {
        if (assetScrollView != null) assetScrollY = assetScrollView.getScrollY();
    }

    private void attachPullToRefresh(ScrollView scroll) {
        final float[] startY = {0f};
        final boolean[] tracking = {false};
        scroll.setOnTouchListener((v, event) -> {
            int action = event.getActionMasked();
            if (action == MotionEvent.ACTION_DOWN) {
                tracking[0] = scroll.getScrollY() == 0;
                startY[0] = event.getY();
            } else if (action == MotionEvent.ACTION_UP || action == MotionEvent.ACTION_CANCEL) {
                if (tracking[0] && scroll.getScrollY() == 0 && event.getY() - startY[0] > dp(82) && !loading) {
                    toast("正在刷新");
                    loadAlbums(true);
                }
                tracking[0] = false;
            }
            return false;
        });
    }

    private LinearLayout basePage() {
        restoreSystemBars();
        LinearLayout page = new LinearLayout(this);
        page.setOrientation(LinearLayout.VERTICAL);
        page.setBackgroundColor(colorBg());
        return page;
    }

    private View topBar(String title, Runnable back, Runnable settings) {
        LinearLayout bar = new LinearLayout(this);
        bar.setGravity(Gravity.CENTER_VERTICAL);
        bar.setPadding(dp(16), statusBarHeight() + dp(22), dp(16), dp(12));

        if (back == null) {
            TextView heading = text("瞬影相册", 24, colorText(), true);
            heading.setSingleLine(true);
            bar.addView(heading, new LinearLayout.LayoutParams(0, ViewGroup.LayoutParams.WRAP_CONTENT, 1));

            Button search = iconButton("⌕");
            search.setOnClickListener(v -> toast("在下方搜索栏输入关键词"));
            bar.addView(search, new LinearLayout.LayoutParams(dp(44), dp(44)));

            Button right = iconButton("⋮");
            right.setOnClickListener(v -> {
                if (settings != null) settings.run();
                else showLogin();
            });
            LinearLayout.LayoutParams rightParams = new LinearLayout.LayoutParams(dp(44), dp(44));
            rightParams.setMargins(dp(6), 0, 0, 0);
            bar.addView(right, rightParams);
            return bar;
        }

        Button left = secondaryButton("返回");
        left.setOnClickListener(v -> {
            back.run();
        });
        bar.addView(left, new LinearLayout.LayoutParams(dp(76), dp(44)));

        TextView heading = text(title, 18, colorPrimaryDark(), true);
        heading.setSingleLine(true);
        heading.setGravity(Gravity.CENTER);
        LinearLayout.LayoutParams headingParams = new LinearLayout.LayoutParams(0, ViewGroup.LayoutParams.WRAP_CONTENT, 1);
        headingParams.setMargins(dp(8), 0, dp(8), 0);
        bar.addView(heading, headingParams);

        Button right = secondaryButton(settings == null ? "退出" : "设置");
        right.setOnClickListener(v -> {
            if (settings != null) settings.run();
            else showLogin();
        });
        bar.addView(right, new LinearLayout.LayoutParams(dp(76), dp(44)));
        return bar;
    }

    private LinearLayout card() {
        LinearLayout card = new LinearLayout(this);
        card.setOrientation(LinearLayout.VERTICAL);
        card.setBackground(roundedBackground(colorSurface(), colorStroke(), 10));
        card.setPadding(0, 0, 0, dp(4));
        return card;
    }

    private TextView text(String value, int sp, int color, boolean bold) {
        TextView view = new TextView(this);
        view.setText(value);
        view.setTextSize(sp);
        view.setTextColor(color);
        view.setIncludeFontPadding(false);
        if (bold) view.setTypeface(null, Typeface.BOLD);
        return view;
    }

    private EditText input(String hint, String value) {
        EditText input = new EditText(this);
        input.setHint(hint);
        input.setText(value);
        input.setSingleLine(true);
        input.setTextSize(15);
        input.setTextColor(colorText());
        input.setHintTextColor(colorMuted());
        input.setIncludeFontPadding(false);
        input.setPadding(dp(14), 0, dp(14), 0);
        input.setBackground(roundedBackground(colorSurface(), colorStroke(), 14));
        return input;
    }

    private EditText searchInput(String hint, String value) {
        EditText input = new EditText(this);
        input.setHint(hint);
        input.setText(value);
        input.setSingleLine(true);
        input.setTextSize(14);
        input.setTextColor(colorText());
        input.setHintTextColor(colorMuted());
        input.setIncludeFontPadding(false);
        input.setPadding(dp(8), 0, dp(8), 0);
        input.setImeOptions(EditorInfo.IME_ACTION_SEARCH);
        input.setBackgroundColor(Color.TRANSPARENT);
        return input;
    }

    private Button primaryButton(String text) {
        Button button = new Button(this);
        button.setText(text);
        button.setAllCaps(false);
        button.setTextColor(Color.WHITE);
        button.setTextSize(14);
        button.setMinHeight(0);
        button.setMinWidth(0);
        button.setPadding(dp(12), 0, dp(12), 0);
        button.setBackground(roundedBackground(colorPrimary(), 0, 16));
        return button;
    }

    private Button iconButton(String text) {
        Button button = secondaryButton(text);
        button.setTextSize(22);
        button.setPadding(0, 0, 0, dp(2));
        return button;
    }

    private Button headerIconButton(String text) {
        Button button = new Button(this);
        button.setText(text);
        button.setAllCaps(false);
        button.setTextColor(colorText());
        button.setTextSize(24);
        button.setGravity(Gravity.CENTER);
        button.setMinHeight(0);
        button.setMinWidth(0);
        button.setPadding(0, 0, 0, 0);
        button.setBackgroundColor(Color.TRANSPARENT);
        return button;
    }

    private TextView headerIcon(String value) {
        TextView icon = text(value, 24, colorText(), true);
        icon.setGravity(Gravity.CENTER);
        icon.setFocusable(true);
        icon.setClickable(true);
        icon.setBackgroundColor(Color.TRANSPARENT);
        return icon;
    }

    private TextView headerPill(String value, boolean active) {
        TextView pill = text(value, 13, active ? Color.WHITE : colorMuted(), true);
        pill.setGravity(Gravity.CENTER);
        pill.setSingleLine(true);
        pill.setPadding(dp(16), 0, dp(16), 0);
        pill.setFocusable(true);
        pill.setClickable(true);
        pill.setBackground(active
                ? roundedBackground(colorPrimary(), 0, 17)
                : roundedBackground(colorSurfaceTint(), colorStroke(), 17));
        return pill;
    }

    private Button secondaryButton(String text) {
        Button button = new Button(this);
        button.setText(text);
        button.setAllCaps(false);
        button.setTextColor(colorMuted());
        button.setTextSize(14);
        button.setMinHeight(0);
        button.setMinWidth(0);
        button.setPadding(dp(12), 0, dp(12), 0);
        button.setBackground(roundedBackground(colorSurfaceTint(), colorStroke(), 16));
        return button;
    }

    private TextView viewerTopTextButton(String value) {
        TextView button = text(value, 24, Color.WHITE, true);
        button.setGravity(Gravity.CENTER);
        button.setFocusable(true);
        button.setClickable(true);
        button.setBackgroundColor(Color.TRANSPARENT);
        button.setShadowLayer(dp(2), 0, dp(1), Color.argb(170, 0, 0, 0));
        return button;
    }

    private View viewerTopIcon(String icon, String description) {
        FrameLayout wrap = new FrameLayout(this);
        wrap.setFocusable(true);
        wrap.setClickable(true);
        wrap.setContentDescription(description);
        wrap.setBackground(roundedBackground(Color.argb(28, 0, 0, 0), 0, 22));
        IconView view = new IconView(this, icon, Color.WHITE, false);
        FrameLayout.LayoutParams params = new FrameLayout.LayoutParams(dp(21), dp(21), Gravity.CENTER);
        wrap.addView(view, params);
        return wrap;
    }

    private View viewerTopIconPlain(String icon, String description) {
        FrameLayout wrap = new FrameLayout(this);
        wrap.setFocusable(true);
        wrap.setClickable(true);
        wrap.setContentDescription(description);
        wrap.setBackgroundColor(Color.TRANSPARENT);
        IconView view = new IconView(this, icon, Color.WHITE, false);
        FrameLayout.LayoutParams params = new FrameLayout.LayoutParams(dp(21), dp(21), Gravity.CENTER);
        wrap.addView(view, params);
        return wrap;
    }

    private GradientDrawable viewerGlassBackground(int radiusDp) {
        return roundedBackground(Color.argb(112, 16, 16, 16), Color.argb(64, 255, 255, 255), radiusDp);
    }

    private GradientDrawable viewerTopScrimBackground() {
        return new GradientDrawable(
                GradientDrawable.Orientation.TOP_BOTTOM,
                new int[]{
                        Color.argb(118, 0, 0, 0),
                        Color.argb(54, 0, 0, 0),
                        Color.argb(0, 0, 0, 0)
                }
        );
    }

    private GradientDrawable viewerBottomScrimBackground() {
        return new GradientDrawable(
                GradientDrawable.Orientation.BOTTOM_TOP,
                new int[]{
                        Color.argb(124, 0, 0, 0),
                        Color.argb(46, 0, 0, 0),
                        Color.argb(0, 0, 0, 0)
                }
        );
    }

    private TextView overlayButton(String text) {
        TextView button = text(text, 30, Color.WHITE, true);
        button.setGravity(Gravity.CENTER);
        button.setBackground(roundedBackground(Color.argb(130, 0, 0, 0), 0, 18));
        return button;
    }

    private TextView viewerTool(String text) {
        TextView button = text(text, 24, Color.WHITE, true);
        button.setGravity(Gravity.CENTER);
        button.setFocusable(true);
        button.setClickable(true);
        return button;
    }

    private View bottomNav() {
        LinearLayout nav = new LinearLayout(this);
        nav.setOrientation(LinearLayout.HORIZONTAL);
        nav.setGravity(Gravity.CENTER);
        nav.setPadding(dp(18), dp(6), dp(18), navigationBarHeight() + dp(8));
        nav.setBackgroundColor(colorSurface());

        View albums = navItem(ICON_GRID, "相册", !isFavoritesTag());
        albums.setOnClickListener(v -> {
            activeTag = TAG_ALL;
            showAlbums(true);
        });
        nav.addView(albums, new LinearLayout.LayoutParams(0, ViewGroup.LayoutParams.MATCH_PARENT, 1));

        View favorites = navItem(ICON_HEART, "收藏", isFavoritesTag());
        favorites.setOnClickListener(v -> {
            activeTag = TAG_FAVORITES;
            showAlbums(true);
        });
        nav.addView(favorites, new LinearLayout.LayoutParams(0, ViewGroup.LayoutParams.MATCH_PARENT, 1));

        View profile = navItem(ICON_USER, "我的", false);
        profile.setOnClickListener(v -> showSettings());
        nav.addView(profile, new LinearLayout.LayoutParams(0, ViewGroup.LayoutParams.MATCH_PARENT, 1));
        return nav;
    }

    private View navItem(String icon, String label, boolean active) {
        LinearLayout item = new LinearLayout(this);
        item.setOrientation(LinearLayout.VERTICAL);
        item.setGravity(Gravity.CENTER);
        item.setFocusable(true);
        item.setClickable(true);
        item.setBackgroundColor(Color.TRANSPARENT);

        int color = active ? colorPrimary() : colorMuted();
        IconView iconView = new IconView(this, icon, color, active && ICON_HEART.equals(icon));
        item.addView(iconView, new LinearLayout.LayoutParams(dp(24), dp(24)));

        TextView text = text(label, 11, color, active);
        text.setGravity(Gravity.CENTER);
        LinearLayout.LayoutParams textParams = new LinearLayout.LayoutParams(
                ViewGroup.LayoutParams.WRAP_CONTENT,
                ViewGroup.LayoutParams.WRAP_CONTENT
        );
        textParams.setMargins(0, dp(4), 0, 0);
        item.addView(text, textParams);
        return item;
    }

    private IconView iconView(String icon, int color, String description) {
        IconView view = new IconView(this, icon, color, false);
        view.setContentDescription(description);
        return view;
    }

    private IconView iconButtonView(String icon, int color, String description) {
        IconView view = iconView(icon, color, description);
        view.setFocusable(true);
        view.setClickable(true);
        view.setBackgroundColor(Color.TRANSPARENT);
        return view;
    }

    private View overlayIconButton(String icon, String description) {
        FrameLayout wrap = new FrameLayout(this);
        wrap.setFocusable(true);
        wrap.setClickable(true);
        wrap.setContentDescription(description);
        wrap.setBackground(roundedBackground(Color.argb(130, 0, 0, 0), 0, 18));
        IconView view = new IconView(this, icon, Color.WHITE, false);
        FrameLayout.LayoutParams params = new FrameLayout.LayoutParams(dp(24), dp(24), Gravity.CENTER);
        wrap.addView(view, params);
        return wrap;
    }

    private View viewerToolIcon(String icon, String description) {
        FrameLayout wrap = new FrameLayout(this);
        wrap.setFocusable(true);
        wrap.setClickable(true);
        wrap.setContentDescription(description);
        IconView view = new IconView(this, icon, Color.WHITE, false);
        FrameLayout.LayoutParams params = new FrameLayout.LayoutParams(dp(25), dp(25), Gravity.CENTER);
        wrap.addView(view, params);
        return wrap;
    }

    private GradientDrawable roundedBackground(int color, int strokeColor, int radiusDp) {
        GradientDrawable drawable = new GradientDrawable();
        drawable.setColor(color);
        drawable.setCornerRadius(dp(radiusDp));
        if (strokeColor != 0) drawable.setStroke(dp(1), strokeColor);
        return drawable;
    }

    private View emptyState(String title, String message) {
        LinearLayout state = new LinearLayout(this);
        state.setOrientation(LinearLayout.VERTICAL);
        state.setGravity(Gravity.CENTER);
        state.setPadding(dp(22), dp(34), dp(22), dp(34));
        state.setBackground(roundedBackground(colorSurface(), colorStroke(), 14));

        FrameLayout iconBubble = new FrameLayout(this);
        iconBubble.setBackground(roundedBackground(colorSurfaceTint(), 0, 28));
        IconView icon = new IconView(this, emptyStateIcon(title), colorMuted(), title.contains("收藏"));
        iconBubble.addView(icon, new FrameLayout.LayoutParams(dp(30), dp(30), Gravity.CENTER));
        LinearLayout.LayoutParams iconParams = new LinearLayout.LayoutParams(dp(56), dp(56));
        iconParams.gravity = Gravity.CENTER_HORIZONTAL;
        state.addView(iconBubble, iconParams);

        TextView titleView = text(title, 18, colorText(), true);
        titleView.setGravity(Gravity.CENTER);
        LinearLayout.LayoutParams titleParams = matchWrap();
        titleParams.setMargins(0, dp(14), 0, dp(6));
        state.addView(titleView, titleParams);

        TextView messageView = text(message, 13, colorMuted(), false);
        messageView.setGravity(Gravity.CENTER);
        messageView.setLineSpacing(dp(3), 1f);
        state.addView(messageView, matchWrap());
        LinearLayout.LayoutParams stateParams = matchWrapWithTop(12);
        stateParams.setMargins(dp(6), dp(12), dp(6), dp(12));
        state.setLayoutParams(stateParams);
        return state;
    }

    private String emptyStateIcon(String title) {
        if (title != null && title.contains("收藏")) return ICON_HEART;
        if (title != null && title.contains("新增")) return ICON_GRID;
        return ICON_SEARCH;
    }

    private LinearLayout.LayoutParams inputParams() {
        LinearLayout.LayoutParams params = new LinearLayout.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT,
                dp(50)
        );
        params.setMargins(0, 0, 0, dp(10));
        return params;
    }

    private GridLayout.LayoutParams gridItemParams() {
        GridLayout.LayoutParams params = new GridLayout.LayoutParams();
        params.width = (getResources().getDisplayMetrics().widthPixels - dp(52)) / 2;
        params.height = dp(196);
        params.setMargins(dp(6), dp(6), dp(6), dp(12));
        return params;
    }

    private GridLayout.LayoutParams assetGridParams() {
        GridLayout.LayoutParams params = new GridLayout.LayoutParams();
        params.width = (getResources().getDisplayMetrics().widthPixels - dp(32)) / 2;
        params.height = params.width;
        params.setMargins(dp(3), dp(3), dp(3), dp(3));
        return params;
    }

    private LinearLayout.LayoutParams matchWrap() {
        return new LinearLayout.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT,
                ViewGroup.LayoutParams.WRAP_CONTENT
        );
    }

    private LinearLayout.LayoutParams matchWrapWithTop(int topDp) {
        LinearLayout.LayoutParams params = matchWrap();
        params.setMargins(0, dp(topDp), 0, 0);
        return params;
    }

    private LinearLayout.LayoutParams centeredParams(int width, int height) {
        LinearLayout.LayoutParams params = new LinearLayout.LayoutParams(width, height);
        params.gravity = Gravity.CENTER_HORIZONTAL;
        params.setMargins(0, dp(14), 0, 0);
        return params;
    }

    private FrameLayout.LayoutParams fullScreen() {
        return new FrameLayout.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT,
                ViewGroup.LayoutParams.MATCH_PARENT
        );
    }

    private FrameLayout.LayoutParams fullFrame() {
        return new FrameLayout.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT,
                ViewGroup.LayoutParams.MATCH_PARENT
        );
    }

    private int dp(int value) {
        return Math.round(value * getResources().getDisplayMetrics().density);
    }

    private int statusBarHeight() {
        return systemBarHeight("status_bar_height");
    }

    private int navigationBarHeight() {
        return systemBarHeight("navigation_bar_height");
    }

    private int systemBarHeight(String resourceName) {
        int resourceId = getResources().getIdentifier(resourceName, "dimen", "android");
        return resourceId > 0 ? getResources().getDimensionPixelSize(resourceId) : 0;
    }

    private float clamp(float value, float min, float max) {
        return Math.max(min, Math.min(max, value));
    }

    private void toast(String message) {
        Toast.makeText(this, message, Toast.LENGTH_SHORT).show();
    }

    private String normalizeUrl(String input) {
        String value = input == null ? "" : input.trim();
        if (value.endsWith("/")) value = value.substring(0, value.length() - 1);
        if (!value.startsWith("http://") && !value.startsWith("https://")) value = "http://" + value;
        return value;
    }

    @Override
    public void onBackPressed() {
        if (SCREEN_VIEWER.equals(currentScreen) || viewerOpen) {
            showAssets();
            return;
        }
        if (SCREEN_ASSETS.equals(currentScreen) || currentAlbum != null) {
            currentAlbum = null;
            showAlbums(false);
            return;
        }
        if (SCREEN_ACCOUNT_DETAIL.equals(currentScreen)) {
            showUserShareManager();
            return;
        }
        if (SCREEN_USER_MANAGER.equals(currentScreen)) {
            showSettings();
            return;
        }
        if (SCREEN_SETTINGS.equals(currentScreen)) {
            showAlbums(false);
            return;
        }
        if (SCREEN_LOGIN.equals(currentScreen)) {
            moveTaskToBack(true);
            return;
        }
        if (SCREEN_ALBUMS.equals(currentScreen)) {
            moveTaskToBack(true);
            return;
        }
        super.onBackPressed();
    }

    private interface BoolCallback {
        void done(boolean ok);
    }

    private interface PageCallback<T> {
        void done(PageResult<T> result);
    }

    private interface ScanCallback {
        void done(ScanResult result);
    }

    private interface DoneCallback {
        void done();
    }

    private class LoadUsersTask extends AsyncTask<Void, Void, List<UserAccount>> {
        private final boolean showToast;
        private final DoneCallback callback;
        LoadUsersTask(boolean showToast) { this(showToast, null); }
        LoadUsersTask(boolean showToast, DoneCallback callback) { this.showToast = showToast; this.callback = callback; }
        @Override protected List<UserAccount> doInBackground(Void... voids) { try { return api.getUsers(); } catch (Exception ignored) { return null; } }
        @Override protected void onPostExecute(List<UserAccount> result) {
            if (result != null) {
                userAccounts.clear();
                userAccounts.addAll(result);
                if (showToast) toast("已加载 " + userAccounts.size() + " 个账户");
            } else if (showToast) toast("账户列表加载失败");
            if (callback != null) callback.done();
        }
    }

    private String safeFileName(String value) {
        String name = value == null ? "" : value.trim();
        if (name.isEmpty()) name = "moment-pic";
        return name.replaceAll("[\\\\/:*?\"<>|]", "_");
    }

    private boolean saveAssetToLocal(Asset asset, String albumName) throws Exception {
        String url = api.absolute(asset.originalUrl == null || asset.originalUrl.trim().isEmpty() ? asset.thumbnailUrl : asset.originalUrl);
        String filename = safeFileName(asset.name == null || asset.name.trim().isEmpty() ? (asset.id + ".jpg") : asset.name);
        if (!filename.contains(".")) filename += ".jpg";
        HttpURLConnection conn = (HttpURLConnection) new URL(url).openConnection();
        conn.setConnectTimeout(15000);
        conn.setReadTimeout(60000);
        if (api.cookieHeader != null && !api.cookieHeader.isEmpty()) conn.setRequestProperty("Cookie", api.cookieHeader);
        InputStream input = new BufferedInputStream(conn.getInputStream());
        OutputStream output;
        String relative = Environment.DIRECTORY_PICTURES + "/Moment Pic" + (albumName == null || albumName.trim().isEmpty() ? "" : "/" + safeFileName(albumName));
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
            ContentValues values = new ContentValues();
            values.put(MediaStore.Images.Media.DISPLAY_NAME, filename);
            values.put(MediaStore.Images.Media.MIME_TYPE, "image/jpeg");
            values.put(MediaStore.Images.Media.RELATIVE_PATH, relative);
            Uri uri = getContentResolver().insert(MediaStore.Images.Media.EXTERNAL_CONTENT_URI, values);
            if (uri == null) throw new Exception("无法创建媒体文件");
            output = getContentResolver().openOutputStream(uri);
            if (output == null) throw new Exception("无法写入媒体文件");
        } else {
            File dir = new File(Environment.getExternalStoragePublicDirectory(Environment.DIRECTORY_PICTURES), "Moment Pic" + (albumName == null || albumName.trim().isEmpty() ? "" : "/" + safeFileName(albumName)));
            if (!dir.exists() && !dir.mkdirs()) throw new Exception("无法创建目录");
            output = new FileOutputStream(new File(dir, filename));
        }
        byte[] buffer = new byte[8192];
        int read;
        while ((read = input.read(buffer)) != -1) output.write(buffer, 0, read);
        output.close();
        input.close();
        conn.disconnect();
        return true;
    }

    private class DownloadAlbumTask extends AsyncTask<Void, Void, Integer> {
        private final Album album;
        private String error;
        DownloadAlbumTask(Album album) { this.album = album; }
        @Override protected void onPreExecute() { toast("开始下载相册"); }
        @Override protected Integer doInBackground(Void... voids) {
            int count = 0;
            try {
                int page = 1;
                while (true) {
                    PageResult<Asset> result = api.getAssets(album.id, page, 120);
                    for (Asset asset : result.items) {
                        saveAssetToLocal(asset, album.name);
                        count++;
                    }
                    if (page * 120 >= result.total) break;
                    page++;
                }
                return count;
            } catch (Exception e) {
                error = e.getMessage();
                return count;
            }
        }
        @Override protected void onPostExecute(Integer count) {
            if (error == null) toast("相册下载完成：" + count + " 张");
            else toast("相册下载中断，已下载 " + count + " 张");
        }
    }

    private class DownloadAssetTask extends AsyncTask<Void, Void, Boolean> {
        private final Asset asset;
        private String error;
        DownloadAssetTask(Asset asset) { this.asset = asset; }
        @Override protected Boolean doInBackground(Void... voids) {
            try {
                saveAssetToLocal(asset, "");
                return true;
            } catch (Exception e) {
                error = e.getMessage();
                return false;
            }
        }
        @Override protected void onPostExecute(Boolean ok) { toast(ok ? "已下载到相册/Moment Pic" : "下载失败" + (error == null ? "" : ": " + error)); }
    }

    private class CreatePublicShareTask extends AsyncTask<Void, Void, String> {
        private final String type;
        private final String targetId;
        CreatePublicShareTask(String type, String targetId) { this.type = type; this.targetId = targetId; }
        @Override protected String doInBackground(Void... voids) { try { return api.createPublicShare(type, targetId); } catch (Exception ignored) { return null; } }
        @Override protected void onPostExecute(String url) {
            if (url == null || url.isEmpty()) toast("生成分享链接失败");
            else copyText("Moment Pic 分享链接", url);
        }
    }

    private class LoadSharedAlbumsDetailTask extends AsyncTask<Void, Void, List<Album>> {
        private final String targetUser;
        LoadSharedAlbumsDetailTask(String targetUser) { this.targetUser = targetUser; }
        @Override protected List<Album> doInBackground(Void... voids) { try { return api.getSharedAlbumsForUser(targetUser); } catch (Exception ignored) { return null; } }
        @Override protected void onPostExecute(List<Album> result) {
            if (result == null) {
                toast("已分享相册加载失败");
                renderAccountShareDetail(targetUser, new ArrayList<>());
            } else renderAccountShareDetail(targetUser, result);
        }
    }

    private class RemoveSingleShareTask extends AsyncTask<Void, Void, Boolean> {
        private final String targetUser;
        private final String albumId;
        private final BoolCallback callback;
        RemoveSingleShareTask(String targetUser, String albumId, BoolCallback callback) { this.targetUser = targetUser; this.albumId = albumId; this.callback = callback; }
        @Override protected Boolean doInBackground(Void... voids) { try { api.setAlbumShareForUser(targetUser, albumId, false); return true; } catch (Exception ignored) { return false; } }
        @Override protected void onPostExecute(Boolean ok) { callback.done(ok); }
    }

    private class LoadAlbumSharesTask extends AsyncTask<Void, Void, Map<String, Set<String>>> {
        private final Album album;
        private final List<String> users = new ArrayList<>();
        LoadAlbumSharesTask(Album album) { this.album = album; }
        @Override protected Map<String, Set<String>> doInBackground(Void... voids) {
            try {
                List<UserAccount> loaded = api.getUsers();
                userAccounts.clear();
                userAccounts.addAll(loaded);
                Map<String, Set<String>> shares = new HashMap<>();
                for (UserAccount account : loaded) {
                    if ("admin".equals(account.username)) continue;
                    users.add(account.username);
                    shares.put(account.username, api.getSharedAlbumIds(account.username));
                }
                return shares;
            } catch (Exception ignored) {
                return null;
            }
        }
        @Override protected void onPostExecute(Map<String, Set<String>> shares) {
            if (shares == null) {
                toast("分享状态加载失败");
                return;
            }
            Set<String> sharedUsers = new HashSet<>();
            for (String user : users) {
                Set<String> ids = shares.get(user);
                if (ids != null && ids.contains(album.id)) sharedUsers.add(user);
            }
            showShareAlbumDialogWithState(album, users, sharedUsers);
        }
    }

    private class SaveAlbumSharesTask extends AsyncTask<Void, Void, Boolean> {
        private final Album album;
        private final List<String> users;
        private final Set<String> nextSharedUsers;
        private final BoolCallback callback;
        SaveAlbumSharesTask(Album album, List<String> users, Set<String> nextSharedUsers, BoolCallback callback) {
            this.album = album;
            this.users = users;
            this.nextSharedUsers = nextSharedUsers;
            this.callback = callback;
        }
        @Override protected Boolean doInBackground(Void... voids) {
            try {
                for (String user : users) api.setAlbumShareForUser(user, album.id, nextSharedUsers.contains(user));
                return true;
            } catch (Exception ignored) {
                return false;
            }
        }
        @Override protected void onPostExecute(Boolean ok) { callback.done(ok); }
    }

    private class DeleteUserTask extends AsyncTask<Void, Void, Boolean> {
        private final String targetUser;
        private final BoolCallback callback;
        DeleteUserTask(String targetUser, BoolCallback callback) { this.targetUser = targetUser; this.callback = callback; }
        @Override protected Boolean doInBackground(Void... voids) { try { api.deleteUser(targetUser); return true; } catch (Exception ignored) { return false; } }
        @Override protected void onPostExecute(Boolean ok) { callback.done(ok); }
    }

    private class ShareAlbumTask extends AsyncTask<Void, Void, Boolean> {
        private final String targetUser;
        private final Album album;
        private final BoolCallback callback;
        ShareAlbumTask(String targetUser, Album album, BoolCallback callback) { this.targetUser = targetUser; this.album = album; this.callback = callback; }
        @Override protected Boolean doInBackground(Void... voids) { try { api.shareAlbumToUser(targetUser, album); return true; } catch (Exception ignored) { return false; } }
        @Override protected void onPostExecute(Boolean ok) { callback.done(ok); }
    }

    private class UpdateUserTask extends AsyncTask<Void, Void, Boolean> {
        private final String oldUser;
        private final String nextUser;
        private final String nextPass;
        private final BoolCallback callback;
        UpdateUserTask(String oldUser, String nextUser, String nextPass, BoolCallback callback) { this.oldUser = oldUser; this.nextUser = nextUser; this.nextPass = nextPass; this.callback = callback; }
        @Override protected Boolean doInBackground(Void... voids) { try { api.updateUser(oldUser, nextUser, nextPass); return true; } catch (Exception ignored) { return false; } }
        @Override protected void onPostExecute(Boolean ok) { callback.done(ok); }
    }

    private class SaveUserTask extends AsyncTask<Void, Void, Boolean> {
        private final String targetUser;
        private final String targetPass;
        private final BoolCallback callback;
        SaveUserTask(String targetUser, String targetPass, BoolCallback callback) { this.targetUser = targetUser; this.targetPass = targetPass; this.callback = callback; }
        @Override protected Boolean doInBackground(Void... voids) { try { api.saveUser(targetUser, targetPass); return true; } catch (Exception ignored) { return false; } }
        @Override protected void onPostExecute(Boolean ok) { callback.done(ok); }
    }

    private class SaveSharedAlbumsTask extends AsyncTask<Void, Void, Boolean> {
        private final String targetUser;
        private final String rawIds;
        private final BoolCallback callback;
        SaveSharedAlbumsTask(String targetUser, String rawIds, BoolCallback callback) { this.targetUser = targetUser; this.rawIds = rawIds; this.callback = callback; }
        @Override protected Boolean doInBackground(Void... voids) { try { api.saveSharedAlbums(targetUser, rawIds); return true; } catch (Exception ignored) { return false; } }
        @Override protected void onPostExecute(Boolean ok) { callback.done(ok); }
    }

    private class PullFavoriteAlbumsTask extends AsyncTask<Void, Void, List<Album>> {
        private final DoneCallback callback;

        PullFavoriteAlbumsTask(DoneCallback callback) {
            this.callback = callback;
        }

        @Override
        protected List<Album> doInBackground(Void... voids) {
            try {
                return api.getFavoriteAlbums();
            } catch (Exception ignored) {
                return null;
            }
        }

        @Override
        protected void onPostExecute(List<Album> result) {
            if (result != null) {
                favoriteAlbums.clear();
                favoriteAlbums.addAll(result);
                saveFavoriteAlbums();
            }
            if (callback != null) callback.done();
        }
    }

    private class PushFavoriteAlbumsTask extends AsyncTask<Void, Void, Boolean> {
        @Override
        protected Boolean doInBackground(Void... voids) {
            try {
                api.putFavoriteAlbums(favoriteAlbums);
                return true;
            } catch (Exception ignored) {
                return false;
            }
        }
    }

    private class GallerySourcesTask extends AsyncTask<Void, Void, List<GallerySource>> {
        @Override
        protected List<GallerySource> doInBackground(Void... voids) {
            try {
                return api.getGallerySources();
            } catch (Exception ignored) {
                return null;
            }
        }

        @Override
        protected void onPostExecute(List<GallerySource> result) {
            loadingGallerySources = false;
            gallerySourcesLoaded = true;
            if (result == null) {
                if (gallerySources.isEmpty()) gallerySources.add(new GallerySource(serverTitle(), ""));
                if (SCREEN_ALBUMS.equals(currentScreen)) showAlbums(false);
                return;
            }
            String before = activeGalleryPrefix;
            applyGallerySources(result);
            if (activeGalleryPrefix.isEmpty() && gallerySources.size() > 1) {
                activeGalleryPrefix = gallerySources.get(0).prefixKey;
            }
            if (SCREEN_ALBUMS.equals(currentScreen)) {
                showAlbums(!before.equals(activeGalleryPrefix));
            }
        }
    }

    private class LoginTask extends AsyncTask<Void, Void, Boolean> {
        private final String user;
        private final String pass;
        private final BoolCallback callback;
        private String error;

        LoginTask(String user, String pass, BoolCallback callback) {
            this.user = user;
            this.pass = pass;
            this.callback = callback;
        }

        @Override
        protected Boolean doInBackground(Void... voids) {
            try {
                api.login(user, pass);
                return true;
            } catch (Exception e) {
                error = e.getMessage();
                return false;
            }
        }

        @Override
        protected void onPostExecute(Boolean ok) {
            if (!ok) showError("登录失败", loginErrorMessage(error));
            callback.done(ok);
        }
    }

    private class AlbumsTask extends AsyncTask<Void, Void, PageResult<Album>> {
        private final int page;
        private final String keyword;
        private final String sortBy;
        private final String sortOrder;
        private final String sourcePrefix;
        private final PageCallback<Album> callback;
        private String error;

        AlbumsTask(int page, String keyword, String sortBy, String sortOrder, String sourcePrefix, PageCallback<Album> callback) {
            this.page = page;
            this.keyword = keyword;
            this.sortBy = sortBy;
            this.sortOrder = sortOrder;
            this.sourcePrefix = sourcePrefix;
            this.callback = callback;
        }

        @Override
        protected PageResult<Album> doInBackground(Void... voids) {
            try {
                return api.getAlbums(page, 40, keyword, sortBy, sortOrder, sourcePrefix);
            } catch (Exception e) {
                error = e.getMessage();
                return null;
            }
        }

        @Override
        protected void onPostExecute(PageResult<Album> result) {
            if (result == null) showError("获取相册失败", error);
            callback.done(result);
        }
    }

    private class NewAlbumsTask extends AsyncTask<Void, Void, PageResult<Album>> {
        private final String keyword;
        private final String sourcePrefix;
        private final PageCallback<Album> callback;
        private String error;

        NewAlbumsTask(String keyword, String sourcePrefix, PageCallback<Album> callback) {
            this.keyword = keyword;
            this.sourcePrefix = sourcePrefix;
            this.callback = callback;
        }

        @Override
        protected PageResult<Album> doInBackground(Void... voids) {
            try {
                return api.getNewAlbums(newAlbumIds, keyword, sourcePrefix);
            } catch (Exception e) {
                error = e.getMessage();
                return null;
            }
        }

        @Override
        protected void onPostExecute(PageResult<Album> result) {
            if (result == null) showError("获取新增内容失败", error);
            callback.done(result);
        }
    }

    private class AssetsTask extends AsyncTask<Void, Void, PageResult<Asset>> {
        private final String albumId;
        private final int page;
        private final PageCallback<Asset> callback;
        private String error;

        AssetsTask(String albumId, int page, PageCallback<Asset> callback) {
            this.albumId = albumId;
            this.page = page;
            this.callback = callback;
        }

        @Override
        protected PageResult<Asset> doInBackground(Void... voids) {
            try {
                return api.getAssets(albumId, page, 60);
            } catch (Exception e) {
                error = e.getMessage();
                return null;
            }
        }

        @Override
        protected void onPostExecute(PageResult<Asset> result) {
            if (result == null) showError("获取图片失败", error);
            callback.done(result);
        }
    }

    private class ScanLibraryTask extends AsyncTask<Void, Void, ScanResult> {
        private final ScanCallback callback;
        private String error;

        ScanLibraryTask(ScanCallback callback) {
            this.callback = callback;
        }

        @Override
        protected ScanResult doInBackground(Void... voids) {
            try {
                List<Album> beforeAlbums = api.getAllAlbums();
                String taskId = api.startScan();
                if (taskId != null && !taskId.trim().isEmpty()) {
                    for (int i = 0; i < 150; i++) {
                        Thread.sleep(2000);
                        ScanStatus status = api.getScanStatus(taskId);
                        if ("completed".equals(status.status)) break;
                        if ("failed".equals(status.status)) {
                            throw new Exception(status.error == null || status.error.isEmpty() ? "scan failed" : status.error);
                        }
                        if (i == 149) throw new Exception("扫描超时，请稍后手动刷新相册");
                    }
                }
                Map<String, Album> beforeMap = new HashMap<>();
                for (Album album : beforeAlbums) {
                    String key = albumKey(album);
                    if (!key.isEmpty()) beforeMap.put(key, album);
                }
                List<Album> afterAlbums = api.getAllAlbums();
                List<String> changedIds = new ArrayList<>();
                for (Album album : afterAlbums) {
                    String key = albumKey(album);
                    if (key.isEmpty()) continue;
                    Album before = beforeMap.get(key);
                    if (before == null || albumChanged(before, album)) {
                        changedIds.add(key);
                    }
                }
                ScanResult result = new ScanResult();
                result.ok = true;
                result.newAlbumIds = changedIds;
                return result;
            } catch (Exception e) {
                error = e.getMessage();
                return null;
            }
        }

        @Override
        protected void onPostExecute(ScanResult result) {
            if (result == null) showError("刷新图库失败", error);
            callback.done(result);
        }
    }

    private void showV2Unsupported(String feature) {
        toast((feature == null || feature.trim().isEmpty() ? "该功能" : feature.trim()) + " v2 暂未支持");
    }

    private void showError(String title, String message) {
        new AlertDialog.Builder(this)
                .setTitle(title)
                .setMessage(message == null ? "未知错误" : message)
                .setPositiveButton("知道了", null)
                .show();
    }

    private String loginErrorMessage(String error) {
        String detail = error == null || error.trim().isEmpty() ? "未知错误" : error.trim();
        return detail
                + "\n\n当前服务地址：" + (baseUrl == null ? "" : baseUrl)
                + "\n请确认手机能访问这个地址和端口，并使用你在后端环境变量中配置的账号密码。";
    }

    private static class MomentApi {
        final String baseUrl;
        String cookieHeader = "";
        String role = "user";

        MomentApi(String baseUrl) {
            this.baseUrl = baseUrl;
        }

        void login(String username, String password) throws Exception {
            JSONObject body = new JSONObject();
            body.put("username", username);
            body.put("password", password);
            JSONObject json = request("POST", "/api/v2/auth/login", body.toString());
            if (json.optInt("code", -1) != 0) throw new Exception(json.optString("message", "login failed"));
            role = json.optJSONObject("data") == null ? "user" : json.optJSONObject("data").optString("role", "user");
        }

        String createPublicShare(String type, String targetId) throws Exception {
            JSONObject body = new JSONObject();
            body.put("type", type == null || type.trim().isEmpty() ? "album" : type.trim());
            body.put("targetId", targetId);
            JSONObject data = data(request("POST", "/api/v2/public-shares", body.toString()));
            String url = data.optString("url");
            return absolute(url);
        }

        List<UserAccount> getUsers() throws Exception {
            JSONObject data = data(request("GET", "/api/v2/users", null));
            JSONArray items = data.getJSONArray("items");
            List<UserAccount> users = new ArrayList<>();
            for (int i = 0; i < items.length(); i++) users.add(UserAccount.from(items.getJSONObject(i)));
            return users;
        }

        void shareAlbumToUser(String username, Album album) throws Exception {
            if (album == null) throw new Exception("album required");
            setAlbumShareForUser(username, album.id, true);
        }

        void saveUser(String username, String password) throws Exception {
            JSONObject body = new JSONObject();
            body.put("username", username);
            body.put("password", password);
            body.put("role", "user");
            data(request("POST", "/api/v2/users", body.toString()));
        }

        void updateUser(String oldUsername, String nextUsername, String password) throws Exception {
            JSONObject body = new JSONObject();
            body.put("username", nextUsername);
            body.put("password", password);
            body.put("role", "user");
            data(request("POST", "/api/v2/users/" + urlEncode(oldUsername), body.toString()));
        }

        void deleteUser(String username) throws Exception {
            data(request("DELETE", "/api/v2/users/" + urlEncode(username), null));
        }

        Set<String> getSharedAlbumIds(String username) throws Exception {
            JSONObject data = data(request("GET", "/api/v2/users/" + urlEncode(username) + "/shared-albums", null));
            JSONArray ids = data.optJSONArray("albumIds");
            Set<String> result = new HashSet<>();
            if (ids != null) {
                for (int i = 0; i < ids.length(); i++) {
                    String id = ids.optString(i).trim();
                    if (!id.isEmpty()) result.add(id);
                }
            }
            return result;
        }

        List<Album> getSharedAlbumsForUser(String username) throws Exception {
            JSONObject data = data(request("GET", "/api/v2/users/" + urlEncode(username) + "/shared-albums", null));
            JSONArray items = data.getJSONArray("items");
            List<Album> albums = new ArrayList<>();
            for (int i = 0; i < items.length(); i++) albums.add(Album.from(items.getJSONObject(i)));
            return albums;
        }

        void setAlbumShareForUser(String username, String albumId, boolean shared) throws Exception {
            String path = "/api/v2/users/" + urlEncode(username) + "/shared-albums/" + urlEncode(albumId);
            if (shared) {
                JSONObject body = new JSONObject();
                body.put("shared", true);
                data(request("PUT", path, body.toString()));
            } else {
                data(request("DELETE", path, null));
            }
        }

        void saveSharedAlbums(String username, String rawIds) throws Exception {
            Set<String> ids = resolveAlbumIds(rawIds);
            putSharedAlbumIds(username, ids);
        }

        private void putSharedAlbumIds(String username, Set<String> idSet) throws Exception {
            JSONObject body = new JSONObject();
            JSONArray ids = new JSONArray();
            for (String id : idSet) ids.put(id);
            body.put("albumIds", ids);
            data(request("PUT", "/api/v2/users/" + urlEncode(username) + "/shared-albums", body.toString()));
        }

        List<Album> getFavoriteAlbums() throws Exception {
            JSONObject data = data(request("GET", "/api/v2/favorite-albums", null));
            JSONArray items = data.getJSONArray("items");
            List<Album> albums = new ArrayList<>();
            for (int i = 0; i < items.length(); i++) albums.add(Album.from(items.getJSONObject(i)));
            return albums;
        }

        void putFavoriteAlbums(List<Album> albums) throws Exception {
            JSONObject body = new JSONObject();
            JSONArray items = new JSONArray();
            for (Album album : albums) {
                if (album == null || album.id == null || album.id.trim().isEmpty()) continue;
                JSONObject item = new JSONObject();
                item.put("id", album.id);
                items.put(item);
            }
            body.put("items", items);
            data(request("PUT", "/api/v2/favorite-albums", body.toString()));
        }

        PageResult<Album> getAlbums(int page, int pageSize, String keyword, String sortBy, String sortOrder) throws Exception {
            return getAlbums(page, pageSize, keyword, sortBy, sortOrder, "");
        }

        PageResult<Album> getAlbums(int page, int pageSize, String keyword, String sortBy, String sortOrder, String sourcePrefix) throws Exception {
            String path = "/api/v2/albums?page=" + page + "&pageSize=" + pageSize;
            if (sourcePrefix != null && !sourcePrefix.trim().isEmpty()) {
                path += "&galleryId=" + URLEncoder.encode(sourcePrefix.trim(), "UTF-8");
            }
            if (keyword != null && !keyword.trim().isEmpty()) {
                path += "&keyword=" + URLEncoder.encode(keyword.trim(), "UTF-8");
            }
            if (sortBy != null && !sortBy.trim().isEmpty()) {
                path += "&sortBy=" + URLEncoder.encode(sortBy.trim(), "UTF-8");
            }
            if (sortOrder != null && !sortOrder.trim().isEmpty()) {
                path += "&sortOrder=" + URLEncoder.encode(sortOrder.trim(), "UTF-8");
            }
            JSONObject data = data(request("GET", path, null));
            JSONArray items = data.getJSONArray("items");
            List<Album> albums = new ArrayList<>();
            for (int i = 0; i < items.length(); i++) {
                albums.add(Album.from(items.getJSONObject(i)));
            }
            return new PageResult<>(albums, data.getJSONObject("pagination").getInt("total"));
        }

        List<GallerySource> getGallerySources() throws Exception {
            JSONObject data = data(request("GET", "/api/v2/galleries", null));
            JSONArray items = data.getJSONArray("items");
            List<GallerySource> sources = new ArrayList<>();
            for (int i = 0; i < items.length(); i++) {
                GallerySource source = GallerySource.from(items.getJSONObject(i));
                if (!source.prefixKey.isEmpty()) sources.add(source);
            }
            return sources;
        }

        private PageResult<Album> getAlbumsBySourcePrefix(int page, int pageSize, String keyword, String sortBy, String sortOrder, String sourcePrefix) throws Exception {
            List<Album> filtered = new ArrayList<>();
            int remotePage = 1;
            int total = 0;
            do {
                PageResult<Album> result = getAlbums(remotePage, 200, keyword, sortBy, sortOrder);
                total = result.total;
                for (Album album : result.items) {
                    if (sourcePathMatchesPrefix(album.sourcePath, sourcePrefix)) filtered.add(album);
                }
                remotePage++;
                if ((remotePage - 1) * 200 >= total) break;
            } while (true);
            int from = Math.max(0, (page - 1) * pageSize);
            int to = Math.min(filtered.size(), from + pageSize);
            List<Album> items = from >= filtered.size() ? new ArrayList<>() : new ArrayList<>(filtered.subList(from, to));
            return new PageResult<>(items, filtered.size());
        }

        PageResult<Album> getNewAlbums(List<String> newIds, String keyword, String sourcePrefix) throws Exception {
            Set<String> idSet = new HashSet<>(newIds);
            List<Album> filtered = new ArrayList<>();
            int page = 1;
            int total = 0;
            do {
                PageResult<Album> result = getAlbums(page, 200, keyword, "updatedAt", "desc");
                total = result.total;
                for (Album album : result.items) {
                    if (idSet.contains(album.key()) && galleryMatches(album, sourcePrefix)) {
                        ensureAlbumCover(album);
                        filtered.add(album);
                    }
                }
                page++;
                if ((page - 1) * 200 >= total) break;
            } while (true);
            return new PageResult<>(filtered, filtered.size());
        }

        private void ensureAlbumCover(Album album) throws Exception {
            if (album == null || album.id == null || album.id.trim().isEmpty()) return;
            if (album.coverUrl != null && !album.coverUrl.trim().isEmpty()) return;
            PageResult<Asset> result = getAssets(album.id, 1, 1);
            if (!result.items.isEmpty()) {
                Asset first = result.items.get(0);
                album.coverUrl = first.thumbnailUrl == null || first.thumbnailUrl.trim().isEmpty()
                        ? first.originalUrl
                        : first.thumbnailUrl;
            }
        }

        List<Album> getAllAlbums() throws Exception {
            List<Album> albums = new ArrayList<>();
            int page = 1;
            int total = 0;
            do {
                PageResult<Album> result = getAlbums(page, 200, null, "", "");
                total = result.total;
                albums.addAll(result.items);
                page++;
                if ((page - 1) * 200 >= total) break;
            } while (true);
            return albums;
        }

        PageResult<Asset> getAssets(String albumId, int page, int pageSize) throws Exception {
            JSONObject data = data(request("GET", "/api/v2/albums/" + URLEncoder.encode(albumId, "UTF-8") + "/assets?page=" + page + "&pageSize=" + pageSize, null));
            JSONArray items = data.getJSONArray("items");
            List<Asset> assets = new ArrayList<>();
            for (int i = 0; i < items.length(); i++) {
                assets.add(Asset.from(items.getJSONObject(i)));
            }
            return new PageResult<>(assets, data.getJSONObject("pagination").getInt("total"));
        }

        String startScan() throws Exception {
            JSONObject body = new JSONObject();
            body.put("dryRun", true);
            JSONObject data = data(request("POST", "/api/v2/scan", body.toString(), 60000));
            return data.optString("taskId");
        }

        ScanStatus getScanStatus(String taskId) throws Exception {
            JSONObject data = data(request("GET", "/api/v2/scan/" + urlEncode(taskId), null));
            ScanStatus status = new ScanStatus();
            status.status = data.optString("status", "unknown");
            status.error = data.optString("error", "");
            return status;
        }

        private Set<String> resolveAlbumIds(String rawIds) throws Exception {
            Set<String> result = new HashSet<>();
            String raw = rawIds == null ? "" : rawIds.trim();
            if (raw.isEmpty()) return result;
            String[] parts = raw.split("[,，\\n]");
            List<Album> allAlbums = null;
            for (String part : parts) {
                String token = part == null ? "" : part.trim();
                if (token.isEmpty()) continue;
                if (allAlbums == null) allAlbums = getAllAlbums();
                boolean matched = false;
                for (Album album : allAlbums) {
                    String id = album.id == null ? "" : album.id;
                    String name = album.name == null ? "" : album.name;
                    String sourcePath = album.sourcePath == null ? "" : album.sourcePath;
                    if (id.equals(token) || name.contains(token) || sourcePath.contains(token)) {
                        result.add(id);
                        matched = true;
                    }
                }
                if (!matched) result.add(token);
            }
            return result;
        }

        private String urlEncode(String value) throws Exception {
            return URLEncoder.encode(value == null ? "" : value, "UTF-8");
        }

        String absolute(String path) {
            if (path == null || path.trim().isEmpty()) return "";
            if (path.startsWith("http://") || path.startsWith("https://")) return path;
            return baseUrl + path;
        }

        private JSONObject data(JSONObject json) throws Exception {
            if (json.optInt("code", -1) != 0) throw new Exception(json.optString("message", "request failed"));
            return json.getJSONObject("data");
        }

        private JSONObject request(String method, String path, String body) throws Exception {
            return request(method, path, body, 30000);
        }

        private JSONObject request(String method, String path, String body, int readTimeout) throws Exception {
            HttpURLConnection conn = (HttpURLConnection) new URL(baseUrl + path).openConnection();
            conn.setRequestMethod(method);
            conn.setConnectTimeout(15000);
            conn.setReadTimeout(readTimeout);
            conn.setRequestProperty("Accept", "application/json");
            if (!cookieHeader.isEmpty()) conn.setRequestProperty("Cookie", cookieHeader);
            if (body != null) {
                conn.setDoOutput(true);
                conn.setRequestProperty("Content-Type", "application/json");
                OutputStream out = conn.getOutputStream();
                out.write(body.getBytes("UTF-8"));
                out.close();
            } else {
                conn.connect();
            }
            String setCookie = conn.getHeaderField("Set-Cookie");
            if (setCookie != null && !setCookie.isEmpty()) cookieHeader = setCookie.split(";", 2)[0];
            InputStream stream = conn.getResponseCode() >= 400 ? conn.getErrorStream() : conn.getInputStream();
            String text = readAll(stream);
            conn.disconnect();
            return new JSONObject(text);
        }

        private String readAll(InputStream stream) throws Exception {
            BufferedReader reader = new BufferedReader(new InputStreamReader(stream, "UTF-8"));
            StringBuilder builder = new StringBuilder();
            String line;
            while ((line = reader.readLine()) != null) builder.append(line);
            return builder.toString();
        }
    }

    private static class ScanStatus {
        String status;
        String error;
    }

    private static class ScanResult {
        boolean ok;
        List<String> newAlbumIds = new ArrayList<>();
    }

    private static class GallerySource {
        final String name;
        final String prefixKey;

        GallerySource(String name, String prefixKey) {
            this.name = name == null || name.trim().isEmpty() ? "Moment Pic" : name.trim();
            this.prefixKey = prefixKey == null ? "" : prefixKey.trim();
        }

        static GallerySource from(JSONObject json) {
            String name = Album.firstNonEmpty(json.optString("name"), json.optString("path"), json.optString("id"));
            return new GallerySource(name, json.optString("id"));
        }
    }

    private static class UserAccount {
        String username;
        String role;

        static UserAccount from(JSONObject json) {
            UserAccount user = new UserAccount();
            user.username = json.optString("username");
            user.role = json.optString("role");
            return user;
        }
    }

    private static class Album {
        String id;
        String galleryId;
        String name;
        int assetCount;
        int archiveCount;
        String coverUrl;
        String coverAssetId;
        String sourcePath;
        String sortTime;

        static Album from(JSONObject json) {
            Album album = new Album();
            album.id = json.optString("id");
            album.galleryId = json.optString("galleryId");
            album.name = json.optString("name");
            album.assetCount = json.optInt("assetCount");
            album.archiveCount = firstInt(json, "archiveCount", "zipCount", "packageCount", "compressedCount", "archiveAssetCount");
            album.coverAssetId = json.optString("coverAssetId");
            album.coverUrl = firstNonEmpty(
                    json.optString("coverUrl"),
                    json.optString("cover"),
                    json.optString("thumbnailUrl"),
                    json.optString("thumbUrl"),
                    json.optString("previewUrl"),
                    json.optString("posterUrl")
            );
            if (album.coverUrl.isEmpty() && album.coverAssetId != null && !album.coverAssetId.trim().isEmpty()) {
                album.coverUrl = assetUrl(album.coverAssetId, "thumbnail");
            }
            album.sourcePath = json.optString("sourcePath");
            album.sortTime = firstNonEmpty(
                    json.optString("downloadedAt"),
                    json.optString("downloadAt"),
                    json.optString("lastDownloadAt"),
                    json.optString("updatedAt"),
                    json.optString("updateAt"),
                    json.optString("modifiedAt"),
                    json.optString("lastModifiedAt"),
                    json.optString("scannedAt"),
                    json.optString("createdAt")
            );
            return album;
        }

        int totalCount() {
            return assetCount + archiveCount;
        }

        String countLabel() {
            if (archiveCount > 0) return assetCount + " 张 + " + archiveCount + " 包";
            return assetCount + " 张";
        }

        String key() {
            if (id != null && !id.trim().isEmpty()) return id.trim();
            return name == null ? "" : name.trim();
        }

        private static String firstNonEmpty(String... values) {
            for (String value : values) {
                if (value != null && !value.trim().isEmpty()) return value.trim();
            }
            return "";
        }

        private static int firstInt(JSONObject json, String... keys) {
            for (String key : keys) {
                if (json.has(key)) return json.optInt(key);
            }
            return 0;
        }

        private static String assetUrl(String assetId, String variant) {
            String id = assetId == null ? "" : assetId.trim();
            if (id.isEmpty()) return "";
            try {
                id = URLEncoder.encode(id, "UTF-8");
            } catch (Exception ignored) {
            }
            return "/api/v2/assets/" + id + "/" + variant;
        }
    }

    private static class Asset {
        String id;
        String name;
        String thumbnailUrl;
        String originalUrl;

        static Asset from(JSONObject json) {
            Asset asset = new Asset();
            asset.id = json.optString("id");
            asset.name = json.optString("name");
            asset.thumbnailUrl = Album.firstNonEmpty(
                    json.optString("thumbnailUrl"),
                    json.optString("thumbUrl"),
                    json.optString("previewUrl"),
                    json.optString("coverUrl")
            );
            if (asset.thumbnailUrl.isEmpty()) asset.thumbnailUrl = Album.assetUrl(asset.id, "thumbnail");
            asset.originalUrl = Album.firstNonEmpty(
                    json.optString("originalUrl"),
                    json.optString("url"),
                    json.optString("downloadUrl"),
                    json.optString("path")
            );
            if (asset.originalUrl.isEmpty()) asset.originalUrl = Album.assetUrl(asset.id, "original");
            return asset;
        }
    }

    private static class PageResult<T> {
        final List<T> items;
        final int total;

        PageResult(List<T> items, int total) {
            this.items = items;
            this.total = total;
        }
    }

    private static class IconView extends View {
        private final String icon;
        private final int color;
        private final boolean filled;
        private final Paint paint = new Paint(Paint.ANTI_ALIAS_FLAG);
        private final Path path = new Path();

        IconView(Context context, String icon, int color, boolean filled) {
            super(context);
            this.icon = icon;
            this.color = color;
            this.filled = filled;
        }

        @Override
        protected void onDraw(Canvas canvas) {
            super.onDraw(canvas);
            float w = getWidth();
            float h = getHeight();
            float size = Math.min(w, h);
            float cx = w / 2f;
            float cy = h / 2f;
            paint.setColor(color);
            paint.setStrokeCap(Paint.Cap.ROUND);
            paint.setStrokeJoin(Paint.Join.ROUND);
            paint.setStrokeWidth(Math.max(2f, size * 0.085f));
            paint.setStyle(Paint.Style.STROKE);

            if (ICON_SEARCH.equals(icon)) {
                float r = size * 0.23f;
                canvas.drawCircle(cx - size * 0.06f, cy - size * 0.06f, r, paint);
                canvas.drawLine(cx + r * 0.65f, cy + r * 0.65f, cx + size * 0.31f, cy + size * 0.31f, paint);
                return;
            }
            if (ICON_MENU.equals(icon)) {
                paint.setStyle(Paint.Style.FILL);
                float r = Math.max(2f, size * 0.065f);
                canvas.drawCircle(cx, cy - size * 0.22f, r, paint);
                canvas.drawCircle(cx, cy, r, paint);
                canvas.drawCircle(cx, cy + size * 0.22f, r, paint);
                return;
            }
            if (ICON_BACK.equals(icon)) {
                path.reset();
                path.moveTo(cx + size * 0.16f, cy - size * 0.28f);
                path.lineTo(cx - size * 0.14f, cy);
                path.lineTo(cx + size * 0.16f, cy + size * 0.28f);
                canvas.drawPath(path, paint);
                return;
            }
            if (ICON_CLOSE.equals(icon)) {
                canvas.drawLine(cx - size * 0.22f, cy - size * 0.22f, cx + size * 0.22f, cy + size * 0.22f, paint);
                canvas.drawLine(cx + size * 0.22f, cy - size * 0.22f, cx - size * 0.22f, cy + size * 0.22f, paint);
                return;
            }
            if (ICON_GRID.equals(icon)) {
                float cell = size * 0.2f;
                float gap = size * 0.12f;
                float startX = cx - cell - gap / 2f;
                float startY = cy - cell - gap / 2f;
                for (int row = 0; row < 2; row++) {
                    for (int col = 0; col < 2; col++) {
                        float left = startX + col * (cell + gap);
                        float top = startY + row * (cell + gap);
                        canvas.drawRoundRect(new RectF(left, top, left + cell, top + cell), size * 0.04f, size * 0.04f, paint);
                    }
                }
                return;
            }
            if (ICON_HEART.equals(icon)) {
                drawHeart(canvas, cx, cy + size * 0.02f, size * 0.74f);
                return;
            }
            if (ICON_USER.equals(icon)) {
                canvas.drawCircle(cx, cy - size * 0.17f, size * 0.17f, paint);
                canvas.drawArc(new RectF(cx - size * 0.32f, cy + size * 0.02f, cx + size * 0.32f, cy + size * 0.48f),
                        205, 130, false, paint);
                return;
            }
            if (ICON_ZOOM_RESET.equals(icon)) {
                float r = size * 0.24f;
                canvas.drawCircle(cx - size * 0.05f, cy - size * 0.05f, r, paint);
                canvas.drawLine(cx - size * 0.17f, cy - size * 0.05f, cx + size * 0.08f, cy - size * 0.05f, paint);
                canvas.drawLine(cx + r * 0.65f, cy + r * 0.65f, cx + size * 0.31f, cy + size * 0.31f, paint);
                return;
            }
            if (ICON_ZOOM_IN.equals(icon)) {
                float r = size * 0.24f;
                canvas.drawCircle(cx - size * 0.05f, cy - size * 0.05f, r, paint);
                canvas.drawLine(cx - size * 0.17f, cy - size * 0.05f, cx + size * 0.08f, cy - size * 0.05f, paint);
                canvas.drawLine(cx - size * 0.045f, cy - size * 0.18f, cx - size * 0.045f, cy + size * 0.08f, paint);
                canvas.drawLine(cx + r * 0.65f, cy + r * 0.65f, cx + size * 0.31f, cy + size * 0.31f, paint);
            }
        }

        private void drawHeart(Canvas canvas, float cx, float cy, float size) {
            path.reset();
            path.moveTo(cx, cy + size * 0.32f);
            path.cubicTo(cx - size * 0.55f, cy, cx - size * 0.44f, cy - size * 0.42f, cx - size * 0.16f, cy - size * 0.28f);
            path.cubicTo(cx - size * 0.06f, cy - size * 0.22f, cx, cy - size * 0.1f, cx, cy - size * 0.03f);
            path.cubicTo(cx, cy - size * 0.1f, cx + size * 0.06f, cy - size * 0.22f, cx + size * 0.16f, cy - size * 0.28f);
            path.cubicTo(cx + size * 0.44f, cy - size * 0.42f, cx + size * 0.55f, cy, cx, cy + size * 0.32f);
            if (filled) {
                paint.setStyle(Paint.Style.FILL);
                canvas.drawPath(path, paint);
                paint.setStyle(Paint.Style.STROKE);
            } else {
                canvas.drawPath(path, paint);
            }
        }
    }

    private class ImageLoader {
        private final LruCache<String, Bitmap> cache = new LruCache<String, Bitmap>(32 * 1024 * 1024) {
            @Override
            protected int sizeOf(String key, Bitmap value) {
                return value.getByteCount();
            }
        };
        private final ExecutorService executor = Executors.newFixedThreadPool(4);

        void load(ImageView target, String url, String cookie) {
            if (url == null || url.trim().isEmpty()) {
                target.setTag("");
                target.setImageDrawable(null);
                target.setAlpha(0.45f);
                target.setBackgroundColor(colorSurfaceTint());
                target.setContentDescription("暂无图片");
                return;
            }
            target.setTag(url);
            Bitmap cached = cache.get(url);
            if (cached != null) {
                target.setAlpha(1f);
                target.setImageBitmap(cached);
                return;
            }
            target.setAlpha(0.45f);
            target.setBackgroundColor(colorSurfaceTint());
            target.setContentDescription("图片加载中");
            target.setImageDrawable(null);
            executor.execute(() -> {
                try {
                    Bitmap bitmap = downloadBitmap(url, cookie);
                    if (bitmap != null) cache.put(url, bitmap);
                    target.post(() -> {
                        if (url.equals(target.getTag()) && bitmap != null) {
                            target.setAlpha(1f);
                            target.setContentDescription("图片");
                            target.setImageBitmap(bitmap);
                        }
                    });
                } catch (Exception ignored) {
                    target.post(() -> {
                        if (url.equals(target.getTag())) {
                            target.setAlpha(0.55f);
                            target.setContentDescription("图片加载失败");
                            target.setImageDrawable(null);
                        }
                    });
                }
            });
        }

        void preload(String url, String cookie) {
            if (url == null || url.trim().isEmpty() || cache.get(url) != null) return;
            executor.execute(() -> {
                try {
                    if (cache.get(url) != null) return;
                    Bitmap bitmap = downloadBitmap(url, cookie);
                    if (bitmap != null) cache.put(url, bitmap);
                } catch (Exception ignored) {
                }
            });
        }

        private Bitmap downloadBitmap(String url, String cookie) throws Exception {
            HttpURLConnection conn = (HttpURLConnection) new URL(url).openConnection();
            conn.setConnectTimeout(15000);
            conn.setReadTimeout(30000);
            if (cookie != null && !cookie.isEmpty()) conn.setRequestProperty("Cookie", cookie);
            InputStream input = new BufferedInputStream(conn.getInputStream());
            Bitmap bitmap = BitmapFactory.decodeStream(input);
            input.close();
            conn.disconnect();
            return bitmap;
        }

        void clear() {
            cache.evictAll();
        }
    }
}
