"use client";

/**
 * KeyboardShortcuts.tsx — Global keyboard shortcuts + overlay help
 * 
 * Shortcuts:
 *  Space / K     → Play / Pause
 *  ArrowLeft / J → -10s
 *  ArrowRight / L → +10s
 *  ArrowUp       → Volume +10
 *  ArrowDown     → Volume -10
 *  M             → Mute / Unmute
 *  N             → Next track
 *  P             → Prev track
 *  S             → Toggle shuffle
 *  R             → Cycle repeat
 *  F             → Open / close full player
 *  ?             → Show shortcuts overlay
 *  Escape        → Close overlay / full player
 */

import React, { useEffect, useState, useCallback } from "react";
import { usePlayer } from "@/lib/player";

interface Shortcut {
  keys: string[];
  label: string;
  category: "Playback" | "Navigation" | "App";
}

const SHORTCUTS: Shortcut[] = [
  { keys: ["Space", "K"], label: "Play / Pause",          category: "Playback"   },
  { keys: ["←", "J"],    label: "Mundur 10 detik",        category: "Playback"   },
  { keys: ["→", "L"],    label: "Maju 10 detik",          category: "Playback"   },
  { keys: ["↑"],         label: "Volume +10",              category: "Playback"   },
  { keys: ["↓"],         label: "Volume -10",              category: "Playback"   },
  { keys: ["M"],         label: "Mute / Unmute",           category: "Playback"   },
  { keys: ["N"],         label: "Lagu berikutnya",         category: "Navigation" },
  { keys: ["P"],         label: "Lagu sebelumnya",         category: "Navigation" },
  { keys: ["S"],         label: "Toggle shuffle",          category: "Navigation" },
  { keys: ["R"],         label: "Ganti mode repeat",       category: "Navigation" },
  { keys: ["F"],         label: "Buka / tutup full player",category: "App"        },
  { keys: ["?"],         label: "Tampilkan shortcut ini",  category: "App"        },
  { keys: ["Esc"],       label: "Tutup overlay",           category: "App"        },
];

export default function KeyboardShortcuts() {
  const p = usePlayer();
  const [show, setShow] = useState(false);
  const [prevVol, setPrevVol] = useState<number | null>(null);

  const handleKey = useCallback((e: KeyboardEvent) => {
    // Jangan intercept saat user sedang mengetik di input/textarea
    const tag = (e.target as HTMLElement).tagName;
    if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;
    if ((e.target as HTMLElement).isContentEditable) return;

    switch (e.code || e.key) {
      case "Space":
      case "KeyK":
        e.preventDefault();
        p.toggle();
        break;
      case "ArrowLeft":
      case "KeyJ":
        e.preventDefault();
        p.seek(Math.max(0, p.progress - 10));
        break;
      case "ArrowRight":
      case "KeyL":
        e.preventDefault();
        p.seek(Math.min(p.duration, p.progress + 10));
        break;
      case "ArrowUp":
        e.preventDefault();
        p.setVolume(Math.min(100, p.volume + 10));
        break;
      case "ArrowDown":
        e.preventDefault();
        p.setVolume(Math.max(0, p.volume - 10));
        break;
      case "KeyM":
        if (p.volume > 0) {
          setPrevVol(p.volume);
          p.setVolume(0);
        } else {
          p.setVolume(prevVol ?? 80);
        }
        break;
      case "KeyN":
        p.next();
        break;
      case "KeyP":
        p.prev();
        break;
      case "KeyS":
        p.toggleShuffle();
        break;
      case "KeyR":
        p.cycleRepeat();
        break;
      case "KeyF":
        p.setFullOpen(!p.fullOpen);
        break;
      case "Slash":
        if (e.shiftKey) { e.preventDefault(); setShow((v) => !v); }
        break;
      case "Escape":
        if (show) { setShow(false); e.preventDefault(); }
        break;
    }
  }, [p, show, prevVol]);

  useEffect(() => {
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [handleKey]);

  if (!show) return null;

  const categories = ["Playback", "Navigation", "App"] as const;

  return (
    <div
      style={{
        position: "fixed", inset: 0,
        background: "rgba(0,0,0,0.72)",
        backdropFilter: "blur(16px)",
        WebkitBackdropFilter: "blur(16px)",
        zIndex: 200,
        display: "flex", alignItems: "center", justifyContent: "center",
        padding: 24,
        animation: "fadeIn 0.22s ease both",
      }}
      onClick={() => setShow(false)}
    >
      <div
        style={{
          background: "rgba(18,16,24,0.98)",
          backdropFilter: "none",
          WebkitBackdropFilter: "none",
          border: "1px solid rgba(255,255,255,0.12)",
          borderRadius: 22,
          padding: "24px 28px 28px",
          width: "min(520px, 100%)",
          maxHeight: "85vh", overflowY: "auto",
          boxShadow: "0 24px 58px rgba(0,0,0,0.48)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 22 }}>
          <div>
            <div style={{ fontWeight: 800, fontSize: 17 }}>⌨️ Keyboard Shortcuts</div>
            <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 3 }}>
              Gunakan shortcut ini saat tidak sedang mengetik
            </div>
          </div>
          <button
            onClick={() => setShow(false)}
            className="icon-btn"
            aria-label="Tutup"
          >
            <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>

        {categories.map((cat) => (
          <div key={cat} style={{ marginBottom: 20 }}>
            <div style={{
              fontSize: 10, fontWeight: 800, letterSpacing: "0.14em",
              textTransform: "uppercase", color: "var(--accent)",
              marginBottom: 10,
            }}>
              {cat}
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              {SHORTCUTS.filter((s) => s.category === cat).map((s) => (
                <div
                  key={s.label}
                  style={{
                    display: "flex", alignItems: "center", justifyContent: "space-between",
                    padding: "9px 12px", borderRadius: 10,
                    background: "rgba(255,255,255,0.03)",
                    border: "1px solid rgba(255,255,255,0.05)",
                  }}
                >
                  <span style={{ fontSize: 13.5, color: "var(--text)" }}>{s.label}</span>
                  <div style={{ display: "flex", gap: 5 }}>
                    {s.keys.map((k) => (
                      <kbd
                        key={k}
                        style={{
                          display: "inline-flex", alignItems: "center", justifyContent: "center",
                          padding: "3px 8px",
                          background: "rgba(183, 164, 215, 0.14)",
                          border: "1px solid rgba(183, 164, 215, 0.32)",
                          borderBottom: "2px solid rgba(183, 164, 215, 0.45)",
                          borderRadius: 7,
                          fontSize: 11, fontWeight: 700,
                          color: "var(--accent)",
                          fontFamily: "monospace",
                          minWidth: 28, textAlign: "center",
                        }}
                      >
                        {k}
                      </kbd>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}

        {/* Footer hint */}
        <div style={{
          marginTop: 16, padding: "10px 14px",
          background: "rgba(183, 164, 215, 0.08)",
          border: "1px solid rgba(183, 164, 215, 0.18)",
          borderRadius: 12,
          fontSize: 12, color: "var(--muted)", textAlign: "center",
        }}>
          Tekan <kbd style={{ padding: "1px 6px", background: "rgba(183, 164, 215, 0.15)", borderRadius: 5, fontFamily: "monospace", fontSize: 11, color: "var(--accent)" }}>?</kbd> kapan saja untuk membuka/menutup overlay ini
        </div>
      </div>
    </div>
  );
}
