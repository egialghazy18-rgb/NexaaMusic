# Nexaa Music v27 — Audio Transition Recovery

Changes:
- Playback watchdog now considers an autoplay attempt successful only when YouTube reports `PLAYING`; `PAUSED` no longer silently ends fallback while the UI can remain stuck on “Mencoba sumber lain…”.
- If a single-track/radio queue reaches the end before its initial Up Next request has populated the queue, the player requests Up Next again and attempts to continue.
- If no next track can be retrieved, loading is cleared and a visible message is shown rather than leaving the player spinning indefinitely.

Validation: ZIP archive integrity checked. This environment did not run a full Next.js production build or real-device/Free Fire playback test. Because playback still uses the YouTube IFrame API, background playback and source availability cannot be guaranteed by a web app.
