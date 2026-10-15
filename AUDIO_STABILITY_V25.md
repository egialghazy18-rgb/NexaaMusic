# Nexaa v25 — Audio stability patch

Changes:
- Do not replay the previous YouTube item when the page becomes visible after the item has ended.
- Clear the player watchdog on the official ENDED event to reduce double-next races.
- Guard the near-end auto-advance timer against switching to a different track before it fires.
- Preserve the intended playing state when the browser reports PAUSED while the page is hidden, then attempt one recovery when returning to foreground.

Limitations:
- Playback still uses the YouTube IFrame Player API. Android/browser policies and another app taking audio focus can still pause or terminate playback.
- Reliable native background playback requires an Android Media3 Player + MediaSessionService and a legal direct audio source/provider; a website-only patch cannot guarantee uninterrupted playback during Free Fire or other apps.
- Equalizer DSP cannot process the YouTube iframe's cross-origin audio directly.
