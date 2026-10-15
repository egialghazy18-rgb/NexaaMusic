# NexaaMusic v34 — Native Media3 Audio Foundation

Added `android-native/`, a standalone Android Studio app project using Media3 ExoPlayer and MediaSessionService. It explicitly sets Android media artist metadata to `NexaMusic`, supports background media-session playback for authorized direct audio URLs, and requests the device's built-in equalizer when available.

This is a native playback foundation, not yet a complete replacement of the website's YouTube IFrame playback. The existing website's tracks are YouTube video IDs; they cannot be passed to ExoPlayer as direct audio URLs. A lawful direct audio provider and bridge from the website's queue are still required for the same catalogue to play natively. This package is source-only; Android Studio build and phone test have not been run.
