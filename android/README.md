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

Install the APK and open it. The default service URL is the Android emulator host loopback:

```text
http://10.0.2.2:3211
```

The app stores the URL locally. Use the menu button in the top-right corner to change it later.

The app uses BackendV2 APIs for login, galleries, albums, assets, thumbnails, originals, public shares, and album sharing to normal users.
Album batch ZIP download is not exposed because BackendV2 has no album ZIP API; download a single original image from the image viewer instead.

In the full-screen image viewer, the image operation menu supports:

- Share to a normal account: admin-only; loads `/api/v2/users`, filters `role=user`, and grants the current image's album with `/api/v2/users/:username/shared-albums/:albumId`.
- Create a public share link: creates an asset public share with `/api/v2/public-shares`, copies the link, and opens Android's system share sheet.
- Download original image: saves the current asset original image locally.

Normal-account sharing is always album-level. The app does not create private per-asset grants; if the viewer cannot determine a real album, it asks the user to open the image from its album.

Settings now keeps connection and appearance options on the main page, with two peer entries:

- Account management: admin-only; creates/updates/deletes normal accounts and manages album sharing. Non-admin users see an explicit permission notice.
- Data management: contains album library directory registration, registered gallery source list, source enable/disable, `dryRun=true` scan preview, image cache clearing, and search history clearing. Source management is admin-only; non-admin users see an explicit permission notice while local cleanup remains available.

Admin users can add an album library directory by entering a server-side absolute path such as `/app/media/photos`.
This path is submitted to BackendV2 as a library root; it is not an Android local folder picker.
Admins can enable or disable registered sources and run a `dryRun=true` scan preview from Android.
Android does not expose `dryRun=false` real import in this build.
