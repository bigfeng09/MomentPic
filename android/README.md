# Moment Pic Android

Lightweight Android WebView shell for a self-hosted Moment Pic service.

## Build

```powershell
.\gradlew.bat :app:assembleDebug
```

The debug APK is generated at:

```text
app/build/outputs/apk/debug/app-debug.apk
```

## Usage

Install the APK, open it, then enter the MomentPic backend URL, for example:

```text
http://10.0.2.2:3211
```

`10.0.2.2` is the Android emulator alias for the host machine. On a real phone, use the backend host name or LAN IP that you control. The app stores the URL locally. Use the menu button in the top-right corner to change it later.
