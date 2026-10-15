# NexaMusic v35 — Playback/metadata test build (source)

## Changes
- Branded browser Media Session metadata uses artist/album `NexaMusic` and re-applies metadata around track starts/playback/foreground recovery. YouTube iframe metadata can still override it on some Android browsers/WebViews.
- Fixed the near-end auto-next predictor so `Repeat One` does not prematurely skip to the next track.
- Added a single guarded resume when a suspended YouTube player returns in `UNSTARTED`, while preserving the no-retry-loop rule.
- Removed Service Worker self-fetch/ping polling. That technique cannot reliably keep background audio alive and may consume data/battery; it is not a playback service.
- Native preview app uses `NexaMusic` as its Media3 notification artist/album, handles incoming play links when the Activity is already open, and no longer starts a foreground service while idle.

## Important limitation
The website still plays YouTube video IDs through the YouTube IFrame API. This source does not extract YouTube audio or route those video IDs into ExoPlayer. Therefore it cannot guarantee uninterrupted audio after leaving the website, and metadata ownership may still be controlled by YouTube/Android WebView. The native Media3 path only plays direct HTTP(S) audio stream URLs that the user is authorized to use.

## Test checklist
1. Deploy the website build and hard refresh/reinstall the PWA so updated `lib/player.tsx` and Service Worker take effect.
2. Play a queued track, lock the screen, then switch to WhatsApp and Free Fire. Note whether audio continues, pauses, or resumes and whether there is a gap.
3. Check Android media notification artist label. If it still displays `Topic`, note browser/device and whether it is Chrome PWA or Android Studio wrapper.
4. Enable Repeat One and let a song end; it should repeat the current track rather than advancing.
5. Test the native Media3 preview separately with a direct audio URL you own or are licensed to stream. A YouTube URL/video ID is not a direct audio URL.

## Build status
Source-only update. Automated Next.js and Android Gradle builds / physical-device tests have not been run in this environment. Do not consider any device behavior verified until tested.
