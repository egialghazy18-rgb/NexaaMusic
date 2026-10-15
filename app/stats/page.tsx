"use client";

import React, { useEffect, useState } from "react";
import { getStats, resetStats, type PlayStats } from "@/lib/storage";
import { usePlayer } from "@/lib/player";
import Reveal from "@/components/Reveal";

function fmtTime(sec: number): string {
  if (sec < 60) return `${sec} detik`;
  if (sec < 3600) return `${Math.floor(sec / 60)} menit`;
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  return `${h} jam ${m} menit`;
}

function StatCard({ label, value, sub, accent }: { label: string; value: string; sub?: string; accent?: boolean }) {
  return (
    <div style={{
      background: accent
        ? "linear-gradient(135deg, rgba(183,164,215,.085), rgba(255,255,255,.02))"
        : "rgba(255,255,255,0.04)",
      border: `1px solid ${accent ? "rgba(183, 164, 215, 0.28)" : "rgba(255,255,255,0.08)"}`,
      borderTop: `1px solid ${accent ? "rgba(183, 164, 215, 0.40)" : "rgba(255,255,255,0.14)"}`,
      borderRadius: 20,
      padding: "22px 20px",
      backdropFilter: "none",
      WebkitBackdropFilter: "none",
      boxShadow: "0 8px 24px rgba(0,0,0,0.14)",
    }}>
      <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: "0.08em", color: "var(--muted)", marginBottom: 10, textTransform: "uppercase" }}>{label}</div>
      <div style={{ fontSize: 32, fontWeight: 900, letterSpacing: "-0.04em", color: accent ? "var(--accent)" : "var(--text)", lineHeight: 1 }}>{value}</div>
      {sub && <div style={{ fontSize: 12, color: "var(--dim)", marginTop: 6, fontWeight: 500 }}>{sub}</div>}
    </div>
  );
}

export default function StatsPage() {
  const [stats, setStats] = useState<PlayStats | null>(null);
  const player = usePlayer();

  useEffect(() => {
    setStats(getStats());
  }, []);

  const refresh = () => setStats(getStats());

  if (!stats) return <main className="page"><div className="empty"><div className="big">📊</div></div></main>;

  // Top artists
  const topArtists = Object.entries(stats.artists)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);

  // Top tracks
  const topTracks = Object.values(stats.tracks)
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  // Daily chart (last 14 days)
  const last14: { date: string; label: string; count: number }[] = [];
  for (let i = 13; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const key = d.toISOString().slice(0, 10);
    const label = i === 0 ? "Hari ini" : i === 1 ? "Kemarin" : d.toLocaleDateString("id-ID", { weekday: "short", day: "numeric" });
    last14.push({ date: key, label, count: stats.dailyPlays[key] || 0 });
  }
  const maxDay = Math.max(...last14.map((d) => d.count), 1);

  const totalMinutes = Math.floor(stats.totalSeconds / 60);

  return (
    <main className="page">
      <Reveal>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24 }}>
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.12em", color: "var(--accent)", marginBottom: 6 }}>STATISTIK</div>
            <h1 className="h1">Aktivitas Musik</h1>
          </div>
          <button
            className="chip"
            style={{ fontSize: 12, color: "var(--danger)", borderColor: "rgba(248,113,113,0.3)" }}
            onClick={() => {
              if (confirm("Reset semua statistik?")) {
                resetStats();
                refresh();
              }
            }}
          >
            Reset
          </button>
        </div>
      </Reveal>

      {/* Summary cards */}
      <Reveal delay={40}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(150px, 1fr))", gap: 12, marginBottom: 28 }}>
          <StatCard label="Total Lagu" value={stats.totalPlays.toString()} sub="diputar sejak awal" accent />
          <StatCard label="Waktu Dengar" value={totalMinutes >= 60 ? `${Math.floor(totalMinutes/60)}j ${totalMinutes%60}m` : `${totalMinutes}m`} sub={fmtTime(stats.totalSeconds)} />
          <StatCard label="Artis Unik" value={Object.keys(stats.artists).length.toString()} sub="pernah diputar" />
          <StatCard label="Lagu Unik" value={Object.keys(stats.tracks).length.toString()} sub="pernah diputar" />
        </div>
      </Reveal>

      {/* Sedang diputar sekarang */}
      {player.current && (
        <Reveal delay={60} className="shelf">
          <div className="shelf-head"><h2 className="h2">▶ Sedang Diputar</h2></div>
          <div style={{
            display: "flex", alignItems: "center", gap: 14,
            background: "#131118", borderRadius: 16,
            padding: "14px 16px",
            border: "1px solid rgba(255,255,255,0.09)",
            borderTop: "1px solid rgba(255,255,255,0.15)",
            backdropFilter: "none",
            WebkitBackdropFilter: "none",
            boxShadow: "none",
          }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={player.current.thumb} alt="" style={{ width: 52, height: 52, borderRadius: 12, objectFit: "cover" }} referrerPolicy="no-referrer" />
            <div>
              <div style={{ fontWeight: 700, fontSize: 15 }}>{player.current.title}</div>
              <div style={{ color: "var(--muted)", fontSize: 13, marginTop: 3 }}>{player.current.artist}</div>
            </div>
          </div>
        </Reveal>
      )}

      {/* Activity chart */}
      {stats.totalPlays > 0 && (
        <Reveal delay={80} className="shelf">
          <div className="shelf-head"><h2 className="h2">📅 Aktivitas 14 Hari</h2></div>
          <div style={{ display: "flex", alignItems: "flex-end", gap: 6, height: 100, padding: "0 4px" }}>
            {last14.map((d) => (
              <div key={d.date} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
                <div style={{ fontSize: 10, color: "var(--dim)", fontWeight: 600, whiteSpace: "nowrap", overflow: "hidden", width: "100%", textAlign: "center" }}>
                  {d.count > 0 ? d.count : ""}
                </div>
                <div style={{
                  width: "100%",
                  height: d.count === 0 ? 4 : Math.max(8, (d.count / maxDay) * 72),
                  borderRadius: 6,
                  background: d.count === 0
                    ? "rgba(255,255,255,0.05)"
                    : `linear-gradient(to top, #766781, #b7a4d7)`,
                  boxShadow: d.count > 0 ? "0 0 8px rgba(183, 164, 215, 0.3)" : "none",
                  transition: "height 0.4s ease",
                }} />
                <div style={{ fontSize: 9, color: "var(--dim)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", width: "100%", textAlign: "center" }}>
                  {d.label.split(" ")[0]}
                </div>
              </div>
            ))}
          </div>
        </Reveal>
      )}

      {/* Top artists */}
      {topArtists.length > 0 && (
        <Reveal delay={100} className="shelf">
          <div className="shelf-head"><h2 className="h2">🎤 Artis Favoritmu</h2></div>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {topArtists.map(([artist, count], i) => (
              <div key={artist} style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <span style={{
                  width: 28, height: 28, borderRadius: "50%", flexShrink: 0,
                  background: i === 0
                    ? "linear-gradient(135deg,#88778f,#b7a4d7)"
                    : i === 1 ? "linear-gradient(135deg,#45404f,#80758e)"
                    : "rgba(255,255,255,0.07)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 12, fontWeight: 800, color: i < 2 ? "#fff" : "var(--dim)"
                }}>
                  {i + 1}
                </span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 4 }}>{artist}</div>
                  <div style={{ height: 4, borderRadius: 999, background: "rgba(255,255,255,0.06)", overflow: "hidden" }}>
                    <div style={{
                      height: "100%", borderRadius: 999,
                      width: `${(count / topArtists[0][1]) * 100}%`,
                      background: "linear-gradient(90deg, #766781, #b7a4d7)",
                      transition: "width 0.8s ease",
                    }} />
                  </div>
                </div>
                <span style={{ fontSize: 13, fontWeight: 700, color: "var(--muted)", flexShrink: 0 }}>{count}×</span>
              </div>
            ))}
          </div>
        </Reveal>
      )}

      {/* Top tracks */}
      {topTracks.length > 0 && (
        <Reveal delay={120} className="shelf">
          <div className="shelf-head"><h2 className="h2">🔥 Lagu Paling Sering</h2></div>
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            {topTracks.map((t, i) => (
              <div key={t.title} style={{ display: "flex", alignItems: "center", gap: 12, padding: "8px 10px", borderRadius: 12 }}>
                <span style={{ fontSize: 13, fontWeight: 800, color: "var(--dim)", width: 20, textAlign: "center", flexShrink: 0 }}>{i + 1}</span>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={t.thumb} alt="" style={{ width: 42, height: 42, borderRadius: 10, objectFit: "cover", flexShrink: 0 }} referrerPolicy="no-referrer" />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 600, fontSize: 14, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{t.title}</div>
                  <div style={{ color: "var(--muted)", fontSize: 12, marginTop: 2 }}>{t.artist}</div>
                </div>
                <span style={{ fontSize: 12, fontWeight: 700, color: "var(--accent)", flexShrink: 0 }}>{t.count}×</span>
              </div>
            ))}
          </div>
        </Reveal>
      )}

      {stats.totalPlays === 0 && (
        <div className="empty" style={{ marginTop: 40 }}>
          <div className="big">🎵</div>
          <p>Belum ada data. Putar lagu dulu untuk mulai tracking!</p>
        </div>
      )}
    </main>
  );
}
