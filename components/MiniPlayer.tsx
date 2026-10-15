"use client";

import React from "react";
import { usePlayer } from "@/lib/player";
import { PlayIcon, PauseIcon, NextIcon } from "./Icons";
import SleepTimer from "./SleepTimer";

export default function MiniPlayer() {
  const p = usePlayer();
  if (!p.current || p.fullOpen) return null;

  const pct = p.duration ? (p.progress / p.duration) * 100 : 0;

  return (
    <>
      {p.notice && <div className="toast">{p.notice}</div>}
      <div className="mini" onClick={() => p.setFullOpen(true)} role="button" aria-label="Buka player">
        <div className="mini-inner">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={p.current.thumb} alt="" referrerPolicy="no-referrer" />
          <div className="meta">
            <div className="tt">{p.current.title}</div>
            <div className="ts">{p.current.artist}</div>
          </div>
          <span onClick={(e) => e.stopPropagation()}>
            <SleepTimer />
          </span>
          <button
            className="play-fab"
            aria-label={p.playing ? "Jeda" : "Putar"}
            onClick={(e) => {
              e.stopPropagation();
              p.toggle();
            }}
          >
            {p.loading ? (
              <span
                style={{
                  width: 17,
                  height: 17,
                  borderRadius: 999,
                  border: "2.5px solid rgba(255,255,255,0.25)",
                  borderTopColor: "#ffffff",
                  animation: "spin .8s linear infinite",
                  display: "inline-block",
                }}
              />
            ) : p.playing ? (
              <PauseIcon size={19} />
            ) : (
              <PlayIcon size={19} />
            )}
          </button>
          <button
            className="icon-btn"
            aria-label="Lagu berikutnya"
            onClick={(e) => {
              e.stopPropagation();
              p.next();
            }}
          >
            <NextIcon size={20} />
          </button>
        </div>
        <div className="mini-bar">
          <div style={{ width: `${pct}%` }} />
        </div>
        <style jsx>{`
          @keyframes spin { to { transform: rotate(360deg); } }
        `}</style>
      </div>
    </>
  );
}

