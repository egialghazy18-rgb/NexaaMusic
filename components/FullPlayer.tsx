"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { usePlayer, fmtTime } from "@/lib/player";
import { toggleLike, isLiked } from "@/lib/storage";
import { useToast } from "./Toast";
import Equalizer from "./Equalizer";
import { useSwipeGesture } from "@/lib/useSwipeGesture";
import {
  PlayIcon,
  PauseIcon,
  NextIcon,
  PrevIcon,
  ShuffleIcon,
  RepeatIcon,
  RepeatOneIcon,
  HeartIcon,
  ChevronDownIcon,
  QueueIcon,
  VolumeIcon,
  TrashIcon,
  LyricsIcon,
  FollowIcon,
} from "./Icons";

type View = "player" | "queue" | "lyrics" | "eq";

// ── CSS hash fallback ─────────────────────────────────────────────────────────
function hashColor(src: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < src.length; i++) {
    h ^= src.charCodeAt(i);
    h = (Math.imul(h, 0x01000193) | 0) >>> 0;
  }
  const hue = h % 360;
  const sat = 55 + (h >> 8) % 45;
  const lit = 30 + (h >> 16) % 25;
  const s = sat / 100, l = lit / 100;
  const a = s * Math.min(l, 1 - l);
  const f = (n: number) => {
    const k = (n + hue / 30) % 12;
    return l - a * Math.max(-1, Math.min(k - 3, 9 - k, 1));
  };
  return `rgba(${Math.round(f(0)*255)},${Math.round(f(8)*255)},${Math.round(f(4)*255)},0.55)`;
}

// ── Canvas sampler ────────────────────────────────────────────────────────────
function sampleCanvas(imgEl: HTMLImageElement): string | null {
  try {
    const SIZE = 32;
    const canvas = document.createElement("canvas");
    canvas.width = SIZE; canvas.height = SIZE;
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;
    ctx.drawImage(imgEl, 0, 0, SIZE, SIZE);
    const data = ctx.getImageData(0, 0, SIZE, SIZE).data;
    let r = 0, g = 0, b = 0, count = 0;
    for (let i = 0; i < data.length; i += 16) {
      const pr = data[i], pg = data[i+1], pb = data[i+2];
      const br = (pr+pg+pb)/3;
      if (br < 20 || br > 235) continue;
      r += pr; g += pg; b += pb; count++;
    }
    if (!count) return null;
    const boost = 1.3;
    r = Math.min(255, Math.round((r/count)*boost));
    g = Math.min(255, Math.round((g/count)*boost));
    b = Math.min(255, Math.round((b/count)*boost));
    return `rgba(${r},${g},${b},0.55)`;
  } catch { return null; }
}

// ── useDominantColor ──────────────────────────────────────────────────────────
function useDominantColor(src: string | undefined): string {
  const [color, setColor] = useState("rgba(80,20,140,0.6)");
  const prevSrc = useRef<string>();
  useEffect(() => {
    if (!src || src === prevSrc.current) return;
    prevSrc.current = src;
    setColor(hashColor(src));
    const proxyUrl = `/api/thumb?url=${encodeURIComponent(src)}`;
    const imgProxy = new Image();
    imgProxy.crossOrigin = "anonymous";
    imgProxy.onload = () => { const c = sampleCanvas(imgProxy); if (c) { setColor(c); return; } tryDirect(); };
    imgProxy.onerror = () => tryDirect();
    imgProxy.src = proxyUrl;
    function tryDirect() {
      const imgD = new Image(); imgD.crossOrigin = "anonymous";
      imgD.onload = () => { const c = sampleCanvas(imgD); if (c) setColor(c); };
      imgD.onerror = () => {};
      imgD.src = src!;
    }
  }, [src]);
  return color;
}

// ── Visualizer — gradient CACHED, bukan dibuat ulang tiap frame ──────────────
const BAR_COUNT = 32; // waveform lebih rapat seperti equalizer musik premium
function Visualizer({ playing, accentColor }: { playing: boolean; accentColor: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const barsRef   = useRef<number[]>(Array.from({ length: BAR_COUNT }, () => Math.random()));
  const rafRef    = useRef<number>(0);
  const timeRef   = useRef(0);
  const frameRef  = useRef(0); // throttle: render setiap 2 frame
  const gradCacheRef = useRef<{ color: string; hi: string; lo: string }>({
    color: "", hi: "", lo: "",
  });

  const draw = useCallback(() => {
    rafRef.current = requestAnimationFrame(draw);
    frameRef.current++;
    // Throttle ke ~30fps saat pause, ~60fps saat playing
    if (!playing && frameRef.current % 3 !== 0) return;
    if (playing && frameRef.current % 2 !== 0) return;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d", { alpha: true });
    if (!ctx) return;
    const W = canvas.width, H = canvas.height;
    ctx.clearRect(0, 0, W, H);
    timeRef.current += playing ? 0.055 : 0.008;
    const t = timeRef.current;
    const gap = 2.5;
    const barW = (W - gap * (BAR_COUNT - 1)) / BAR_COUNT;

    // Update cache hanya saat warna berubah
    if (gradCacheRef.current.color !== accentColor) {
      gradCacheRef.current = {
        color: accentColor,
        hi: accentColor.replace("0.55", "0.90"),
        lo: accentColor.replace("0.55", "0.35"),
      };
    }
    const { hi, lo } = gradCacheRef.current;

    // Satu gradient column — re-create hanya sekali per frame (bukan per bar)
    const grad = ctx.createLinearGradient(0, 0, 0, H);
    grad.addColorStop(0, hi);
    grad.addColorStop(1, lo);
    ctx.fillStyle = grad;

    for (let i = 0; i < BAR_COUNT; i++) {
      const center = 1 - Math.abs((i / (BAR_COUNT - 1)) * 2 - 1);
      const freq  = 0.75 + (i % 9) * 0.11;
      const phase = i * 1.73;
      const wave  = Math.sin(t * freq + phase) * 0.5 + 0.5;
      const wave2 = Math.sin(t * (freq * 1.61) + phase * 0.63) * 0.5 + 0.5;
      const transient = Math.max(0, Math.sin(t * 2.7 + i * 0.91)) * 0.18;
      const target = playing
        ? 0.09 + center * 0.31 + wave * 0.25 + wave2 * 0.19 + transient
        : 0.025 + wave * 0.045;
      barsRef.current[i] += (target - barsRef.current[i]) * 0.12;
      const barH = barsRef.current[i] * H;
      const x = i * (barW + gap);
      const y = (H - barH) / 2;
      const radius = Math.min(barW / 2, 3);
      ctx.beginPath();
      ctx.roundRect(x, y, barW, barH, radius);
      ctx.fill();
    }
  }, [playing, accentColor]);

  useEffect(() => {
    frameRef.current = 0;
    rafRef.current = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(rafRef.current);
  }, [draw]);

  return (
    <canvas
      ref={canvasRef}
      width={480} height={64}
      style={{
        width: "100%", maxWidth: 480, height: 64,
        display: "block", margin: "0 auto 8px",
        opacity: playing ? 1 : 0.45,
        filter: playing ? "drop-shadow(0 0 5px rgba(207, 153, 93, 0.22))" : "none",
        transition: "opacity 0.6s ease",
      }}
    />
  );
}

// ── Download helper ───────────────────────────────────────────────────────────
function DownloadIcon({ size = 20 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
      <polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>
    </svg>
  );
}
function EQIcon({ size = 20 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round">
      <line x1="4" y1="21" x2="4" y2="14"/><line x1="4" y1="10" x2="4" y2="3"/>
      <line x1="12" y1="21" x2="12" y2="12"/><line x1="12" y1="8" x2="12" y2="3"/>
      <line x1="20" y1="21" x2="20" y2="16"/><line x1="20" y1="12" x2="20" y2="3"/>
      <line x1="1" y1="14" x2="7" y2="14"/><line x1="9" y1="8" x2="15" y2="8"/>
      <line x1="17" y1="16" x2="23" y2="16"/>
    </svg>
  );
}

async function downloadTrackInfo(track: { id: string; title: string; artist: string; album?: string | null; thumb?: string }) {
  const safeTitle = track.title.replace(/[^a-z0-9]/gi, "_");
  if (track.thumb) {
    try {
      let res = await fetch(`/api/thumb?url=${encodeURIComponent(track.thumb)}`);
      if (!res.ok) res = await fetch(track.thumb);
      if (res.ok) {
        const blob = await res.blob();
        const objUrl = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = objUrl; a.download = `${safeTitle}_cover.jpg`;
        document.body.appendChild(a); a.click(); document.body.removeChild(a);
        setTimeout(() => URL.revokeObjectURL(objUrl), 5000);
      }
    } catch {}
  }
  const meta = { id: track.id, title: track.title, artist: track.artist, album: track.album || null, youtubeUrl: `https://www.youtube.com/watch?v=${track.id}`, downloadedAt: new Date().toISOString() };
  const blob = new Blob([JSON.stringify(meta, null, 2)], { type: "application/json" });
  const jsonUrl = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = jsonUrl; a.download = `${safeTitle}_metadata.json`;
  document.body.appendChild(a); a.click(); document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(jsonUrl), 5000);
}

// ── Karaoke: highlight per-baris (bukan per-kata) ─────────────────────────────
// Highlight seluruh baris aktif sekaligus, dengan glow effect.
// Tidak ada animasi per-kata — baris langsung nyala saat waktunya tiba.

// ── CharStagger (tetap untuk lirik non-sync) ──────────────────────────────────
function CharStagger({ text, active, baseDelay = 0 }: { text: string; active: boolean; baseDelay?: number }) {
  if (!active) return <>{text}</>;
  return (
    <>
      {text.split("").map((ch, i) => (
        <span key={i} className="lyric-char" style={{ animationDelay: `${baseDelay + i * 11}ms` }}>
          {ch === " " ? "\u00a0" : ch}
        </span>
      ))}
    </>
  );
}

// ── Speed Control ─────────────────────────────────────────────────────────────
const SPEEDS = [0.75, 1, 1.25, 1.5];
function SpeedControl() {
  const [speed, setSpeed] = React.useState(1);
  const applySpeed = React.useCallback((s: number) => {
    setSpeed(s);
    try {
      const yt = (window as any)._nexaaYtPlayer;
      if (yt?.setPlaybackRate) yt.setPlaybackRate(s);
    } catch {}
    // Fallback: dispatch event for player to pick up
    window.dispatchEvent(new CustomEvent("nexaa:speed", { detail: { rate: s } }));
  }, []);

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 12 }}>
      <span style={{ fontSize: 11, color: "var(--dim)", fontWeight: 700, width: 36, textAlign: "right" }}>
        {speed}×
      </span>
      <div style={{ display: "flex", gap: 6, flex: 1 }}>
        {SPEEDS.map((s) => (
          <button
            key={s}
            onClick={() => applySpeed(s)}
            style={{
              flex: 1, padding: "5px 0", borderRadius: 99,
              background: speed === s ? "rgba(183, 164, 215, 0.25)" : "rgba(255,255,255,0.05)",
              border: `1px solid ${speed === s ? "rgba(183, 164, 215, 0.55)" : "rgba(255,255,255,0.08)"}`,
              color: speed === s ? "var(--accent)" : "var(--muted)",
              fontSize: 11, fontWeight: 700, cursor: "pointer",
              transition: "all 0.15s ease",
            }}
          >
            {s}×
          </button>
        ))}
      </div>
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────
export default function FullPlayer() {
  const p     = usePlayer();
  const toast = useToast();
  const [view, setView]   = useState<View>("player");
  const [liked, setLiked] = useState(false);
  const [drag, setDrag]   = useState<number | null>(null);

  const [lyrics,        setLyrics]        = useState<string[] | null>(null);
  const [synced,        setSynced]        = useState<{ time: number; text: string }[] | null>(null);
  const [lyricsLoading, setLyricsLoading] = useState(false);
  const [autoFollow,    setAutoFollow]    = useState(true);

  const userScrollingRef   = useRef(false);
  const userScrollTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lyricsForRef       = useRef<string | null>(null);
  const activeLineRef      = useRef<HTMLParagraphElement | null>(null);
  const lyricsBoxRef       = useRef<HTMLDivElement | null>(null);
  const fullRef            = useRef<HTMLDivElement | null>(null);

  const showQueue = view === "queue";
  const dominantColor = useDominantColor(p.current?.thumb);

  // ── Swipe gestures ──────────────────────────────────────────────────────────
  useSwipeGesture(fullRef, {
    enabled: p.fullOpen && view === "player",
    onSwipeLeft:  () => { p.next(); toast("⏭ Berikutnya"); },
    onSwipeRight: () => { p.prev(); toast("⏮ Sebelumnya"); },
    onSwipeDown:  () => p.setFullOpen(false),
    threshold: 65,
  });

  useEffect(() => {
    if (p.current) setLiked(isLiked(p.current.id));
  }, [p.current]);

  // ── Load lyrics ─────────────────────────────────────────────────────────────
  useEffect(() => {
    const cur = p.current;
    if (!cur || view !== "lyrics") return;
    if (lyricsForRef.current === cur.id) return;
    lyricsForRef.current = cur.id;
    setLyrics(null); setSynced(null); setLyricsLoading(true);
    const qs = new URLSearchParams({
      action: "lyrics", id: cur.id,
      title: cur.title, artist: cur.artist,
      dur: String(Math.round(cur.duration || 0)),
    });
    fetch(`/api/ytm?${qs}`)
      .then((r) => r.json())
      .then((d) => {
        setSynced(Array.isArray(d.synced) && d.synced.length ? d.synced : null);
        setLyrics(Array.isArray(d.lyrics) && d.lyrics.length ? d.lyrics : null);
        setLyricsLoading(false);
      })
      .catch(() => { setLyrics(null); setSynced(null); setLyricsLoading(false); });
  }, [p.current, view]);

  // ── Active lyric index ──────────────────────────────────────────────────────
  const activeIdx = synced
    ? (() => {
        let i = -1;
        for (let k = 0; k < synced.length; k++) {
          if (synced[k].time <= p.progress + 0.05) i = k; else break;
        }
        return i;
      })()
    : -1;

  // lineProgress & lineDuration tidak diperlukan — highlight per-baris langsung

  // ── Manual scroll detection ─────────────────────────────────────────────────
  useEffect(() => {
    const box = lyricsBoxRef.current;
    if (!box) return;
    const onScroll = () => {
      if (!autoFollow) return;
      userScrollingRef.current = true;
      if (userScrollTimerRef.current) clearTimeout(userScrollTimerRef.current);
      userScrollTimerRef.current = setTimeout(() => { userScrollingRef.current = false; }, 3000);
    };
    box.addEventListener("wheel", onScroll, { passive: true });
    box.addEventListener("touchmove", onScroll, { passive: true });
    return () => { box.removeEventListener("wheel", onScroll); box.removeEventListener("touchmove", onScroll); };
  }, [autoFollow, view, synced]);

  // ── Auto-scroll to active lyric ─────────────────────────────────────────────
  const scrollRafRef = useRef<number | null>(null);
  const scrollToActive = useCallback(() => {
    const el  = activeLineRef.current;
    const box = lyricsBoxRef.current;
    if (!el || !box) return;
    const boxRect  = box.getBoundingClientRect();
    const elRect   = el.getBoundingClientRect();
    const elRelTop = elRect.top - boxRect.top + box.scrollTop;
    // Posisi baris aktif 30% dari atas box agar jelas terlihat sedang dinyanyikan
    const target   = elRelTop - box.clientHeight * 0.30;
    const start    = box.scrollTop;
    const delta    = target - start;
    if (Math.abs(delta) < 1) return;
    const DURATION = 420;
    let startTime: number | null = null;
    const ease = (t: number) => t < 0.5 ? 8*t*t*t*t : 1 - Math.pow(-2*t+2,4)/2;
    if (scrollRafRef.current) cancelAnimationFrame(scrollRafRef.current);
    const step = (ts: number) => {
      if (!startTime) startTime = ts;
      const prog = Math.min((ts - startTime) / DURATION, 1);
      box.scrollTop = start + delta * ease(prog);
      if (prog < 1) scrollRafRef.current = requestAnimationFrame(step);
    };
    scrollRafRef.current = requestAnimationFrame(step);
  }, []);

  useEffect(() => {
    if (view !== "lyrics" || !synced) return;
    if (!autoFollow || userScrollingRef.current) return;
    scrollToActive();
    return () => { if (scrollRafRef.current) cancelAnimationFrame(scrollRafRef.current); };
  }, [activeIdx, view, synced, autoFollow, scrollToActive]);

  const handleFollowClick = useCallback(() => {
    // Reset flag scroll manual
    userScrollingRef.current = false;
    if (userScrollTimerRef.current) clearTimeout(userScrollTimerRef.current);
    // Aktifkan autoFollow dulu, lalu langsung scroll ke baris aktif
    setAutoFollow(true);
    // Double rAF: tunggu state update selesai sebelum scroll
    requestAnimationFrame(() => {
      requestAnimationFrame(() => scrollToActive());
    });
  }, [scrollToActive]);

  // ── Keyboard: Escape tutup player ──────────────────────────────────────────
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape" && view !== "eq") p.setFullOpen(false); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [p, view]);

  const cur = p.current;
  const pos = drag ?? p.progress;
  const pct = p.duration ? (pos / p.duration) * 100 : 0;

  return (
    <div
      ref={fullRef}
      className={`full ${p.fullOpen ? "open" : ""}`}
      aria-hidden={!p.fullOpen}
      style={{
        "--dyn-color-1": dominantColor,
        "--dyn-color-2": dominantColor.replace("0.55", "0.28"),
      } as React.CSSProperties}
    >
      {/* Dynamic BG overlay */}
      <div
        className="full-dyn-bg"
        style={{
          background: `
            radial-gradient(ellipse 110% 65% at 20% -5%, ${dominantColor.replace("0.55","0.72")} 0%, transparent 60%),
            radial-gradient(ellipse 80% 55% at 82% 22%, ${dominantColor.replace("0.55","0.42")} 0%, transparent 55%),
            radial-gradient(ellipse 65% 70% at 50% 95%, ${dominantColor.replace("0.55","0.32")} 0%, transparent 60%)
          `,
        }}
      />
      {p.notice && p.fullOpen && (
        <div className="toast" style={{ bottom: 90, zIndex: 130 }}>{p.notice}</div>
      )}
      {cur && (
        <div className="full-inner">
          <div className="full-handle" />

          {/* Header */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 4 }}>
            <button className="icon-btn" onClick={() => p.setFullOpen(false)} aria-label="Tutup player">
              <ChevronDownIcon size={22} />
            </button>
            <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.14em", textTransform: "uppercase", color: "var(--muted)" }}>
              {view === "queue" ? "Antrean" : view === "lyrics" ? "Lirik" : view === "eq" ? "Equalizer" : "Sedang Diputar"}
            </span>
            <div style={{ display: "flex", gap: 2 }}>
              {view === "player" && (
                <button
                  className="icon-btn"
                  aria-label="Unduh cover & metadata"
                  onClick={async () => {
                    toast("Mengunduh cover & metadata…");
                    await downloadTrackInfo({ id: cur.id, title: cur.title, artist: cur.artist, album: cur.album, thumb: cur.thumb });
                    toast("Cover & metadata berhasil diunduh ✓");
                  }}
                >
                  <DownloadIcon size={20} />
                </button>
              )}
              <button
                className={`icon-btn ${view === "eq" ? "accent" : ""}`}
                onClick={() => setView((v) => v === "eq" ? "player" : "eq")}
                aria-label="Equalizer"
                title="Equalizer"
              >
                <EQIcon size={20} />
              </button>
              <button
                className={`icon-btn ${view === "lyrics" ? "accent" : ""}`}
                onClick={() => setView((v) => v === "lyrics" ? "player" : "lyrics")}
                aria-label="Lirik"
              >
                <LyricsIcon size={21} />
              </button>
              <button
                className={`icon-btn ${showQueue ? "accent" : ""}`}
                onClick={() => setView((v) => v === "queue" ? "player" : "queue")}
                aria-label="Antrean"
              >
                <QueueIcon size={21} />
              </button>
            </div>
          </div>

          {/* ── VIEW: PLAYER ── */}
          {view === "player" && (
            <>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                className={`full-art ${p.playing ? "" : "paused"}`}
                src={cur.thumb} alt="" referrerPolicy="no-referrer"
              />

              {/* Swipe hint — hanya tampil sekali */}
              <div style={{ textAlign: "center", fontSize: 11, color: "var(--dim)", marginBottom: 6, letterSpacing: "0.04em" }}>
                ← Swipe untuk ganti lagu →
              </div>

              <Visualizer playing={p.playing} accentColor={dominantColor} />

              <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 18 }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: "clamp(16px,5vw,21px)", fontWeight: 800, letterSpacing: "-0.02em", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                    {cur.title}
                  </div>
                  <div className="muted" style={{ fontSize: 15, marginTop: 3, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                    {cur.artist}
                  </div>
                </div>
                <button
                  className="icon-btn"
                  style={{ color: liked ? "var(--accent)" : undefined }}
                  aria-label="Suka"
                  onClick={() => {
                    const now = toggleLike(cur);
                    setLiked(now);
                    toast(now ? "Ditambahkan ke Lagu Disukai" : "Dihapus dari Lagu Disukai");
                    window.dispatchEvent(new Event("mv:liked-changed"));
                  }}
                >
                  <HeartIcon filled={liked} size={24} />
                </button>
              </div>

              {/* Seek */}
              <input
                className="slider" type="range" min={0}
                max={Math.max(p.duration, 1)} value={pos}
                style={{ ["--fill" as any]: `${pct}%` }}
                onChange={(e) => setDrag(Number(e.target.value))}
                onPointerUp={() => { if (drag != null) { p.seek(drag); setDrag(null); } }}
                onKeyUp={() => { if (drag != null) { p.seek(drag); setDrag(null); } }}
                aria-label="Posisi lagu"
              />
              <div style={{ display: "flex", justifyContent: "space-between", marginTop: 8 }}>
                <span className="dim" style={{ fontSize: 12.5, fontVariantNumeric: "tabular-nums" }}>{fmtTime(pos)}</span>
                <span className="dim" style={{ fontSize: 12.5, fontVariantNumeric: "tabular-nums" }}>{fmtTime(p.duration)}</span>
              </div>

              {/* Controls */}
              <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 14, margin: "18px 0 8px" }}>
                <button className="icon-btn" style={{ color: p.shuffle ? "var(--accent)" : undefined }} onClick={p.toggleShuffle} aria-label="Acak">
                  <ShuffleIcon size={21} />
                </button>
                <button className="icon-btn" onClick={p.prev} aria-label="Sebelumnya" style={{ width: 52, height: 52 }}>
                  <PrevIcon size={28} />
                </button>
                <button className="play-fab" style={{ width: 72, height: 72 }} onClick={p.toggle} aria-label={p.playing ? "Jeda" : "Putar"}>
                  {p.playing ? <PauseIcon size={30} /> : <PlayIcon size={30} />}
                </button>
                <button className="icon-btn" onClick={p.next} aria-label="Berikutnya" style={{ width: 52, height: 52 }}>
                  <NextIcon size={28} />
                </button>
                <button className="icon-btn" style={{ color: p.repeat !== "off" ? "var(--accent)" : undefined }} onClick={p.cycleRepeat} aria-label="Ulangi">
                  {p.repeat === "one" ? <RepeatOneIcon size={21} /> : <RepeatIcon size={21} />}
                </button>
              </div>

              {/* Volume */}
              <div style={{ display: "flex", alignItems: "center", gap: 12, marginTop: 10 }}>
                <span className="dim"><VolumeIcon size={18} /></span>
                <input
                  className="slider" type="range" min={0} max={100} value={p.volume}
                  style={{ ["--fill" as any]: `${p.volume}%`, flex: 1 }}
                  onChange={(e) => p.setVolume(Number(e.target.value))}
                  aria-label="Volume"
                />
              </div>

              {/* Playback Speed */}
              <SpeedControl />
            </>
          )}

          {/* ── VIEW: EQUALIZER ── */}
          {view === "eq" && (
            <div style={{ marginTop: 14, flex: 1 }}>
              <Equalizer onClose={() => setView("player")} />
              <div style={{
                marginTop: 16, padding: "12px 16px",
                background: "rgba(255,255,255,0.03)",
                borderRadius: 14,
                border: "1px solid rgba(255,255,255,0.06)",
                fontSize: 12, color: "var(--muted)", lineHeight: 1.6,
              }}>
                💡 EQ berlaku pada audio output device. Karena YouTube stream cross-origin,
                preset ini menyimpan preferensi dan menerapkan efek via WebAudio API pada sesi aktif.
              </div>
            </div>
          )}

          {/* ── VIEW: LYRICS ── */}
          {view === "lyrics" && (
            <div style={{ marginTop: 10, flex: 1, display: "flex", flexDirection: "column" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 4px 14px" }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={cur.thumb} alt="" width={40} height={40} style={{ borderRadius: 10, objectFit: "cover", flexShrink: 0 }} referrerPolicy="no-referrer" />
                <div style={{ minWidth: 0, flex: 1 }}>
                  <div style={{ fontWeight: 700, fontSize: 14, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{cur.title}</div>
                  <div className="muted" style={{ fontSize: 12 }}>{cur.artist}</div>
                </div>
                {synced && (
                  <button
                    className={`lyric-follow-btn${autoFollow ? " on" : ""}`}
                    onClick={autoFollow ? () => setAutoFollow(false) : handleFollowClick}
                    title={autoFollow ? "Nonaktifkan ikuti lirik" : "Ikuti lirik aktif"}
                  >
                    <FollowIcon size={13} />
                    {autoFollow ? "Mengikuti" : "Ikuti"}
                  </button>
                )}
              </div>

              {lyricsLoading && (
                <div style={{ padding: "8px 4px" }}>
                  {[80, 65, 90, 55, 75, 60, 85].map((w, i) => (
                    <div key={i} className="skel" style={{ width: `${w}%`, height: 16, borderRadius: 999, marginBottom: 14 }} />
                  ))}
                </div>
              )}

              {!lyricsLoading && synced && (
                <div className="lyrics-scroll" ref={lyricsBoxRef}>
                  <div style={{ height: "12px" }} />
                  {synced.map((line, i) => {
                    const isActive = i === activeIdx;
                    const isPast   = i < activeIdx;
                    const dist     = Math.abs(i - activeIdx);
                    const blurPx   = isActive ? 0 : Math.min(dist * 0.6, 2.5);
                    const opacity  = isActive ? 1 : isPast
                      ? Math.max(0.18, 0.52 - dist * 0.10)
                      : Math.max(0.14, 0.46 - dist * 0.10);

                    return (
                      <p
                        key={i}
                        ref={i === activeIdx ? activeLineRef : undefined}
                        className={`lyrics-line sync ${isActive ? "active" : isPast ? "past" : ""}`}
                        onClick={() => { p.seek(line.time); }}
                        title={`Lompat ke ${Math.floor(line.time/60)}:${String(Math.floor(line.time%60)).padStart(2,"0")}`}
                        style={{
                          filter: blurPx > 0 ? `blur(${blurPx}px)` : undefined,
                          opacity,
                          cursor: "pointer",
                          userSelect: isActive ? "text" : "none",
                          // Highlight baris aktif — glow langsung seluruh baris
                          color: isActive ? "#fff" : undefined,
                          textShadow: isActive
                            ? "0 0 22px var(--dyn-color-1, rgba(183, 164, 215, 0.85)), 0 0 8px rgba(183, 164, 215, 0.5)"
                            : undefined,
                          transition: "color 0.18s ease, text-shadow 0.18s ease, opacity 0.18s ease, filter 0.18s ease",
                        }}
                      >
                        {line.text || "♪"}
                      </p>
                    );
                  })}
                  <div style={{ height: "60vh" }} />
                </div>
              )}

              {!lyricsLoading && !synced && lyrics && (
                <div className="lyrics-scroll">
                  {lyrics.map((line, i) =>
                    line.trim() ? (
                      <p key={i} className="lyrics-line">{line}</p>
                    ) : (
                      <div key={i} style={{ height: 18 }} />
                    )
                  )}
                </div>
              )}

              {!lyricsLoading && !lyrics && !synced && (
                <div className="empty" style={{ padding: "40px 20px" }}>
                  <div className="big">🎤</div>
                  <p>Lirik tidak tersedia untuk lagu ini.</p>
                </div>
              )}
            </div>
          )}

          {/* ── VIEW: QUEUE ── */}
          {view === "queue" && (
            <div style={{ marginTop: 14, flex: 1 }}>
              {p.queue.map((t, i) => (
                <div
                  key={t.id + i}
                  className={`trow ${i === p.index ? "playing" : ""}`}
                  onClick={() => p.jumpTo(i)}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={t.thumb} alt="" loading="lazy" referrerPolicy="no-referrer" />
                  <div className="meta">
                    <div className="tt">{t.title}</div>
                    <div className="ts">{t.artist}</div>
                  </div>
                  {i === p.index ? (
                    <span className={`eq ${p.playing ? "" : "paused"}`}>
                      <span style={{ height: "40%" }} />
                      <span style={{ height: "90%" }} />
                      <span style={{ height: "60%" }} />
                    </span>
                  ) : (
                    <button className="icon-btn" aria-label="Hapus dari antrean" onClick={(e) => { e.stopPropagation(); p.removeFromQueue(i); }}>
                      <TrashIcon size={17} />
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
