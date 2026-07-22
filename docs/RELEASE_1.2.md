# MomentPic 1.2 Beta

This release adds the product roadmap features implemented after 1.1 beta:

- Global asset timeline with date grouping, keyword/date/extension/orientation filters, and endless paging.
- Persistent download queue for albums and individual originals, Wi-Fi-only mode, pause/resume/retry, offline history, and completion notifications.
- Public share expiry, optional password protection, original-download policy, share listing, copy, and revoke.
- Admin operational summary for gallery, album, asset, user, share, scan, thumbnail cache, database size, and free disk space.
- GitHub Release update checking in Android.
- Legacy Android AsyncTask usage replaced by the repository-owned UiTask executor.

## Optional release signing

Set all four environment variables before building assembleRelease:

- MOMENTPIC_ANDROID_KEYSTORE
- MOMENTPIC_ANDROID_STORE_PASSWORD
- MOMENTPIC_ANDROID_KEY_ALIAS
- MOMENTPIC_ANDROID_KEY_PASSWORD

The keystore and passwords must stay outside the repository. If the variables are absent, debug builds continue to work and release output remains unsigned.

## Compatibility

Database migration is automatic. Existing public_shares rows are upgraded with no expiry, no password, and original downloads enabled, preserving current links.

## Validation

Backend: npm.cmd run typecheck, npm.cmd run build, npm.cmd run smoke.

Android: gradlew clean testDebugUnitTest lintDebug assembleDebug.

A connected Android device or emulator is still required for final visual and notification acceptance testing.
