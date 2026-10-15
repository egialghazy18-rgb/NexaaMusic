# NexaMusic v35 — test package

## Website update
Push/deploy this source to Vercel as usual. The site now uses `NexaMusic` as the browser Media Session artist/album label, guards Repeat One from being overridden by auto-next prediction, tries one safe foreground resume after an `UNSTARTED` suspension state, and no longer polls the Service Worker as a fake background-audio keepalive.

## Build native Android preview APK through GitHub Actions
1. Upload/push this project to a GitHub repository.
2. In GitHub, open **Actions** and run **Build NexaMusic Native APK** (or push a change under `android-native/`).
3. Download the artifact named **NexaMusic-debug-apk** after the workflow finishes.
4. Install the debug APK on your test phone.

The workflow has been added but has not been executed from this environment. If it fails, send the workflow log for the next debugging pass.

## What this test does and does not verify
- Website/YouTube player: tests whether metadata overrides and queue recovery behave better on your device. Android/YouTube may still replace the browser media metadata with `Topic`.
- Native form: tests background playback and notification metadata for a direct HTTP(S) audio URL that you are authorized to stream.
- It does not route the website's YouTube video IDs to native Media3; a YouTube video ID cannot simply be played as a direct ExoPlayer audio URL. Because of that, uninterrupted background playback for the website's YouTube catalogue is not guaranteed by this update.
