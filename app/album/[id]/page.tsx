"use client";

import React, { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import type { Track } from "@/lib/types";
import { usePlayer, fmtTime } from "@/lib/player";
import Reveal from "@/components/Reveal";
import TrackRow from "@/components/TrackRow";
import { PlayIcon, ShuffleIcon, ClockIcon } from "@/components/Icons";

interface AlbumData {
  id: string;
  name: string;
  artist: string;
  year?: number | null;
  thumb: string;
  tracks: Track[];
}

export default function AlbumPage() {
  const { id } = useParams<{ id: string }>();
  const [data, setData] = useState<AlbumData | null>(null);
  const [error, setError] = useState(false);
  const player = usePlayer();

  useEffect(() => {
    fetch(`/api/ytm?action=album&id=${id}`)
      .then((r) => r.json())
      .then((d) => (d.error ? setError(true) : setData(d)))
      .catch(() => setError(true));
  }, [id]);

  if (error)
    return (
      <main className="page">
        <div className="empty"><div className="big">😕</div><p>Gagal memuat album.</p></div>
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

  const totalSec = data.tracks.reduce((a, t) => a + (t.duration || 0), 0);

  return (
    <main className="page">
      <Reveal>
        <div className="hero">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={data.thumb} alt={data.name} />
          <div>
            <div className="kicker">Album</div>
            <h1>{data.name}</h1>
            <p className="muted" style={{ fontSize: 14, display: "flex", alignItems: "center", gap: 6 }}>
              {data.artist}
              {data.year ? ` · ${data.year}` : ""} · {data.tracks.length} lagu ·{" "}
              <ClockIcon size={14} /> {fmtTime(totalSec)}
            </p>
            <div style={{ display: "flex", gap: 10, marginTop: 14 }}>
              <button className="play-fab" aria-label="Putar album" onClick={() => player.playQueue(data.tracks)}>
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
          </div>
        </div>
      </Reveal>

      <Reveal delay={80}>
        {data.tracks.map((t, i) => (
          <TrackRow key={t.id + i} track={t} index={i} showIndex showThumb={false} queue={data.tracks} />
        ))}
      </Reveal>
    </main>
  );
}
