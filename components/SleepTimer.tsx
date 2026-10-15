"use client";

import React, { useEffect, useRef, useState } from "react";
import { usePlayer } from "@/lib/player";

const PRESETS = [5, 10, 15, 20, 30, 45, 60, 90];

function MoonIcon({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
    </svg>
  );
}

export default function SleepTimer() {
  const player = usePlayer();
  const [open, setOpen] = useState(false);
  const [remaining, setRemaining] = useState<number | null>(null); // seconds
  const timerRef = useRef<ReturnType<typeof setInterval>>();
  const endRef    = useRef<number | null>(null);

  const start = (minutes: number) => {
    clearInterval(timerRef.current);
    endRef.current = Date.now() + minutes * 60 * 1000;
    setRemaining(minutes * 60);
    timerRef.current = setInterval(() => {
      const left = Math.max(0, Math.round((endRef.current! - Date.now()) / 1000));
      setRemaining(left);
      if (left === 0) {
        clearInterval(timerRef.current);
        player.toggle(); // pause
        endRef.current = null;
      }
    }, 1000);
    setOpen(false);
  };

  const cancel = () => {
    clearInterval(timerRef.current);
    endRef.current = null;
    setRemaining(null);
  };

  useEffect(() => () => clearInterval(timerRef.current), []);

  const fmt = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m}:${sec.toString().padStart(2, "0")}`;
  };

  return (
    <>
      <button
        className="icon-btn"
        aria-label="Sleep Timer"
        style={{ position: "relative", color: remaining !== null ? "var(--accent)" : "var(--muted)" }}
        onClick={() => setOpen((o) => !o)}
      >
        <MoonIcon size={18} />
        {remaining !== null && (
          <span style={{
            position: "absolute", top: -2, right: -2,
            background: "var(--accent)", color: "#fff",
            fontSize: 8, fontWeight: 800, borderRadius: 999,
            padding: "1px 4px", lineHeight: 1.4, whiteSpace: "nowrap",
          }}>
            {fmt(remaining)}
          </span>
        )}
      </button>

      {open && (
        <>
          <div
            style={{ position: "fixed", inset: 0, zIndex: 200 }}
            onClick={() => setOpen(false)}
          />
          <div style={{
            position: "fixed", bottom: 180, left: "50%", transform: "translateX(-50%)",
            zIndex: 201, width: 260,
            background: "rgba(18,16,24,0.98)",
            backdropFilter: "none",
            border: "1px solid rgba(183, 164, 215, 0.28)",
            borderRadius: 20,
            padding: "18px 16px",
            boxShadow: "0 16px 42px rgba(0,0,0,0.42)",
          }}>
            <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 14, display: "flex", alignItems: "center", gap: 8 }}>
              <MoonIcon size={15} />
              Sleep Timer
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: remaining !== null ? 12 : 0 }}>
              {PRESETS.map((m) => (
                <button
                  key={m}
                  className="chip"
                  style={{ padding: "6px 14px", fontSize: 13 }}
                  onClick={() => start(m)}
                >
                  {m}m
                </button>
              ))}
            </div>
            {remaining !== null && (
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", paddingTop: 10, borderTop: "1px solid rgba(255,255,255,0.07)" }}>
                <span style={{ fontSize: 13, color: "var(--muted)" }}>
                  Berhenti dalam <strong style={{ color: "var(--accent)" }}>{fmt(remaining)}</strong>
                </span>
                <button
                  className="chip"
                  style={{ padding: "5px 12px", fontSize: 12, color: "var(--danger)", borderColor: "rgba(248,113,113,0.3)" }}
                  onClick={cancel}
                >
                  Batal
                </button>
              </div>
            )}
          </div>
        </>
      )}
    </>
  );
}
