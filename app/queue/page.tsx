"use client";

import React from "react";
import { usePlayer, fmtTime } from "@/lib/player";
import { useTrackSheet } from "@/components/TrackSheet";
import Reveal from "@/components/Reveal";
import { PlayIcon, TrashIcon, ShuffleIcon, MoreIcon } from "@/components/Icons";
export default function QueuePage() {
  const player = usePlayer();
  const openSheet = useTrackSheet();
  const queue = player.queue ?? [];
  const currentIdx = player.index ?? 0;

  const upcoming = queue.slice(currentIdx + 1);
  const played   = queue.slice(0, currentIdx);

  if (queue.length === 0) {
    return (
      <main className="page">
        <Reveal>
          <h1 className="h1" style={{ marginBottom: 24 }}>Antrean</h1>
        </Reveal>
        <div className="empty">
          <div className="big">🎵</div>
          <p>Antrean kosong. Putar lagu dulu.</p>
        </div>
      </main>
    );
  }

  return (
    <main className="page">
      <Reveal>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
          <h1 className="h1">Antrean</h1>
          <div style={{ display: "flex", gap: 8 }}>
            <button
              className="chip"
              onClick={() => player.toggleShuffle()}
            >
              <ShuffleIcon size={15} /> Acak
            </button>
            <button
              className="chip"
              style={{ color: "var(--danger)" }}
              onClick={() => {
                // Clear queue by playing empty — remove all after current
                const q = player.queue ?? [];
                for (let i = q.length - 1; i > (player.index ?? 0); i--) {
                  player.removeFromQueue(i);
                }
              }}
            >
              <TrashIcon size={15} /> Hapus
            </button>
          </div>
        </div>
      </Reveal>

      {/* Now playing */}
      {player.current && (
        <Reveal className="shelf" delay={40}>
          <div className="shelf-head">
            <h2 className="h2" style={{ color: "var(--accent)" }}>▶ Sedang Diputar</h2>
          </div>
          <div
            className="trow playing"
            role="button"
            onClick={() => player.current && openSheet(player.current)}
            style={{ background: "var(--active-bg)", borderRadius: "var(--r-lg)", border: "1px solid rgba(183, 164, 215, 0.2)" }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={player.current.thumb} alt="" loading="lazy" referrerPolicy="no-referrer" />
            <div className="meta">
              <div className="tt">{player.current.title}</div>
              <div className="ts">{player.current.artist}</div>
            </div>
            <span className="dur">{player.current.duration ? fmtTime(player.current.duration) : ""}</span>
            <div className="row-actions">
              <button className="icon-btn" aria-label="Menu" onClick={(e) => { e.stopPropagation(); player.current && openSheet(player.current); }}>
                <MoreIcon size={19} />
              </button>
            </div>
          </div>
        </Reveal>
      )}

      {/* Upcoming */}
      {upcoming.length > 0 && (
        <Reveal className="shelf" delay={80}>
          <div className="shelf-head">
            <h2 className="h2">Selanjutnya</h2>
            <span className="dim" style={{ fontSize: 12.5 }}>{upcoming.length} lagu</span>
          </div>
          {upcoming.map((t, i) => (
            <div
              key={`${t.id}-${currentIdx + 1 + i}`}
              className="trow"
              role="button"
              onClick={() => player.jumpTo(currentIdx + 1 + i)}
            >
              <span className="num" style={{ color: "var(--dim)", minWidth: 24, textAlign: "center", fontSize: 13 }}>
                {i + 1}
              </span>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={t.thumb} alt="" loading="lazy" referrerPolicy="no-referrer" />
              <div className="meta">
                <div className="tt">{t.title}</div>
                <div className="ts">{t.artist}</div>
              </div>
              <span className="dur">{t.duration ? fmtTime(t.duration) : ""}</span>
              <div className="row-actions">
                <button
                  className="icon-btn"
                  aria-label="Putar"
                  onClick={(e) => { e.stopPropagation(); player.jumpTo(currentIdx + 1 + i); }}
                >
                  <PlayIcon size={17} />
                </button>
                <button className="icon-btn" aria-label="Menu" onClick={(e) => { e.stopPropagation(); openSheet(t); }}>
                  <MoreIcon size={19} />
                </button>
              </div>
            </div>
          ))}
        </Reveal>
      )}

      {/* Previously played */}
      {played.length > 0 && (
        <Reveal className="shelf" delay={120}>
          <div className="shelf-head">
            <h2 className="h2" style={{ color: "var(--dim)" }}>Sudah Diputar</h2>
            <span className="dim" style={{ fontSize: 12.5 }}>{played.length} lagu</span>
          </div>
          {[...played].reverse().map((t, i) => (
            <div
              key={`${t.id}-played-${i}`}
              className="trow"
              role="button"
              style={{ opacity: 0.5 }}
              onClick={() => player.jumpTo(currentIdx - 1 - i)}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={t.thumb} alt="" loading="lazy" referrerPolicy="no-referrer" />
              <div className="meta">
                <div className="tt">{t.title}</div>
                <div className="ts">{t.artist}</div>
              </div>
              <span className="dur">{t.duration ? fmtTime(t.duration) : ""}</span>
              <div className="row-actions">
                <button className="icon-btn" aria-label="Menu" onClick={(e) => { e.stopPropagation(); openSheet(t); }}>
                  <MoreIcon size={19} />
                </button>
              </div>
            </div>
          ))}
        </Reveal>
      )}
    </main>
  );
}
