"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { Track, LocalPlaylist } from "@/lib/types";
import {
  getLiked,
  getRecent,
  getPlaylists,
  createPlaylist,
  deletePlaylist,
} from "@/lib/storage";
import { usePlayer } from "@/lib/player";
import { useToast } from "@/components/Toast";
import Reveal from "@/components/Reveal";
import TrackRow from "@/components/TrackRow";
import {
  HeartIcon,
  MusicNoteIcon,
  PlusIcon,
  TrashIcon,
  PlayIcon,
  HistoryIcon,
} from "@/components/Icons";

type Tab = "playlists" | "liked" | "recent";

export default function LibraryPage() {
  const [tab, setTab] = useState<Tab>("playlists");
  const [liked, setLiked] = useState<Track[]>([]);
  const [recent, setRecent] = useState<Track[]>([]);
  const [playlists, setPlaylists] = useState<LocalPlaylist[]>([]);
  const [newName, setNewName] = useState("");
  const [creating, setCreating] = useState(false);
  const player = usePlayer();
  const toast = useToast();
  const router = useRouter();

  const refresh = () => {
    setLiked(getLiked());
    setRecent(getRecent());
    setPlaylists(getPlaylists());
  };

  /* deep-link dari beranda: /library?tab=liked | recent | playlists */
  useEffect(() => {
    const t = new URLSearchParams(window.location.search).get("tab");
    if (t === "liked" || t === "recent" || t === "playlists") setTab(t);
  }, []);

  useEffect(() => {
    refresh();
    window.addEventListener("mv:liked-changed", refresh);
    window.addEventListener("mv:playlists-changed", refresh);
    return () => {
      window.removeEventListener("mv:liked-changed", refresh);
      window.removeEventListener("mv:playlists-changed", refresh);
    };
  }, []);

  return (
    <main className="page">
      <Reveal>
        <h1 className="h1" style={{ marginBottom: 18 }}>Koleksi Kamu</h1>
        <div style={{ display: "flex", gap: 8, marginBottom: 22, flexWrap: "wrap" }}>
          <button className={`chip ${tab === "playlists" ? "active" : ""}`} onClick={() => setTab("playlists")}>
            <MusicNoteIcon size={16} /> Playlist
          </button>
          <button className={`chip ${tab === "liked" ? "active" : ""}`} onClick={() => setTab("liked")}>
            <HeartIcon filled size={16} /> Disukai ({liked.length})
          </button>
          <button className={`chip ${tab === "recent" ? "active" : ""}`} onClick={() => setTab("recent")}>
            <HistoryIcon size={16} /> Riwayat
          </button>
        </div>
      </Reveal>

      {tab === "playlists" && (
        <Reveal>
          {!creating ? (
            <button className="chip" style={{ marginBottom: 18 }} onClick={() => setCreating(true)}>
              <PlusIcon size={16} /> Buat Playlist Baru
            </button>
          ) : (
            <div className="searchbox" style={{ marginBottom: 18, maxWidth: 420, padding: "0 6px 0 16px" }}>
              <input
                autoFocus
                placeholder="Nama playlist…"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && newName.trim()) {
                    createPlaylist(newName.trim());
                    toast(`Playlist "${newName.trim()}" dibuat`);
                    setNewName("");
                    setCreating(false);
                    refresh();
                  }
                  if (e.key === "Escape") setCreating(false);
                }}
              />
              <button
                className="chip active"
                style={{ padding: "8px 16px" }}
                onClick={() => {
                  if (!newName.trim()) return;
                  createPlaylist(newName.trim());
                  toast(`Playlist "${newName.trim()}" dibuat`);
                  setNewName("");
                  setCreating(false);
                  refresh();
                }}
              >
                Buat
              </button>
            </div>
          )}

          {playlists.length === 0 ? (
            <div className="empty">
              <div className="big">🎶</div>
              <p>Belum ada playlist. Buat satu dan tambahkan lagu dari menu ⋯ di lagu mana pun.</p>
            </div>
          ) : (
            <div className="grid-cards">
              {playlists.map((pl) => (
                <div
                  key={pl.id}
                  className="card"
                  onClick={() => router.push(`/playlist/${pl.id}`)}
                >
                  {pl.tracks[0]?.thumb ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img className="art" src={pl.tracks[0].thumb} alt="" />
                  ) : (
                    <div
                      className="art"
                      style={{ display: "flex", alignItems: "center", justifyContent: "center", color: "var(--dim)" }}
                    >
                      <MusicNoteIcon size={40} />
                    </div>
                  )}
                  <div className="t">{pl.name}</div>
                  <div className="s">{pl.tracks.length} lagu</div>
                  <div style={{ display: "flex", gap: 4, marginTop: 8 }}>
                    {pl.tracks.length > 0 && (
                      <button
                        className="icon-btn accent"
                        aria-label="Putar playlist"
                        onClick={(e) => {
                          e.stopPropagation();
                          player.playQueue(pl.tracks);
                        }}
                      >
                        <PlayIcon size={19} />
                      </button>
                    )}
                    <button
                      className="icon-btn"
                      aria-label="Hapus playlist"
                      onClick={(e) => {
                        e.stopPropagation();
                        deletePlaylist(pl.id);
                        toast("Playlist dihapus");
                        refresh();
                      }}
                    >
                      <TrashIcon size={18} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Reveal>
      )}

      {tab === "liked" && (
        <Reveal>
          {liked.length === 0 ? (
            <div className="empty">
              <div className="big">💛</div>
              <p>Belum ada lagu disukai. Tekan ikon hati untuk menyimpan lagu di sini.</p>
            </div>
          ) : (
            <>
              <button
                className="play-fab"
                style={{ marginBottom: 16 }}
                aria-label="Putar semua"
                onClick={() => player.playQueue(liked)}
              >
                <PlayIcon size={24} />
              </button>
              {liked.map((t, i) => (
                <TrackRow key={t.id} track={t} index={i} showIndex queue={liked} />
              ))}
            </>
          )}
        </Reveal>
      )}

      {tab === "recent" && (
        <Reveal>
          {recent.length === 0 ? (
            <div className="empty">
              <div className="big">🕘</div>
              <p>Belum ada riwayat pemutaran.</p>
            </div>
          ) : (
            recent.map((t, i) => <TrackRow key={t.id + i} track={t} queue={recent} />)
          )}
        </Reveal>
      )}
    </main>
  );
}
