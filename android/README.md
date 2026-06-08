# Moment Pic Android

Native Android client for the self-hosted Moment Pic BackendV2 service.

## Build

```powershell
.\gradlew.bat :app:assembleDebug
```

The debug APK is generated at:

```text
app/build/outputs/apk/debug/app-debug.apk
```

## Usage

Install the APK and open it. The default service URL is the LAN BackendV2 instance:

```text
http://10.0.2.2:3211
```

The app stores the URL locally. Use the menu button in the top-right corner to change it later.

The app uses BackendV2 APIs for login, galleries, albums, assets, thumbnails, originals, public shares, and album sharing to normal users.
Album batch ZIP download is not exposed because BackendV2 has no album ZIP API; download a single original image from the image viewer instead.

In Settings, admin users can add an album library directory by entering a server-side absolute path such as `/srv/momentpic/photos`.
This path is submitted to BackendV2 as a library root; it is not an Android local folder picker.
Admins can enable or disable registered sources and run a `dryRun=true` scan preview from Android.
Android does not expose `dryRun=false` real import in this build.
