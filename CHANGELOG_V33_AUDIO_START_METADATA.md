# Nexaa Studio v33 — Media Label + Background Start tuning

- Reasserts the parent page's Media Session metadata while a track is playing, so the Android media card is repeatedly nudged toward `NexaaMusic` instead of YouTube's `- Topic` artist label.
- Re-applies the brand metadata when the page returns to foreground.
- Does not add silent/keepalive audio or duplicate playback loops.

## Important limitation
The app uses the YouTube IFrame Player API. The browser/YouTube may still overwrite Media Session metadata, and mobile browsers/Android can suspend iframe playback when the page is backgrounded or the game takes audio focus. A website-only patch cannot guarantee instant, gapless, uninterrupted background audio. For that, use a native Android player service (Media3 + MediaSessionService) with a supported audio source.

Build and real-device testing are still required.
