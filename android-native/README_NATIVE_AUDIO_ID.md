# NexaaMusic Native Audio Preview (Media3)

This Android Studio project adds a real Android `Media3 ExoPlayer + MediaSessionService` playback path. It is packaged alongside the existing NexaaMusic Next.js website.

## What this native path provides
- Foreground media playback service with Android media notification / lock-screen controls.
- `MediaMetadata` explicitly sets artist to `NexaMusic` and album to `NexaMusic`.
- Android audio focus and noisy-route handling through Media3.
- Basic Android system Equalizer is enabled when the device supports it.
- Direct audio URL playback (e.g. an authorized MP3/AAC/stream URL) from the small native player form or an intent.

## Important source limitation
The existing website searches YouTube Music and plays YouTube **video IDs** through YouTube IFrame API. A video ID is not a direct audio URL. This native module deliberately does not scrape/extract YouTube audio, and it does not pretend to replace YouTube playback. The WebView still loads the current website; songs selected in that page are not yet routed to Media3 because the current source is YouTube IFrame. To make every song from the web UI play natively, the app needs an authorized direct audio provider/source and the web app must send those URLs (and queue metadata) to the native bridge.

## Open and build
1. Open `android-native/` in Android Studio (JDK 17 recommended).
2. Let Gradle sync/download dependencies.
3. Build > Build APK(s).
4. Install the debug APK on your own test device.

No APK is included because this environment has not run an Android/Gradle build. Source is provided for review and testing.

## Test direct audio
Use a direct HTTPS audio URL that you own or are licensed to stream. Enter the URL and title in the native player form and tap **PUTAR DI PLAYER NATIVE**. Android's media notification should show artist `NexaMusic`. A normal web page URL or a YouTube video URL is not a direct audio stream and will not work as an audio source.

## Bass / loudness
The app requests Android's built-in system Equalizer where supported. Effects vary by device/vendor and may be unavailable. It does not apply unsafe volume amplification or guarantee a bass boost on every phone.
