"use client";

import React, { useEffect, useState } from "react";
import "./home.css";
import type { HomeShelf, Track, LocalPlaylist, CommunityPlaylist } from "@/lib/types";
import { getRecent, getPlaylists } from "@/lib/storage";
import { useRouter } from "next/navigation";
import { usePlayer } from "@/lib/player";
import Reveal from "@/components/Reveal";
import TrackRow from "@/components/TrackRow";
import {
  SongCard,
  AlbumCardView,
  PlaylistCardView,
  ArtistCardView,
} from "@/components/Cards";
import { HistoryIcon, MusicNoteIcon, PlayIcon } from "@/components/Icons";
import {
  HomeHeader,
  QuickChips,
  CommunityRow,
  ReleasesRow,
} from "@/components/HomeParts";

/* Salam dinamis berdasarkan waktu */
function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 5)  return "Selamat malam 🌙";
  if (hour < 11) return "Selamat pagi ☀️";
  if (hour < 15) return "Selamat siang 🌤";
  if (hour < 19) return "Selamat sore 🌅";
  return "Selamat malam 🌙";
}

const rise = (n: number) => ({ "--d": n } as React.CSSProperties);

export default function HomePage() {
  const [shelves, setShelves] = useState<HomeShelf[] | null>(null);
  const [community, setCommunity] = useState<CommunityPlaylist[] | null>(null);
  const [releases, setReleases] = useState<Track[] | null>(null);
  const [recent, setRecent] = useState<Track[]>([]);
  const [localPlaylists, setLocalPlaylists] = useState<LocalPlaylist[]>([]);

  const [error, setError] = useState(false);
  const router = useRouter();
  const player = usePlayer();

  /* tema navy hanya aktif selama di beranda */
  useEffect(() => {
    document.body.classList.add("theme-home");
    return () => document.body.classList.remove("theme-home");
  }, []);

  useEffect(() => {
    let alive = true;
    setRecent(getRecent().slice(0, 6));
    setLocalPlaylists(getPlaylists());
    const onChanged = () => setLocalPlaylists(getPlaylists());
    window.addEventListener("mv:playlists-changed", onChanged);

    const load = (url: string) => fetch(url).then((r) => r.json());

    load("/api/ytm?action=home")
      .then((d) => {
        if (!alive) return;
        if (d.shelves) setShelves(d.shelves);
        else setError(true);
      })
      .catch(() => alive && setError(true));

    load("/api/ytm?action=community")
      .then((d) => alive && setCommunity(Array.isArray(d.playlists) ? d.playlists : []))
      .catch(() => alive && setCommunity([]));

    load("/api/ytm?action=newreleases")
      .then((d) => alive && setReleases(Array.isArray(d.songs) ? d.songs : []))
      .catch(() => alive && setReleases([]));

    return () => {
      alive = false;
      window.removeEventListener("mv:playlists-changed", onChanged);
    };
  }, []);

  return (
    <main className="page hm-page">
      <div className="hm-rise" style={rise(0)}>
        <HomeHeader />
      </div>

      <h1 className="hm-greeting hm-rise" style={rise(1)}>
        {getGreeting()}
      </h1>

      <div className="hm-rise" style={rise(2)}>
        <QuickChips />
      </div>

      <div className="hm-rise" style={rise(3)}>
        <CommunityRow items={community} />
      </div>

      <div className="hm-rise" style={rise(4)}>
        <ReleasesRow items={releases} />
      </div>

      {/* ── Recently Played ── */}
      {recent.length > 0 && (
        <Reveal className="shelf">
          <div className="shelf-head">
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ color: "var(--hm-title)", display: "flex" }}>
                <HistoryIcon size={17} />
              </span>
              <h2 className="h2">Baru Diputar</h2>
            </div>
          </div>
          <div className="recent-grid">
            {recent.map((t) => (
              <TrackRow key={t.id} track={t} queue={recent} />
            ))}
          </div>
        </Reveal>
      )}

      {/* ── Playlist Kamu ── */}
      {localPlaylists.length > 0 && (
        <Reveal className="shelf">
          <div className="shelf-head">
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ color: "var(--hm-title)", display: "flex" }}>
                <MusicNoteIcon size={17} />
              </span>
              <h2 className="h2">Playlist Kamu</h2>
            </div>
            <span
              style={{ fontSize: 12, color: "var(--dim)", fontWeight: 500, letterSpacing: "0.01em", cursor: "pointer" }}
              onClick={() => router.push("/library")}
            >
              Lihat semua →
            </span>
          </div>
          <div className="shelf-row">
            {localPlaylists.slice(0, 8).map((pl) => (
              <div
                key={pl.id}
                className="card"
                onClick={() => router.push(`/playlist/${pl.id}`)}
              >
                {pl.tracks[0]?.thumb ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img className="art" src={pl.tracks[0].thumb} alt="" loading="lazy" />
                ) : (
                  <div
                    className="art"
                    style={{ display: "flex", alignItems: "center", justifyContent: "center", color: "var(--dim)", background: "rgba(183, 164, 215, 0.10)" }}
                  >
                    <MusicNoteIcon size={40} />
                  </div>
                )}
                <div className="t">{pl.name}</div>
                <div className="s">{pl.tracks.length} lagu</div>
                {pl.tracks.length > 0 && (
                  <span className="hover-play" onClick={(e) => { e.stopPropagation(); player.playQueue(pl.tracks); }}>
                    <PlayIcon size={20} />
                  </span>
                )}
              </div>
            ))}
          </div>
        </Reveal>
      )}

      {/* ── Error state ── */}
      {error && (
        <div className="empty">
          <div className="big">🎧</div>
          <p>Gagal memuat rekomendasi. Coba muat ulang halaman.</p>
        </div>
      )}

      {/* ── Dynamic shelves from API ── */}
      {shelves?.map((shelf, si) => (
        <Reveal key={shelf.title + si} className="shelf" delay={Math.min(si * 60, 240)}>
          <div className="shelf-head">
            <h2 className="h2">{shelf.title}</h2>
            <span
              style={{ fontSize: 12, color: "var(--dim)", fontWeight: 500, letterSpacing: "0.01em", cursor: "pointer" }}
              onClick={() => router.push(`/search?q=${encodeURIComponent(shelf.searchQuery)}`)}
            >
              Lihat semua →
            </span>
          </div>
          <div className="shelf-row">
            {shelf.items.map((item, i) => {
              if (item.kind === "song")     return <SongCard       key={item.id + i} track={item}    />;
              if (item.kind === "album")    return <AlbumCardView  key={item.id + i} album={item}    />;
              if (item.kind === "playlist") return <PlaylistCardView key={item.id + i} playlist={item} />;
              return                               <ArtistCardView key={item.id + i} artist={item}   />;
            })}
          </div>
        </Reveal>
      ))}

      <style jsx>{`
        .recent-grid { display:grid; grid-template-columns:repeat(auto-fill,minmax(240px,1fr)); gap:4px; }
        @media (max-width:600px) { .recent-grid { grid-template-columns:1fr; } }
      `}</style>
    </main>
  );
}

function HomeSkeleton() {
  return (
    <div>
      {[0, 1].map((s) => (
        <div className="shelf" key={s}>
          <div className="skel" style={{ width: 160, height: 20, marginBottom: 18, borderRadius: 999 }} />
          <div className="shelf-row">
            {[0, 1, 2, 3, 4].map((i) => (
              <div key={i} style={{ width: 160, flexShrink: 0 }}>
                <div className="skel" style={{ width: "100%", aspectRatio: "1", borderRadius: 16, marginBottom: 10 }} />
                <div className="skel" style={{ width: "75%", height: 13, borderRadius: 999, marginBottom: 7 }} />
                <div className="skel" style={{ width: "50%", height: 11, borderRadius: 999 }} />
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
