"use client";

import React, {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  useCallback,
} from "react";
import type { Track } from "./types";
import {
  pushRecent,
  saveQueue,
  loadQueue,
  saveVolume,
  loadVolume,
  recordPlay,
} from "./storage";

type RepeatMode = "off" | "all" | "one";

interface PlayerState {
  queue: Track[];
  index: number;
  current: Track | null;
  playing: boolean;
  loading: boolean;
  progress: number; // seconds
  duration: number; // seconds
  volume: number; // 0-100
  shuffle: boolean;
  repeat: RepeatMode;
  fullOpen: boolean;
  notice: string | null;
}

interface PlayerAPI extends PlayerState {
  playTrack: (track: Track, queue?: Track[]) => void;
  playQueue: (tracks: Track[], startIndex?: number) => void;
  addNext: (track: Track) => void;
  addToQueue: (track: Track) => void;
  toggle: () => void;
  next: () => void;
  prev: () => void;
  seek: (sec: number) => void;
  setVolume: (v: number) => void;
  toggleShuffle: () => void;
  cycleRepeat: () => void;
  setFullOpen: (open: boolean) => void;
  jumpTo: (index: number) => void;
  removeFromQueue: (index: number) => void;
}

const PlayerContext = createContext<PlayerAPI | null>(null);

declare global {
  interface Window {
    YT: any;
    onYouTubeIframeAPIReady: () => void;
  }
}

let ytApiPromise: Promise<any> | null = null;
function loadYTApi(): Promise<any> {
  if (typeof window === "undefined") return Promise.reject(new Error("Browser belum tersedia"));
  if (window.YT?.Player) return Promise.resolve(window.YT);
  if (!ytApiPromise) {
    ytApiPromise = new Promise((resolve, reject) => {
      const prev = window.onYouTubeIframeAPIReady;
      window.onYouTubeIframeAPIReady = () => {
        try { prev?.(); } catch {}
        if (window.YT?.Player) resolve(window.YT);
        else {
          ytApiPromise = null;
          reject(new Error("YouTube Player API gagal dimuat"));
        }
      };
      let tag = document.querySelector<HTMLScriptElement>('script[src="https://www.youtube.com/iframe_api"]');
      const onError = () => {
        ytApiPromise = null;
        try { tag?.remove(); } catch {}
        reject(new Error("Jaringan gagal memuat YouTube Player API"));
      };
      if (!tag) {
        tag = document.createElement("script");
        tag.src = "https://www.youtube.com/iframe_api";
        tag.async = true;
        tag.onerror = onError;
        document.head.appendChild(tag);
      } else {
        tag.addEventListener("error", onError, { once: true });
      }
    });
  }
  return ytApiPromise;
}

// ── Web Notification saat lagu berganti ─────────────────────────────────────
// Permission hanya boleh di-request saat user gesture (klik/tap).
function sendTrackNotification(track: { title: string; artist: string; thumb?: string }) {
  if (typeof Notification === "undefined" || Notification.permission !== "granted") return;
  try {
    const n = new Notification(track.title, {
      body: track.artist,
      icon: track.thumb || "/icons/icon-192.png",
      silent: true,
      tag: "nexaa-track",
    });
    setTimeout(() => n.close(), 5000);
  } catch {}
}

// Best-effort branded media metadata. YouTube's iframe can overwrite the browser
// Media Session with its own channel name, so re-apply after playback state changes.
function applyNexaaMediaMetadata(track: { title: string; thumb?: string }) {
  if (typeof navigator === "undefined" || !("mediaSession" in navigator)) return;
  try {
    if (typeof MediaMetadata !== "undefined") {
      navigator.mediaSession.metadata = new MediaMetadata({
        title: track.title || "Nexaa Music",
        artist: "NexaMusic",
        album: "NexaMusic",
        artwork: track.thumb ? [{ src: track.thumb, sizes: "544x544", type: "image/jpeg" }] : [],
      });
    }
  } catch {}
}
export function PlayerProvider({ children }: { children: React.ReactNode }) {
  const [queue, setQueueState] = useState<Track[]>([]);
  const [index, setIndex] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolumeState] = useState(80);
  const [shuffle, setShuffle] = useState(false);
  const [repeat, setRepeat] = useState<RepeatMode>("off");
  const [fullOpen, setFullOpen] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  const ytRef = useRef<any>(null);
  const readyRef = useRef(false);
  // Warm-up dan klik play bisa terjadi hampir bersamaan. Semua pemanggil
  // menunggu satu proses init agar tidak membuat dua iframe player.
  const initPromiseRef = useRef<Promise<void> | null>(null);
  const watchdogRef = useRef<ReturnType<typeof setTimeout>>();
  const noticeTimerRef = useRef<ReturnType<typeof setTimeout>>();
  const altTriedRef = useRef<Set<string>>(new Set());
  const altCandidatesRef = useRef<{ forId: string; ids: string[] } | null>(null);
  const currentIdRef = useRef<string | null>(null);
  const playingRef = useRef(false);
  const wakeLockRef = useRef<any>(null);

  /* Background playback note:
     * Tracks are played through the YouTube IFrame Player API. Browsers/YouTube
     * may suspend embedded playback when the page is backgrounded or closed.
     * A silent/ultrasonic keepalive cannot reliably prevent that, so no fake
     * audio is played. Media Session handlers below provide lock-screen controls
     * where the browser and embedded player permit them.
     */
  const startAudioContext = useCallback(() => {}, []);
  const acquireWakeLock = useCallback(async () => {}, []);
  const releaseWakeLock = useCallback(() => {}, []);

  const showNotice = useCallback((msg: string) => {
    setNotice(msg);
    clearTimeout(noticeTimerRef.current);
    noticeTimerRef.current = setTimeout(() => setNotice(null), 3000);
  }, []);
  const queueRef = useRef<Track[]>([]);
  const indexRef = useRef(0);
  const shuffleRef = useRef(false);
  const repeatRef = useRef<RepeatMode>("off");
  const autoloadRef = useRef(false);

  queueRef.current = queue;
  indexRef.current = index;
  shuffleRef.current = shuffle;
  repeatRef.current = repeat;

  const current = queue[index] ?? null;
  playingRef.current = playing;

  /* restore persisted state */
  useEffect(() => {
    const { queue: q, index: i } = loadQueue();
    if (q.length) {
      setQueueState(q);
      setIndex(Math.min(i, q.length - 1));
    }
    setVolumeState(loadVolume());
  }, []);

  /* persist queue */
  useEffect(() => {
    if (queue.length) saveQueue(queue, index);
  }, [queue, index]);

  // Reassert the branded Media Session while playing. Embedded YouTube can
  // publish its own "Artist - Topic" metadata after our initial assignment.
  // This is best-effort: some browsers give the iframe/player precedence.
  useEffect(() => {
    if (!playing || !current) return;
    const branded = () => {
      if (typeof navigator === "undefined" || !("mediaSession" in navigator)) return;
      try {
        const md = navigator.mediaSession.metadata;
        if (!md || md.artist !== "NexaMusic" || md.album !== "NexaMusic" || md.title !== current.title) {
          applyNexaaMediaMetadata(current);
        }
      } catch {}
    };
    branded();
    const id = window.setInterval(branded, 1200);
    return () => window.clearInterval(id);
  }, [playing, current?.id, current?.title, current?.thumb]);

  const loadVideo = useCallback((track: Track, autoplay = true) => {
    setLoading(true);
    setProgress(0);
    setDuration(track.duration || 0);
    currentIdRef.current = track.id;
    nearEndFiredRef.current = null; // reset near-end predictor untuk lagu baru
    altTriedRef.current.delete(track.id);
    altCandidatesRef.current = null;
    pushRecent(track);
    // Record play stats (non-blocking)
    try { recordPlay({ id: track.id, title: track.title, artist: track.artist, thumb: track.thumb }, track.duration || 180); } catch {}
    // Notifikasi lagu berganti (hanya jika sudah granted dari warm-up)
    sendTrackNotification(track);
    const start = () => {
      const p = ytRef.current;
      if (!p) return;
      if (autoplay) {
        // Mulai watchdog setelah player siap, bukan saat API masih diunduh.
        // Dengan begitu jaringan lambat tidak keliru dianggap sebagai video gagal.
        clearTimeout(watchdogRef.current);
        watchdogRef.current = setTimeout(() => {
          const activePlayer = ytRef.current;
          const S = window.YT?.PlayerState;
          const state = activePlayer?.getPlayerState?.();
          // Untuk loadVideoById/autoplay, PAUSED bukan tanda berhasil.
          // Anggap gagal agar fallback tidak berhenti di "Mencoba sumber lain…".
          if (S && state === S.PLAYING) {
            setLoading(false);
            return;
          }
          handleErrorRef.current(150);
        }, 12000);
        // loadVideoById sudah memulai playback; jangan memanggil playVideo lagi.
        try {
          p.loadVideoById(track.id);
        } catch {
          clearTimeout(watchdogRef.current);
          setLoading(false);
          showNotice("Pemutar gagal memulai lagu. Coba lagi.");
        }
      } else {
        p.cueVideoById(track.id);
      }
    };
    if (readyRef.current) start();
    else {
      initPlayer().then(start).catch(() => {
        if (currentIdRef.current !== track.id) return;
        clearTimeout(watchdogRef.current);
        setLoading(false);
        showNotice("Pemutar belum siap. Periksa koneksi lalu coba lagi.");
      });
    }
    // Set our own metadata after selecting a track, then re-apply briefly because
    // the embedded YouTube player may publish its own "Artist - Topic" metadata.
    applyNexaaMediaMetadata(track);
    [350, 1000, 2200].forEach((delay) => {
      window.setTimeout(() => {
        if (currentIdRef.current === track.id) applyNexaaMediaMetadata(track);
      }, delay);
    });
  }, [showNotice]);

  const nextRef = useRef<() => void>(() => {});

  /* video error (embed diblokir / video hilang) → coba SEMUA sumber alternatif berurutan, lalu skip */
  const tryPlayId = useCallback((videoId: string) => {
    const p = ytRef.current;
    if (!p || !readyRef.current) return false;
    setLoading(true);
    clearTimeout(watchdogRef.current);

    const candidateId = videoId;
    const parentTrackId = currentIdRef.current;
    watchdogRef.current = setTimeout(() => {
      // Abaikan timer usang jika lagu atau kandidat sudah berubah.
      if (currentIdRef.current !== parentTrackId) return;
      if (altCandidatesRef.current?.forId !== parentTrackId) return;
      if (p !== ytRef.current) return;
      if (p.getVideoData?.()?.video_id !== candidateId) return;
      if (!altTriedRef.current.has(candidateId)) return;

      const S = window.YT?.PlayerState;
      const st = p.getPlayerState?.();
      if (S && st === S.PLAYING) {
        setLoading(false);
        return;
      }
      handleErrorRef.current(150);
    }, 12000);
    // loadVideoById otomatis memulai sumber alternatif juga.
    p.loadVideoById(videoId);
    return true;
  }, []);

  const handleVideoError = useCallback(
    async (code: number) => {
      clearTimeout(watchdogRef.current);
      const cur = queueRef.current[indexRef.current];
      if (!cur) {
        setLoading(false);
        return;
      }
      // 101 / 150 = pemilik video melarang pemutaran embed; 100 = video dihapus
      const embedBlocked = code === 101 || code === 150 || code === 100 || code === 2;

      if (embedBlocked) {
        // 1) ambil daftar kandidat (sekali per lagu, sudah disaring server via oembed)
        if (altCandidatesRef.current?.forId !== cur.id) {
          altTriedRef.current.add(cur.id);
          showNotice("Sumber dibatasi, mencari versi lain…");
          try {
            const r = await fetch(
              `/api/ytm?action=alt&q=${encodeURIComponent(
                `${cur.title} ${cur.artist}`
              )}&dur=${Math.round(cur.duration || 0)}`
            );
            const d = await r.json();
            altCandidatesRef.current = {
              forId: cur.id,
              ids: (d.ids || []).filter((x: string) => x && x !== cur.id),
            };
          } catch {
            altCandidatesRef.current = { forId: cur.id, ids: [] };
          }
        }
        // 2) coba kandidat berikutnya (maks 4 percobaan; kandidat sudah diranking server)
        if (currentIdRef.current === cur.id && altCandidatesRef.current) {
          const tried = altCandidatesRef.current.ids.filter((x) =>
            altTriedRef.current.has(x)
          ).length;
          const nextAlt =
            tried < 4
              ? altCandidatesRef.current.ids.find(
                  (x) => !altTriedRef.current.has(x)
                )
              : undefined;
          if (nextAlt) {
            altTriedRef.current.add(nextAlt);
            showNotice("Mencoba sumber lain…");
            if (tryPlayId(nextAlt)) return;
          }
        }
      }
      // semua kandidat habis / error lain → skip
      showNotice("Sumber lagu tidak tersedia, otomatis lanjut ke berikutnya...");      setLoading(false);
      setTimeout(() => nextRef.current(), 600);
    },
    [showNotice, tryPlayId]
  );

  const handleErrorRef = useRef(handleVideoError);
  handleErrorRef.current = handleVideoError;

  const initPlayer = useCallback((): Promise<void> => {
    if (readyRef.current) return Promise.resolve();
    if (initPromiseRef.current) return initPromiseRef.current;

    const task = (async () => {
      const YT = await loadYTApi();
      if (readyRef.current) return;
      await new Promise<void>((resolve, reject) => {
        const host = document.getElementById("yt-audio-host");
        if (!host) {
          reject(new Error("Elemen player belum tersedia"));
          return;
        }

        let readyTimeout: ReturnType<typeof setTimeout> | undefined;
        const markReady = (target: any) => {
          readyRef.current = true;
          if (readyTimeout) clearTimeout(readyTimeout);
          target.setVolume(loadVolume());
          resolve();
        };

        try {
          ytRef.current = new YT.Player("yt-audio-host", {
            width: 2,
            height: 2,
            playerVars: {
              autoplay: 0,
              mute: 0,
              controls: 0,
              disablekb: 1,
              playsinline: 1,
              fs: 0,
              modestbranding: 1,
              origin: window.location.origin,
              widget_referrer: window.location.origin,
              enablejsapi: 1,
              rel: 0,
              iv_load_policy: 3,
              cc_load_policy: 0,
            },
            events: {
              onReady: (e: any) => {
                markReady(e.target);
              },
              onStateChange: (e: any) => {
                const S = window.YT.PlayerState;
                if (e.data === S.PLAYING) {
                  clearTimeout(watchdogRef.current);
                  setPlaying(true);
                  setLoading(false);
                  setDuration(e.target.getDuration() || 0);
                  const activeTrack = queueRef.current[indexRef.current];
                  if (activeTrack && activeTrack.id === currentIdRef.current) {
                    applyNexaaMediaMetadata(activeTrack);
                  }
                  startAudioContext();
                  acquireWakeLock();
                  try {
                    if ("mediaSession" in navigator) navigator.mediaSession.playbackState = "playing";
                  } catch {}
                } else if (e.data === S.PAUSED) {
                  // Jika browser mengirim PAUSED saat tab disembunyikan, pertahankan
                  // niat playback. Saat kembali foreground kita coba pulihkan sekali.
                  const backgroundPause = document.visibilityState === "hidden" && playingRef.current;
                  if (!backgroundPause) {
                    setPlaying(false);
                    releaseWakeLock();
                    try {
                      if ("mediaSession" in navigator) navigator.mediaSession.playbackState = "paused";
                    } catch {}
                  }
                } else if (e.data === S.BUFFERING) {
                  setLoading(true);
                } else if (e.data === S.ENDED) {
                  clearTimeout(watchdogRef.current);
                  const endedId = currentIdRef.current;
                  // Near-end predictor may already have scheduled next().
                  const alreadyScheduled = nearEndFiredRef.current === endedId;
                  nearEndFiredRef.current = endedId;
                  try {
                    if ("mediaSession" in navigator) navigator.mediaSession.playbackState = "none";
                  } catch {}
                  if (repeatRef.current === "one") {
                    e.target.seekTo(0, true);
                    e.target.playVideo();
                  } else if (!alreadyScheduled) {
                    nextRef.current();
                  }
                }
              },
              onError: (e: any) => {
                handleErrorRef.current(Number(e?.data ?? -1));
              },
            },
          });
          // Jangan biarkan tombol play menggantung selamanya bila iframe diblokir.
          readyTimeout = setTimeout(() => {
            if (!readyRef.current) reject(new Error("YouTube Player belum siap"));
          }, 18000);
        } catch (error) {
          if (readyTimeout) clearTimeout(readyTimeout);
          reject(error);
        }
      });
    })();

    initPromiseRef.current = task;
    task.finally(() => {
      if (initPromiseRef.current === task) initPromiseRef.current = null;
    }).catch(() => {});
    return task;
  }, []);

  /* Warm up the embedded player shortly after the first paint instead of
     waiting for the first song tap to download and initialize the API.
     A single-flight promise makes this safe alongside the tap fallback. */
  useEffect(() => {
    let cancelled = false;
    const warm = () => {
      if (!cancelled) initPlayer().catch(() => {});
    };
    const timer = window.setTimeout(warm, 900);
    window.addEventListener("pointerdown", warm, { once: true, passive: true });
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
      window.removeEventListener("pointerdown", warm);
    };
  }, [initPlayer]);

  /* Progress ticker: 700ms balances responsive controls with less context churn.
     Near-end predictor: bila sisa < 1.2 detik dan masih PLAYING, paksa trigger
     next() supaya perpindahan lagu terasa mulus tanpa jeda. */
  const nearEndFiredRef = useRef<string | null>(null);
  useEffect(() => {
    const t = setInterval(() => {
      const p = ytRef.current;
      if (p && readyRef.current && typeof p.getCurrentTime === "function") {
        const ct = p.getCurrentTime() || 0;
        setProgress(ct);
        const d = p.getDuration?.() || 0;
        if (d > 0) {
          setDuration(d);
          // Near-end predictor: bila sisa ≤ 1.2 detik → langsung next
          const S = window.YT?.PlayerState;
          const state = p.getPlayerState?.();
          const isPlaying = S ? state === S.PLAYING : false;
          const remaining = d - ct;
          const trackId = queueRef.current[indexRef.current]?.id ?? null;
          if (
            isPlaying &&
            repeatRef.current !== "one" &&
            remaining > 0 &&
            remaining <= 1.2 &&
            trackId &&
            nearEndFiredRef.current !== trackId
          ) {
            nearEndFiredRef.current = trackId;
            // Beri sedikit jeda agar beat terakhir selesai, lalu next
            const scheduledTrackId = trackId;
            setTimeout(() => {
              if (currentIdRef.current === scheduledTrackId && nearEndFiredRef.current === scheduledTrackId) {
                nextRef.current();
              }
            }, Math.max(0, remaining * 1000 - 80));
          }
        }
      }
    }, 700);
    return () => clearInterval(t);
  }, []);

  const playQueue = useCallback(
    (tracks: Track[], startIndex = 0) => {
      if (!tracks.length) return;
      setQueueState(tracks);
      setIndex(startIndex);
      loadVideo(tracks[startIndex]);
    },
    [loadVideo]
  );

  const playTrack = useCallback(
    (track: Track, q?: Track[]) => {
      if (q && q.length) {
        const i = q.findIndex((t) => t.id === track.id);
        playQueue(q, i >= 0 ? i : 0);
        return;
      }
      playQueue([track], 0);
      // auto-extend with radio (up next)
      autoloadRef.current = true;
      fetch(`/api/ytm?action=upnext&id=${track.id}`)
        .then((r) => r.json())
        .then((d) => {
          if (!autoloadRef.current) return;
          const extra: Track[] = (d.tracks || []).filter(
            (t: Track) => t.id !== track.id
          );
          if (extra.length) {
            setQueueState((prev) =>
              prev.length && prev[0]?.id === track.id
                ? [...prev, ...extra]
                : prev
            );
          }
        })
        .catch(() => {});
    },
    [playQueue]
  );

  const jumpTo = useCallback(
    (i: number) => {
      const q = queueRef.current;
      if (i < 0 || i >= q.length) return;
      setIndex(i);
      loadVideo(q[i]);
    },
    [loadVideo]
  );

  const nextRecoveryRef = useRef(false);
  const next = useCallback(() => {
    const q = queueRef.current;
    if (!q.length) return;
    let i = indexRef.current;
    if (shuffleRef.current && q.length > 1) {
      let r = i;
      while (r === i) r = Math.floor(Math.random() * q.length);
      i = r;
    } else {
      i = i + 1;
      if (i >= q.length) {
        if (repeatRef.current === "all") i = 0;
        else {
          // Lagu tunggal memakai radio/up-next. Kalau permintaan up-next belum
          // selesai saat lagu habis, coba ambil lagi daripada berhenti permanen.
          const endedTrack = q[indexRef.current];
          if (autoloadRef.current && endedTrack && !nextRecoveryRef.current) {
            nextRecoveryRef.current = true;
            setLoading(true);
            (async () => {
              // Up-next can briefly return an empty list; retry before stopping.
              let extra: Track[] = [];
              for (let attempt = 0; attempt < 3 && !extra.length; attempt++) {
                if (attempt > 0) await new Promise((resolve) => setTimeout(resolve, 900));
                if (queueRef.current[indexRef.current]?.id !== endedTrack.id) return;
                try {
                  const r = await fetch(`/api/ytm?action=upnext&id=${encodeURIComponent(endedTrack.id)}`);
                  if (!r.ok) continue;
                  const d = await r.json();
                  extra = (d.tracks || []).filter((t: Track) => t?.id && t.id !== endedTrack.id);
                } catch {}
              }
              if (queueRef.current[indexRef.current]?.id !== endedTrack.id) return;
              if (!extra.length) throw new Error("no up-next tracks after retries");
              const merged = [...queueRef.current];
              const known = new Set(merged.map((t) => t.id));
              for (const track of extra) if (!known.has(track.id)) merged.push(track);
              const nextIndex = indexRef.current + 1;
              if (merged.length <= nextIndex) throw new Error("no new up-next tracks");
              setQueueState(merged);
              setIndex(nextIndex);
              loadVideo(merged[nextIndex]);
            })()
              .catch(() => {
                setLoading(false);
                setPlaying(false);
                showNotice("Lagu berikutnya belum tersedia. Coba pilih lagu lain.");
              })
              .finally(() => { nextRecoveryRef.current = false; });
            return;
          }
          setPlaying(false);
          setLoading(false);
          return;
        }
      }
    }
    setIndex(i);
    loadVideo(q[i]);
  }, [loadVideo, showNotice]);

  nextRef.current = next;

  const prev = useCallback(() => {
    const p = ytRef.current;
    if (p && readyRef.current && (p.getCurrentTime?.() || 0) > 4) {
      p.seekTo(0, true);
      return;
    }
    const q = queueRef.current;
    let i = indexRef.current - 1;
    if (i < 0) i = repeatRef.current === "all" ? q.length - 1 : 0;
    setIndex(i);
    if (q[i]) loadVideo(q[i]);
  }, [loadVideo]);

  const toggle = useCallback(async () => {
    // Pastikan player sudah diinit — penting di mobile karena init baru
    // boleh dilakukan setelah ada user gesture (tap/click)
    if (!readyRef.current) {
      await initPlayer();
    }
    const p = ytRef.current;
    if (!p || !readyRef.current) {
      const c = queueRef.current[indexRef.current];
      if (c) loadVideo(c);
      return;
    }
    const S = window.YT.PlayerState;
    const st = p.getPlayerState();
    if (st === S.PLAYING) p.pauseVideo();
    else if (st === S.PAUSED) p.playVideo();
    else if (st === S.CUED || st === -1) {
      const c = queueRef.current[indexRef.current];
      if (c) loadVideo(c);
    } else p.playVideo();
  }, [loadVideo, initPlayer]);

  const seek = useCallback((sec: number) => {
    const p = ytRef.current;
    if (p && readyRef.current) {
      p.seekTo(sec, true);
      setProgress(sec);
    }
  }, []);

  const setVolume = useCallback((v: number) => {
    setVolumeState(v);
    saveVolume(v);
    baseVolumeRef.current = v; // update base untuk EQ offset
    const p = ytRef.current;
    if (p && readyRef.current) p.setVolume(v);
  }, []);

  const toggleShuffle = useCallback(() => setShuffle((s) => !s), []);
  const cycleRepeat = useCallback(
    () =>
      setRepeat((r) => (r === "off" ? "all" : r === "all" ? "one" : "off")),
    []
  );

  const addNext = useCallback((track: Track) => {
    autoloadRef.current = false;
    setQueueState((q) => {
      const copy = q.filter((t) => t.id !== track.id);
      const i = Math.min(indexRef.current + 1, copy.length);
      copy.splice(i, 0, track);
      return copy;
    });
  }, []);

  const addToQueue = useCallback((track: Track) => {
    autoloadRef.current = false;
    setQueueState((q) =>
      q.some((t) => t.id === track.id) ? q : [...q, track]
    );
  }, []);

  const removeFromQueue = useCallback((i: number) => {
    setQueueState((q) => {
      const copy = [...q];
      copy.splice(i, 1);
      if (i < indexRef.current) setIndex(indexRef.current - 1);
      return copy;
    });
  }, []);

  /* media session actions — lengkap agar lock screen & notifikasi berfungsi */
  useEffect(() => {
    if (!("mediaSession" in navigator)) return;
    navigator.mediaSession.setActionHandler("play", () => {
      const p = ytRef.current;
      if (p && readyRef.current) try { p.playVideo(); } catch {}
      // Resume audio context if a browser implementation needs it.
      startAudioContext();
    });
    navigator.mediaSession.setActionHandler("pause", () => {
      const p = ytRef.current;
      if (p && readyRef.current) try { p.pauseVideo(); } catch {}
    });
    navigator.mediaSession.setActionHandler("nexttrack", next);
    navigator.mediaSession.setActionHandler("previoustrack", prev);
    navigator.mediaSession.setActionHandler("seekto", (d) => {
      if (d.seekTime != null) seek(d.seekTime);
    });
    try {
      navigator.mediaSession.setActionHandler("seekbackward", (d) => {
        const p = ytRef.current;
        if (p && readyRef.current) {
          const ct = p.getCurrentTime?.() || 0;
          seek(Math.max(0, ct - (d.seekOffset ?? 10)));
        }
      });
      navigator.mediaSession.setActionHandler("seekforward", (d) => {
        const p = ytRef.current;
        if (p && readyRef.current) {
          const ct = p.getCurrentTime?.() || 0;
          const dur = p.getDuration?.() || 0;
          seek(Math.min(dur || Infinity, ct + (d.seekOffset ?? 10)));
        }
      });
    } catch {}
  }, [next, prev, seek]);

  /* Update positionState setiap 5 detik agar lock screen progress bar akurat */
  useEffect(() => {
    const t = setInterval(() => {
      if (!("mediaSession" in navigator)) return;
      const p = ytRef.current;
      if (!p || !readyRef.current) return;
      try {
        const dur = p.getDuration?.() || 0;
        const pos = p.getCurrentTime?.() || 0;
        const rate = p.getPlaybackRate?.() || 1;
        if (dur > 0 && pos >= 0 && pos <= dur) {
          navigator.mediaSession.setPositionState({ duration: dur, playbackRate: rate, position: pos });
        }
      } catch {}
    }, 5000);
    return () => clearInterval(t);
  }, []);

  /* ── Background recovery: single guarded attempt ───────────────────────
     Jangan membuat retry-loop playVideo() setiap tab kembali aktif. Itu dapat
     berebut dengan state BUFFERING dan menyebabkan playback terasa tersendat.
     Hanya pulihkan jika player benar-benar PAUSED/CUED/ENDED; biarkan BUFFERING
     menyelesaikan prosesnya sendiri.
  ─────────────────────────────────────────────────────────────────────── */
  useEffect(() => {
    const resumeIfActuallyStopped = () => {
      if (document.visibilityState !== "visible" || !playingRef.current) return;
      const activeTrack = queueRef.current[indexRef.current];
      if (activeTrack && activeTrack.id === currentIdRef.current) applyNexaaMediaMetadata(activeTrack);
      const p = ytRef.current;
      if (!p || !readyRef.current) return;
      const S = window.YT?.PlayerState;
      if (!S) return;
      let state: number | undefined;
      try { state = p.getPlayerState?.(); } catch { return; }
      // Never interrupt an active or buffering stream with another play command.
      if (state === S.PLAYING || state === S.BUFFERING) return;
      // ENDED ditangani oleh event onStateChange; memanggil playVideo di sini
      // dapat mengulang lagu lama dan bertabrakan dengan antrean lagu berikutnya.
      if (state === S.PAUSED || state === S.CUED || state === S.UNSTARTED) {
        // UNSTARTED can occur after WebView/browser suspension. This is only
        // one guarded resume on return to foreground; never run a retry loop.
        try { p.playVideo(); } catch {}
      }
      acquireWakeLock();
      try {
        if ("mediaSession" in navigator) {
          navigator.mediaSession.playbackState = "playing";
        }
      } catch {}
    };

    const onVisible = () => resumeIfActuallyStopped();
    const onPageShow = (e: PageTransitionEvent) => {
      if (e.persisted) resumeIfActuallyStopped();
    };
    const onFocus = () => resumeIfActuallyStopped();
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("pageshow", onPageShow);
    window.addEventListener("focus", onFocus);
    return () => {
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("pageshow", onPageShow);
      window.removeEventListener("focus", onFocus);
    };
  }, [acquireWakeLock]);

  /* ── Expose YT player & listen speed event ──────────────────────────────
     SpeedControl dispatch nexaa:speed → apply ke YouTube player.
  ─────────────────────────────────────────────────────────────────────── */
  useEffect(() => {
    const onSpeed = (e: Event) => {
      const { rate } = (e as CustomEvent).detail as { rate: number };
      const p = ytRef.current;
      if (p && readyRef.current) {
        try { p.setPlaybackRate(rate); } catch {}
      }
    };
    window.addEventListener("nexaa:speed", onSpeed);
    return () => window.removeEventListener("nexaa:speed", onSpeed);
  }, []);

  // Expose player ke window untuk SpeedControl direct access
  useEffect(() => {
    (window as any)._nexaaYtPlayer = ytRef.current;
  });

  /* ── Dengarkan event EQ dari Equalizer.tsx ──────────────────────────────
     EQ perceptual: ubah volume YouTube player berdasarkan volumeOffset preset.
     Base volume disimpan, EQ offset diterapkan di atasnya.
  ─────────────────────────────────────────────────────────────────────── */
  const baseVolumeRef = useRef(80);
  useEffect(() => {
    baseVolumeRef.current = loadVolume();
  }, []);

  useEffect(() => {
    const onEQ = (e: Event) => {
      const detail = (e as CustomEvent).detail as { volumeOffset: number };
      const p = ytRef.current;
      if (!p || !readyRef.current) return;
      try {
        const base = baseVolumeRef.current;
        // volumeOffset: -10 to +10 → clamp ke 0–100
        const adjusted = Math.max(0, Math.min(100, base + detail.volumeOffset));
        p.setVolume(adjusted);
      } catch {}
    };
    window.addEventListener("nexaa:eq-apply", onEQ);
    return () => window.removeEventListener("nexaa:eq-apply", onEQ);
  }, []);

  const api: PlayerAPI = {
    queue,
    index,
    current,
    playing,
    loading,
    progress,
    duration,
    volume,
    shuffle,
    repeat,
    fullOpen,
    notice,
    playTrack,
    playQueue,
    addNext,
    addToQueue,
    toggle,
    next,
    prev,
    seek,
    setVolume,
    toggleShuffle,
    cycleRepeat,
    setFullOpen,
    jumpTo,
    removeFromQueue,
  };

  return (
    <PlayerContext.Provider value={api}>
      {children}
      {/* YouTube iframe harus terlihat (walaupun sangat kecil) di posisi yang tidak mengganggu.
          opacity:0 / display:none / visibility:hidden menyebabkan YouTube memblokir playback.
          Solusi: posisikan di luar layar dengan clip, bukan hidden. */}
      <div
        style={{
          position: "fixed",
          width: 2,
          height: 2,
          bottom: 72,
          right: 0,
          pointerEvents: "none",
          zIndex: 0,
          clip: "rect(0,2px,2px,0)",
          overflow: "hidden",
        }}
        aria-hidden
      >
        <div id="yt-audio-host" style={{ width: 2, height: 2 }} />
      </div>
    </PlayerContext.Provider>
  );
}

export function usePlayer(): PlayerAPI {
  const ctx = useContext(PlayerContext);
  if (!ctx) throw new Error("usePlayer must be used within PlayerProvider");
  return ctx;
}

export function fmtTime(sec: number): string {
  if (!sec || !isFinite(sec)) return "0:00";
  const s = Math.floor(sec % 60);
  const m = Math.floor(sec / 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}
