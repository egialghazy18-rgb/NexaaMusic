# Nexaa Music v31 — Radio / Next Track Reliability

- Prevents the end-of-track event and near-end predictor from advancing the queue twice for the same track.
- Retries the radio/up-next endpoint up to three times when a single-track session reaches the end and the first response is empty or temporarily unavailable.
- Checks that the original track is still current before applying a late up-next response, avoiding a stale response replacing a user-selected track.
- Leaves YouTube IFrame playback in place. Browser/Android background restrictions can still interrupt playback, so test on the target phone and deployed Vercel build.
