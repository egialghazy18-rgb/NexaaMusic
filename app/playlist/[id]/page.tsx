"use client";

import React, { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import type { Track } from "@/lib/types";
import { usePlayer } from "@/lib/player";
import { getPlaylist, removeFromPlaylist } from "@/lib/storage";
import { useToast } from "@/components/Toast";
import Reveal from "@/components/Reveal";
import TrackRow from "@/components/TrackRow";
import { PlayIcon, ShuffleIcon, TrashIcon, MusicNoteIcon } from "@/components/Icons";

interface PLData {
  id: string;
  name: string;
  artist?: string;
  thumb: string;
  tracks: Track[];
  local?: boolean;
}

export default function PlaylistPage() {
  const { id } = useParams<{ id: string }>();
  const [data, setData] = useState<PLData | null>(null);
  const [error, setError] = useState(false);
  const player = usePlayer();
  const toast = useToast();
  const isLocal = typeof id === "string" && id.startsWith("local-");

  const load = () => {
    if (isLocal) {
      const pl = getPlaylist(id as string);
      if (pl) {
        setData({
          id: pl.id,
          name: pl.name,
          thumb: pl.tracks[0]?.thumb || "",
          tracks: pl.tracks,
          local: true,
        });
      } else setError(true);
      return;
    }
    fetch(`/api/ytm?action=playlist&id=${id}`)
      .then((r) => r.json())
      .then((d) => (d.error ? setError(true) : setData(d)))
      .catch(() => setError(true));
  };

  useEffect(load, [id]); // eslint-disable-line react-hooks/exhaustive-deps

  if (error)
    return (
      <main className="page">
        <div className="empty"><div className="big">😕</div><p>Playlist tidak ditemukan.</p></div>
      </main>
    );

  if (!data)
    return (
      <main className="page">
        <div className="hero">
          <div className="skel" style={{ width: 168, height: 168, borderRadius: 28 }} />
          <div>
            <div className="skel" style={{ width: 100, height: 14, borderRadius: 999, marginBottom: 12 }} />
            <div className="skel" style={{ width: 260, height: 34, borderRadius: 999 }} />
          </div>
        </div>
      </main>
    );

  return (
    <main className="page">
      <Reveal>
        <div className="hero">
          {data.thumb ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={data.thumb} alt={data.name} />
          ) : (
            <div
              style={{
                width: 168,
                height: 168,
                borderRadius: 28,
                background: "var(--surface)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "var(--dim)",
              }}
            >
              <MusicNoteIcon size={56} />
            </div>
          )}
          <div>
            <div className="kicker">{data.local ? "Playlist Kamu" : "Playlist"}</div>
            <h1>{data.name}</h1>
            <p className="muted" style={{ fontSize: 14 }}>
              {data.artist ? `${data.artist} · ` : ""}
              {data.tracks.length} lagu
            </p>
            {data.tracks.length > 0 && (
              <div style={{ display: "flex", gap: 10, marginTop: 14 }}>
                <button className="play-fab" aria-label="Putar playlist" onClick={() => player.playQueue(data.tracks)}>
                  <PlayIcon size={24} />
                </button>
                <button
                  className="chip"
                  onClick={() => {
                    const shuffled = [...data.tracks].sort(() => Math.random() - 0.5);
                    player.playQueue(shuffled);
                  }}
                >
                  <ShuffleIcon size={16} /> Acak
                </button>
              </div>
            )}
          </div>
        </div>
      </Reveal>

      <Reveal delay={80}>
        {data.tracks.length === 0 && (
          <div className="empty">
            <div className="big">🎶</div>
            <p>Playlist ini kosong. Tambahkan lagu lewat menu ⋯ di lagu mana pun.</p>
          </div>
        )}
        {data.tracks.map((t, i) => (
          <div key={t.id + i} style={{ display: "flex", alignItems: "center", gap: 4 }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <TrackRow track={t} index={i} showIndex queue={data.tracks} />
            </div>
            {data.local && (
              <button
                className="icon-btn"
                aria-label="Hapus dari playlist"
                onClick={() => {
                  removeFromPlaylist(data.id, t.id);
                  toast("Dihapus dari playlist");
                  load();
                }}
              >
                <TrashIcon size={17} />
              </button>
            )}
          </div>
        ))}
      </Reveal>
    </main>
  );
}
