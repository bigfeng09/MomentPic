package top.five915.momentpic;

import android.app.AlertDialog;
import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.content.Context;
import android.content.ClipData;
import android.content.ClipboardManager;
import android.content.Intent;
import android.graphics.Canvas;
import android.graphics.Color;
import android.graphics.Paint;
import android.graphics.Path;
import android.graphics.RectF;
import android.graphics.Typeface;
import android.graphics.drawable.ColorDrawable;
import android.graphics.drawable.Drawable;
import android.graphics.drawable.GradientDrawable;
import android.os.Build;
import android.os.Bundle;
import android.os.Environment;
import android.provider.MediaStore;
import android.content.ContentValues;
import android.net.ConnectivityManager;
import android.net.NetworkCapabilities;
import android.net.Uri;
import android.view.Gravity;
import android.view.KeyEvent;
import android.view.MenuItem;
import android.view.MotionEvent;
import android.view.ScaleGestureDetector;
import android.view.View;
import android.view.ViewGroup;
import android.view.Window;
import android.view.WindowManager;
import android.view.inputmethod.EditorInfo;
import android.widget.Button;
import android.widget.ArrayAdapter;
import android.widget.CheckBox;
import android.widget.EditText;
import android.widget.FrameLayout;
import android.widget.HorizontalScrollView;
import android.widget.ImageView;
import android.widget.LinearLayout;
import android.widget.PopupMenu;
import android.widget.ProgressBar;
import android.widget.ScrollView;
import android.widget.Switch;
import android.widget.Spinner;
import android.widget.TextView;
import android.widget.Toast;

import androidx.activity.ComponentActivity;
import androidx.activity.OnBackPressedCallback;
import androidx.recyclerview.widget.GridLayoutManager;
import androidx.recyclerview.widget.RecyclerView;
import androidx.swiperefreshlayout.widget.SwipeRefreshLayout;

import com.bumptech.glide.Glide;
import com.bumptech.glide.RequestBuilder;
import com.bumptech.glide.load.DataSource;
import com.bumptech.glide.load.engine.DiskCacheStrategy;
import com.bumptech.glide.load.engine.GlideException;
import com.bumptech.glide.load.model.GlideUrl;
import com.bumptech.glide.load.model.LazyHeaders;
import com.bumptech.glide.load.resource.drawable.DrawableTransitionOptions;
import com.bumptech.glide.request.RequestListener;
import com.bumptech.glide.request.target.Target;
import com.bumptech.glide.signature.ObjectKey;

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
import java.text.SimpleDateFormat;
import java.util.ArrayList;
import java.util.Collections;
import java.util.HashMap;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import java.util.Date;
import java.util.UUID;

public class MainActivity extends ComponentActivity {
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
    private static final String KEY_REMEMBER_PASSWORD = "remember_password";
    private static final String KEY_PASSWORD = "password";
    private static final String KEY_ACTIVE_SCAN_TASK_ID = "active_scan_task_id";
    private static final String KEY_ACTIVE_SCAN_FULL = "active_scan_full";
    private static final String KEY_ACTIVE_SCAN_GALLERY = "active_scan_gallery";
    private static final String KEY_ACTIVE_SCAN_SNAPSHOT = "active_scan_snapshot";
    private static final String KEY_DOWNLOAD_JOBS = "download_jobs";
    private static final String KEY_WIFI_ONLY = "download_wifi_only";
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
    private static final String ALBUM_SORT_UPDATED = "updatedAt";
    private static final String ALBUM_SORT_NAME = "name";
    private static final String ICON_SEARCH = "search";
    private static final String ICON_MENU = "menu";
    private static final String ICON_GRID = "grid";
    private static final String ICON_HEART = "heart";
    private static final String ICON_USER = "user";
    private static final String ICON_BACK = "back";
    private static final String ICON_CLOSE = "close";
    private static final String ICON_ZOOM_RESET = "zoom_reset";
    private static final String ICON_ZOOM_IN = "zoom_in";
    private static final String ICON_CLOCK = "clock";
    private static final String SCREEN_LOGIN = "login";
    private static final String SCREEN_ALBUMS = "albums";
    private static final String SCREEN_ASSETS = "assets";
    private static final String SCREEN_VIEWER = "viewer";
    private static final String SCREEN_SETTINGS = "settings";
    private static final String SCREEN_DATA_MANAGER = "data_manager";
    private static final String SCREEN_USER_MANAGER = "user_manager";
    private static final String SCREEN_ACCOUNT_DETAIL = "account_detail";
    private static final String SCREEN_TIMELINE = "timeline";
    private static final String SCREEN_DOWNLOADS = "downloads";
    private static final String SCREEN_PUBLIC_SHARES = "public_shares";
    private static final String TIMELINE_ALBUM_ID = "__timeline__";
    private static final int ALBUM_PAGE_SIZE = 24;
    private static final int ASSET_PAGE_SIZE = 60;
    private static final int MAX_ALBUM_PAGE_CACHE = 24;

    private FrameLayout root;
    private MomentApi api;
    private ImageLoader imageLoader;
    private String baseUrl;
    private String username;
    private String role;
    private String activeTag = TAG_ALL;
    private String searchKeyword = "";
    private String activeSort = SORT_NORMAL;
    private String activeAlbumSort = ALBUM_SORT_UPDATED;
    private List<Album> albums = new ArrayList<>();
    private List<Asset> assets = new ArrayList<>();
    private List<Asset> timelineAssets = new ArrayList<>();
    private List<DownloadJob> downloadJobs = new ArrayList<>();
    private List<PublicShare> publicShares = new ArrayList<>();
    private boolean loadingPublicShares = false;
    private List<Asset> favoriteAssets = new ArrayList<>();
    private List<Album> favoriteAlbums = new ArrayList<>();
    private List<String> searchHistory = new ArrayList<>();
    private List<String> newAlbumIds = new ArrayList<>();
    private List<UserAccount> userAccounts = new ArrayList<>();
    private List<GallerySource> gallerySources = new ArrayList<>();
    private final LinkedHashMap<String, PageResult<Album>> albumPageCache = new LinkedHashMap<>();
    private Album currentAlbum;
    private RecyclerView albumRecyclerView;
    private RecyclerView assetRecyclerView;
    private RecyclerView timelineRecyclerView;
    private int currentAssetIndex = 0;
    private int albumScrollPosition = 0;
    private int albumScrollY = 0;
    private int assetScrollPosition = 0;
    private int assetScrollY = 0;
    private int timelineScrollPosition = 0;
    private int timelineScrollY = 0;
    private int albumPage = 1;
    private int assetPage = 1;
    private int timelinePage = 1;
    private boolean timelineHasMore = true;
    private boolean timelineLoadedOnce = false;
    private String timelineLoadError = "";
    private String timelineKeyword = "";
    private String timelineFrom = "";
    private String timelineTo = "";
    private String timelineOrientation = "";
    private String timelineExtension = "";
    private boolean downloadQueueRunning = false;
    private SystemStatus systemStatus;
    private boolean loadingSystemStatus = false;
    private String systemStatusError = "";
    private boolean loading = false;
    private boolean albumsHasMore = true;
    private boolean assetsHasMore = true;
    private boolean albumsLoadedOnce = false;
    private boolean assetsLoadedOnce = false;
    private String albumLoadError = "";
    private String assetLoadError = "";
    private boolean viewerOpen = false;
    private boolean scanningLibrary = false;
    private boolean loadingGallerySources = false;
    private boolean gallerySourcesLoaded = false;
    private boolean checkingScanStatus = false;
    private boolean scanStatusPollScheduled = false;
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
        getOnBackPressedDispatcher().addCallback(this, new OnBackPressedCallback(true) {
            @Override
            public void handleOnBackPressed() {
                handleBackNavigation();
            }
        });
        loadFavorites();
        loadSearchHistory();
        loadNewAlbumIds();
        loadDownloadJobs();
        createDownloadNotificationChannel();
        showLogin();
    }

    @Override
    protected void onResume() {
        super.onResume();
        checkActiveScanTask(false);
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
        checkActiveScanTask(false);
        if (SCREEN_VIEWER.equals(currentScreen)) {
            showViewer(currentAssetIndex);
        } else if (SCREEN_ASSETS.equals(currentScreen) && currentAlbum != null) {
            showAssets();
        } else if (SCREEN_TIMELINE.equals(currentScreen)) {
            showTimeline(false);
        } else if (SCREEN_DOWNLOADS.equals(currentScreen)) {
            showDownloads();
        } else if (SCREEN_PUBLIC_SHARES.equals(currentScreen)) {
            showPublicShares(false);
        } else if (SCREEN_ACCOUNT_DETAIL.equals(currentScreen) && !currentAccountDetailUser.isEmpty()) {
            showAccountShareDetail(currentAccountDetailUser);
        } else if (SCREEN_USER_MANAGER.equals(currentScreen)) {
            showUserShareManager();
        } else if (SCREEN_DATA_MANAGER.equals(currentScreen)) {
            showDataManager();
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
        boolean rememberPassword = getSharedPreferences(PREFS, MODE_PRIVATE).getBoolean(KEY_REMEMBER_PASSWORD, false);
        String savedPassword = rememberPassword ? getSharedPreferences(PREFS, MODE_PRIVATE).getString(KEY_PASSWORD, "") : "";
        EditText passInput = input("密码", savedPassword);
        passInput.setInputType(android.text.InputType.TYPE_CLASS_TEXT | android.text.InputType.TYPE_TEXT_VARIATION_PASSWORD);
        page.addView(urlInput, inputParams());

        TextView connectionStatus = text("建议先测试服务器，确认手机能够访问后端", 12, colorMuted(), false);
        connectionStatus.setPadding(dp(12), dp(10), dp(12), dp(10));
        connectionStatus.setBackground(roundedBackground(colorSurfaceTint(), colorStroke(), 12));
        LinearLayout.LayoutParams connectionStatusParams = matchWrapWithTop(8);
        page.addView(connectionStatus, connectionStatusParams);

        Button testConnection = secondaryButton("测试服务器连接");
        testConnection.setOnClickListener(v -> {
            String candidateUrl = normalizeUrl(urlInput.getText().toString());
            if (candidateUrl.isEmpty()) {
                connectionStatus.setText("请先填写服务器地址");
                connectionStatus.setTextColor(colorFavorite());
                return;
            }
            urlInput.setText(candidateUrl);
            testConnection.setEnabled(false);
            testConnection.setText("正在连接...");
            connectionStatus.setText("正在检查服务器健康状态");
            connectionStatus.setTextColor(colorMuted());
            MomentApi candidateApi = new MomentApi(candidateUrl);
            testConnectionAsync(candidateApi, (version, error) -> {
                testConnection.setEnabled(true);
                testConnection.setText("测试服务器连接");
                if (error == null || error.isEmpty()) {
                    boolean secure = candidateUrl.startsWith("https://");
                    connectionStatus.setText(String.format(
                            Locale.CHINA,
                            "连接成功 · 后端 %s%s",
                            version,
                            secure ? " · HTTPS" : " · HTTP（仅建议可信内网使用）"));
                    connectionStatus.setTextColor(darkMode ? 0xFF79D5A3 : 0xFF267A52);
                } else {
                    connectionStatus.setText(connectionErrorMessage(error));
                    connectionStatus.setTextColor(colorFavorite());
                }
            });
        });
        LinearLayout.LayoutParams testParams = matchWrapWithTop(8);
        testParams.height = dp(44);
        page.addView(testConnection, testParams);
        page.addView(userInput, inputParams());
        page.addView(passInput, inputParams());

        CheckBox remember = new CheckBox(this);
        remember.setText("记住密码");
        remember.setTextSize(14);
        remember.setTextColor(colorMuted());
        remember.setButtonTintList(android.content.res.ColorStateList.valueOf(colorPrimary()));
        remember.setChecked(rememberPassword);
        LinearLayout.LayoutParams rememberParams = matchWrapWithTop(4);
        page.addView(remember, rememberParams);

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
            connectionStatus.setText("正在连接服务器并验证账号");
            connectionStatus.setTextColor(colorMuted());
            baseUrl = url;
            username = user;
            api = new MomentApi(baseUrl);
            resetGalleryState();
            new LoginTask(user, pass, ok -> {
                login.setEnabled(true);
                login.setText("登录");
                if (ok) {
                    albumLoadError = "";
                    assetLoadError = "";
                    connectionStatus.setText("登录成功，正在进入图库");
                    role = api.role;
                    getSharedPreferences(PREFS, MODE_PRIVATE).edit()
                            .putString(KEY_BASE_URL, baseUrl)
                            .putString(KEY_USER, username)
                            .putString(KEY_ROLE, role)
                            .putBoolean(KEY_REMEMBER_PASSWORD, remember.isChecked())
                            .putString(KEY_PASSWORD, remember.isChecked() ? pass : "")
                            .apply();
                    loadFavorites();
                    new PullFavoriteAlbumsTask(() -> {
                        showAlbums(true);
                        runNextDownload();
                    }).execute();
                } else {
                    connectionStatus.setText("登录未完成，请检查上方信息后重试");
                    connectionStatus.setTextColor(colorFavorite());
                }
            }).execute();
        });
        LinearLayout.LayoutParams loginParams = matchWrap();
        loginParams.setMargins(0, dp(12), 0, 0);
        page.addView(login, loginParams);

        ScrollView loginScroll = new ScrollView(this);
        loginScroll.setFillViewport(true);
        loginScroll.addView(page, new ScrollView.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.WRAP_CONTENT));
        root.addView(loginScroll, fullScreen());
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

        TextView accountTitle = text("当前连接", 18, colorText(), true);
        content.addView(accountTitle, matchWrap());

        LinearLayout connectionCard = new LinearLayout(this);
        connectionCard.setOrientation(LinearLayout.VERTICAL);
        connectionCard.setPadding(dp(16), dp(14), dp(16), dp(14));
        connectionCard.setBackground(roundedBackground(colorSurface(), colorStroke(), 14));

        TextView serverLabel = text("服务器", 12, colorMuted(), false);
        connectionCard.addView(serverLabel, matchWrap());
        TextView serverValue = text(baseUrl, 15, colorText(), true);
        serverValue.setSingleLine(true);
        connectionCard.addView(serverValue, matchWrapWithTop(5));

        String roleLabel = "admin".equals(role) ? "管理员" : "普通用户";
        TextView identity = text(username + " · " + roleLabel, 13, colorPrimaryDark(), true);
        connectionCard.addView(identity, matchWrapWithTop(10));
        TextView changeHint = text("更换服务器或账号需要重新登录，避免旧会话与新地址混用。", 12, colorMuted(), false);
        connectionCard.addView(changeHint, matchWrapWithTop(6));

        Button changeConnection = secondaryButton("更换服务器或账号");
        changeConnection.setOnClickListener(v -> showLogin());
        LinearLayout.LayoutParams changeParams = matchWrapWithTop(12);
        changeParams.height = dp(44);
        connectionCard.addView(changeConnection, changeParams);
        content.addView(connectionCard, matchWrapWithTop(12));

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

        if ("admin".equals(role)) {
            TextView manageTitle = text("管理员中心", 18, colorText(), true);
            LinearLayout.LayoutParams manageTitleParams = matchWrapWithTop(26);
            content.addView(manageTitle, manageTitleParams);

            LinearLayout manageRow = new LinearLayout(this);
            manageRow.setOrientation(LinearLayout.HORIZONTAL);
            Button accountManage = secondaryButton("账户与分享");
            accountManage.setOnClickListener(v ->
                    new LoadUsersTask(false, () -> showUserShareManager()).execute());
            manageRow.addView(accountManage, new LinearLayout.LayoutParams(0, dp(50), 1));
            Button dataManage = secondaryButton("图库与缓存");
            dataManage.setOnClickListener(v -> showDataManager());
            LinearLayout.LayoutParams dataManageParams = new LinearLayout.LayoutParams(0, dp(50), 1);
            dataManageParams.setMargins(dp(10), 0, 0, 0);
            manageRow.addView(dataManage, dataManageParams);
            content.addView(manageRow, matchWrapWithTop(12));
        }

        TextView offlineTitle = text("\u4e0b\u8f7d\u4e0e\u79bb\u7ebf", 18, colorText(), true);
        content.addView(offlineTitle, matchWrapWithTop(26));
        Button downloads = secondaryButton("\u67e5\u770b\u4e0b\u8f7d\u961f\u5217\u4e0e\u79bb\u7ebf\u8bb0\u5f55");
        downloads.setOnClickListener(v -> showDownloads());
        LinearLayout.LayoutParams downloadsParams = matchWrapWithTop(12);
        downloadsParams.height = dp(46);
        content.addView(downloads, downloadsParams);

        TextView version = text("\u7248\u672c " + appVersion(), 12, colorMuted(), false);
        content.addView(version, matchWrapWithTop(20));
        Button update = secondaryButton("\u68c0\u67e5 GitHub \u66f4\u65b0");
        update.setOnClickListener(v -> new CheckUpdateTask().execute());
        LinearLayout.LayoutParams updateParams = matchWrapWithTop(8);
        updateParams.height = dp(44);
        content.addView(update, updateParams);

        TextView shareLinksTitle = text("\u516c\u5f00\u5206\u4eab", 18, colorText(), true);
        content.addView(shareLinksTitle, matchWrapWithTop(26));
        Button shareLinks = secondaryButton("\u7ba1\u7406\u5206\u4eab\u94fe\u63a5");
        shareLinks.setOnClickListener(v -> showPublicShares(true));
        LinearLayout.LayoutParams shareLinksParams = matchWrapWithTop(12);
        shareLinksParams.height = dp(46);
        content.addView(shareLinks, shareLinksParams);

        Button logout = secondaryButton("退出登录");
        logout.setTextColor(colorFavorite());
        logout.setOnClickListener(v -> {
            if (api != null) api.cookieHeader = "";
            imageLoader.clear();
            showLogin();
        });
        LinearLayout.LayoutParams logoutParams = matchWrapWithTop(24);
        logoutParams.height = dp(46);
        content.addView(logout, logoutParams);

        page.addView(scroll, new LinearLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, 0, 1));
        page.addView(bottomNav(), new LinearLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, navigationBarHeight() + dp(72)));
        root.addView(page, fullScreen());
    }

    private void showDataManager() {
        currentScreen = SCREEN_DATA_MANAGER;
        viewerOpen = false;
        restoreSystemBars();
        root.removeAllViews();

        LinearLayout page = basePage();
        page.addView(topBar("数据管理", () -> showSettings(), null));

        ScrollView scroll = new ScrollView(this);
        LinearLayout content = new LinearLayout(this);
        content.setOrientation(LinearLayout.VERTICAL);
        content.setPadding(dp(18), dp(8), dp(18), navigationBarHeight() + dp(24));
        scroll.addView(content);

        if ("admin".equals(role)) {
            TextView libraryTitle = text("相册库目录", 18, colorText(), true);
            content.addView(libraryTitle, matchWrap());
            TextView libraryHint = text("这里填写的是后端/Unraid 服务器上的绝对路径，不是手机本地目录。新增后只登记目录；用增量刷新发现新增相册，用全量刷新遍历整个相册库。", 12, colorMuted(), false);
            libraryHint.setLineSpacing(dp(3), 1f);
            content.addView(libraryHint, matchWrapWithTop(8));
            EditText libraryNameInput = input("目录名称（可选）", "");
            EditText libraryPathInput = input("服务器目录路径，例如 /app/media/photos", "");
            LinearLayout.LayoutParams libraryNameParams = matchWrapWithTop(10);
            libraryNameParams.height = dp(50);
            content.addView(libraryNameInput, libraryNameParams);
            LinearLayout.LayoutParams libraryPathParams = matchWrapWithTop(10);
            libraryPathParams.height = dp(50);
            content.addView(libraryPathInput, libraryPathParams);
            Button addLibrary = primaryButton("添加来源目录");
            addLibrary.setOnClickListener(v -> {
                String libraryName = libraryNameInput.getText().toString().trim();
                String libraryPath = libraryPathInput.getText().toString().trim();
                if (libraryPath.isEmpty()) {
                    toast("服务器目录路径不能为空");
                    return;
                }
                if (!isServerAbsolutePath(libraryPath)) {
                    toast("请输入服务端绝对路径，例如 /app/media/photos");
                    return;
                }
                addLibrary.setEnabled(false);
                addLibrary.setText("添加中...");
                new AddGalleryRootTask(libraryName, libraryPath, source -> {
                    addLibrary.setEnabled(true);
                    addLibrary.setText("添加来源目录");
                    if (source != null) {
                        libraryNameInput.setText("");
                        libraryPathInput.setText("");
                        resetGalleryState();
                        toast("相册库目录已添加：" + source.name);
                    }
                }).execute();
            });
            LinearLayout.LayoutParams addLibraryParams = matchWrapWithTop(10);
            addLibraryParams.height = dp(46);
            content.addView(addLibrary, addLibraryParams);

            TextView rootsTitle = text("已登记图库来源", 18, colorText(), true);
            content.addView(rootsTitle, matchWrapWithTop(24));
            TextView rootsHint = text("可启用/禁用来源，并对单个来源执行扫描预览、增量导入或全量导入。", 12, colorMuted(), false);
            rootsHint.setLineSpacing(dp(3), 1f);
            content.addView(rootsHint, matchWrapWithTop(8));
            if (!gallerySourcesLoaded && !loadingGallerySources) {
                loadingGallerySources = true;
                new GallerySourcesTask().execute();
            }
            if (loadingGallerySources && !gallerySourcesLoaded) {
                content.addView(text("来源列表加载中...", 13, colorMuted(), false), matchWrapWithTop(10));
            } else if (gallerySources.isEmpty()) {
                content.addView(text("暂无图库来源", 13, colorMuted(), false), matchWrapWithTop(10));
            } else {
                for (GallerySource source : gallerySources) content.addView(gallerySourceRow(source), matchWrapWithTop(10));
            }
        } else {
            TextView permissionTitle = text("需要管理员权限", 18, colorText(), true);
            content.addView(permissionTitle, matchWrap());
            TextView permissionHint = text("当前账号没有相册库目录和图库来源管理权限。请使用管理员账号进入后再添加来源、启用/禁用来源或执行扫描。", 12, colorMuted(), false);
            permissionHint.setLineSpacing(dp(3), 1f);
            content.addView(permissionHint, matchWrapWithTop(8));
        }

        if ("admin".equals(role)) {
            TextView opsTitle = text("\u8fd0\u7ef4\u72b6\u6001", 18, colorText(), true);
            content.addView(opsTitle, matchWrapWithTop(26));
            if (systemStatus == null && !loadingSystemStatus && systemStatusError.isEmpty()) {
                loadingSystemStatus = true;
                new LoadSystemStatusTask().execute();
            }
            String statusText = loadingSystemStatus ? "\u6b63\u5728\u8bfb\u53d6\u540e\u7aef\u72b6\u6001..."
                    : (systemStatus == null ? "\u65e0\u6cd5\u8bfb\u53d6\uff1a" + systemStatusError : systemStatus.summary());
            TextView statusView = text(statusText, 13, colorMuted(), false);
            statusView.setPadding(dp(14), dp(12), dp(14), dp(12));
            statusView.setLineSpacing(dp(3), 1f);
            statusView.setBackground(roundedBackground(colorSurface(), colorStroke(), 14));
            content.addView(statusView, matchWrapWithTop(10));

            LinearLayout opsActions = new LinearLayout(this);
            Button refreshStatus = secondaryButton("\u5237\u65b0\u72b6\u6001");
            refreshStatus.setOnClickListener(v -> {
                systemStatus = null;
                systemStatusError = "";
                showDataManager();
            });
            opsActions.addView(refreshStatus, new LinearLayout.LayoutParams(0, dp(44), 1));
            Button prune = secondaryButton("\u6e05\u7406\u540e\u7aef\u65e7\u7f29\u7565\u56fe");
            prune.setOnClickListener(v -> new PruneServerCacheTask().execute());
            LinearLayout.LayoutParams pruneParams = new LinearLayout.LayoutParams(0, dp(44), 1);
            pruneParams.setMargins(dp(8), 0, 0, 0);
            opsActions.addView(prune, pruneParams);
            content.addView(opsActions, matchWrapWithTop(10));
        }

        TextView localTitle = text("本机数据", 18, colorText(), true);
        content.addView(localTitle, matchWrapWithTop(26));

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

        page.addView(scroll, new LinearLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, 0, 1));
        root.addView(page, fullScreen());
    }

    private View gallerySourceRow(GallerySource source) {
        LinearLayout row = new LinearLayout(this);
        row.setOrientation(LinearLayout.VERTICAL);
        row.setPadding(dp(14), dp(12), dp(14), dp(12));
        row.setBackground(roundedBackground(colorSurface(), colorStroke(), 14));

        TextView title = text(source.name + (source.enabled ? " · 已启用" : " · 已禁用"), 15, colorText(), true);
        row.addView(title, matchWrap());
        TextView path = text(source.path.isEmpty() ? source.prefixKey : source.path, 12, colorMuted(), false);
        path.setLineSpacing(dp(3), 1f);
        row.addView(path, matchWrapWithTop(6));

        LinearLayout actions = new LinearLayout(this);
        actions.setOrientation(LinearLayout.HORIZONTAL);
        Button dryRun = secondaryButton("扫描预览");
        dryRun.setEnabled(source.enabled);
        dryRun.setAlpha(source.enabled ? 1f : 0.5f);
        dryRun.setOnClickListener(v -> new GalleryScanTask(source, true, false).execute());
        actions.addView(dryRun, new LinearLayout.LayoutParams(0, dp(42), 1));
        Button incremental = secondaryButton("增量导入");
        incremental.setEnabled(source.enabled);
        incremental.setAlpha(source.enabled ? 1f : 0.5f);
        incremental.setOnClickListener(v -> confirmGalleryScan(source, false));
        LinearLayout.LayoutParams incrementalParams = new LinearLayout.LayoutParams(0, dp(42), 1);
        incrementalParams.setMargins(dp(8), 0, 0, 0);
        actions.addView(incremental, incrementalParams);
        Button toggle = secondaryButton(source.enabled ? "禁用来源" : "启用来源");
        toggle.setOnClickListener(v -> new ToggleGallerySourceTask(source).execute());
        LinearLayout.LayoutParams toggleParams = new LinearLayout.LayoutParams(0, dp(42), 1);
        toggleParams.setMargins(dp(8), 0, 0, 0);
        actions.addView(toggle, toggleParams);
        row.addView(actions, matchWrapWithTop(10));

        LinearLayout fullActions = new LinearLayout(this);
        fullActions.setOrientation(LinearLayout.HORIZONTAL);
        Button full = secondaryButton("全量导入");
        full.setEnabled(source.enabled);
        full.setAlpha(source.enabled ? 1f : 0.5f);
        full.setTextColor(colorFavorite());
        full.setOnClickListener(v -> confirmGalleryScan(source, true));
        fullActions.addView(full, new LinearLayout.LayoutParams(0, dp(42), 1));
        row.addView(fullActions, matchWrapWithTop(8));
        return row;
    }

    private void confirmGalleryScan(GallerySource source, boolean full) {
        String title = full ? "确认全量导入" : "确认增量导入";
        String message = (full
                ? "全量导入会遍历该来源的整个相册库，包含压缩包深度解析，耗时较长。"
                : "增量导入会扫描新增相册文件夹和新增压缩包，并写入数据库。")
                + "\n\n来源：" + source.name
                + "\n后端会在写库前执行数据库备份。";
        new AlertDialog.Builder(this)
                .setTitle(title)
                .setMessage(message)
                .setPositiveButton("开始", (dialog, which) -> new GalleryScanTask(source, false, full).execute())
                .setNegativeButton("取消", null)
                .show();
    }

    private void showUserShareManager() {
        currentScreen = SCREEN_USER_MANAGER;
        currentAccountDetailUser = "";
        viewerOpen = false;
        restoreSystemBars();
        root.removeAllViews();

        LinearLayout page = basePage();
        page.addView(topBar("账户管理", () -> showSettings(), null));

        ScrollView scroll = new ScrollView(this);
        LinearLayout content = new LinearLayout(this);
        content.setOrientation(LinearLayout.VERTICAL);
        content.setPadding(dp(18), dp(8), dp(18), navigationBarHeight() + dp(24));
        scroll.addView(content);

        if (!"admin".equals(role)) {
            TextView permissionTitle = text("需要管理员权限", 18, colorText(), true);
            content.addView(permissionTitle, matchWrap());
            TextView permissionHint = text("当前账号没有普通账户和分享管理权限。请使用管理员账号进入后再创建账户、改密码、删除账户或调整相册分享。", 12, colorMuted(), false);
            permissionHint.setLineSpacing(dp(3), 1f);
            content.addView(permissionHint, matchWrapWithTop(8));
            page.addView(scroll, new LinearLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, 0, 1));
            root.addView(page, fullScreen());
            return;
        }

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
        if (!"admin".equals(role)) {
            showUserShareManager();
            return;
        }
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
        if (!"admin".equals(role)) {
            showUserShareManager();
            return;
        }
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
            albumLoadError = "";
            albumScrollPosition = 0;
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
        scanningLibrary = hasActiveScanTask();

        root.removeAllViews();
        LinearLayout page = basePage();
        page.addView(albumHeader());

        SwipeRefreshLayout refreshLayout = new SwipeRefreshLayout(this);
        refreshLayout.setColorSchemeColors(colorPrimary(), colorPrimaryDark());
        refreshLayout.setProgressBackgroundColorSchemeColor(colorSurface());
        refreshLayout.setRefreshing(loading && albums.isEmpty());
        refreshLayout.setOnRefreshListener(() -> {
            if (loading) return;
            toast("正在刷新");
            loadAlbums(true);
        });

        RecyclerView recycler = new RecyclerView(this);
        albumRecyclerView = recycler;
        recycler.setClipToPadding(false);
        recycler.setPadding(dp(8), dp(8), dp(8), dp(18));
        recycler.setItemAnimator(null);
        AlbumGridAdapter adapter = new AlbumGridAdapter();
        GridLayoutManager layoutManager = new GridLayoutManager(this, 2);
        layoutManager.setSpanSizeLookup(new GridLayoutManager.SpanSizeLookup() {
            @Override
            public int getSpanSize(int position) {
                return adapter.isFullSpan(position) ? 2 : 1;
            }
        });
        recycler.setLayoutManager(layoutManager);
        recycler.setAdapter(adapter);
        recycler.addOnScrollListener(new RecyclerView.OnScrollListener() {
            @Override
            public void onScrolled(RecyclerView view, int dx, int dy) {
                if (dy <= 0) return;
                maybeLoadMoreAlbums(layoutManager, adapter.getItemCount());
            }
        });
        refreshLayout.addView(recycler, new SwipeRefreshLayout.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT,
                ViewGroup.LayoutParams.MATCH_PARENT
        ));

        page.addView(refreshLayout, new LinearLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, 0, 1));
        page.addView(bottomNav(), new LinearLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, navigationBarHeight() + dp(72)));
        root.addView(page, fullScreen());
        recycler.post(() -> {
            layoutManager.scrollToPositionWithOffset(albumScrollPosition, albumScrollY);
            recycler.postDelayed(() -> maybeLoadMoreAlbums(layoutManager, adapter.getItemCount()), 180);
        });
        loadGallerySourcesIfNeeded();
        checkActiveScanTask(false);

        if (!isFavoritesTag() && !albumsLoadedOnce && albums.isEmpty() && !loading) {
            loadAlbums(true);
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

        View menu = iconButtonView(ICON_MENU, colorText(), "更多");
        menu.setOnClickListener(this::showHomeMenu);
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

        LinearLayout selectorRow = new LinearLayout(this);
        selectorRow.setOrientation(LinearLayout.HORIZONTAL);
        selectorRow.setGravity(Gravity.CENTER_VERTICAL);

        TextView tagSelector = headerPill("分类：" + activeTag + "⌄", !TAG_ALL.equals(activeTag));
        tagSelector.setTextSize(12);
        tagSelector.setOnClickListener(v -> showTagSelector());
        selectorRow.addView(tagSelector, new LinearLayout.LayoutParams(0, dp(34), 1));

        TextView sortSelector = headerPill("排序：" + albumSortLabel() + "⌄", ALBUM_SORT_NAME.equals(activeAlbumSort));
        sortSelector.setTextSize(12);
        sortSelector.setOnClickListener(v -> showAlbumSortSelector());
        LinearLayout.LayoutParams sortParams = new LinearLayout.LayoutParams(0, dp(34), 1);
        sortParams.setMargins(dp(8), 0, 0, 0);
        selectorRow.addView(sortSelector, sortParams);

        LinearLayout.LayoutParams selectorParams = matchWrap();
        selectorParams.setMargins(0, dp(10), 0, 0);
        wrap.addView(selectorRow, selectorParams);

        LinearLayout summaryRow = new LinearLayout(this);
        summaryRow.setGravity(Gravity.CENTER_VERTICAL);
        summaryRow.setPadding(0, 0, 0, 0);
        String summaryText = scanningLibrary ? "扫描中..." : (isNewSort() ? "新增/更新 " + albums.size() + " 个相册" : "共 " + albums.size() + " 个相册");
        TextView summary = text(summaryText, 12, colorMuted(), false);
        summaryRow.addView(summary, new LinearLayout.LayoutParams(0, dp(26), 1));
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
        imageLoader.loadThumbnail(cover, api.absolute(album.coverUrl), api.cookieHeader);

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
            assetScrollPosition = 0;
            assetScrollY = 0;
            assets.clear();
            assetLoadError = "";
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

    private void shareText(String title, String text) {
        copyText(title, text);
        Intent intent = new Intent(Intent.ACTION_SEND);
        intent.setType("text/plain");
        intent.putExtra(Intent.EXTRA_TEXT, text);
        startActivity(Intent.createChooser(intent, title));
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
                    if ("下载相册到本地".equals(action)) enqueueAlbumDownload(album);
                    else if ("生成公开分享链接".equals(action)) showPublicShareOptions("album", album.id);
                    else showShareAlbumDialog(album);
                })
                .setNegativeButton("取消", null)
                .show();
    }

    private void showBatchAlbumDownloadUnsupported() {
        showError("暂不支持批量下载相册", "后端 V2 当前没有相册 zip 下载 API，Android 不执行批量下载。请进入相册后下载单张原图。");
    }

    private void showPublicShareOptions(String type, String targetId) {
        LinearLayout form = new LinearLayout(this);
        form.setOrientation(LinearLayout.VERTICAL);
        form.setPadding(dp(18), dp(4), dp(18), 0);
        Spinner expiry = new Spinner(this);
        String[] labels = {"\u6c38\u4e45", "24 \u5c0f\u65f6", "7 \u5929", "30 \u5929"};
        int[] hours = {0, 24, 168, 720};
        ArrayAdapter<String> adapter = new ArrayAdapter<>(this, android.R.layout.simple_spinner_item, labels);
        adapter.setDropDownViewResource(android.R.layout.simple_spinner_dropdown_item);
        expiry.setAdapter(adapter);
        EditText password = input("\u8bbf\u95ee\u5bc6\u7801\uff08\u53ef\u9009\uff09", "");
        CheckBox allowOriginal = new CheckBox(this);
        allowOriginal.setText("\u5141\u8bb8\u4e0b\u8f7d\u539f\u56fe");
        allowOriginal.setTextColor(colorText());
        allowOriginal.setChecked(true);
        form.addView(expiry, inputParams());
        form.addView(password, inputParams());
        form.addView(allowOriginal, matchWrapWithTop(8));
        new AlertDialog.Builder(this)
                .setTitle("\u521b\u5efa\u516c\u5f00\u5206\u4eab")
                .setView(form)
                .setPositiveButton("\u751f\u6210\u94fe\u63a5", (dialog, which) -> {
                    int selected = Math.max(0, Math.min(expiry.getSelectedItemPosition(), hours.length - 1));
                    new CreatePublicShareTask(
                            type, targetId, hours[selected],
                            password.getText().toString(), allowOriginal.isChecked()).execute();
                })
                .setNegativeButton("\u53d6\u6d88", null)
                .show();
    }

    private void showShareAlbumDialog(Album album) {
        if (!"admin".equals(role)) {
            toast("只有管理员可以分享相册");
            return;
        }
        new LoadAlbumSharesTask(album).execute();
    }

    private void showShareAssetAlbumDialog(Asset asset) {
        if (!"admin".equals(role)) {
            showError("无法分享给普通账户", "只有管理员可以把图片所在相册授权给普通账户。");
            return;
        }
        Album album = currentAssetAlbum(asset);
        if (album == null || album.id == null || album.id.trim().isEmpty() || FAVORITES_ALBUM_ID.equals(album.id)) {
            showError("无法确认所在相册", "普通账户分享按相册授权，不做单张图片私有授权。请从真实相册进入这张图片后再分享。");
            return;
        }
        new LoadNormalUsersForAssetShareTask(album).execute();
    }

    private Album currentAssetAlbum(Asset asset) {
        if (currentAlbum != null && currentAlbum.id != null && !currentAlbum.id.trim().isEmpty()
                && !FAVORITES_ALBUM_ID.equals(currentAlbum.id)
                && !TIMELINE_ALBUM_ID.equals(currentAlbum.id)) {
            return currentAlbum;
        }
        if (asset == null || asset.albumId == null || asset.albumId.trim().isEmpty()) return null;
        Album album = new Album();
        album.id = asset.albumId.trim();
        album.name = "当前图片所在相册";
        return album;
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

    private boolean isNormalUser(UserAccount account) {
        if (account == null) return false;
        String user = account.username == null ? "" : account.username.trim();
        String accountRole = account.role == null ? "" : account.role.trim();
        return !user.isEmpty() && "user".equals(accountRole) && !"admin".equals(user);
    }

    private void showTimeline(boolean reset) {
        currentScreen = SCREEN_TIMELINE;
        viewerOpen = false;
        currentAlbum = null;
        if (reset) {
            timelineAssets.clear();
            timelinePage = 1;
            timelineHasMore = true;
            timelineLoadedOnce = false;
            timelineLoadError = "";
            timelineScrollPosition = 0;
            timelineScrollY = 0;
        }
        root.removeAllViews();
        LinearLayout page = basePage();
        page.addView(timelineHeader());

        RecyclerView recycler = new RecyclerView(this);
        timelineRecyclerView = recycler;
        recycler.setClipToPadding(false);
        recycler.setPadding(dp(8), dp(4), dp(8), dp(18));
        TimelineAdapter adapter = new TimelineAdapter();
        GridLayoutManager layout = new GridLayoutManager(this, 3);
        layout.setSpanSizeLookup(new GridLayoutManager.SpanSizeLookup() {
            @Override public int getSpanSize(int position) {
                return adapter.isFullSpan(position) ? 3 : 1;
            }
        });
        recycler.setLayoutManager(layout);
        recycler.setAdapter(adapter);
        recycler.addOnScrollListener(new RecyclerView.OnScrollListener() {
            @Override public void onScrolled(RecyclerView view, int dx, int dy) {
                if (dy > 0) maybeLoadMoreTimeline(layout, adapter.getItemCount());
            }
        });
        page.addView(recycler, new LinearLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, 0, 1));
        page.addView(bottomNav(), new LinearLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, navigationBarHeight() + dp(72)));
        root.addView(page, fullScreen());
        recycler.post(() -> {
            layout.scrollToPositionWithOffset(timelineScrollPosition, timelineScrollY);
            recycler.postDelayed(() -> maybeLoadMoreTimeline(layout, adapter.getItemCount()), 180);
        });
        if (!timelineLoadedOnce && timelineAssets.isEmpty() && !loading) loadTimeline(true);
    }

    private View timelineHeader() {
        LinearLayout wrap = new LinearLayout(this);
        wrap.setOrientation(LinearLayout.VERTICAL);
        wrap.setPadding(dp(16), statusBarHeight() + dp(12), dp(16), dp(10));
        LinearLayout titleRow = new LinearLayout(this);
        titleRow.setGravity(Gravity.CENTER_VERTICAL);
        TextView title = text("\u65f6\u95f4\u7ebf", 22, colorText(), true);
        titleRow.addView(title, new LinearLayout.LayoutParams(0, dp(42), 1));
        Button filter = secondaryButton("\u7b5b\u9009");
        filter.setOnClickListener(v -> showTimelineSearchDialog());
        titleRow.addView(filter, new LinearLayout.LayoutParams(dp(86), dp(40)));
        wrap.addView(titleRow, matchWrap());

        String filterText = timelineFilterSummary();
        TextView summary = text(
                timelineAssets.size() + " \u5f20\u5df2\u52a0\u8f7d" + (filterText.isEmpty() ? "" : "  \u00b7  " + filterText),
                12, colorMuted(), false);
        summary.setMaxLines(2);
        wrap.addView(summary, matchWrapWithTop(6));
        return wrap;
    }

    private String timelineFilterSummary() {
        List<String> parts = new ArrayList<>();
        if (!timelineKeyword.isEmpty()) parts.add(timelineKeyword);
        if (!timelineFrom.isEmpty() || !timelineTo.isEmpty()) parts.add(
                (timelineFrom.isEmpty() ? "..." : timelineFrom) + " ~ " + (timelineTo.isEmpty() ? "..." : timelineTo));
        if (!timelineOrientation.isEmpty()) parts.add(timelineOrientation);
        if (!timelineExtension.isEmpty()) parts.add(timelineExtension);
        return android.text.TextUtils.join("  ", parts);
    }

    private void showTimelineSearchDialog() {
        LinearLayout form = new LinearLayout(this);
        form.setOrientation(LinearLayout.VERTICAL);
        form.setPadding(dp(18), dp(4), dp(18), 0);
        EditText keyword = input("\u56fe\u7247\u540d\u6216\u76f8\u518c\u540d", timelineKeyword);
        EditText from = input("\u5f00\u59cb\u65e5\u671f YYYY-MM-DD", timelineFrom);
        EditText to = input("\u7ed3\u675f\u65e5\u671f YYYY-MM-DD", timelineTo);
        EditText extension = input("\u6269\u5c55\u540d\uff0c\u5982 jpg", timelineExtension);
        form.addView(keyword, inputParams());
        form.addView(from, inputParams());
        form.addView(to, inputParams());
        form.addView(extension, inputParams());

        Spinner orientation = new Spinner(this);
        String[] labels = {"\u5168\u90e8\u65b9\u5411", "\u6a2a\u5411", "\u7ad6\u5411", "\u65b9\u5f62"};
        ArrayAdapter<String> spinnerAdapter = new ArrayAdapter<>(this, android.R.layout.simple_spinner_item, labels);
        spinnerAdapter.setDropDownViewResource(android.R.layout.simple_spinner_dropdown_item);
        orientation.setAdapter(spinnerAdapter);
        int selected = "landscape".equals(timelineOrientation) ? 1
                : ("portrait".equals(timelineOrientation) ? 2 : ("square".equals(timelineOrientation) ? 3 : 0));
        orientation.setSelection(selected);
        form.addView(orientation, inputParams());

        new AlertDialog.Builder(this)
                .setTitle("\u9ad8\u7ea7\u641c\u7d22")
                .setView(form)
                .setPositiveButton("\u5e94\u7528", (dialog, which) -> {
                    timelineKeyword = keyword.getText().toString().trim();
                    timelineFrom = normalizeDateInput(from.getText().toString());
                    timelineTo = normalizeDateInput(to.getText().toString());
                    timelineExtension = extension.getText().toString().trim().replace(".", "");
                    int index = orientation.getSelectedItemPosition();
                    timelineOrientation = index == 1 ? "landscape" : (index == 2 ? "portrait" : (index == 3 ? "square" : ""));
                    showTimeline(true);
                })
                .setNeutralButton("\u91cd\u7f6e", (dialog, which) -> {
                    timelineKeyword = "";
                    timelineFrom = "";
                    timelineTo = "";
                    timelineExtension = "";
                    timelineOrientation = "";
                    showTimeline(true);
                })
                .setNegativeButton("\u53d6\u6d88", null)
                .show();
    }

    private String normalizeDateInput(String value) {
        String date = value == null ? "" : value.trim();
        return date.matches("\\d{4}-\\d{2}-\\d{2}") ? date : "";
    }

    private String timelineDateBoundary(String date, boolean end) {
        if (date == null || date.isEmpty()) return "";
        return date + (end ? "T23:59:59.999Z" : "T00:00:00.000Z");
    }

    private void saveTimelineScroll() {
        if (timelineRecyclerView == null || !(timelineRecyclerView.getLayoutManager() instanceof GridLayoutManager)) return;
        RecyclerView recycler = timelineRecyclerView;
        GridLayoutManager layout = (GridLayoutManager) recycler.getLayoutManager();
        timelineScrollPosition = Math.max(0, layout.findFirstVisibleItemPosition());
        View first = layout.findViewByPosition(timelineScrollPosition);
        timelineScrollY = first == null ? 0 : first.getTop() - recycler.getPaddingTop();
    }

    private void maybeLoadMoreTimeline(GridLayoutManager layout, int itemCount) {
        if (!SCREEN_TIMELINE.equals(currentScreen) || loading || !timelineHasMore || !timelineLoadError.isEmpty()) return;
        if (layout.findLastVisibleItemPosition() >= Math.max(0, itemCount - 12)) loadTimeline(false);
    }

    private void loadTimeline(boolean reset) {
        if (loading) return;
        loading = true;
        if (reset) {
            timelinePage = 1;
            timelineAssets.clear();
            timelineHasMore = true;
            timelineLoadedOnce = false;
            timelineLoadError = "";
        }
        showTimeline(false);
        new TimelineTask(timelinePage, result -> {
            loading = false;
            timelineLoadedOnce = true;
            if (result == null) {
                if (timelineLoadError.isEmpty()) timelineLoadError = "timeline request failed";
            } else {
                timelineLoadError = "";
                timelineAssets.addAll(result.items);
                timelineHasMore = result.hasMore;
                timelinePage++;
            }
            showTimeline(false);
        }).execute();
    }

    private List<TimelineEntry> timelineEntries() {
        List<TimelineEntry> entries = new ArrayList<>();
        String lastDay = "";
        for (int i = 0; i < timelineAssets.size(); i++) {
            Asset asset = timelineAssets.get(i);
            String day = asset.timelineDay();
            if (!day.equals(lastDay)) {
                entries.add(TimelineEntry.header(day));
                lastDay = day;
            }
            entries.add(TimelineEntry.asset(asset, i));
        }
        return entries;
    }

    private View timelineAssetTile(Asset asset, int sourceIndex) {
        FrameLayout frame = new FrameLayout(this);
        ImageView image = new ImageView(this);
        image.setScaleType(ImageView.ScaleType.CENTER_CROP);
        image.setBackgroundColor(colorSurfaceTint());
        imageLoader.loadThumbnail(image, api.absolute(asset.thumbnailUrl), api.cookieHeader);
        frame.addView(image, fullFrame());
        TextView meta = text(asset.albumName == null ? "" : asset.albumName, 9, Color.WHITE, true);
        meta.setSingleLine(true);
        meta.setPadding(dp(5), 0, dp(5), 0);
        meta.setBackgroundColor(Color.argb(145, 0, 0, 0));
        FrameLayout.LayoutParams mp = new FrameLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, dp(22), Gravity.BOTTOM);
        frame.addView(meta, mp);
        frame.setOnClickListener(v -> {
            saveTimelineScroll();
            Album timelineAlbum = new Album();
            timelineAlbum.id = TIMELINE_ALBUM_ID;
            timelineAlbum.name = "\u65f6\u95f4\u7ebf";
            currentAlbum = timelineAlbum;
            assets = new ArrayList<>(timelineAssets);
            showViewer(Math.max(0, Math.min(sourceIndex, assets.size() - 1)));
        });
        return frame;
    }

    private View timelineFooterView() {
        if (loading) return loadingMoreView("\u6b63\u5728\u8f7d\u5165\u66f4\u591a\u56fe\u7247");
        if (!timelineLoadError.isEmpty()) return inlineRetryState(
                timelineAssets.isEmpty() ? "\u65e0\u6cd5\u52a0\u8f7d\u65f6\u95f4\u7ebf" : "\u540e\u7eed\u52a0\u8f7d\u5931\u8d25",
                friendlyRequestMessage(timelineLoadError), () -> {
                    timelineLoadError = "";
                    loadTimeline(timelineAssets.isEmpty());
                });
        if (timelineLoadedOnce && timelineAssets.isEmpty()) {
            return emptyState("\u6ca1\u6709\u5339\u914d\u56fe\u7247", "\u8bf7\u8c03\u6574\u65e5\u671f\u3001\u65b9\u5411\u6216\u5173\u952e\u8bcd\u3002");
        }
        return new View(this);
    }

    private static class TimelineEntry {
        final String day;
        final Asset asset;
        final int sourceIndex;
        private TimelineEntry(String day, Asset asset, int sourceIndex) {
            this.day = day;
            this.asset = asset;
            this.sourceIndex = sourceIndex;
        }
        static TimelineEntry header(String day) { return new TimelineEntry(day, null, -1); }
        static TimelineEntry asset(Asset asset, int index) { return new TimelineEntry("", asset, index); }
        boolean isHeader() { return asset == null; }
    }

    private class TimelineAdapter extends RecyclerView.Adapter<DynamicViewHolder> {
        private static final int TYPE_HEADER = 1;
        private static final int TYPE_ASSET = 2;
        private static final int TYPE_FOOTER = 3;
        private List<TimelineEntry> entries() { return timelineEntries(); }
        private boolean hasFooter() { return loading || !timelineLoadError.isEmpty() || (timelineLoadedOnce && timelineAssets.isEmpty()); }
        @Override public int getItemCount() { return entries().size() + (hasFooter() ? 1 : 0); }
        @Override public int getItemViewType(int position) {
            List<TimelineEntry> list = entries();
            if (position >= list.size()) return TYPE_FOOTER;
            return list.get(position).isHeader() ? TYPE_HEADER : TYPE_ASSET;
        }
        boolean isFullSpan(int position) { return getItemViewType(position) != TYPE_ASSET; }
        @Override public DynamicViewHolder onCreateViewHolder(ViewGroup parent, int viewType) {
            FrameLayout container = new FrameLayout(MainActivity.this);
            int size = (getResources().getDisplayMetrics().widthPixels - dp(28)) / 3;
            RecyclerView.LayoutParams params = new RecyclerView.LayoutParams(
                    ViewGroup.LayoutParams.MATCH_PARENT,
                    viewType == TYPE_ASSET ? size : ViewGroup.LayoutParams.WRAP_CONTENT);
            params.setMargins(dp(3), dp(3), dp(3), dp(3));
            container.setLayoutParams(params);
            return new DynamicViewHolder(container);
        }
        @Override public void onBindViewHolder(DynamicViewHolder holder, int position) {
            List<TimelineEntry> list = entries();
            int type = getItemViewType(position);
            if (type == TYPE_FOOTER) holder.bind(timelineFooterView(), false);
            else if (type == TYPE_HEADER) {
                TextView day = text(list.get(position).day, 17, colorText(), true);
                day.setPadding(dp(6), dp(12), dp(6), dp(5));
                holder.bind(day, false);
            } else {
                TimelineEntry entry = list.get(position);
                holder.bind(timelineAssetTile(entry.asset, entry.sourceIndex), true);
            }
        }
        @Override public void onViewRecycled(DynamicViewHolder holder) {
            imageLoader.clear(holder.container);
            holder.container.removeAllViews();
        }
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

        RecyclerView recycler = new RecyclerView(this);
        assetRecyclerView = recycler;
        recycler.setClipToPadding(false);
        recycler.setPadding(dp(7), dp(7), dp(7), navigationBarHeight() + dp(90));
        recycler.setItemAnimator(null);
        AssetGridAdapter adapter = new AssetGridAdapter();
        GridLayoutManager layoutManager = new GridLayoutManager(this, 2);
        layoutManager.setSpanSizeLookup(new GridLayoutManager.SpanSizeLookup() {
            @Override
            public int getSpanSize(int position) {
                return adapter.isFullSpan(position) ? 2 : 1;
            }
        });
        recycler.setLayoutManager(layoutManager);
        recycler.setAdapter(adapter);
        recycler.addOnScrollListener(new RecyclerView.OnScrollListener() {
            @Override
            public void onScrolled(RecyclerView view, int dx, int dy) {
                int lastVisible = layoutManager.findLastVisibleItemPosition();
                if (lastVisible >= 0) {
                    preloadAssetThumbnails(lastVisible + 1, 16);
                }
                if (dy <= 0) return;
                maybeLoadMoreAssets(layoutManager, adapter.getItemCount());
            }
        });
        preloadAssetThumbnails(0, 24);

        page.addView(recycler, new LinearLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, 0, 1));
        root.addView(page, fullScreen());
        recycler.post(() -> {
            layoutManager.scrollToPositionWithOffset(assetScrollPosition, assetScrollY);
            recycler.postDelayed(() -> maybeLoadMoreAssets(layoutManager, adapter.getItemCount()), 180);
        });

        if (!isFavoritesAlbum() && !assetsLoadedOnce && assets.isEmpty() && !loading) {
            loadAssets(true);
        }
    }

    private View assetTile(Asset asset, int index) {
        ImageView image = new ImageView(this);
        image.setScaleType(ImageView.ScaleType.CENTER_CROP);
        image.setBackgroundColor(colorSurfaceTint());
        imageLoader.loadThumbnail(image, api.absolute(asset.thumbnailUrl), api.cookieHeader);
        if (index < 12) preloadAssetThumbnail(index + 12);
        image.setOnClickListener(v -> {
            saveAssetScroll();
            showViewer(index);
        });
        return image;
    }

    private void maybeLoadMoreAlbums(GridLayoutManager layoutManager, int itemCount) {
        if (!SCREEN_ALBUMS.equals(currentScreen)
                || isFavoritesTag()
                || loading
                || !albumsHasMore
                || !albumLoadError.isEmpty()) return;
        int lastVisible = layoutManager.findLastVisibleItemPosition();
        if (lastVisible >= Math.max(0, itemCount - 5)) {
            loadAlbums(false);
        }
    }

    private void maybeLoadMoreAssets(GridLayoutManager layoutManager, int itemCount) {
        if (!SCREEN_ASSETS.equals(currentScreen)
                || isFavoritesAlbum()
                || loading
                || !assetsHasMore
                || !assetLoadError.isEmpty()) return;
        int lastVisible = layoutManager.findLastVisibleItemPosition();
        if (lastVisible >= Math.max(0, itemCount - 10)) {
            loadAssets(false);
        }
    }

    private View skeletonGrid(int tileCount, int tileHeightDp) {
        LinearLayout grid = new LinearLayout(this);
        grid.setOrientation(LinearLayout.VERTICAL);
        int rows = Math.max(1, (tileCount + 1) / 2);
        for (int rowIndex = 0; rowIndex < rows; rowIndex++) {
            LinearLayout row = new LinearLayout(this);
            row.setOrientation(LinearLayout.HORIZONTAL);
            for (int column = 0; column < 2; column++) {
                View tile = new View(this);
                tile.setBackground(roundedBackground(colorSurfaceTint(), 0, 12));
                LinearLayout.LayoutParams tileParams = new LinearLayout.LayoutParams(0, dp(tileHeightDp), 1);
                tileParams.setMargins(dp(4), dp(4), dp(4), dp(4));
                row.addView(tile, tileParams);
            }
            grid.addView(row, matchWrap());
        }
        grid.setAlpha(0.78f);
        return grid;
    }

    private View loadingMoreView(String label) {
        LinearLayout row = new LinearLayout(this);
        row.setGravity(Gravity.CENTER);
        row.setPadding(dp(12), dp(14), dp(12), dp(14));
        ProgressBar progress = new ProgressBar(this);
        row.addView(progress, new LinearLayout.LayoutParams(dp(28), dp(28)));
        TextView copy = text(label, 12, colorMuted(), false);
        LinearLayout.LayoutParams copyParams = new LinearLayout.LayoutParams(
                ViewGroup.LayoutParams.WRAP_CONTENT,
                ViewGroup.LayoutParams.WRAP_CONTENT
        );
        copyParams.setMargins(dp(10), 0, 0, 0);
        row.addView(copy, copyParams);
        return row;
    }

    private View inlineRetryState(String title, String message, Runnable retry) {
        LinearLayout state = new LinearLayout(this);
        state.setOrientation(LinearLayout.VERTICAL);
        state.setGravity(Gravity.CENTER);
        state.setPadding(dp(22), dp(20), dp(22), dp(20));
        state.setBackground(roundedBackground(colorSurface(), colorStroke(), 14));

        TextView heading = text(title, 16, colorText(), true);
        heading.setGravity(Gravity.CENTER);
        state.addView(heading, matchWrap());
        TextView detail = text(message, 12, colorMuted(), false);
        detail.setGravity(Gravity.CENTER);
        state.addView(detail, matchWrapWithTop(7));

        Button button = secondaryButton("重新加载");
        button.setOnClickListener(v -> retry.run());
        LinearLayout.LayoutParams buttonParams = matchWrapWithTop(12);
        buttonParams.height = dp(42);
        state.addView(button, buttonParams);
        return state;
    }

    private boolean hasAlbumFooter() {
        return loading
                || !albumLoadError.isEmpty()
                || (!isFavoritesTag() && isNewSort() && newAlbumIds.isEmpty())
                || (isFavoritesTag() && favoriteAssets.isEmpty() && favoriteAlbums.isEmpty())
                || (albumsLoadedOnce && albums.isEmpty());
    }

    private View albumFooterView() {
        LinearLayout footer = new LinearLayout(this);
        footer.setOrientation(LinearLayout.VERTICAL);
        footer.setPadding(dp(6), dp(8), dp(6), dp(12));
        if (loading) {
            if (albums.isEmpty()) footer.addView(skeletonGrid(6, 184), matchWrap());
            else footer.addView(loadingMoreView("正在载入更多相册"), matchWrap());
        } else if (!albumLoadError.isEmpty()) {
            footer.addView(inlineRetryState(
                    albums.isEmpty() ? "无法加载相册" : "后续相册加载失败",
                    friendlyRequestMessage(albumLoadError),
                    () -> {
                        albumLoadError = "";
                        loadAlbums(albums.isEmpty());
                    }
            ));
        } else if (!isFavoritesTag() && isNewSort() && newAlbumIds.isEmpty()) {
            footer.addView(emptyState("本次没有新增或更新", "点击“刷新图库”后，这里只显示本次新增或内容发生变化的相册。"));
        } else if (isFavoritesTag() && favoriteAssets.isEmpty() && favoriteAlbums.isEmpty()) {
            footer.addView(emptyState("还没有收藏", "收藏图片或相册后，就会出现在这里。"));
        } else if (albumsLoadedOnce && albums.isEmpty()) {
            String title = isNewSort() ? "没有匹配的新增或更新内容" : "没找到相册";
            String message = isNewSort() ? "本次新增或更新里没有匹配当前搜索或标签的相册。" : "换个关键词，或者点“全部”看看。";
            footer.addView(emptyState(title, message));
        }
        return footer;
    }

    private boolean hasAssetFooter() {
        return loading || !assetLoadError.isEmpty() || (assetsLoadedOnce && assets.isEmpty());
    }

    private View assetFooterView() {
        LinearLayout footer = new LinearLayout(this);
        footer.setOrientation(LinearLayout.VERTICAL);
        footer.setPadding(dp(6), dp(8), dp(6), dp(12));
        if (loading) {
            if (assets.isEmpty()) footer.addView(skeletonGrid(8, 168), matchWrap());
            else footer.addView(loadingMoreView("正在载入更多图片"), matchWrap());
        } else if (!assetLoadError.isEmpty()) {
            footer.addView(inlineRetryState(
                    assets.isEmpty() ? "无法加载图片" : "后续图片加载失败",
                    friendlyRequestMessage(assetLoadError),
                    () -> {
                        assetLoadError = "";
                        loadAssets(assets.isEmpty());
                    }
            ));
        } else if (assetsLoadedOnce && assets.isEmpty()) {
            String title = isFavoritesAlbum() ? "还没有收藏" : "这个相册暂时没有图片";
            String message = isFavoritesAlbum() ? "在全屏看图时点心型收藏图片。" : "返回相册列表试试其他内容。";
            footer.addView(emptyState(title, message));
        }
        return footer;
    }

    private class DynamicViewHolder extends RecyclerView.ViewHolder {
        final FrameLayout container;

        DynamicViewHolder(FrameLayout container) {
            super(container);
            this.container = container;
        }

        void bind(View child, boolean fillHeight) {
            imageLoader.clear(container);
            container.removeAllViews();
            FrameLayout.LayoutParams params = new FrameLayout.LayoutParams(
                    ViewGroup.LayoutParams.MATCH_PARENT,
                    fillHeight ? ViewGroup.LayoutParams.MATCH_PARENT : ViewGroup.LayoutParams.WRAP_CONTENT
            );
            container.addView(child, params);
        }
    }

    private class AlbumGridAdapter extends RecyclerView.Adapter<DynamicViewHolder> {
        private static final int TYPE_OVERVIEW = 1;
        private static final int TYPE_ALBUM = 2;
        private static final int TYPE_FOOTER = 3;

        private int overviewCount() {
            return isFavoritesTag() ? 1 : 0;
        }

        @Override
        public int getItemCount() {
            return overviewCount() + albums.size() + (hasAlbumFooter() ? 1 : 0);
        }

        @Override
        public int getItemViewType(int position) {
            if (overviewCount() == 1 && position == 0) return TYPE_OVERVIEW;
            int albumIndex = position - overviewCount();
            return albumIndex >= 0 && albumIndex < albums.size() ? TYPE_ALBUM : TYPE_FOOTER;
        }

        boolean isFullSpan(int position) {
            return getItemViewType(position) != TYPE_ALBUM;
        }

        @Override
        public DynamicViewHolder onCreateViewHolder(ViewGroup parent, int viewType) {
            FrameLayout container = new FrameLayout(MainActivity.this);
            RecyclerView.LayoutParams params;
            if (viewType == TYPE_ALBUM) {
                params = new RecyclerView.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, dp(196));
                params.setMargins(dp(6), dp(6), dp(6), dp(12));
            } else {
                params = new RecyclerView.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.WRAP_CONTENT);
                params.setMargins(dp(6), 0, dp(6), 0);
            }
            container.setLayoutParams(params);
            return new DynamicViewHolder(container);
        }

        @Override
        public void onBindViewHolder(DynamicViewHolder holder, int position) {
            int viewType = getItemViewType(position);
            if (viewType == TYPE_OVERVIEW) {
                holder.bind(favoritesOverview(), false);
            } else if (viewType == TYPE_ALBUM) {
                holder.bind(albumCard(albums.get(position - overviewCount())), true);
            } else {
                holder.bind(albumFooterView(), false);
            }
        }

        @Override
        public void onViewRecycled(DynamicViewHolder holder) {
            imageLoader.clear(holder.container);
            holder.container.removeAllViews();
        }
    }

    private class AssetGridAdapter extends RecyclerView.Adapter<DynamicViewHolder> {
        private static final int TYPE_ASSET = 1;
        private static final int TYPE_FOOTER = 2;

        @Override
        public int getItemCount() {
            return assets.size() + (hasAssetFooter() ? 1 : 0);
        }

        @Override
        public int getItemViewType(int position) {
            return position < assets.size() ? TYPE_ASSET : TYPE_FOOTER;
        }

        boolean isFullSpan(int position) {
            return getItemViewType(position) == TYPE_FOOTER;
        }

        @Override
        public DynamicViewHolder onCreateViewHolder(ViewGroup parent, int viewType) {
            FrameLayout container = new FrameLayout(MainActivity.this);
            RecyclerView.LayoutParams params;
            if (viewType == TYPE_ASSET) {
                int size = (getResources().getDisplayMetrics().widthPixels - dp(28)) / 2;
                params = new RecyclerView.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, size);
                params.setMargins(dp(3), dp(3), dp(3), dp(3));
            } else {
                params = new RecyclerView.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.WRAP_CONTENT);
                params.setMargins(dp(6), 0, dp(6), 0);
            }
            container.setLayoutParams(params);
            return new DynamicViewHolder(container);
        }

        @Override
        public void onBindViewHolder(DynamicViewHolder holder, int position) {
            if (getItemViewType(position) == TYPE_ASSET) {
                holder.bind(assetTile(assets.get(position), position), true);
            } else {
                holder.bind(assetFooterView(), false);
            }
        }

        @Override
        public void onViewRecycled(DynamicViewHolder holder) {
            imageLoader.clear(holder.container);
            holder.container.removeAllViews();
        }
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

        ProgressBar imageLoading = new ProgressBar(this);
        FrameLayout.LayoutParams imageLoadingParams = new FrameLayout.LayoutParams(dp(46), dp(46), Gravity.CENTER);
        viewer.addView(imageLoading, imageLoadingParams);

        TextView imageError = text("图片加载失败 · 点击重试", 13, Color.WHITE, true);
        imageError.setGravity(Gravity.CENTER);
        imageError.setPadding(dp(16), dp(10), dp(16), dp(10));
        imageError.setBackground(roundedBackground(Color.argb(176, 28, 28, 28), Color.argb(90, 255, 255, 255), 14));
        imageError.setVisibility(View.GONE);
        imageError.setClickable(true);
        FrameLayout.LayoutParams imageErrorParams = new FrameLayout.LayoutParams(
                ViewGroup.LayoutParams.WRAP_CONTENT,
                ViewGroup.LayoutParams.WRAP_CONTENT,
                Gravity.CENTER
        );
        viewer.addView(imageError, imageErrorParams);

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
        final int[] tapGeneration = {0};
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
            imageLoading.setVisibility(View.VISIBLE);
            imageError.setVisibility(View.GONE);
            imageLoader.loadPreviewThenOriginal(
                    image,
                    api.absolute(asset.thumbnailUrl),
                    api.absolute(asset.originalUrl),
                    api.cookieHeader,
                    ok -> {
                        imageLoading.setVisibility(View.GONE);
                        imageError.setVisibility(ok ? View.GONE : View.VISIBLE);
                    }
            );
            preloadViewerImage(currentAssetIndex - 1);
            preloadViewerImage(currentAssetIndex + 1);
            preloadViewerImage(currentAssetIndex + 2);
            preloadAssetThumbnails(currentAssetIndex + 3, 12);
        };

        imageError.setOnClickListener(v -> render.run());
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
                if (!moved[0] && !multiTouch[0]) {
                    long now = event.getEventTime();
                    float tapX = event.getX();
                    float tapY = event.getY();
                    float tapDx = tapX - lastTapX[0];
                    float tapDy = tapY - lastTapY[0];
                    boolean isDoubleTap = now - lastTapTime[0] <= doubleTapTimeout
                            && Math.abs(tapDx) <= doubleTapSlop
                            && Math.abs(tapDy) <= doubleTapSlop;
                    if (isDoubleTap) {
                        tapGeneration[0]++;
                        if (zoom[0] <= minZoom) {
                            zoom[0] = 2.25f;
                            image.setPivotX(tapX);
                            image.setPivotY(tapY);
                            image.setScaleX(zoom[0]);
                            image.setScaleY(zoom[0]);
                            clampImagePan.run();
                        } else {
                            resetZoom.run();
                        }
                        lastTapTime[0] = 0L;
                        return true;
                    }
                    lastTapTime[0] = now;
                    lastTapX[0] = tapX;
                    lastTapY[0] = tapY;
                    int generation = ++tapGeneration[0];
                    image.postDelayed(() -> {
                        if (generation != tapGeneration[0]) return;
                        if (zoom[0] <= minZoom) {
                            if (tapX <= sideTapWidth) previousAction.run();
                            else if (tapX >= image.getWidth() - sideTapWidth) nextAction.run();
                            else toggleChrome.run();
                        } else {
                            toggleChrome.run();
                        }
                        image.performClick();
                    }, doubleTapTimeout + 20L);
                    return true;
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
            List<String> actions = new ArrayList<>();
            actions.add("分享给普通账户");
            actions.add("生成公开分享链接");
            actions.add("下载原图");
            String[] items = actions.toArray(new String[0]);
            new AlertDialog.Builder(this)
                    .setTitle("图片操作")
                    .setItems(items, (dialog, which) -> {
                        String action = items[which];
                        if ("分享给普通账户".equals(action)) showShareAssetAlbumDialog(asset);
                        else if ("生成公开分享链接".equals(action)) showPublicShareOptions("asset", asset.id);
                        else enqueueAssetDownload(asset);
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

    private void preloadAssetThumbnails(int startIndex, int count) {
        for (int i = Math.max(0, startIndex); i < Math.min(assets.size(), startIndex + count); i++) {
            preloadAssetThumbnail(i);
        }
    }

    private void preloadAssetThumbnail(int index) {
        if (index < 0 || index >= assets.size()) return;
        Asset asset = assets.get(index);
        imageLoader.preloadThumbnail(api.absolute(asset.thumbnailUrl), api.cookieHeader, dp(220));
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
            albumLoadError = "";
            albumScrollPosition = 0;
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
            new NewAlbumsTask(keyword, activeGalleryPrefix, albumSortBy(), albumSortOrder(), result -> {
                loading = false;
                albumsLoadedOnce = true;
                if (result != null) {
                    albumLoadError = "";
                    albums.addAll(result.items);
                    sortAlbums();
                    albumsHasMore = false;
                } else {
                    albumsHasMore = false;
                    if (handleSessionExpired(albumLoadError)) return;
                }
                showAlbums(false);
            }).execute();
            return;
        }
        final int requestedPage = albumPage;
        PageResult<Album> cached = getCachedAlbumPage(requestedPage, keyword, albumSortBy(), albumSortOrder(), activeGalleryPrefix);
        if (cached != null) {
            albumLoadError = "";
            loading = false;
            albumsLoadedOnce = true;
            albums.addAll(cached.items);
            sortAlbums();
            albumsHasMore = cached.hasMore;
            albumPage++;
            showAlbums(false);
            return;
        }
        new AlbumsTask(requestedPage, keyword, albumSortBy(), albumSortOrder(), activeGalleryPrefix, result -> {
            loading = false;
            albumsLoadedOnce = true;
            if (result != null) {
                albumLoadError = "";
                putCachedAlbumPage(requestedPage, keyword, albumSortBy(), albumSortOrder(), activeGalleryPrefix, result);
                albums.addAll(result.items);
                sortAlbums();
                albumsHasMore = result.hasMore;
                albumPage++;
            } else {
                if (handleSessionExpired(albumLoadError)) return;
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
            assetLoadError = "";
            assetScrollPosition = 0;
            assetScrollY = 0;
        }
        if (after == null) showAssets();
        new AssetsTask(currentAlbum.id, assetPage, result -> {
            loading = false;
            assetsLoadedOnce = true;
            if (result != null) {
                assetLoadError = "";
                assets.addAll(result.items);
                assetsHasMore = result.hasMore;
                assetPage++;
            } else {
                if (handleSessionExpired(assetLoadError)) return;
                if (after != null) {
                    toast("后续图片加载失败，可返回九宫格重试");
                }
            }
            if (after != null) after.run();
            else showAssets();
        }).execute();
    }

    private void refreshLibrary(boolean full) {
        if (scanningLibrary) return;
        scanningLibrary = true;
        showAlbums(false);
        toast(full ? "已提交全量刷新，后台继续执行" : "已提交增量刷新，后台继续执行");
        new StartScanTask(full, activeGalleryPrefix).execute();
    }

    private String scanCompleteText(ScanResult result, boolean full) {
        String mode = full ? "全量刷新" : "增量刷新";
        if (result == null) return mode + "完成";
        String text = mode + "完成，新增/变化 " + result.newAlbumIds.size() + " 个相册";
        if (result.status != null) {
            text += " · 图片 " + result.status.assetsDiscovered;
            if (result.status.unchangedAlbums > 0 || result.status.unchangedAssets > 0) {
                text += " · 跳过未变化 相册 " + result.status.unchangedAlbums + " / 图片 " + result.status.unchangedAssets;
            }
            if (result.status.skippedFiles > 0) text += " · 错误/不支持 " + result.status.skippedFiles;
        }
        return text;
    }

    private void saveActiveScanTask(String taskId, boolean full, String galleryId, String snapshotJson) {
        if (taskId == null || taskId.trim().isEmpty()) return;
        getSharedPreferences(PREFS, MODE_PRIVATE).edit()
                .putString(KEY_ACTIVE_SCAN_TASK_ID, taskId.trim())
                .putBoolean(KEY_ACTIVE_SCAN_FULL, full)
                .putString(KEY_ACTIVE_SCAN_GALLERY, galleryId == null ? "" : galleryId.trim())
                .putString(KEY_ACTIVE_SCAN_SNAPSHOT, snapshotJson == null ? "{}" : snapshotJson)
                .apply();
    }

    private void clearActiveScanTask() {
        getSharedPreferences(PREFS, MODE_PRIVATE).edit()
                .remove(KEY_ACTIVE_SCAN_TASK_ID)
                .remove(KEY_ACTIVE_SCAN_FULL)
                .remove(KEY_ACTIVE_SCAN_GALLERY)
                .remove(KEY_ACTIVE_SCAN_SNAPSHOT)
                .apply();
    }

    private boolean hasActiveScanTask() {
        String taskId = getSharedPreferences(PREFS, MODE_PRIVATE).getString(KEY_ACTIVE_SCAN_TASK_ID, "");
        return taskId != null && !taskId.trim().isEmpty();
    }

    private void checkActiveScanTask(boolean forceMessage) {
        if (api == null || checkingScanStatus) return;
        String taskId = getSharedPreferences(PREFS, MODE_PRIVATE).getString(KEY_ACTIVE_SCAN_TASK_ID, "");
        if (taskId == null || taskId.trim().isEmpty()) {
            scanningLibrary = false;
            return;
        }
        checkingScanStatus = true;
        scanningLibrary = true;
        new CheckScanTask(taskId, forceMessage).execute();
    }

    private void scheduleScanStatusPoll() {
        if (scanStatusPollScheduled || !hasActiveScanTask()) return;
        scanStatusPollScheduled = true;
        root.postDelayed(() -> {
            scanStatusPollScheduled = false;
            if (hasActiveScanTask()) {
                checkActiveScanTask(false);
                scheduleScanStatusPoll();
            }
        }, 5000);
    }

    private void handleScanCompleted(ScanStatus status) {
        boolean full = getSharedPreferences(PREFS, MODE_PRIVATE).getBoolean(KEY_ACTIVE_SCAN_FULL, false);
        String galleryId = getSharedPreferences(PREFS, MODE_PRIVATE).getString(KEY_ACTIVE_SCAN_GALLERY, "");
        String snapshot = getSharedPreferences(PREFS, MODE_PRIVATE).getString(KEY_ACTIVE_SCAN_SNAPSHOT, "{}");
        clearActiveScanTask();
        scanningLibrary = false;
        clearAlbumPageCache();
        new CompleteScanTask(full, galleryId, snapshot, status).execute();
    }

    private void handleScanFailed(ScanStatus status) {
        clearActiveScanTask();
        scanningLibrary = false;
        showError("刷新图库失败", status == null || status.error == null || status.error.isEmpty() ? "后台扫描失败" : status.error);
        if (SCREEN_ALBUMS.equals(currentScreen)) showAlbums(false);
        if (SCREEN_DATA_MANAGER.equals(currentScreen)) showDataManager();
    }

    private String albumSnapshotJson(List<Album> sourceAlbums) {
        JSONObject object = new JSONObject();
        try {
            for (Album album : sourceAlbums) {
                String key = albumKey(album);
                if (key.isEmpty()) continue;
                JSONObject item = new JSONObject();
                item.put("assetCount", album.assetCount);
                item.put("archiveCount", album.archiveCount);
                item.put("sortTime", album.sortTime == null ? "" : album.sortTime);
                object.put(key, item);
            }
        } catch (Exception ignored) {
        }
        return object.toString();
    }

    private List<String> changedAlbumIdsFromSnapshot(String snapshotJson, List<Album> afterAlbums) {
        List<String> changed = new ArrayList<>();
        try {
            JSONObject before = new JSONObject(snapshotJson == null || snapshotJson.trim().isEmpty() ? "{}" : snapshotJson);
            for (Album album : afterAlbums) {
                String key = albumKey(album);
                if (key.isEmpty()) continue;
                JSONObject item = before.optJSONObject(key);
                if (item == null
                        || item.optInt("assetCount", -1) != album.assetCount
                        || item.optInt("archiveCount", -1) != album.archiveCount
                        || !item.optString("sortTime", "").equals(album.sortTime == null ? "" : album.sortTime)) {
                    changed.add(key);
                }
            }
        } catch (Exception ignored) {
        }
        return changed;
    }

    private void showHomeMenu(View anchor) {
        PopupMenu popup = new PopupMenu(this, anchor);
        MenuItem incremental = popup.getMenu().add(0, 1, 0, scanningLibrary ? "扫描中..." : "增量刷新");
        incremental.setEnabled(!scanningLibrary);
        MenuItem full = popup.getMenu().add(0, 2, 1, scanningLibrary ? "扫描中..." : "全量刷新");
        full.setEnabled(!scanningLibrary);
        popup.getMenu().add(0, 4, 2, "\u672c\u6b21\u65b0\u589e/\u66f4\u65b0");
        popup.getMenu().add(0, 3, 3, "\u6211\u7684/\u8bbe\u7f6e");
        popup.setOnMenuItemClickListener(item -> {
            int id = item.getItemId();
            if (id == 1) {
                refreshLibrary(false);
                return true;
            }
            if (id == 2) {
                refreshLibrary(true);
                return true;
            }
            if (id == 4) {
                activeTag = TAG_ALL;
                activeSort = SORT_NEW;
                showAlbums(true);
                return true;
            }
            showSettings();
            return true;
        });
        popup.show();
    }

    private void showTagSelector() {
        int checked = 0;
        for (int i = 0; i < TAGS.length; i++) {
            if (TAGS[i].equals(activeTag)) {
                checked = i;
                break;
            }
        }
        new AlertDialog.Builder(this)
                .setTitle("选择标签分类")
                .setSingleChoiceItems(TAGS, checked, (dialog, which) -> {
                    String next = TAGS[which];
                    if (!next.equals(activeTag)) {
                        activeTag = next;
                        showAlbums(true);
                    }
                    dialog.dismiss();
                })
                .show();
    }

    private void showAlbumSortSelector() {
        String[] labels = {"更新时间", "相册名"};
        String[] values = {ALBUM_SORT_UPDATED, ALBUM_SORT_NAME};
        int checked = ALBUM_SORT_NAME.equals(activeAlbumSort) ? 1 : 0;
        new AlertDialog.Builder(this)
                .setTitle("选择排序")
                .setSingleChoiceItems(labels, checked, (dialog, which) -> {
                    String next = values[which];
                    if (!next.equals(activeAlbumSort)) {
                        activeAlbumSort = next;
                        showAlbums(true);
                    }
                    dialog.dismiss();
                })
                .show();
    }

    private String joinKeywords(String search, String tag) {
        if (search == null || search.trim().isEmpty()) return tag;
        return search.trim() + " " + tag;
    }

    private String albumSortBy() {
        return ALBUM_SORT_NAME.equals(activeAlbumSort) ? ALBUM_SORT_NAME : ALBUM_SORT_UPDATED;
    }

    private String albumSortOrder() {
        return ALBUM_SORT_NAME.equals(activeAlbumSort) ? "asc" : "desc";
    }

    private String albumSortLabel() {
        return ALBUM_SORT_NAME.equals(activeAlbumSort) ? "相册名" : "更新时间";
    }

    private void runSearch(String keyword) {
        searchKeyword = keyword == null ? "" : keyword.trim();
        if (!searchKeyword.isEmpty()) addSearchHistory(searchKeyword);
        showAlbums(true);
    }

    private void sortAlbums() {
        if (albums.size() < 2) return;
        Collections.sort(albums, (left, right) -> {
            if (FAVORITES_ALBUM_ID.equals(albumKey(left))) return -1;
            if (FAVORITES_ALBUM_ID.equals(albumKey(right))) return 1;
            if (ALBUM_SORT_NAME.equals(activeAlbumSort)) {
                int byName = safeText(left.name).compareToIgnoreCase(safeText(right.name));
                if (byName != 0) return byName;
                return albumKey(left).compareTo(albumKey(right));
            }
            int byTime = compareDesc(left.sortTime, right.sortTime);
            if (byTime != 0) return byTime;
            return safeText(left.name).compareToIgnoreCase(safeText(right.name));
        });
    }

    private String safeText(String value) {
        return value == null ? "" : value.trim();
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
        clearAlbumPageCache();
    }

    private void clearAlbumPageCache() {
        albumPageCache.clear();
    }

    private String albumPageCacheKey(int page, String keyword, String sortBy, String sortOrder, String galleryId) {
        return (baseUrl == null ? "" : baseUrl)
                + "|" + (username == null ? "" : username)
                + "|" + page
                + "|" + ALBUM_PAGE_SIZE
                + "|" + (keyword == null ? "" : keyword.trim())
                + "|" + (sortBy == null ? "" : sortBy.trim())
                + "|" + (sortOrder == null ? "" : sortOrder.trim())
                + "|" + (galleryId == null ? "" : galleryId.trim());
    }

    private PageResult<Album> getCachedAlbumPage(int page, String keyword, String sortBy, String sortOrder, String galleryId) {
        return albumPageCache.get(albumPageCacheKey(page, keyword, sortBy, sortOrder, galleryId));
    }

    private void putCachedAlbumPage(int page, String keyword, String sortBy, String sortOrder, String galleryId, PageResult<Album> result) {
        if (result == null) return;
        albumPageCache.put(albumPageCacheKey(page, keyword, sortBy, sortOrder, galleryId), result);
        while (albumPageCache.size() > MAX_ALBUM_PAGE_CACHE) {
            String oldest = albumPageCache.keySet().iterator().next();
            albumPageCache.remove(oldest);
        }
    }

    private String currentGalleryTitle() {
        for (GallerySource source : gallerySources) {
            if (source.prefixKey.equals(activeGalleryPrefix)) return source.name;
        }
        if (!gallerySources.isEmpty()) return gallerySources.get(0).name;
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
                item.put("albumId", asset.albumId);
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
        copy.albumId = source.albumId;
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
        if (albumRecyclerView == null || !(albumRecyclerView.getLayoutManager() instanceof GridLayoutManager)) return;
        GridLayoutManager layoutManager = (GridLayoutManager) albumRecyclerView.getLayoutManager();
        albumScrollPosition = Math.max(0, layoutManager.findFirstVisibleItemPosition());
        View first = layoutManager.findViewByPosition(albumScrollPosition);
        albumScrollY = first == null ? 0 : first.getTop() - albumRecyclerView.getPaddingTop();
    }

    private void saveAssetScroll() {
        if (assetRecyclerView == null || !(assetRecyclerView.getLayoutManager() instanceof GridLayoutManager)) return;
        GridLayoutManager layoutManager = (GridLayoutManager) assetRecyclerView.getLayoutManager();
        assetScrollPosition = Math.max(0, layoutManager.findFirstVisibleItemPosition());
        View first = layoutManager.findViewByPosition(assetScrollPosition);
        assetScrollY = first == null ? 0 : first.getTop() - assetRecyclerView.getPaddingTop();
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
        nav.setPadding(dp(10), dp(6), dp(10), navigationBarHeight() + dp(8));
        nav.setBackgroundColor(colorSurface());

        boolean onAlbumHome = SCREEN_ALBUMS.equals(currentScreen) && !isFavoritesTag() && !isNewSort();
        boolean onTimeline = SCREEN_TIMELINE.equals(currentScreen);
        boolean onFavorites = SCREEN_ALBUMS.equals(currentScreen) && isFavoritesTag();
        boolean onProfile = SCREEN_SETTINGS.equals(currentScreen);

        View albumsItem = navItem(ICON_GRID, "相册", onAlbumHome);
        albumsItem.setOnClickListener(v -> {
            activeTag = TAG_ALL;
            activeSort = SORT_NORMAL;
            showAlbums(true);
        });
        nav.addView(albumsItem, new LinearLayout.LayoutParams(0, ViewGroup.LayoutParams.MATCH_PARENT, 1));

        View recentItem = navItem(ICON_CLOCK, "\u65f6\u95f4\u7ebf", onTimeline);
        recentItem.setOnClickListener(v -> showTimeline(false));
        nav.addView(recentItem, new LinearLayout.LayoutParams(0, ViewGroup.LayoutParams.MATCH_PARENT, 1));

        View favoritesItem = navItem(ICON_HEART, "收藏", onFavorites);
        favoritesItem.setOnClickListener(v -> {
            activeTag = TAG_FAVORITES;
            activeSort = SORT_NORMAL;
            showAlbums(true);
        });
        nav.addView(favoritesItem, new LinearLayout.LayoutParams(0, ViewGroup.LayoutParams.MATCH_PARENT, 1));

        View profileItem = navItem(ICON_USER, "我的", onProfile);
        profileItem.setOnClickListener(v -> showSettings());
        nav.addView(profileItem, new LinearLayout.LayoutParams(0, ViewGroup.LayoutParams.MATCH_PARENT, 1));
        return nav;
    }

    private View navItem(String icon, String label, boolean active) {
        LinearLayout item = new LinearLayout(this);
        item.setOrientation(LinearLayout.VERTICAL);
        item.setGravity(Gravity.CENTER);
        item.setFocusable(true);
        item.setClickable(true);
        item.setBackgroundColor(Color.TRANSPARENT);
        if (active) {
            item.setBackground(roundedBackground(colorSurfaceTint(), 0, 16));
        }
        item.setPadding(dp(4), dp(5), dp(4), dp(4));

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

    private String appVersion() {
        try {
            return getPackageManager().getPackageInfo(getPackageName(), 0).versionName;
        } catch (Exception ignored) {
            return "unknown";
        }
    }

    private String normalizeUrl(String input) {
        String value = input == null ? "" : input.trim();
        if (value.isEmpty()) return "";
        if (value.endsWith("/")) value = value.substring(0, value.length() - 1);
        if (!value.startsWith("http://") && !value.startsWith("https://")) value = "http://" + value;
        return value;
    }

    private boolean isServerAbsolutePath(String path) {
        String value = path == null ? "" : path.trim().replace('\\', '/');
        return value.startsWith("/") || value.matches("^[A-Za-z]:/.*");
    }

    private void handleBackNavigation() {
        if (SCREEN_VIEWER.equals(currentScreen) || viewerOpen) {
            if (currentAlbum != null && TIMELINE_ALBUM_ID.equals(currentAlbum.id)) showTimeline(false);
            else showAssets();
            return;
        }
        if (SCREEN_TIMELINE.equals(currentScreen)) {
            showAlbums(false);
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
        if (SCREEN_DATA_MANAGER.equals(currentScreen)) {
            showSettings();
            return;
        }
        if (SCREEN_DOWNLOADS.equals(currentScreen)) {
            showSettings();
            return;
        }
        if (SCREEN_PUBLIC_SHARES.equals(currentScreen)) {
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
        moveTaskToBack(true);
    }

    private interface ConnectionCallback {
        void done(String version, String error);
    }

    private interface ImageLoadCallback {
        void done(boolean ok);
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

    private interface GalleryRootCallback {
        void done(GallerySource source);
    }

    private interface DoneCallback {
        void done();
    }

    private class CheckUpdateTask extends UiTask<Void, Void, String> {
        private String error;

        @Override
        protected String doInBackground(Void... voids) {
            HttpURLConnection connection = null;
            try {
                connection = (HttpURLConnection) new URL(
                        "https://api.github.com/repos/bigfeng09/MomentPic/releases/latest").openConnection();
                connection.setConnectTimeout(12000);
                connection.setReadTimeout(12000);
                connection.setRequestProperty("Accept", "application/vnd.github+json");
                connection.setRequestProperty("User-Agent", "MomentPic-Android");
                BufferedReader reader = new BufferedReader(new InputStreamReader(connection.getInputStream(), "UTF-8"));
                StringBuilder body = new StringBuilder();
                String line;
                while ((line = reader.readLine()) != null) body.append(line);
                reader.close();
                JSONObject json = new JSONObject(body.toString());
                return json.optString("tag_name", "latest") + "|" + json.optString(
                        "html_url", "https://github.com/bigfeng09/MomentPic/releases");
            } catch (Exception exception) {
                error = exception.getMessage();
                return null;
            } finally {
                if (connection != null) connection.disconnect();
            }
        }

        @Override
        protected void onPostExecute(String result) {
            if (result == null) {
                showError("\u68c0\u67e5\u66f4\u65b0\u5931\u8d25", friendlyRequestMessage(error));
                return;
            }
            String[] values = result.split("\\|", 2);
            String latest = values[0];
            String url = values.length > 1 ? values[1] : "https://github.com/bigfeng09/MomentPic/releases";
            new AlertDialog.Builder(MainActivity.this)
                    .setTitle("\u7248\u672c\u66f4\u65b0")
                    .setMessage("\u5f53\u524d\uff1a" + appVersion() + "\n\u6700\u65b0\uff1a" + latest)
                    .setPositiveButton("\u6253\u5f00 GitHub", (dialog, which) ->
                            startActivity(new Intent(Intent.ACTION_VIEW, Uri.parse(url))))
                    .setNegativeButton("\u5173\u95ed", null)
                    .show();
        }
    }

    private class LoadSystemStatusTask extends UiTask<Void, Void, SystemStatus> {
        private String error;
        @Override protected SystemStatus doInBackground(Void... voids) {
            try { return api.getSystemStatus(); }
            catch (Exception exception) { error = exception.getMessage(); return null; }
        }
        @Override protected void onPostExecute(SystemStatus result) {
            loadingSystemStatus = false;
            systemStatus = result;
            systemStatusError = result == null ? (error == null ? "request failed" : error) : "";
            if (SCREEN_DATA_MANAGER.equals(currentScreen)) showDataManager();
        }
    }

    private class PruneServerCacheTask extends UiTask<Void, Void, Boolean> {
        private String error;
        @Override protected Boolean doInBackground(Void... voids) {
            try { api.pruneServerCache(); return true; }
            catch (Exception exception) { error = exception.getMessage(); return false; }
        }
        @Override protected void onPostExecute(Boolean ok) {
            toast(ok ? "\u540e\u7aef\u7f29\u7565\u56fe\u7f13\u5b58\u5df2\u6e05\u7406" : "\u6e05\u7406\u5931\u8d25\uff1a" + friendlyRequestMessage(error));
            systemStatus = null;
            systemStatusError = "";
            if (SCREEN_DATA_MANAGER.equals(currentScreen)) showDataManager();
        }
    }

    private class LoadPublicSharesTask extends UiTask<Void, Void, List<PublicShare>> {
        @Override protected List<PublicShare> doInBackground(Void... voids) {
            try { return api.getPublicShares(); } catch (Exception ignored) { return null; }
        }
        @Override protected void onPostExecute(List<PublicShare> result) {
            loadingPublicShares = false;
            publicShares.clear();
            if (result != null) publicShares.addAll(result);
            if (SCREEN_PUBLIC_SHARES.equals(currentScreen)) showPublicShares(false);
        }
    }

    private class DeletePublicShareTask extends UiTask<Void, Void, Boolean> {
        private final String token;
        DeletePublicShareTask(String token) { this.token = token; }
        @Override protected Boolean doInBackground(Void... voids) {
            try { api.deletePublicShare(token); return true; } catch (Exception ignored) { return false; }
        }
        @Override protected void onPostExecute(Boolean ok) {
            toast(ok ? "\u5206\u4eab\u5df2\u64a4\u9500" : "\u64a4\u9500\u5931\u8d25");
            showPublicShares(true);
        }
    }

    private class LoadUsersTask extends UiTask<Void, Void, List<UserAccount>> {
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
            File baseDir = getExternalFilesDir(Environment.DIRECTORY_PICTURES);
            if (baseDir == null) baseDir = getFilesDir();
            File dir = new File(baseDir, "Moment Pic" + (albumName == null || albumName.trim().isEmpty() ? "" : "/" + safeFileName(albumName)));
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

    private void enqueueAlbumDownload(Album album) {
        if (album == null || album.id == null || album.id.trim().isEmpty()) return;
        downloadJobs.add(0, DownloadJob.album(album));
        saveDownloadJobs();
        toast("\u5df2\u52a0\u5165\u4e0b\u8f7d\u961f\u5217");
        runNextDownload();
    }

    private void enqueueAssetDownload(Asset asset) {
        if (asset == null || asset.id == null || asset.id.trim().isEmpty()) return;
        downloadJobs.add(0, DownloadJob.asset(asset));
        saveDownloadJobs();
        toast("\u5df2\u52a0\u5165\u4e0b\u8f7d\u961f\u5217");
        runNextDownload();
    }

    private void loadDownloadJobs() {
        downloadJobs.clear();
        String raw = getSharedPreferences(PREFS, MODE_PRIVATE).getString(KEY_DOWNLOAD_JOBS, "[]");
        try {
            JSONArray array = new JSONArray(raw == null ? "[]" : raw);
            for (int i = 0; i < array.length(); i++) {
                DownloadJob job = DownloadJob.from(array.optJSONObject(i));
                if (job != null) {
                    if ("running".equals(job.status)) job.status = "queued";
                    downloadJobs.add(job);
                }
            }
        } catch (Exception ignored) {
        }
    }

    private void saveDownloadJobs() {
        JSONArray array = new JSONArray();
        for (DownloadJob job : downloadJobs) array.put(job.toJson());
        getSharedPreferences(PREFS, MODE_PRIVATE).edit().putString(KEY_DOWNLOAD_JOBS, array.toString()).apply();
    }

    private boolean isWifiConnected() {
        ConnectivityManager manager = (ConnectivityManager) getSystemService(Context.CONNECTIVITY_SERVICE);
        if (manager == null) return false;
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            NetworkCapabilities capabilities = manager.getNetworkCapabilities(manager.getActiveNetwork());
            return capabilities != null && capabilities.hasTransport(NetworkCapabilities.TRANSPORT_WIFI);
        }
        android.net.NetworkInfo info = manager.getActiveNetworkInfo();
        return info != null && info.isConnected() && info.getType() == ConnectivityManager.TYPE_WIFI;
    }

    private void runNextDownload() {
        if (downloadQueueRunning || api == null || api.cookieHeader == null || api.cookieHeader.isEmpty()) return;
        boolean wifiOnly = getSharedPreferences(PREFS, MODE_PRIVATE).getBoolean(KEY_WIFI_ONLY, false);
        if (wifiOnly && !isWifiConnected()) {
            for (DownloadJob job : downloadJobs) if ("queued".equals(job.status)) job.status = "waiting_wifi";
            saveDownloadJobs();
            return;
        }
        DownloadJob next = null;
        for (DownloadJob job : downloadJobs) {
            if ("waiting_wifi".equals(job.status) && (!wifiOnly || isWifiConnected())) job.status = "queued";
            if ("queued".equals(job.status)) { next = job; break; }
        }
        if (next == null) return;
        downloadQueueRunning = true;
        new DownloadQueueTask(next).execute();
    }

    private void createDownloadNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            NotificationManager manager = (NotificationManager) getSystemService(Context.NOTIFICATION_SERVICE);
            if (manager != null) manager.createNotificationChannel(new NotificationChannel(
                    "momentpic_downloads", "Moment Pic Downloads", NotificationManager.IMPORTANCE_LOW));
        }
        if (Build.VERSION.SDK_INT >= 33
                && checkSelfPermission("android.permission.POST_NOTIFICATIONS") != android.content.pm.PackageManager.PERMISSION_GRANTED) {
            requestPermissions(new String[]{"android.permission.POST_NOTIFICATIONS"}, 3212);
        }
    }

    private void notifyDownload(DownloadJob job) {
        NotificationManager manager = (NotificationManager) getSystemService(Context.NOTIFICATION_SERVICE);
        if (manager == null) return;
        Notification.Builder builder = Build.VERSION.SDK_INT >= Build.VERSION_CODES.O
                ? new Notification.Builder(this, "momentpic_downloads") : new Notification.Builder(this);
        builder.setSmallIcon(android.R.drawable.stat_sys_download_done)
                .setContentTitle("completed".equals(job.status) ? "Download completed" : "Download failed")
                .setContentText(job.title + "  " + job.progress + "/" + Math.max(job.total, job.progress))
                .setAutoCancel(true);
        manager.notify(Math.abs(job.id.hashCode()), builder.build());
    }

    private void showDownloads() {
        currentScreen = SCREEN_DOWNLOADS;
        viewerOpen = false;
        root.removeAllViews();
        LinearLayout page = basePage();
        page.addView(topBar("\u4e0b\u8f7d\u4e0e\u79bb\u7ebf", this::showSettings, null));
        ScrollView scroll = new ScrollView(this);
        LinearLayout content = new LinearLayout(this);
        content.setOrientation(LinearLayout.VERTICAL);
        content.setPadding(dp(18), dp(8), dp(18), navigationBarHeight() + dp(24));
        scroll.addView(content);

        LinearLayout wifiRow = new LinearLayout(this);
        wifiRow.setGravity(Gravity.CENTER_VERTICAL);
        wifiRow.addView(text("\u4ec5 Wi-Fi \u4e0b\u8f7d", 15, colorText(), true), new LinearLayout.LayoutParams(0, dp(48), 1));
        Switch wifi = new Switch(this);
        wifi.setChecked(getSharedPreferences(PREFS, MODE_PRIVATE).getBoolean(KEY_WIFI_ONLY, false));
        wifi.setOnCheckedChangeListener((buttonView, checked) -> {
            getSharedPreferences(PREFS, MODE_PRIVATE).edit().putBoolean(KEY_WIFI_ONLY, checked).apply();
            if (!checked || isWifiConnected()) runNextDownload();
        });
        wifiRow.addView(wifi, new LinearLayout.LayoutParams(ViewGroup.LayoutParams.WRAP_CONTENT, dp(48)));
        content.addView(wifiRow, matchWrap());

        if (downloadJobs.isEmpty()) content.addView(emptyState(
                "\u6682\u65e0\u4e0b\u8f7d\u4efb\u52a1",
                "\u5728\u76f8\u518c\u83dc\u5355\u6216\u770b\u56fe\u9875\u52a0\u5165\u4e0b\u8f7d\u3002"), matchWrapWithTop(16));
        for (DownloadJob job : downloadJobs) content.addView(downloadJobRow(job), matchWrapWithTop(10));

        Button clear = secondaryButton("\u6e05\u7406\u5df2\u5b8c\u6210\u8bb0\u5f55");
        clear.setOnClickListener(v -> {
            for (int index = downloadJobs.size() - 1; index >= 0; index--) {
                DownloadJob job = downloadJobs.get(index);
                if ("completed".equals(job.status) || "cancelled".equals(job.status)) {
                    downloadJobs.remove(index);
                }
            }
            saveDownloadJobs();
            showDownloads();
        });
        LinearLayout.LayoutParams clearParams = matchWrapWithTop(18);
        clearParams.height = dp(46);
        content.addView(clear, clearParams);
        page.addView(scroll, new LinearLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, 0, 1));
        root.addView(page, fullScreen());
        runNextDownload();
    }

    private void showPublicShares(boolean reload) {
        currentScreen = SCREEN_PUBLIC_SHARES;
        viewerOpen = false;
        if (reload && !loadingPublicShares) {
            publicShares.clear();
            loadingPublicShares = true;
            new LoadPublicSharesTask().execute();
        }
        root.removeAllViews();
        LinearLayout page = basePage();
        page.addView(topBar("\u516c\u5f00\u5206\u4eab", this::showSettings, null));
        ScrollView scroll = new ScrollView(this);
        LinearLayout content = new LinearLayout(this);
        content.setOrientation(LinearLayout.VERTICAL);
        content.setPadding(dp(18), dp(8), dp(18), navigationBarHeight() + dp(24));
        scroll.addView(content);
        if (loadingPublicShares) content.addView(loadingMoreView("\u6b63\u5728\u52a0\u8f7d\u5206\u4eab\u94fe\u63a5"), matchWrap());
        else if (publicShares.isEmpty()) content.addView(emptyState(
                "\u6682\u65e0\u516c\u5f00\u5206\u4eab",
                "\u5728\u76f8\u518c\u6216\u56fe\u7247\u83dc\u5355\u4e2d\u521b\u5efa\u94fe\u63a5\u3002"), matchWrap());
        else for (PublicShare share : publicShares) content.addView(publicShareRow(share), matchWrapWithTop(10));
        page.addView(scroll, new LinearLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, 0, 1));
        root.addView(page, fullScreen());
    }

    private View publicShareRow(PublicShare share) {
        LinearLayout row = new LinearLayout(this);
        row.setOrientation(LinearLayout.VERTICAL);
        row.setPadding(dp(14), dp(12), dp(14), dp(12));
        row.setBackground(roundedBackground(colorSurface(), colorStroke(), 14));
        row.addView(text(share.type + "  " + share.targetId, 14, colorText(), true), matchWrap());
        String policy = (share.expiresAt.isEmpty() ? "\u6c38\u4e45" : share.expiresAt)
                + "  \u00b7  " + (share.passwordProtected ? "\u6709\u5bc6\u7801" : "\u65e0\u5bc6\u7801")
                + "  \u00b7  " + (share.allowOriginal ? "\u5141\u8bb8\u539f\u56fe" : "\u4ec5\u9884\u89c8");
        row.addView(text(policy, 12, colorMuted(), false), matchWrapWithTop(6));
        LinearLayout actions = new LinearLayout(this);
        Button copy = secondaryButton("\u590d\u5236\u94fe\u63a5");
        copy.setOnClickListener(v -> copyText("Moment Pic", api.absolute(share.url)));
        actions.addView(copy, new LinearLayout.LayoutParams(0, dp(40), 1));
        Button delete = secondaryButton("\u64a4\u9500");
        delete.setTextColor(colorFavorite());
        delete.setOnClickListener(v -> new DeletePublicShareTask(share.token).execute());
        LinearLayout.LayoutParams deleteParams = new LinearLayout.LayoutParams(0, dp(40), 1);
        deleteParams.setMargins(dp(8), 0, 0, 0);
        actions.addView(delete, deleteParams);
        row.addView(actions, matchWrapWithTop(10));
        return row;
    }

    private View downloadJobRow(DownloadJob job) {
        LinearLayout row = new LinearLayout(this);
        row.setOrientation(LinearLayout.VERTICAL);
        row.setPadding(dp(14), dp(12), dp(14), dp(12));
        row.setBackground(roundedBackground(colorSurface(), colorStroke(), 14));
        row.addView(text(job.title, 15, colorText(), true), matchWrap());
        String status = job.status + "  " + job.progress + "/" + Math.max(job.total, job.progress);
        if (job.error != null && !job.error.isEmpty()) status += "  " + job.error;
        row.addView(text(status, 12, colorMuted(), false), matchWrapWithTop(6));
        Button action = secondaryButton("running".equals(job.status) ? "\u6682\u505c"
                : ("queued".equals(job.status) ? "\u53d6\u6d88"
                : (("completed".equals(job.status) || "cancelled".equals(job.status)) ? "\u5220\u9664" : "\u7ee7\u7eed")));
        action.setOnClickListener(v -> {
            if ("running".equals(job.status)) { job.cancelRequested = true; job.status = "paused"; }
            else if ("queued".equals(job.status)) job.status = "cancelled";
            else if ("completed".equals(job.status) || "cancelled".equals(job.status)) downloadJobs.remove(job);
            else { job.cancelRequested = false; job.error = ""; job.status = "queued"; }
            saveDownloadJobs();
            showDownloads();
        });
        LinearLayout.LayoutParams actionParams = matchWrapWithTop(10);
        actionParams.height = dp(40);
        row.addView(action, actionParams);
        return row;
    }

    private class DownloadQueueTask extends UiTask<Void, Void, Boolean> {
        private final DownloadJob job;

        DownloadQueueTask(DownloadJob job) {
            this.job = job;
        }

        @Override
        protected void onPreExecute() {
            job.status = "running";
            job.error = "";
            saveDownloadJobs();
        }

        @Override
        protected Boolean doInBackground(Void... voids) {
            try {
                if ("asset".equals(job.type)) {
                    Asset asset = api.getAsset(job.targetId);
                    job.total = 1;
                    if (!job.cancelRequested) {
                        saveAssetToLocal(asset, job.albumName);
                        job.progress = 1;
                    }
                } else {
                    int page = 1;
                    int seen = 0;
                    while (true) {
                        if (job.cancelRequested) break;
                        if (getSharedPreferences(PREFS, MODE_PRIVATE).getBoolean(KEY_WIFI_ONLY, false) && !isWifiConnected()) {
                            job.status = "waiting_wifi";
                            break;
                        }
                        PageResult<Asset> result = api.getAssets(job.targetId, page, 120);
                        for (Asset asset : result.items) {
                            if (job.cancelRequested) break;
                            seen++;
                            if (seen <= job.progress) continue;
                            saveAssetToLocal(asset, job.title);
                            job.progress++;
                            saveDownloadJobs();
                        }
                        if (!result.hasMore || job.cancelRequested) break;
                        page++;
                    }
                    if (!job.cancelRequested && !"waiting_wifi".equals(job.status)) job.total = job.progress;
                }
                if (job.cancelRequested) {
                    if (!"paused".equals(job.status)) job.status = "cancelled";
                    return false;
                }
                if ("waiting_wifi".equals(job.status)) return false;
                job.status = "completed";
                return true;
            } catch (Exception error) {
                job.status = "failed";
                job.error = error.getMessage() == null ? "download failed" : error.getMessage();
                return false;
            }
        }

        @Override
        protected void onPostExecute(Boolean ok) {
            downloadQueueRunning = false;
            saveDownloadJobs();
            if ("completed".equals(job.status) || "failed".equals(job.status)) notifyDownload(job);
            if (SCREEN_DOWNLOADS.equals(currentScreen)) showDownloads();
            runNextDownload();
        }
    }

    private class DownloadAlbumTask extends UiTask<Void, Void, Integer> {
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
                    if (!result.hasMore) break;
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

    private class DownloadAssetTask extends UiTask<Void, Void, Boolean> {
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

    private class CreatePublicShareTask extends UiTask<Void, Void, String> {
        private final String type;
        private final String targetId;
        private final int expiresInHours;
        private final String password;
        private final boolean allowOriginal;
        CreatePublicShareTask(String type, String targetId, int expiresInHours, String password, boolean allowOriginal) {
            this.type = type;
            this.targetId = targetId;
            this.expiresInHours = expiresInHours;
            this.password = password;
            this.allowOriginal = allowOriginal;
        }
        @Override protected String doInBackground(Void... voids) {
            try { return api.createPublicShare(type, targetId, expiresInHours, password, allowOriginal); } catch (Exception ignored) { return null; }
        }
        @Override protected void onPostExecute(String url) {
            if (url == null || url.isEmpty()) toast("生成分享链接失败");
            else shareText("Moment Pic 分享链接", url);
        }
    }

    private class LoadSharedAlbumsDetailTask extends UiTask<Void, Void, List<Album>> {
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

    private class RemoveSingleShareTask extends UiTask<Void, Void, Boolean> {
        private final String targetUser;
        private final String albumId;
        private final BoolCallback callback;
        RemoveSingleShareTask(String targetUser, String albumId, BoolCallback callback) { this.targetUser = targetUser; this.albumId = albumId; this.callback = callback; }
        @Override protected Boolean doInBackground(Void... voids) { try { api.setAlbumShareForUser(targetUser, albumId, false); return true; } catch (Exception ignored) { return false; } }
        @Override protected void onPostExecute(Boolean ok) { callback.done(ok); }
    }

    private class LoadAlbumSharesTask extends UiTask<Void, Void, Map<String, Set<String>>> {
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
                    if (!isNormalUser(account)) continue;
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

    private class LoadNormalUsersForAssetShareTask extends UiTask<Void, Void, List<UserAccount>> {
        private final Album album;
        private String error;

        LoadNormalUsersForAssetShareTask(Album album) {
            this.album = album;
        }

        @Override
        protected List<UserAccount> doInBackground(Void... voids) {
            try {
                List<UserAccount> loaded = api.getUsers();
                userAccounts.clear();
                userAccounts.addAll(loaded);
                List<UserAccount> normalUsers = new ArrayList<>();
                for (UserAccount account : loaded) {
                    if (isNormalUser(account)) normalUsers.add(account);
                }
                return normalUsers;
            } catch (Exception e) {
                error = e.getMessage();
                return null;
            }
        }

        @Override
        protected void onPostExecute(List<UserAccount> normalUsers) {
            if (normalUsers == null) {
                showError("普通账户加载失败", error == null || error.trim().isEmpty() ? "请确认当前账号是管理员，且后端 /api/v2/users 可访问。" : error);
                return;
            }
            if (normalUsers.isEmpty()) {
                showError("没有普通账户", "当前没有可授权的普通账户。请先在设置里创建 role=user 的普通账户。");
                return;
            }
            String[] items = new String[normalUsers.size()];
            for (int i = 0; i < normalUsers.size(); i++) items[i] = normalUsers.get(i).username;
            new AlertDialog.Builder(MainActivity.this)
                    .setTitle("把相册授权给")
                    .setItems(items, (dialog, which) -> new ShareAlbumTask(items[which], album, ok -> {
                        if (ok) showError("分享成功", "已把当前图片所在相册授权给普通账户：" + items[which]);
                        else showError("分享失败", "未能把相册授权给普通账户，请稍后重试。");
                    }).execute())
                    .setNegativeButton("取消", null)
                    .show();
        }
    }

    private class SaveAlbumSharesTask extends UiTask<Void, Void, Boolean> {
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

    private class DeleteUserTask extends UiTask<Void, Void, Boolean> {
        private final String targetUser;
        private final BoolCallback callback;
        DeleteUserTask(String targetUser, BoolCallback callback) { this.targetUser = targetUser; this.callback = callback; }
        @Override protected Boolean doInBackground(Void... voids) { try { api.deleteUser(targetUser); return true; } catch (Exception ignored) { return false; } }
        @Override protected void onPostExecute(Boolean ok) { callback.done(ok); }
    }

    private class ShareAlbumTask extends UiTask<Void, Void, Boolean> {
        private final String targetUser;
        private final Album album;
        private final BoolCallback callback;
        ShareAlbumTask(String targetUser, Album album, BoolCallback callback) { this.targetUser = targetUser; this.album = album; this.callback = callback; }
        @Override protected Boolean doInBackground(Void... voids) { try { api.shareAlbumToUser(targetUser, album); return true; } catch (Exception ignored) { return false; } }
        @Override protected void onPostExecute(Boolean ok) { callback.done(ok); }
    }

    private class UpdateUserTask extends UiTask<Void, Void, Boolean> {
        private final String oldUser;
        private final String nextUser;
        private final String nextPass;
        private final BoolCallback callback;
        UpdateUserTask(String oldUser, String nextUser, String nextPass, BoolCallback callback) { this.oldUser = oldUser; this.nextUser = nextUser; this.nextPass = nextPass; this.callback = callback; }
        @Override protected Boolean doInBackground(Void... voids) { try { api.updateUser(oldUser, nextUser, nextPass); return true; } catch (Exception ignored) { return false; } }
        @Override protected void onPostExecute(Boolean ok) { callback.done(ok); }
    }

    private class SaveUserTask extends UiTask<Void, Void, Boolean> {
        private final String targetUser;
        private final String targetPass;
        private final BoolCallback callback;
        SaveUserTask(String targetUser, String targetPass, BoolCallback callback) { this.targetUser = targetUser; this.targetPass = targetPass; this.callback = callback; }
        @Override protected Boolean doInBackground(Void... voids) { try { api.saveUser(targetUser, targetPass); return true; } catch (Exception ignored) { return false; } }
        @Override protected void onPostExecute(Boolean ok) { callback.done(ok); }
    }

    private class SaveSharedAlbumsTask extends UiTask<Void, Void, Boolean> {
        private final String targetUser;
        private final String rawIds;
        private final BoolCallback callback;
        SaveSharedAlbumsTask(String targetUser, String rawIds, BoolCallback callback) { this.targetUser = targetUser; this.rawIds = rawIds; this.callback = callback; }
        @Override protected Boolean doInBackground(Void... voids) { try { api.saveSharedAlbums(targetUser, rawIds); return true; } catch (Exception ignored) { return false; } }
        @Override protected void onPostExecute(Boolean ok) { callback.done(ok); }
    }

    private class PullFavoriteAlbumsTask extends UiTask<Void, Void, List<Album>> {
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

    private class PushFavoriteAlbumsTask extends UiTask<Void, Void, Boolean> {
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

    private class AddGalleryRootTask extends UiTask<Void, Void, GallerySource> {
        private final String name;
        private final String path;
        private final GalleryRootCallback callback;
        private String error;

        AddGalleryRootTask(String name, String path, GalleryRootCallback callback) {
            this.name = name;
            this.path = path;
            this.callback = callback;
        }

        @Override
        protected GallerySource doInBackground(Void... voids) {
            try {
                return api.addGalleryRoot(name, path);
            } catch (Exception e) {
                error = e.getMessage();
                return null;
            }
        }

        @Override
        protected void onPostExecute(GallerySource source) {
            if (source == null) showError("添加相册库目录失败", error);
            callback.done(source);
        }
    }

    private class GallerySourcesTask extends UiTask<Void, Void, List<GallerySource>> {
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
                if (SCREEN_SETTINGS.equals(currentScreen)) showSettings();
                if (SCREEN_DATA_MANAGER.equals(currentScreen)) showDataManager();
                return;
            }
            String before = activeGalleryPrefix;
            applyGallerySources(result);
            if (SCREEN_ALBUMS.equals(currentScreen)) {
                showAlbums(!before.equals(activeGalleryPrefix));
            } else if (SCREEN_SETTINGS.equals(currentScreen)) {
                showSettings();
            } else if (SCREEN_DATA_MANAGER.equals(currentScreen)) {
                showDataManager();
            }
        }
    }

    private class ToggleGallerySourceTask extends UiTask<Void, Void, GallerySource> {
        private final GallerySource source;
        private String error;

        ToggleGallerySourceTask(GallerySource source) {
            this.source = source;
        }

        @Override
        protected GallerySource doInBackground(Void... voids) {
            try {
                return api.setGalleryEnabled(source.prefixKey, !source.enabled);
            } catch (Exception e) {
                error = e.getMessage();
                return null;
            }
        }

        @Override
        protected void onPostExecute(GallerySource result) {
            if (result == null) {
                showError("更新图库来源失败", error);
                return;
            }
            toast(result.enabled ? "来源已启用" : "来源已禁用");
            gallerySourcesLoaded = false;
            clearAlbumPageCache();
            new GallerySourcesTask().execute();
        }
    }

    private class GalleryScanTask extends UiTask<Void, Void, GalleryScanSummary> {
        private final GallerySource source;
        private final boolean dryRun;
        private final boolean full;
        private String snapshot = "{}";
        private String error;

        GalleryScanTask(GallerySource source, boolean dryRun, boolean full) {
            this.source = source;
            this.dryRun = dryRun;
            this.full = full;
        }

        @Override
        protected void onPreExecute() {
            toast("开始" + galleryScanLabel() + "：" + source.name);
        }

        @Override
        protected GalleryScanSummary doInBackground(Void... voids) {
            try {
                if (!dryRun) snapshot = albumSnapshotJson(api.getAllAlbums(source.prefixKey));
                String taskId = api.startGalleryScan(source.prefixKey, dryRun, full);
                if (!dryRun) {
                    saveActiveScanTask(taskId, full, source.prefixKey, snapshot);
                    return null;
                }
                return api.waitForScanSummary(taskId);
            } catch (Exception e) {
                error = e.getMessage();
                return null;
            }
        }

        @Override
        protected void onPostExecute(GalleryScanSummary result) {
            if (result == null) {
                if (!dryRun && error == null) {
                    scanningLibrary = true;
                    toast(galleryScanLabel() + "已提交，后台继续执行");
                    checkActiveScanTask(false);
                    refreshCurrentScreen();
                    return;
                }
                showError(galleryScanLabel() + "失败", error);
                return;
            }
            if (!result.dryRun) {
                resetGalleryState();
                newAlbumIds.clear();
                saveNewAlbumIds();
            }
            showError(galleryScanLabel() + "结果", result.summaryText());
        }

        private String galleryScanLabel() {
            if (dryRun) return "扫描预览";
            return full ? "全量导入" : "增量导入";
        }
    }

    private void testConnectionAsync(MomentApi candidateApi, ConnectionCallback callback) {
        new Thread(() -> {
            String version;
            String error;
            try {
                version = candidateApi.health();
                error = "";
            } catch (Exception e) {
                error = e.getMessage() == null ? "connection failed" : e.getMessage();
                version = "";
            }
            String finalVersion = version;
            String finalError = error;
            runOnUiThread(() -> callback.done(finalVersion, finalError));
        }, "momentpic-connection-test").start();
    }

    private class LoginTask extends UiTask<Void, Void, Boolean> {
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

    private class AlbumsTask extends UiTask<Void, Void, PageResult<Album>> {
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
                return api.getAlbums(page, ALBUM_PAGE_SIZE, keyword, sortBy, sortOrder, sourcePrefix);
            } catch (Exception e) {
                error = e.getMessage();
                return null;
            }
        }

        @Override
        protected void onPostExecute(PageResult<Album> result) {
            if (result == null) albumLoadError = error == null ? "request failed" : error;
            callback.done(result);
        }
    }

    private class NewAlbumsTask extends UiTask<Void, Void, PageResult<Album>> {
        private final String keyword;
        private final String sourcePrefix;
        private final String sortBy;
        private final String sortOrder;
        private final PageCallback<Album> callback;
        private String error;

        NewAlbumsTask(String keyword, String sourcePrefix, String sortBy, String sortOrder, PageCallback<Album> callback) {
            this.keyword = keyword;
            this.sourcePrefix = sourcePrefix;
            this.sortBy = sortBy;
            this.sortOrder = sortOrder;
            this.callback = callback;
        }

        @Override
        protected PageResult<Album> doInBackground(Void... voids) {
            try {
                return api.getNewAlbums(newAlbumIds, keyword, sourcePrefix, sortBy, sortOrder);
            } catch (Exception e) {
                error = e.getMessage();
                return null;
            }
        }

        @Override
        protected void onPostExecute(PageResult<Album> result) {
            if (result == null) albumLoadError = error == null ? "request failed" : error;
            callback.done(result);
        }
    }

    private class TimelineTask extends UiTask<Void, Void, PageResult<Asset>> {
        private final int page;
        private final PageCallback<Asset> callback;
        private String error;

        TimelineTask(int page, PageCallback<Asset> callback) {
            this.page = page;
            this.callback = callback;
        }

        @Override
        protected PageResult<Asset> doInBackground(Void... voids) {
            try {
                return api.searchAssets(
                        page, ASSET_PAGE_SIZE, timelineKeyword,
                        timelineDateBoundary(timelineFrom, false),
                        timelineDateBoundary(timelineTo, true),
                        timelineExtension, timelineOrientation, activeGalleryPrefix);
            } catch (Exception e) {
                error = e.getMessage();
                return null;
            }
        }

        @Override
        protected void onPostExecute(PageResult<Asset> result) {
            if (result == null) timelineLoadError = error == null ? "request failed" : error;
            callback.done(result);
        }
    }

    private class AssetsTask extends UiTask<Void, Void, PageResult<Asset>> {
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
                return api.getAssets(albumId, page, ASSET_PAGE_SIZE);
            } catch (Exception e) {
                error = e.getMessage();
                return null;
            }
        }

        @Override
        protected void onPostExecute(PageResult<Asset> result) {
            if (result == null) assetLoadError = error == null ? "request failed" : error;
            callback.done(result);
        }
    }

    private class StartScanTask extends UiTask<Void, Void, String> {
        private final boolean full;
        private final String galleryId;
        private String snapshot = "{}";
        private String error;

        StartScanTask(boolean full, String galleryId) {
            this.full = full;
            this.galleryId = galleryId == null ? "" : galleryId;
        }

        @Override
        protected String doInBackground(Void... voids) {
            try {
                snapshot = albumSnapshotJson(api.getAllAlbums(galleryId));
                return api.startScan(false, full, galleryId);
            } catch (Exception e) {
                error = e.getMessage();
                return null;
            }
        }

        @Override
        protected void onPostExecute(String taskId) {
            if (taskId == null || taskId.trim().isEmpty()) {
                scanningLibrary = false;
                showError("刷新图库失败", error == null ? "后端没有返回扫描任务" : error);
                showAlbums(false);
                return;
            }
            saveActiveScanTask(taskId, full, galleryId, snapshot);
            checkActiveScanTask(true);
            showAlbums(false);
        }
    }

    private class CheckScanTask extends UiTask<Void, Void, ScanStatus> {
        private final String taskId;
        private final boolean forceMessage;
        private String error;

        CheckScanTask(String taskId, boolean forceMessage) {
            this.taskId = taskId;
            this.forceMessage = forceMessage;
        }

        @Override
        protected ScanStatus doInBackground(Void... voids) {
            try {
                return api.getScanStatus(taskId);
            } catch (Exception e) {
                error = e.getMessage();
                return null;
            }
        }

        @Override
        protected void onPostExecute(ScanStatus status) {
            checkingScanStatus = false;
            if (status == null) {
                if (forceMessage) showError("扫描状态获取失败", error);
                return;
            }
            if ("completed".equals(status.status)) {
                handleScanCompleted(status);
            } else if ("failed".equals(status.status)) {
                handleScanFailed(status);
            } else {
                scanningLibrary = true;
                if (forceMessage) toast("后台刷新中，可以离开 App，稍后回来会自动更新");
                scheduleScanStatusPoll();
            }
        }
    }

    private class CompleteScanTask extends UiTask<Void, Void, ScanResult> {
        private final boolean full;
        private final String galleryId;
        private final String snapshot;
        private final ScanStatus status;
        private String error;

        CompleteScanTask(boolean full, String galleryId, String snapshot, ScanStatus status) {
            this.full = full;
            this.galleryId = galleryId == null ? "" : galleryId;
            this.snapshot = snapshot;
            this.status = status;
        }

        @Override
        protected ScanResult doInBackground(Void... voids) {
            try {
                List<Album> afterAlbums = api.getAllAlbums(galleryId);
                ScanResult result = new ScanResult();
                result.ok = true;
                result.newAlbumIds = changedAlbumIdsFromSnapshot(snapshot, afterAlbums);
                result.status = status;
                return result;
            } catch (Exception e) {
                error = e.getMessage();
                return null;
            }
        }

        @Override
        protected void onPostExecute(ScanResult result) {
            if (result == null) {
                showError("刷新结果获取失败", error);
                return;
            }
            clearAlbumPageCache();
            newAlbumIds.clear();
            newAlbumIds.addAll(result.newAlbumIds);
            saveNewAlbumIds();
            activeSort = SORT_NEW;
            toast(scanCompleteText(result, full));
            if (SCREEN_ALBUMS.equals(currentScreen)) showAlbums(true);
            if (SCREEN_DATA_MANAGER.equals(currentScreen)) showDataManager();
        }
    }

    private void showV2Unsupported(String feature) {
        toast((feature == null || feature.trim().isEmpty() ? "该功能" : feature.trim()) + " v2 暂未支持");
    }

    private boolean isSessionExpiredError(String error) {
        String value = error == null ? "" : error.toLowerCase(Locale.ROOT);
        return value.contains("http 401")
                || value.contains("unauthorized")
                || value.contains("not authenticated")
                || value.contains("authentication required")
                || value.contains("登录状态已过期");
    }

    private boolean handleSessionExpired(String error) {
        if (!isSessionExpiredError(error) || SCREEN_LOGIN.equals(currentScreen)) return false;
        loading = false;
        albumLoadError = "";
        assetLoadError = "";
        if (api != null) api.cookieHeader = "";
        toast("登录状态已过期，请重新登录");
        showLogin();
        return true;
    }

    private String connectionErrorMessage(String error) {
        String detail = error == null || error.trim().isEmpty() ? "未知错误" : error.trim();
        String value = detail.toLowerCase(Locale.ROOT);
        if (value.contains("timed out") || value.contains("timeout")) {
            return "连接超时：请确认手机与服务器网络互通，端口没有被防火墙阻止。";
        }
        if (value.contains("unable to resolve host")
                || value.contains("unknownhost")
                || value.contains("no address associated")) {
            return "找不到服务器：请检查地址或域名是否填写正确。";
        }
        if (value.contains("connection refused")
                || value.contains("failed to connect")
                || value.contains("econnrefused")) {
            return "服务器拒绝连接：请确认 MomentPic 后端已启动并监听当前端口。";
        }
        if (value.contains("ssl") || value.contains("certificate") || value.contains("trust anchor")) {
            return "HTTPS 证书验证失败：请检查证书有效期、域名和手机信任设置。";
        }
        if (value.contains("json") || value.contains("unexpected end") || value.contains("end of input")) {
            return "服务器响应格式不兼容：请确认填写的是 MomentPic V2 后端地址。";
        }
        return "连接失败：" + detail;
    }

    private String friendlyRequestMessage(String error) {
        if (isSessionExpiredError(error)) return "登录状态已失效，请重新登录。";
        String value = error == null ? "" : error.toLowerCase(Locale.ROOT);
        if (value.contains("timed out") || value.contains("timeout")) {
            return "请求超时，请检查网络后重试。";
        }
        if (value.contains("failed to connect")
                || value.contains("connection refused")
                || value.contains("unable to resolve host")
                || value.contains("unknownhost")) {
            return "无法连接服务器，请确认服务器在线且手机网络可达。";
        }
        return error == null || error.trim().isEmpty() ? "请求失败，请稍后重试。" : error.trim();
    }

    private String loginErrorMessage(String error) {
        String detail = error == null || error.trim().isEmpty() ? "未知错误" : error.trim();
        String value = detail.toLowerCase(Locale.ROOT);
        if (isSessionExpiredError(detail)
                || value.contains("invalid credentials")
                || value.contains("invalid username")
                || value.contains("password")) {
            return "用户名或密码错误。"
                    + "\n\n如果管理员密码来自 .env，请注意：数据库中已有管理员时，修改 .env 不会自动重置旧密码。";
        }
        return connectionErrorMessage(detail)
                + "\n\n当前服务地址：" + (baseUrl == null ? "" : baseUrl);
    }

    private void showError(String title, String message) {
        if (handleSessionExpired(message)) return;
        new AlertDialog.Builder(this)
                .setTitle(title)
                .setMessage(message == null ? "未知错误" : message)
                .setPositiveButton("知道了", null)
                .show();
    }

    private static class MomentApi {
        final String baseUrl;
        String cookieHeader = "";
        String role = "user";

        MomentApi(String baseUrl) {
            this.baseUrl = baseUrl;
        }

        String health() throws Exception {
            JSONObject payload = data(request("GET", "/api/v2/health", null, 10000));
            String version = payload.optString("version", "v2");
            return version == null || version.trim().isEmpty() ? "v2" : version.trim();
        }
        SystemStatus getSystemStatus() throws Exception {
            return SystemStatus.from(data(request("GET", "/api/v2/system/status", null)));
        }

        void pruneServerCache() throws Exception {
            JSONObject body = new JSONObject();
            body.put("dryRun", false);
            body.put("maxFiles", 0);
            data(request("POST", "/api/v2/cache/thumbnails/prune", body.toString(), 60000));
        }

        void login(String username, String password) throws Exception {
            JSONObject body = new JSONObject();
            body.put("username", username);
            body.put("password", password);
            JSONObject json = request("POST", "/api/v2/auth/login", body.toString());
            if (json.optInt("code", -1) != 0) throw new Exception(json.optString("message", "login failed"));
            role = json.optJSONObject("data") == null ? "user" : json.optJSONObject("data").optString("role", "user");
        }

        String createPublicShare(String type, String targetId, int expiresInHours, String password, boolean allowOriginal) throws Exception {
            JSONObject body = new JSONObject();
            body.put("type", type == null || type.trim().isEmpty() ? "album" : type.trim());
            body.put("targetId", targetId);
            if (expiresInHours > 0) body.put("expiresInHours", expiresInHours);
            else body.put("expiresAt", JSONObject.NULL);
            body.put("password", password == null ? "" : password);
            body.put("allowOriginal", allowOriginal);
            JSONObject data = data(request("POST", "/api/v2/public-shares", body.toString()));
            String url = data.optString("url");
            return absolute(url);
        }

        List<PublicShare> getPublicShares() throws Exception {
            JSONObject data = data(request("GET", "/api/v2/public-shares", null));
            JSONArray items = data.optJSONArray("items");
            List<PublicShare> result = new ArrayList<>();
            if (items != null) {
                for (int i = 0; i < items.length(); i++) result.add(PublicShare.from(items.optJSONObject(i)));
            }
            return result;
        }

        void deletePublicShare(String token) throws Exception {
            data(request("DELETE", "/api/v2/public-shares/" + urlEncode(token), null));
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
            String path = "/api/v2/albums?page=" + page + "&pageSize=" + pageSize + "&includeTotal=false";
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
            JSONObject pagination = data.getJSONObject("pagination");
            int total = pagination.optInt("total", -1);
            boolean hasMore = pagination.has("hasMore") ? pagination.optBoolean("hasMore", false) : total >= 0 && page * pageSize < total;
            return new PageResult<>(albums, total, hasMore);
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

        GallerySource addGalleryRoot(String name, String path) throws Exception {
            JSONObject body = new JSONObject();
            if (name != null && !name.trim().isEmpty()) body.put("name", name.trim());
            body.put("path", path == null ? "" : path.trim());
            JSONObject data = data(request("POST", "/api/v2/galleries", body.toString()));
            JSONObject item = data.optJSONObject("item");
            if (item == null) throw new Exception("gallery create response missing item");
            return GallerySource.from(item);
        }

        GallerySource setGalleryEnabled(String galleryId, boolean enabled) throws Exception {
            JSONObject body = new JSONObject();
            body.put("enabled", enabled);
            JSONObject data = data(request("PATCH", "/api/v2/galleries/" + urlEncode(galleryId), body.toString()));
            JSONObject item = data.optJSONObject("item");
            if (item == null) throw new Exception("gallery update response missing item");
            return GallerySource.from(item);
        }

        PageResult<Album> getNewAlbums(List<String> newIds, String keyword, String sourcePrefix, String sortBy, String sortOrder) throws Exception {
            Set<String> idSet = new HashSet<>(newIds);
            List<Album> filtered = new ArrayList<>();
            int page = 1;
            do {
                PageResult<Album> result = getAlbums(page, 200, keyword, sortBy, sortOrder, sourcePrefix);
                for (Album album : result.items) {
                    if (idSet.contains(album.key()) && galleryMatches(album, sourcePrefix)) {
                        ensureAlbumCover(album);
                        filtered.add(album);
                    }
                }
                page++;
                if (!result.hasMore) break;
            } while (true);
            return new PageResult<>(filtered, filtered.size(), false);
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
            return getAllAlbums("");
        }

        List<Album> getAllAlbums(String sourcePrefix) throws Exception {
            List<Album> albums = new ArrayList<>();
            int page = 1;
            do {
                PageResult<Album> result = getAlbums(page, 200, null, "updatedAt", "desc", sourcePrefix);
                albums.addAll(result.items);
                page++;
                if (!result.hasMore) break;
            } while (true);
            return albums;
        }

        PageResult<Asset> searchAssets(
                int page, int pageSize, String keyword, String from, String to,
                String extension, String orientation, String galleryId) throws Exception {
            StringBuilder path = new StringBuilder("/api/v2/assets?page=")
                    .append(page).append("&pageSize=").append(pageSize)
                    .append("&includeTotal=false&sortBy=date&sortOrder=desc");
            if (keyword != null && !keyword.trim().isEmpty()) path.append("&keyword=").append(urlEncode(keyword.trim()));
            if (from != null && !from.trim().isEmpty()) path.append("&from=").append(urlEncode(from.trim()));
            if (to != null && !to.trim().isEmpty()) path.append("&to=").append(urlEncode(to.trim()));
            if (extension != null && !extension.trim().isEmpty()) path.append("&extension=").append(urlEncode(extension.trim()));
            if (orientation != null && !orientation.trim().isEmpty()) path.append("&orientation=").append(urlEncode(orientation.trim()));
            if (galleryId != null && !galleryId.trim().isEmpty()) path.append("&galleryId=").append(urlEncode(galleryId.trim()));
            JSONObject data = data(request("GET", path.toString(), null));
            JSONArray items = data.getJSONArray("items");
            List<Asset> result = new ArrayList<>();
            for (int i = 0; i < items.length(); i++) result.add(Asset.from(items.getJSONObject(i)));
            JSONObject pagination = data.getJSONObject("pagination");
            int total = pagination.optInt("total", -1);
            boolean hasMore = pagination.has("hasMore")
                    ? pagination.optBoolean("hasMore", false)
                    : total >= 0 && page * pageSize < total;
            return new PageResult<>(result, total, hasMore);
        }

        Asset getAsset(String assetId) throws Exception {
            JSONObject payload = data(request("GET", "/api/v2/assets/" + urlEncode(assetId), null));
            return Asset.from(payload);
        }

        PageResult<Asset> getAssets(String albumId, int page, int pageSize) throws Exception {
            JSONObject data = data(request("GET", "/api/v2/albums/" + URLEncoder.encode(albumId, "UTF-8") + "/assets?page=" + page + "&pageSize=" + pageSize + "&includeTotal=false", null));
            JSONArray items = data.getJSONArray("items");
            List<Asset> assets = new ArrayList<>();
            for (int i = 0; i < items.length(); i++) {
                Asset asset = Asset.from(items.getJSONObject(i));
                if (asset.albumId == null || asset.albumId.trim().isEmpty()) asset.albumId = albumId;
                assets.add(asset);
            }
            JSONObject pagination = data.getJSONObject("pagination");
            int total = pagination.optInt("total", -1);
            boolean hasMore = pagination.has("hasMore") ? pagination.optBoolean("hasMore", false) : total >= 0 && page * pageSize < total;
            return new PageResult<>(assets, total, hasMore);
        }

        String startScan(boolean dryRun, boolean full, String galleryId) throws Exception {
            JSONObject body = new JSONObject();
            body.put("dryRun", dryRun);
            body.put("fast", !full);
            if (galleryId != null && !galleryId.trim().isEmpty()) {
                body.put("galleryId", galleryId.trim());
            }
            JSONObject data = data(request("POST", "/api/v2/scan", body.toString(), 60000));
            return data.optString("taskId");
        }

        String startGalleryScan(String galleryId, boolean dryRun, boolean full) throws Exception {
            JSONObject body = new JSONObject();
            body.put("dryRun", dryRun);
            body.put("fast", !full);
            JSONObject data = data(request("POST", "/api/v2/galleries/" + urlEncode(galleryId) + "/scan", body.toString(), 60000));
            return data.optString("taskId");
        }

        GalleryScanSummary waitForScanSummary(String taskId) throws Exception {
            if (taskId == null || taskId.trim().isEmpty()) throw new Exception("scan task missing");
            for (int i = 0; i < 150; i++) {
                Thread.sleep(2000);
                JSONObject data = data(request("GET", "/api/v2/scan/" + urlEncode(taskId), null));
                String status = data.optString("status", "unknown");
                if ("completed".equals(status)) return GalleryScanSummary.from(data);
                if ("failed".equals(status)) {
                    String error = data.optString("error", "");
                    throw new Exception(error.isEmpty() ? "scan failed" : error);
                }
                if (i == 149) throw new Exception("扫描超时，请稍后查看扫描结果");
            }
            throw new Exception("扫描超时，请稍后查看扫描结果");
        }

        ScanStatus getScanStatus(String taskId) throws Exception {
            JSONObject data = data(request("GET", "/api/v2/scan/" + urlEncode(taskId), null));
            ScanStatus status = new ScanStatus();
            status.status = data.optString("status", "unknown");
            status.error = data.optString("error", "");
            status.albumsDiscovered = data.optInt("albumsDiscovered");
            status.assetsDiscovered = data.optInt("assetsDiscovered");
            status.skippedFiles = data.optInt("skippedFiles");
            status.unchangedAlbums = data.optInt("unchangedAlbums");
            status.unchangedAssets = data.optInt("unchangedAssets");
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
            int responseCode = conn.getResponseCode();
            InputStream stream = responseCode >= 400 ? conn.getErrorStream() : conn.getInputStream();
            String text = readAll(stream);
            conn.disconnect();
            if (text == null || text.trim().isEmpty()) {
                if (responseCode == 204) {
                    JSONObject empty = new JSONObject();
                    empty.put("code", 0);
                    empty.put("data", new JSONObject());
                    return empty;
                }
                throw new Exception("HTTP " + responseCode + ": empty response");
            }
            JSONObject json;
            try {
                json = new JSONObject(text);
            } catch (Exception parseError) {
                throw new Exception("HTTP " + responseCode + ": invalid JSON response");
            }
            if (responseCode >= 400) {
                String message = json.optString("message", "request failed");
                throw new Exception("HTTP " + responseCode + ": " + message);
            }
            return json;
        }

        private String readAll(InputStream stream) throws Exception {
            if (stream == null) return "";
            BufferedReader reader = new BufferedReader(new InputStreamReader(stream, "UTF-8"));
            StringBuilder builder = new StringBuilder();
            String line;
            while ((line = reader.readLine()) != null) builder.append(line);
            return builder.toString();
        }
    }

    private static class PublicShare {
        String token;
        String type;
        String targetId;
        String url;
        String expiresAt;
        boolean passwordProtected;
        boolean allowOriginal;

        static PublicShare from(JSONObject json) {
            PublicShare share = new PublicShare();
            if (json == null) return share;
            share.token = json.optString("token");
            share.type = json.optString("type");
            share.targetId = json.optString("targetId");
            share.url = json.optString("url");
            share.expiresAt = json.optString("expiresAt");
            share.passwordProtected = json.optBoolean("passwordProtected");
            share.allowOriginal = json.optBoolean("allowOriginal", true);
            return share;
        }
    }

    private static class SystemStatus {
        int galleries;
        int albums;
        int assets;
        int users;
        int publicShares;
        int cacheFiles;
        long cacheBytes;
        long databaseBytes;
        long diskFreeBytes;
        String scanStatus = "-";

        static SystemStatus from(JSONObject json) {
            SystemStatus status = new SystemStatus();
            JSONObject counts = json.optJSONObject("counts");
            if (counts != null) {
                status.galleries = counts.optInt("galleries");
                status.albums = counts.optInt("albums");
                status.assets = counts.optInt("assets");
                status.users = counts.optInt("users");
                status.publicShares = counts.optInt("publicShares");
            }
            JSONObject cache = json.optJSONObject("cacheStatus");
            if (cache != null) {
                status.cacheFiles = cache.optInt("files");
                status.cacheBytes = cache.optLong("bytes");
            }
            JSONObject storage = json.optJSONObject("storage");
            if (storage != null) {
                status.databaseBytes = storage.optLong("databaseBytes");
                status.diskFreeBytes = storage.optLong("diskFreeBytes");
            }
            JSONObject scan = json.optJSONObject("scan");
            if (scan != null) status.scanStatus = scan.optString("status", "-");
            return status;
        }

        String summary() {
            return "\u56fe\u5e93 " + galleries + "  \u00b7  \u76f8\u518c " + albums + "  \u00b7  \u56fe\u7247 " + assets
                    + "\n\u7528\u6237 " + users + "  \u00b7  \u516c\u5f00\u5206\u4eab " + publicShares + "  \u00b7  \u626b\u63cf " + scanStatus
                    + "\n\u7f29\u7565\u56fe " + cacheFiles + " / " + bytes(cacheBytes)
                    + "  \u00b7  \u6570\u636e\u5e93 " + bytes(databaseBytes)
                    + "  \u00b7  \u5269\u4f59 " + bytes(diskFreeBytes);
        }

        static String bytes(long value) {
            if (value <= 0) return "-";
            double size = value;
            String[] units = {"B", "KB", "MB", "GB", "TB"};
            int unit = 0;
            while (size >= 1024 && unit < units.length - 1) { size /= 1024; unit++; }
            return String.format(Locale.CHINA, "%.1f %s", size, units[unit]);
        }
    }

    private static class DownloadJob {
        String id;
        String type;
        String targetId;
        String title;
        String albumName;
        String status = "queued";
        String error = "";
        int progress;
        int total;
        long createdAt;
        boolean cancelRequested;

        static DownloadJob album(Album album) {
            DownloadJob job = new DownloadJob();
            job.id = UUID.randomUUID().toString();
            job.type = "album";
            job.targetId = album.id;
            job.title = album.name;
            job.albumName = album.name;
            job.total = album.assetCount;
            job.createdAt = System.currentTimeMillis();
            return job;
        }

        static DownloadJob asset(Asset asset) {
            DownloadJob job = new DownloadJob();
            job.id = UUID.randomUUID().toString();
            job.type = "asset";
            job.targetId = asset.id;
            job.title = asset.name == null || asset.name.isEmpty() ? asset.id : asset.name;
            job.albumName = asset.albumName == null ? "" : asset.albumName;
            job.total = 1;
            job.createdAt = System.currentTimeMillis();
            return job;
        }

        JSONObject toJson() {
            JSONObject json = new JSONObject();
            try {
                json.put("id", id);
                json.put("type", type);
                json.put("targetId", targetId);
                json.put("title", title);
                json.put("albumName", albumName);
                json.put("status", status);
                json.put("error", error);
                json.put("progress", progress);
                json.put("total", total);
                json.put("createdAt", createdAt);
            } catch (Exception ignored) {
            }
            return json;
        }

        static DownloadJob from(JSONObject json) {
            if (json == null) return null;
            DownloadJob job = new DownloadJob();
            job.id = json.optString("id", UUID.randomUUID().toString());
            job.type = json.optString("type");
            job.targetId = json.optString("targetId");
            job.title = json.optString("title", job.targetId);
            job.albumName = json.optString("albumName");
            job.status = json.optString("status", "queued");
            job.error = json.optString("error");
            job.progress = json.optInt("progress");
            job.total = json.optInt("total");
            job.createdAt = json.optLong("createdAt", System.currentTimeMillis());
            return job.targetId.isEmpty() ? null : job;
        }
    }

    private static class ScanStatus {
        String status;
        String error;
        int albumsDiscovered;
        int assetsDiscovered;
        int skippedFiles;
        int unchangedAlbums;
        int unchangedAssets;
    }

    private static class ScanResult {
        boolean ok;
        List<String> newAlbumIds = new ArrayList<>();
        ScanStatus status;
    }

    private static class GallerySource {
        final String name;
        final String prefixKey;
        final String path;
        final boolean enabled;

        GallerySource(String name, String prefixKey) {
            this(name, prefixKey, "", true);
        }

        GallerySource(String name, String prefixKey, String path, boolean enabled) {
            this.name = name == null || name.trim().isEmpty() ? "Moment Pic" : name.trim();
            this.prefixKey = prefixKey == null ? "" : prefixKey.trim();
            this.path = path == null ? "" : path.trim();
            this.enabled = enabled;
        }

        static GallerySource from(JSONObject json) {
            String name = Album.firstNonEmpty(json.optString("name"), json.optString("path"), json.optString("id"));
            return new GallerySource(name, json.optString("id"), json.optString("path"), json.optBoolean("enabled", true));
        }
    }

    private static class GalleryScanSummary {
        String galleryName;
        boolean dryRun;
        int discoveredAlbums;
        int discoveredAssets;
        int albumsToCreate;
        int albumsToUpdate;
        int assetsToCreate;
        int assetsToUpdate;
        int skippedFiles;
        int unchangedAlbums;
        int unchangedAssets;
        String status;
        String error;

        static GalleryScanSummary from(JSONObject json) {
            GalleryScanSummary summary = new GalleryScanSummary();
            summary.galleryName = json.optString("galleryName");
            summary.dryRun = json.optBoolean("dryRun", true);
            summary.status = json.optString("status", "");
            summary.error = json.optString("error", "");
            JSONObject discovered = json.optJSONObject("discovered");
            if (discovered != null) {
                summary.discoveredAlbums = discovered.optInt("albums");
                summary.discoveredAssets = discovered.optInt("assets");
            } else {
                summary.discoveredAlbums = json.optInt("albumsDiscovered");
                summary.discoveredAssets = json.optInt("assetsDiscovered");
            }
            JSONObject changes = json.optJSONObject("changes");
            if (changes != null) {
                summary.albumsToCreate = changes.optInt("albumsToCreate");
                summary.albumsToUpdate = changes.optInt("albumsToUpdate");
                summary.assetsToCreate = changes.optInt("assetsToCreate");
                summary.assetsToUpdate = changes.optInt("assetsToUpdate");
                summary.skippedFiles = changes.optInt("skippedFiles");
            } else {
                summary.skippedFiles = json.optInt("skippedFiles");
            }
            JSONObject unchanged = json.optJSONObject("unchanged");
            if (unchanged != null) {
                summary.unchangedAlbums = unchanged.optInt("albums");
                summary.unchangedAssets = unchanged.optInt("assets");
            } else {
                summary.unchangedAlbums = json.optInt("unchangedAlbums");
                summary.unchangedAssets = json.optInt("unchangedAssets");
            }
            return summary;
        }

        String summaryText() {
            String title = galleryName == null || galleryName.trim().isEmpty() ? "当前来源" : galleryName.trim();
            return title
                    + "\n模式：" + (dryRun ? "dry-run 预览，未写入数据库" : "正式扫描")
                    + "\n发现相册：" + discoveredAlbums
                    + "\n发现图片：" + discoveredAssets
                    + "\n将新增相册：" + albumsToCreate
                    + "\n将更新相册：" + albumsToUpdate
                    + "\n将新增图片：" + assetsToCreate
                    + "\n将更新图片：" + assetsToUpdate
                    + "\n跳过未变化相册：" + unchangedAlbums
                    + "\n跳过未变化图片：" + unchangedAssets
                    + "\n错误/不支持：" + skippedFiles
                    + (error == null || error.trim().isEmpty() ? "" : "\n错误详情：" + error);
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
        String albumId;
        String albumName;
        String thumbnailUrl;
        String originalUrl;
        String sourceMtime;
        String createdAt;
        String extension;
        int width;
        int height;
        long sizeBytes;

        static Asset from(JSONObject json) {
            Asset asset = new Asset();
            asset.id = json.optString("id");
            asset.name = json.optString("name");
            asset.albumId = json.optString("albumId");
            asset.albumName = json.optString("albumName");
            asset.sourceMtime = Album.firstNonEmpty(json.optString("sourceMtime"), json.optString("updatedAt"), json.optString("createdAt"));
            asset.createdAt = json.optString("createdAt");
            asset.extension = json.optString("extension");
            asset.width = json.optInt("width");
            asset.height = json.optInt("height");
            asset.sizeBytes = json.optLong("sizeBytes");
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

        String timelineDay() {
            String value = sourceMtime == null || sourceMtime.trim().isEmpty() ? createdAt : sourceMtime;
            if (value == null || value.trim().isEmpty()) return "\u672a\u77e5\u65e5\u671f";
            value = value.trim();
            return value.length() >= 10 ? value.substring(0, 10) : value;
        }
    }

    private static class PageResult<T> {
        final List<T> items;
        final int total;
        final boolean hasMore;

        PageResult(List<T> items, int total) {
            this(items, total, total >= 0 && items.size() < total);
        }

        PageResult(List<T> items, int total, boolean hasMore) {
            this.items = items;
            this.total = total;
            this.hasMore = hasMore;
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
            if (ICON_CLOCK.equals(icon)) {
                float r = size * 0.3f;
                canvas.drawCircle(cx, cy, r, paint);
                canvas.drawLine(cx, cy, cx, cy - size * 0.17f, paint);
                canvas.drawLine(cx, cy, cx + size * 0.14f, cy + size * 0.08f, paint);
                canvas.drawCircle(cx, cy, Math.max(1.5f, size * 0.035f), paint);
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
        void load(ImageView target, String url, String cookie) {
            if (!prepareTarget(target, url)) return;
            request(url, cookie)
                    .fitCenter()
                    .into(target);
        }

        void loadThumbnail(ImageView target, String url, String cookie) {
            if (!prepareTarget(target, url)) return;
            int targetSize = Math.max(dp(180), Math.max(target.getWidth(), getResources().getDisplayMetrics().widthPixels / 2));
            request(url, cookie)
                    .override(targetSize, targetSize)
                    .centerCrop()
                    .into(target);
        }

        void loadPreviewThenOriginal(
                ImageView target,
                String thumbnailUrl,
                String originalUrl,
                String cookie,
                ImageLoadCallback callback
        ) {
            String source = originalUrl == null || originalUrl.trim().isEmpty() ? thumbnailUrl : originalUrl;
            if (!prepareTarget(target, source)) {
                if (callback != null) callback.done(false);
                return;
            }
            RequestBuilder<Drawable> full = request(source, cookie)
                    .fitCenter()
                    .listener(new RequestListener<Drawable>() {
                        @Override
                        public boolean onLoadFailed(
                                GlideException e,
                                Object model,
                                Target<Drawable> target,
                                boolean isFirstResource
                        ) {
                            if (callback != null) callback.done(false);
                            return false;
                        }

                        @Override
                        public boolean onResourceReady(
                                Drawable resource,
                                Object model,
                                Target<Drawable> target,
                                DataSource dataSource,
                                boolean isFirstResource
                        ) {
                            if (callback != null) callback.done(true);
                            return false;
                        }
                    });
            if (thumbnailUrl != null && !thumbnailUrl.trim().isEmpty() && !thumbnailUrl.equals(source)) {
                full = full.thumbnail(request(thumbnailUrl, cookie).override(dp(720), dp(720)).fitCenter());
            }
            full.into(target);
        }

        void preload(String url, String cookie) {
            if (url == null || url.trim().isEmpty()) return;
            request(url, cookie)
                    .fitCenter()
                    .preload(getResources().getDisplayMetrics().widthPixels, getResources().getDisplayMetrics().heightPixels);
        }

        void preloadThumbnail(String url, String cookie, int targetSize) {
            if (url == null || url.trim().isEmpty()) return;
            int size = Math.max(dp(180), targetSize);
            request(url, cookie)
                    .override(size, size)
                    .centerCrop()
                    .preload(size, size);
        }

        private boolean prepareTarget(ImageView target, String url) {
            Glide.with(MainActivity.this).clear(target);
            target.setBackgroundColor(colorSurfaceTint());
            if (url == null || url.trim().isEmpty()) {
                target.setImageDrawable(null);
                target.setAlpha(0.45f);
                target.setContentDescription("暂无图片");
                return false;
            }
            target.setAlpha(1f);
            target.setContentDescription("图片加载中");
            return true;
        }

        private RequestBuilder<Drawable> request(String url, String cookie) {
            LazyHeaders.Builder headers = new LazyHeaders.Builder()
                    .addHeader("Accept", "image/avif,image/webp,image/*,*/*");
            if (cookie != null && !cookie.isEmpty()) headers.addHeader("Cookie", cookie);
            GlideUrl model = new GlideUrl(url, headers.build());
            return Glide.with(MainActivity.this)
                    .load(model)
                    .signature(new ObjectKey(authCacheSignature(cookie)))
                    .diskCacheStrategy(DiskCacheStrategy.AUTOMATIC)
                    .placeholder(new ColorDrawable(colorSurfaceTint()))
                    .error(new ColorDrawable(colorSurfaceTint()))
                    .transition(DrawableTransitionOptions.withCrossFade(140));
        }

        private String authCacheSignature(String cookie) {
            String scope = baseUrl + "|" + username + "|" + (cookie == null ? "" : cookie);
            return Integer.toHexString(scope.hashCode());
        }

        void clear(View view) {
            if (view instanceof ImageView) {
                Glide.with(MainActivity.this).clear(view);
                return;
            }
            if (view instanceof ViewGroup) {
                ViewGroup group = (ViewGroup) view;
                for (int i = 0; i < group.getChildCount(); i++) clear(group.getChildAt(i));
            }
        }

        void clear() {
            Glide.get(MainActivity.this).clearMemory();
            new Thread(() -> Glide.get(MainActivity.this).clearDiskCache(), "momentpic-glide-cache-clear").start();
        }
    }
}
