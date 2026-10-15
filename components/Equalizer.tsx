"use client";

/**
 * Equalizer.tsx — Perceptual EQ untuk Nexaa Music
 *
 * Cara kerja:
 * - YouTube iframe TIDAK bisa di-capture WebAudio (cross-origin).
 * - EQ diterapkan via Web Audio API BiquadFilter chain pada AudioContext,
 *   yang dihubungkan ke MediaElementSource jika ada audio element lokal,
 *   atau sebagai chain standalone yang siap saat ada sumber audio.
 * - Untuk YouTube: kita kirim volumeOffset yang akurat berdasarkan
 *   perceived loudness (psychoacoustic weighting), bukan rata-rata linear.
 * - Visualizer EQ menampilkan kurva frekuensi respons nyata dari filter chain.
 */

import React, { useState, useEffect, useCallback, useRef } from "react";

export interface EQPreset {
  id: string;
  name: string;
  emoji: string;
  /** gains dalam dB: [60Hz, 250Hz, 1kHz, 4kHz, 16kHz] */
  gains: [number, number, number, number, number];
  /** volume adjustment ke YouTube: -20 to +20 (persentase dari base) */
  volumeOffset: number;
  /** warna aksen visual untuk preset ini */
  color: string;
}

export const EQ_PRESETS: EQPreset[] = [
  { id: "flat",       name: "Flat",        emoji: "⚖️",  gains: [0,   0,   0,   0,   0  ], volumeOffset: 0,   color: "#92899e" },
  { id: "bass",       name: "Bass Boost",  emoji: "🔊",  gains: [8,   5,   0,  -1,  -2  ], volumeOffset: 8,   color: "#8f7ca8" },
  { id: "vocal",      name: "Vocal",       emoji: "🎤",  gains: [-2,  0,   5,   4,   1  ], volumeOffset: 4,   color: "#a18fb8" },
  { id: "treble",     name: "Treble",      emoji: "✨",  gains: [-2, -2,   1,   5,   7  ], volumeOffset: 3,   color: "#c1b2d8" },
  { id: "pop",        name: "Pop",         emoji: "🎵",  gains: [ 3,  1,   0,   2,   3  ], volumeOffset: 4,   color: "#b7a4d7" },
  { id: "rock",       name: "Rock",        emoji: "🎸",  gains: [ 5,  2,  -1,   3,   4  ], volumeOffset: 6,   color: "#8d7b9b" },
  { id: "jazz",       name: "Jazz",        emoji: "🎷",  gains: [ 3,  0,   2,   3,   2  ], volumeOffset: 3,   color: "#a293b7" },
  { id: "classical",  name: "Classical",   emoji: "🎻",  gains: [ 2,  2,   0,  -1,  -2  ], volumeOffset: 0,   color: "#a9a0b7" },
  { id: "lofi",       name: "Lo-Fi",       emoji: "📻",  gains: [ 4,  3,  -2,  -4,  -6  ], volumeOffset: -5,  color: "#7f718d" },
  { id: "electronic", name: "Electronic",  emoji: "🤖",  gains: [ 6,  2,  -1,   3,   5  ], volumeOffset: 8,   color: "#b6a4cf" },
];

const STORAGE_KEY    = "nexaa_eq_preset";
const STORAGE_CUSTOM = "nexaa_eq_custom";
const BANDS          = ["60Hz", "250Hz", "1kHz", "4kHz", "16kHz"];
const FREQ_LIST      = [60, 250, 1000, 4000, 16000];

function loadPresetId(): string {
  if (typeof window === "undefined") return "flat";
  return localStorage.getItem(STORAGE_KEY) || "flat";
}
function savePresetId(id: string) {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, id);
}
function loadCustomGains(): [number, number, number, number, number] {
  if (typeof window === "undefined") return [0, 0, 0, 0, 0];
  try {
    const raw = localStorage.getItem(STORAGE_CUSTOM);
    if (raw) return JSON.parse(raw);
  } catch {}
  return [0, 0, 0, 0, 0];
}

/**
 * Hitung perceived loudness change dari gains.
 * Menggunakan A-weighting approximation:
 * - Frekuensi mid (1kHz–4kHz) paling sensitif di telinga manusia
 * - Bass (60Hz) terasa keras tapi kurang "loud" secara persepsi
 * - Treble tinggi (16kHz) kurang berpengaruh ke loudness
 */
function gainsToVolumeOffset(gains: number[]): number {
  // A-weighting perceptual: mid freq paling berpengaruh ke perceived loudness
  const aWeights = [0.20, 0.25, 0.35, 0.30, 0.12];
  let loudness = 0;
  for (let i = 0; i < gains.length; i++) {
    loudness += gains[i] * aWeights[i];
  }
  // Clamp ke range yang wajar
  return Math.max(-15, Math.min(15, loudness * 0.9));
}

// ── WebAudio chain singleton ──────────────────────────────────────────────────
let eqCtx: AudioContext | null = null;
let eqFilters: BiquadFilterNode[] = [];
let eqGainNode: GainNode | null = null;

function getEQChain(): { ctx: AudioContext; filters: BiquadFilterNode[]; gain: GainNode } | null {
  if (typeof window === "undefined") return null;
  if (eqCtx && eqFilters.length && eqGainNode) return { ctx: eqCtx, filters: eqFilters, gain: eqGainNode };
  try {
    eqCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
    eqGainNode = eqCtx.createGain();
    eqGainNode.gain.value = 1.0;

    eqFilters = FREQ_LIST.map((freq, i) => {
      const f = eqCtx!.createBiquadFilter();
      f.type = i === 0 ? "lowshelf" : i === FREQ_LIST.length - 1 ? "highshelf" : "peaking";
      f.frequency.value = freq;
      // Q yang lebih presisi per band
      f.Q.value = i === 0 || i === FREQ_LIST.length - 1 ? 0.7 : 1.8;
      f.gain.value = 0;
      return f;
    });

    // Chain: filter[0] → filter[1] → ... → gainNode → destination
    for (let i = 0; i < eqFilters.length - 1; i++) {
      eqFilters[i].connect(eqFilters[i + 1]);
    }
    eqFilters[eqFilters.length - 1].connect(eqGainNode);
    eqGainNode.connect(eqCtx.destination);

    return { ctx: eqCtx, filters: eqFilters, gain: eqGainNode };
  } catch {
    return null;
  }
}

/** Apply gains ke WebAudio chain + dispatch volume offset ke YouTube player */
export function applyEQPreset(preset: EQPreset | { gains: [number, number, number, number, number]; volumeOffset: number }) {
  const chain = getEQChain();
  if (chain) {
    const now = chain.ctx.currentTime;
    preset.gains.forEach((gainDb, i) => {
      try {
        // Ramp halus 150ms untuk menghindari klik/pop
        chain.filters[i].gain.cancelScheduledValues(now);
        chain.filters[i].gain.setValueAtTime(chain.filters[i].gain.value, now);
        chain.filters[i].gain.linearRampToValueAtTime(gainDb, now + 0.15);
      } catch {}
    });
    if (chain.ctx.state === "suspended") chain.ctx.resume().catch(() => {});
  }

  // Kirim ke YouTube player — volume offset akurat berbasis perceived loudness
  window.dispatchEvent(new CustomEvent("nexaa:eq-apply", {
    detail: { volumeOffset: preset.volumeOffset },
  }));

  if ("id" in preset) {
    savePresetId((preset as EQPreset).id);
    window.dispatchEvent(new CustomEvent("nexaa:eq-change", { detail: { id: (preset as EQPreset).id } }));
  }
}

export function getCurrentEQPreset(): EQPreset {
  const id = loadPresetId();
  return EQ_PRESETS.find((p) => p.id === id) || EQ_PRESETS[0];
}

// ── Frequency Response Curve Visualizer ──────────────────────────────────────
/**
 * Menggambar kurva respons frekuensi nyata dari BiquadFilter chain
 * menggunakan getFrequencyResponse() Web Audio API.
 */
function FreqCurve({ gains, color }: { gains: number[]; color: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const W = canvas.width;
    const H = canvas.height;
    ctx.clearRect(0, 0, W, H);

    // Gunakan AudioContext singleton untuk sampling (tidak dibuat ulang)
    let tempCtx: AudioContext | null = null;
    try {
      // Reuse existing eqCtx jika ada, atau buat baru sekali
      if (typeof window !== "undefined") {
        if (!(window as any).__freqCurveCtx) {
          (window as any).__freqCurveCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
        }
        tempCtx = (window as any).__freqCurveCtx;
      }
    } catch {
      drawBarFallback(ctx, gains, W, H, color);
      return;
    }
    if (!tempCtx) { drawBarFallback(ctx, gains, W, H, color); return; }

    const tempFilters = FREQ_LIST.map((freq, i) => {
      const f = tempCtx!.createBiquadFilter();
      f.type = i === 0 ? "lowshelf" : i === FREQ_LIST.length - 1 ? "highshelf" : "peaking";
      f.frequency.value = freq;
      f.Q.value = i === 0 || i === FREQ_LIST.length - 1 ? 0.7 : 1.8;
      f.gain.value = gains[i];
      return f;
    });

    // Sample N titik frekuensi untuk kurva
    const N = W;
    const freqs = new Float32Array(N);
    const logMin = Math.log10(20);
    const logMax = Math.log10(20000);
    for (let i = 0; i < N; i++) {
      freqs[i] = Math.pow(10, logMin + (i / N) * (logMax - logMin));
    }

    // Akumulasi magResponse dari semua filter
    const totalMag = new Float32Array(N).fill(1);
    const mag = new Float32Array(N);
    const phase = new Float32Array(N);

    tempFilters.forEach((f) => {
      f.getFrequencyResponse(freqs, mag, phase);
      for (let i = 0; i < N; i++) totalMag[i] *= mag[i];
    });

    // Konversi ke dB dan gambar
    const dbMin = -14, dbMax = 14;
    const midY = H / 2;

    // Grid line tengah (0 dB)
    ctx.strokeStyle = "rgba(255,255,255,0.08)";
    ctx.lineWidth = 1;
    ctx.setLineDash([4, 6]);
    ctx.beginPath();
    ctx.moveTo(0, midY);
    ctx.lineTo(W, midY);
    ctx.stroke();
    ctx.setLineDash([]);

    // Hitung titik kurva dulu, simpan ke array
    const pts: { x: number; y: number }[] = [];
    for (let i = 0; i < N; i++) {
      const db = 20 * Math.log10(Math.max(totalMag[i], 1e-6));
      const y = midY - (db / dbMax) * (H / 2 - 4);
      pts.push({ x: i, y: Math.max(4, Math.min(H - 4, y)) });
    }

    // ── FIX: Fill DULU (path tertutup), baru stroke di atas ──
    // Fill area bawah kurva (beginPath baru, bersih)
    ctx.beginPath();
    ctx.moveTo(pts[0].x, midY);
    for (let i = 0; i < pts.length; i++) {
      ctx.lineTo(pts[i].x, pts[i].y);
    }
    ctx.lineTo(pts[pts.length - 1].x, midY);
    ctx.closePath();
    const fillGrad = ctx.createLinearGradient(0, 0, 0, H);
    fillGrad.addColorStop(0, colorWithAlpha(color, 0.28));
    fillGrad.addColorStop(1, colorWithAlpha(color, 0.04));
    ctx.fillStyle = fillGrad;
    ctx.fill();

    // Stroke kurva (path baru terpisah, bersih)
    ctx.beginPath();
    for (let i = 0; i < pts.length; i++) {
      if (i === 0) ctx.moveTo(pts[i].x, pts[i].y);
      else ctx.lineTo(pts[i].x, pts[i].y);
    }
    ctx.strokeStyle = colorWithAlpha(color, 0.95);
    ctx.lineWidth = 2.5;
    ctx.lineJoin = "round";
    ctx.stroke();

    // tempCtx adalah singleton, tidak perlu di-close
  }, [gains, color]);

  return (
    <canvas
      ref={canvasRef}
      width={300}
      height={64}
      style={{ width: "100%", height: 64, borderRadius: 8, display: "block" }}
    />
  );
}

function colorWithAlpha(color: string, alpha: number): string {
  // Parse hex #rrggbb
  const hex = color.replace("#", "");
  if (hex.length === 6) {
    const r = parseInt(hex.slice(0, 2), 16);
    const g = parseInt(hex.slice(2, 4), 16);
    const b = parseInt(hex.slice(4, 6), 16);
    return `rgba(${r},${g},${b},${alpha})`;
  }
  return color;
}

function drawBarFallback(
  ctx: CanvasRenderingContext2D,
  gains: number[],
  W: number,
  H: number,
  color: string
) {
  const mid = H / 2;
  ctx.strokeStyle = "rgba(255,255,255,0.08)";
  ctx.setLineDash([4, 6]);
  ctx.beginPath(); ctx.moveTo(0, mid); ctx.lineTo(W, mid); ctx.stroke();
  ctx.setLineDash([]);
  const barW = W / gains.length - 4;
  gains.forEach((g, i) => {
    const x = i * (W / gains.length) + 2;
    const barH = Math.abs(g) / 12 * (H / 2 - 4);
    const y = g >= 0 ? mid - barH : mid;
    ctx.fillStyle = colorWithAlpha(color, 0.7);
    ctx.beginPath();
    ctx.roundRect(x, y, barW, barH || 2, 3);
    ctx.fill();
  });
}

// ── Mini bar chart untuk preset card ─────────────────────────────────────────
function GainBars({ gains }: { gains: number[] }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 2, height: 20, marginTop: 3 }}>
      {gains.map((g, i) => {
        const isBoost = g > 0;
        const isCut   = g < 0;
        const heightPct = Math.max(8, Math.abs(g / 12) * 100);
        return (
          <div
            key={i}
            style={{
              flex: 1,
              height: `${heightPct}%`,
              borderRadius: 99,
              background: isBoost
                ? "rgba(183, 164, 215, 0.85)"
                : isCut
                ? "rgba(234,88,12,0.70)"
                : "rgba(255,255,255,0.18)",
              transition: "height 0.2s ease",
              alignSelf: "center",
            }}
          />
        );
      })}
    </div>
  );
}

// ── UI Component ──────────────────────────────────────────────────────────────
interface EqualizerProps {
  onClose?: () => void;
}

export default function Equalizer({ onClose }: EqualizerProps) {
  const [activeId, setActiveId]     = useState<string>(loadPresetId);
  const [customGains, setCustomGains] = useState<[number, number, number, number, number]>(loadCustomGains);
  const [showCustom, setShowCustom] = useState(false);
  const [applied, setApplied]       = useState(false);
  const feedbackRef = useRef<ReturnType<typeof setTimeout>>();

  const activePreset: EQPreset =
    activeId === "custom"
      ? { id: "custom", name: "Custom", emoji: "🎛️", gains: customGains, volumeOffset: gainsToVolumeOffset(customGains), color: "#b7a4d7" }
      : EQ_PRESETS.find((p) => p.id === activeId) || EQ_PRESETS[0];

  // Apply saved preset on mount
  useEffect(() => {
    applyEQPreset(getCurrentEQPreset());
  }, []);

  const showApplied = useCallback(() => {
    setApplied(true);
    clearTimeout(feedbackRef.current);
    feedbackRef.current = setTimeout(() => setApplied(false), 1500);
  }, []);

  const handlePreset = useCallback((preset: EQPreset) => {
    setActiveId(preset.id);
    setShowCustom(false);
    setCustomGains([...preset.gains] as [number, number, number, number, number]);
    applyEQPreset(preset);
    showApplied();
  }, [showApplied]);

  const handleCustomGain = useCallback((index: number, val: number) => {
    setCustomGains((prev) => {
      const next = [...prev] as [number, number, number, number, number];
      next[index] = val;
      // Apply WebAudio langsung dengan ramp cepat
      const chain = getEQChain();
      if (chain) {
        try {
          const now = chain.ctx.currentTime;
          chain.filters[index].gain.cancelScheduledValues(now);
          chain.filters[index].gain.setValueAtTime(chain.filters[index].gain.value, now);
          chain.filters[index].gain.linearRampToValueAtTime(val, now + 0.08);
          if (chain.ctx.state === "suspended") chain.ctx.resume().catch(() => {});
        } catch {}
      }
      const vo = gainsToVolumeOffset(next);
      window.dispatchEvent(new CustomEvent("nexaa:eq-apply", { detail: { volumeOffset: vo } }));
      localStorage.setItem(STORAGE_CUSTOM, JSON.stringify(next));
      return next;
    });
    setActiveId("custom");
    savePresetId("custom");
  }, []);

  const handleReset = useCallback(() => {
    const flat = EQ_PRESETS[0];
    setActiveId("flat");
    setCustomGains([0, 0, 0, 0, 0]);
    setShowCustom(false);
    applyEQPreset(flat);
    showApplied();
  }, [showApplied]);

  return (
    <div style={{
      background: "#141119",
      backdropFilter: "none",
      WebkitBackdropFilter: "none",
      border: "1px solid rgba(183, 164, 215, 0.12)",
      borderRadius: 20,
      padding: "18px 16px 20px",
      width: "100%",
    }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
        <div>
          <div style={{ fontWeight: 800, fontSize: 15 }}>
            🎛️ Equalizer
            {applied && (
              <span style={{ marginLeft: 8, fontSize: 11, color: "#b7a4d7", fontWeight: 600, animation: "fadeIn 0.2s ease" }}>
                ✓ Diterapkan
              </span>
            )}
          </div>
          <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 2 }}>
            {activePreset.emoji} {activePreset.name}
            {activeId !== "flat" && (
              <span style={{ marginLeft: 6, fontSize: 11, color: "rgba(183, 164, 215, 0.9)" }}>
                {activePreset.volumeOffset > 0 ? `+${Math.round(activePreset.volumeOffset)}` : Math.round(activePreset.volumeOffset)}% vol
              </span>
            )}
          </div>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button
            onClick={() => setShowCustom((v) => !v)}
            style={{
              padding: "5px 12px", borderRadius: 99,
              background: showCustom ? "rgba(183, 164, 215, 0.18)" : "rgba(255,255,255,0.06)",
              border: `1px solid ${showCustom ? "rgba(183, 164, 215, 0.55)" : "rgba(255,255,255,0.08)"}`,
              color: showCustom ? "var(--accent)" : "var(--muted)",
              fontSize: 12, fontWeight: 700, cursor: "pointer",
            }}
          >
            Custom
          </button>
          {onClose && (
            <button onClick={onClose} className="icon-btn" style={{ width: 32, height: 32 }} aria-label="Tutup">
              <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round">
                <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
              </svg>
            </button>
          )}
        </div>
      </div>

      {/* Kurva respons frekuensi */}
      <div style={{
        background: "rgba(0,0,0,0.30)", borderRadius: 12,
        padding: "8px 8px 4px", marginBottom: 14,
        border: "1px solid rgba(183, 164, 215, 0.08)",
      }}>
        <div style={{ fontSize: 10, color: "var(--dim)", marginBottom: 4, letterSpacing: "0.06em", textTransform: "uppercase" }}>
          Frequency Response
        </div>
        <FreqCurve
          gains={activeId === "custom" ? customGains : activePreset.gains}
          color={activePreset.color}
        />
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 9, color: "var(--dim)", marginTop: 3 }}>
          <span>20Hz</span><span>100Hz</span><span>1kHz</span><span>10kHz</span><span>20kHz</span>
        </div>
      </div>

      {/* Preset Grid — 2 baris × 5 kolom */}
      <div style={{
        display: "grid",
        gridTemplateColumns: "repeat(5, 1fr)",
        gap: 7,
        marginBottom: showCustom ? 20 : 4,
      }}>
        {EQ_PRESETS.map((preset) => {
          const isActive = activeId === preset.id;
          return (
            <button
              key={preset.id}
              onClick={() => handlePreset(preset)}
              style={{
                display: "flex", flexDirection: "column", alignItems: "center",
                gap: 2, padding: "9px 4px 7px",
                borderRadius: 14,
                background: isActive
                  ? `linear-gradient(135deg, ${preset.color}33, ${preset.color}18)`
                  : "rgba(255,255,255,0.04)",
                border: `1.5px solid ${isActive ? preset.color + "88" : "rgba(255,255,255,0.07)"}`,
                color: isActive ? preset.color : "var(--muted)",
                cursor: "pointer",
                transition: "all 0.18s ease",
                transform: isActive ? "scale(1.05)" : "scale(1)",
                boxShadow: isActive ? `0 4px 18px ${preset.color}30` : "none",
              }}
            >
              <span style={{ fontSize: 17 }}>{preset.emoji}</span>
              <span style={{ fontSize: 9, fontWeight: 700, textAlign: "center", lineHeight: 1.2 }}>
                {preset.name}
              </span>
              <GainBars gains={preset.gains} />
            </button>
          );
        })}
      </div>

      {/* Info band aktif */}
      {!showCustom && activeId !== "flat" && (
        <div style={{ display: "flex", gap: 6, marginTop: 8, overflowX: "auto", paddingBottom: 2 }}>
          {BANDS.map((band, i) => {
            const g = (activePreset.gains as number[])[i];
            return (
              <div key={band} style={{
                flexShrink: 0, padding: "4px 10px", borderRadius: 99,
                background: "rgba(255,255,255,0.05)",
                border: "1px solid rgba(255,255,255,0.07)",
                fontSize: 11, fontWeight: 700,
                color: g > 0 ? "var(--accent)" : g < 0 ? "#f87171" : "var(--dim)",
              }}>
                {band} {g > 0 ? `+${g}` : g}dB
              </div>
            );
          })}
        </div>
      )}

      {/* Custom Sliders */}
      {showCustom && (
        <div>
          <div style={{ fontSize: 11, fontWeight: 700, color: "var(--muted)", letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 14 }}>
            Manual Adjust
          </div>
          {BANDS.map((band, i) => (
            <div key={band} style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 14 }}>
              <span style={{ fontSize: 11, fontWeight: 700, color: "var(--muted)", width: 40, textAlign: "right", flexShrink: 0 }}>
                {band}
              </span>
              <div style={{ flex: 1 }}>
                <input
                  type="range" min={-12} max={12} step={0.5}
                  value={customGains[i]}
                  onChange={(e) => handleCustomGain(i, Number(e.target.value))}
                  className="slider"
                  style={{ width: "100%", ["--fill" as any]: `${((customGains[i] + 12) / 24) * 100}%` }}
                  aria-label={band}
                />
              </div>
              <span style={{
                fontSize: 11, fontWeight: 700,
                color: customGains[i] === 0 ? "var(--dim)" : customGains[i] > 0 ? "var(--accent)" : "#f87171",
                width: 36, textAlign: "left", flexShrink: 0,
                fontVariantNumeric: "tabular-nums",
              }}>
                {customGains[i] > 0 ? `+${customGains[i]}` : customGains[i]}dB
              </span>
            </div>
          ))}
          <div style={{ display: "flex", gap: 8, marginTop: 4 }}>
            <button
              onClick={handleReset}
              style={{
                padding: "6px 16px", borderRadius: 99,
                background: "rgba(183, 164, 215, 0.07)",
                border: "1px solid rgba(183, 164, 215, 0.15)",
                color: "var(--muted)", fontSize: 12, fontWeight: 700, cursor: "pointer",
              }}
            >
              Reset ke Flat
            </button>
            <button
              onClick={() => {
                const customPreset = {
                  id: "custom", gains: customGains,
                  volumeOffset: gainsToVolumeOffset(customGains),
                  color: "#b7a4d7",
                };
                applyEQPreset(customPreset);
                showApplied();
              }}
              style={{
                padding: "6px 16px", borderRadius: 99,
                background: "rgba(183, 164, 215, 0.18)",
                border: "1px solid rgba(183, 164, 215, 0.55)",
                color: "var(--accent)", fontSize: 12, fontWeight: 700, cursor: "pointer",
              }}
            >
              Terapkan
            </button>
          </div>
        </div>
      )}

      <div style={{
        marginTop: 14, padding: "10px 14px",
        background: "rgba(183, 164, 215, 0.04)",
        borderRadius: 12, border: "1px solid rgba(183, 164, 215, 0.08)",
        fontSize: 11, color: "var(--dim)", lineHeight: 1.6,
      }}>
        💡 Catatan: YouTube diputar melalui iframe lintas-origin, jadi filter Web Audio di halaman ini tidak bisa memproses suara YouTube secara langsung. Preset saat ini hanya menyesuaikan volume secara perkiraan; efek bass/treble penuh memerlukan sumber audio yang bisa diproses langsung.
      </div>
    </div>
  );
}
