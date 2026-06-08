# MomentPic Android

Android client for a self-hosted MomentPic Backend V2 server.

## Requirements

- JDK compatible with the Android Gradle Plugin used by this project.
- Android SDK installed locally.
- Network access to the backend from the device or emulator.

## Build debug APK

Linux/macOS:

```bash
bash ./gradlew :app:assembleDebug
```

Windows:

```powershell
.\gradlew.bat :app:assembleDebug
```

Output:

```text
app/build/outputs/apk/debug/app-debug.apk
```

## Install and configure

Install `app-debug.apk` on a test device. On first use, set the backend URL, for example:

```text
http://<server-ip>:3211
```

For an Android emulator talking to a backend on the host machine, use:

```text
http://10.0.2.2:3211
```

The app stores the backend URL locally. Use the top-right menu to change it later.

## Login

Use the admin username/password configured in the backend `.env` file, for example:

```text
username: admin
password: <your MOMENTPIC_ADMIN_PASSWORD>
```

## Do not commit

- `local.properties`
- signing keys / keystores
- `google-services.*`
- `app/build/`
- APK/AAB outputs
- Gradle caches
