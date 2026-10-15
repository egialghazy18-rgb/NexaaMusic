"use client";

import React, { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import type { Track, AlbumCard, PlaylistCard } from "@/lib/types";
import { usePlayer } from "@/lib/player";
import Reveal from "@/components/Reveal";
import TrackRow from "@/components/TrackRow";
import { AlbumCardView, PlaylistCardView } from "@/components/Cards";
import { PlayIcon, ShuffleIcon } from "@/components/Icons";

interface RelatedArtist {
  id: string;
  name: string;
  thumb: string;
  subscribers?: string;
}

interface ArtistData {
  id: string;
  name: string;
  thumb: string;
  description: string;
  subscribers: string;
  topSongs: Track[];
  topAlbums: AlbumCard[];
  playlists: PlaylistCard[];
  relatedArtists?: RelatedArtist[];
}

const SONGS_INITIAL = 5;
const SONGS_STEP = 5;

export default function ArtistPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [data, setData] = useState<ArtistData | null>(null);
  const [error, setError] = useState(false);
  const [descExpanded, setDescExpanded] = useState(false);
  const [visibleSongs, setVisibleSongs] = useState(SONGS_INITIAL);
  const [loadingMore, setLoadingMore] = useState(false);
  const player = usePlayer();

  useEffect(() => {
    setData(null);
    setError(false);
    setVisibleSongs(SONGS_INITIAL);
    fetch(`/api/ytm?action=artist&id=${id}`)
      .then((r) => r.json())
      .then((d) => (d.error ? setError(true) : setData(d)))
      .catch(() => setError(true));
  }, [id]);

  const handleLoadMore = useCallback(() => {
    if (!data) return;
    const nextVisible = visibleSongs + SONGS_STEP;
    setVisibleSongs(nextVisible);
    // Jika masih butuh lebih dan ada API support, bisa fetch tambahan
  }, [data, visibleSongs]);

  const displayedSongs = data?.topSongs.slice(0, visibleSongs) ?? [];
  const hasMoreSongs = data ? visibleSongs < data.topSongs.length : false;

  if (error)
    return (
      <main className="page">
        <div className="empty"><div className="big">😕</div><p>Gagal memuat artis.</p></div>
      </main>
    );

  if (!data)
    return (
      <main className="page">
        <div className="hero">
          <div className="skel" style={{ width: 168, height: 168, borderRadius: 999 }} />
          <div style={{ flex: 1 }}>
            <div className="skel" style={{ width: 80, height: 12, borderRadius: 999, marginBottom: 12 }} />
            <div className="skel" style={{ width: "70%", height: 34, borderRadius: 999, marginBottom: 10 }} />
            <div className="skel" style={{ width: 120, height: 12, borderRadius: 999 }} />
          </div>
        </div>
        <div style={{ padding: "8px 0" }}>
          {[85,70,90,65,80].map((w, i) => (
            <div key={i} className="skel" style={{ width: `${w}%`, height: 52, borderRadius: 14, marginBottom: 8 }} />
          ))}
        </div>
      </main>
    );

  return (
    <main className="page">
      <Reveal>
        <div className="hero">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img className="round" src={data.thumb} alt={data.name} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div className="kicker">Artis</div>
            <h1 style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{data.name}</h1>
            {data.subscribers && (
              <div style={{ fontSize: 13, color: "var(--muted)", marginTop: 4, fontWeight: 500 }}>
                {data.subscribers} subscriber
              </div>
            )}
            <div style={{ display: "flex", gap: 10, marginTop: 12, flexWrap: "wrap" }}>
              <button
                className="play-fab"
                aria-label="Putar semua"
                onClick={() => player.playQueue(data.topSongs)}
                title="Putar semua lagu"
              >
                <PlayIcon size={24} />
              </button>
              <button
                className="chip"
                onClick={() => {
                  const shuffled = [...data.topSongs].sort(() => Math.random() - 0.5);
                  player.playQueue(shuffled);
                }}
              >
                <ShuffleIcon size={16} /> Acak
              </button>
            </div>
          </div>
        </div>
      </Reveal>

      {/* Deskripsi artis */}
      {data.description && (
        <Reveal delay={40}>
          <div style={{
            background: "rgba(255,255,255,0.04)",
            border: "1px solid rgba(255,255,255,0.07)",
            borderRadius: 18,
            padding: "18px 20px",
            marginBottom: 8,
          }}>
            <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: "0.08em", color: "var(--accent)", marginBottom: 10, textTransform: "uppercase" }}>
              Tentang {data.name}
            </div>
            <p style={{
              fontSize: 14,
              color: "var(--muted)",
              lineHeight: 1.75,
              fontWeight: 500,
              display: descExpanded ? "block" : "-webkit-box",
              WebkitLineClamp: descExpanded ? undefined : 4,
              WebkitBoxOrient: "vertical" as const,
              overflow: descExpanded ? "visible" : "hidden",
              whiteSpace: "pre-line",
            }}>
              {data.description}
            </p>
            {data.description.length > 200 && (
              <button
                onClick={() => setDescExpanded((e) => !e)}
                style={{ marginTop: 10, fontSize: 13, color: "var(--accent)", fontWeight: 600, background: "none", border: "none", cursor: "pointer", padding: 0 }}
              >
                {descExpanded ? "Tampilkan lebih sedikit ↑" : "Selengkapnya ↓"}
              </button>
            )}
          </div>
        </Reveal>
      )}

      {/* Lagu Populer */}
      <Reveal className="shelf" delay={80}>
        <div className="shelf-head">
          <h2 className="h2">Lagu Populer</h2>
          <span style={{ fontSize: 12, color: "var(--muted)", fontWeight: 500 }}>
            {displayedSongs.length} / {data.topSongs.length}
          </span>
        </div>
        {displayedSongs.map((t, i) => (
          <TrackRow key={t.id + i} track={t} index={i} showIndex queue={data.topSongs} />
        ))}

        {/* Load More / Next */}
        {hasMoreSongs && (
          <button
            onClick={handleLoadMore}
            style={{
              width: "100%",
              marginTop: 10,
              padding: "14px 0",
              borderRadius: 14,
              background: "rgba(183, 164, 215, 0.10)",
              border: "1px solid rgba(183, 164, 215, 0.25)",
              color: "var(--accent)",
              fontSize: 14,
              fontWeight: 700,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 8,
              transition: "background 0.18s ease",
            }}
            onMouseOver={(e) => (e.currentTarget.style.background = "rgba(183, 164, 215, 0.18)")}
            onMouseOut={(e) => (e.currentTarget.style.background = "rgba(183, 164, 215, 0.10)")}
          >
            <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
              <polyline points="6 9 12 15 18 9" />
            </svg>
            Tampilkan {Math.min(SONGS_STEP, data.topSongs.length - visibleSongs)} lagu berikutnya
          </button>
        )}

        {/* Show All button jika ada jauh lebih banyak */}
        {!hasMoreSongs && data.topSongs.length > SONGS_INITIAL && (
          <div style={{ textAlign: "center", marginTop: 6, fontSize: 12, color: "var(--dim)" }}>
            ✓ Semua {data.topSongs.length} lagu ditampilkan
          </div>
        )}
      </Reveal>

      {/* Album */}
      {data.topAlbums.length > 0 && (
        <Reveal className="shelf" delay={140}>
          <div className="shelf-head">
            <h2 className="h2">Album</h2>
          </div>
          <div className="shelf-row">
            {data.topAlbums.map((a) => (
              <AlbumCardView key={a.id} album={a} />
            ))}
          </div>
        </Reveal>
      )}

      {/* Playlist */}
      {data.playlists && data.playlists.length > 0 && (
        <Reveal className="shelf" delay={180}>
          <div className="shelf-head">
            <h2 className="h2">Playlist</h2>
          </div>
          <div className="shelf-row">
            {data.playlists.map((p) => (
              <PlaylistCardView key={p.id} playlist={p} />
            ))}
          </div>
        </Reveal>
      )}

      {/* Related Artists */}
      {data.relatedArtists && data.relatedArtists.length > 0 && (
        <Reveal className="shelf" delay={220}>
          <div className="shelf-head">
            <h2 className="h2">Artis Serupa</h2>
          </div>
          <div className="shelf-row" style={{ gap: 12 }}>
            {data.relatedArtists.map((a) => (
              <button
                key={a.id}
                onClick={() => router.push(`/artist/${a.id}`)}
                style={{
                  flexShrink: 0,
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  gap: 8,
                  padding: "12px 10px",
                  borderRadius: 18,
                  background: "rgba(255,255,255,0.04)",
                  border: "1px solid rgba(255,255,255,0.07)",
                  cursor: "pointer",
                  width: 108,
                  transition: "background 0.18s ease",
                }}
                onMouseOver={(e) => (e.currentTarget.style.background = "rgba(255,255,255,0.08)")}
                onMouseOut={(e) => (e.currentTarget.style.background = "rgba(255,255,255,0.04)")}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={a.thumb}
                  alt={a.name}
                  width={72}
                  height={72}
                  style={{ borderRadius: "50%", objectFit: "cover", flexShrink: 0 }}
                  referrerPolicy="no-referrer"
                />
                <div style={{
                  fontSize: 12, fontWeight: 700, textAlign: "center",
                  color: "var(--fg)",
                  whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
                  width: "100%",
                }}>
                  {a.name}
                </div>
                {a.subscribers && (
                  <div style={{ fontSize: 10, color: "var(--dim)", marginTop: -4 }}>
                    {a.subscribers}
                  </div>
                )}
              </button>
            ))}
          </div>
        </Reveal>
      )}
    </main>
  );
}
