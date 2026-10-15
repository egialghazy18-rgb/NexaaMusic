"use client";

import React, { useEffect, useState, useCallback } from "react";
import type { Track } from "@/lib/types";
import { usePlayer } from "@/lib/player";
import Reveal from "@/components/Reveal";
import TrackRow from "@/components/TrackRow";
import { SparkleIcon, PlayIcon, ShuffleIcon } from "@/components/Icons";

interface TrendingSection {
  title: string;
  emoji: string;
  query: string;
  tracks: Track[];
}

function RefreshIcon({ size = 20 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 12a9 9 0 0 1 15-6.7L21 8" />
      <path d="M21 3v5h-5" />
      <path d="M21 12a9 9 0 0 1-15 6.7L3 16" />
      <path d="M3 21v-5h5" />
    </svg>
  );
}

const SECTIONS = [
  { title: "Trending Global",   emoji: "🌍", query: "top hits 2025 global" },
  { title: "Hits Indonesia",    emoji: "🇮🇩", query: "lagu hits indonesia 2025" },
  { title: "Hip-Hop & R&B",    emoji: "⚡", query: "hip hop rnb hits 2025" },
  { title: "Pop Terbaik",       emoji: "🎤", query: "pop hits 2025" },
  { title: "Chill & Lo-fi",    emoji: "🌙", query: "lofi chill acoustic 2025" },
  { title: "K-Pop",            emoji: "🇰🇷", query: "kpop hits 2025" },
];

export default function TrendingPage() {
  const [sections, setSections] = useState<TrendingSection[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeSection, setActiveSection] = useState(0);
  const player = usePlayer();

  const load = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);

    try {
      const results = await Promise.allSettled(
        SECTIONS.map(({ query }) =>
          fetch(`/api/ytm?action=search&q=${encodeURIComponent(query)}`)
            .then((r) => r.json())
            .then((d) => (d.songs as Track[]) || [])
            .catch(() => [] as Track[])
        )
      );

      const loaded: TrendingSection[] = SECTIONS.map((s, i) => ({
        ...s,
        tracks: results[i].status === "fulfilled" ? (results[i] as PromiseFulfilledResult<Track[]>).value : [],
      })).filter((s) => s.tracks.length > 0);

      setSections(loaded);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const current = sections[activeSection];

  return (
    <main className="page">
      <Reveal>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
              <span style={{ color: "var(--accent)" }}><SparkleIcon size={18} /></span>
              <span style={{ fontSize: 12, fontWeight: 700, letterSpacing: "0.1em", color: "var(--accent)" }}>TRENDING</span>
            </div>
            <h1 className="h1">Lagu Populer</h1>
          </div>
          <button
            className="chip"
            style={{ gap: 6, padding: "8px 14px" }}
            onClick={() => load(true)}
            disabled={refreshing}
          >
            <span style={{ display: "flex", transition: "transform 0.5s", transform: refreshing ? "rotate(360deg)" : "none" }}>
              <RefreshIcon size={15} />
            </span>
            {refreshing ? "Memuat…" : "Refresh"}
          </button>
        </div>
      </Reveal>

      {/* Category tabs */}
      {!loading && sections.length > 0 && (
        <Reveal delay={60}>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 20 }}>
            {sections.map((s, i) => (
              <button
                key={s.query}
                className={`chip ${activeSection === i ? "active" : ""}`}
                onClick={() => setActiveSection(i)}
              >
                {s.emoji} {s.title}
              </button>
            ))}
          </div>
        </Reveal>
      )}

      {/* Loading skeleton */}
      {loading && (
        <div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 20 }}>
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="skel" style={{ width: 110, height: 36, borderRadius: 999 }} />
            ))}
          </div>
          {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map((i) => (
            <div key={i} style={{ display: "flex", gap: 12, alignItems: "center", padding: "8px 10px" }}>
              <div className="skel" style={{ width: 24, height: 14, borderRadius: 999, flexShrink: 0 }} />
              <div className="skel" style={{ width: 46, height: 46, borderRadius: 12 }} />
              <div style={{ flex: 1 }}>
                <div className="skel" style={{ width: "55%", height: 14, borderRadius: 999, marginBottom: 7 }} />
                <div className="skel" style={{ width: "35%", height: 12, borderRadius: 999 }} />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Track list */}
      {!loading && current && (
        <Reveal key={current.query} className="shelf">
          <div className="shelf-head" style={{ marginBottom: 12 }}>
            <h2 className="h2">{current.emoji} {current.title}</h2>
            <div style={{ display: "flex", gap: 8 }}>
              <button
                className="play-fab"
                style={{ width: 36, height: 36 }}
                aria-label="Putar semua"
                onClick={() => player.playQueue(current.tracks)}
              >
                <PlayIcon size={18} />
              </button>
              <button
                className="chip"
                onClick={() => {
                  const shuffled = [...current.tracks].sort(() => Math.random() - 0.5);
                  player.playQueue(shuffled);
                }}
              >
                <ShuffleIcon size={15} /> Acak
              </button>
            </div>
          </div>
          <div>
            {current.tracks.map((t, i) => (
              <TrackRow
                key={t.id}
                track={t}
                index={i}
                showIndex
                queue={current.tracks}
              />
            ))}
          </div>
        </Reveal>
      )}

      {!loading && sections.length === 0 && (
        <div className="empty">
          <div className="big">📡</div>
          <p>Gagal memuat trending. Coba refresh.</p>
        </div>
      )}
    </main>
  );
}
