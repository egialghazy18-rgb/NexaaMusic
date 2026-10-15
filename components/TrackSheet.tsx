"use client";

import React, { createContext, useContext, useState, useCallback } from "react";
import type { Track } from "@/lib/types";
import { usePlayer } from "@/lib/player";
import { useToast } from "./Toast";
import {
  getPlaylists,
  addToPlaylist,
  createPlaylist,
  toggleLike,
  isLiked,
} from "@/lib/storage";
import {
  HeartIcon,
  QueueIcon,
  PlusIcon,
  NextIcon,
  MusicNoteIcon,
  CloseIcon,
  ShareIcon,
} from "./Icons";

const Ctx = createContext<(t: Track) => void>(() => {});
export const useTrackSheet = () => useContext(Ctx);

export function TrackSheetProvider({ children }: { children: React.ReactNode }) {
  const [track, setTrack] = useState<Track | null>(null);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [liked, setLiked] = useState(false);
  const player = usePlayer();
  const toast = useToast();

  const open = useCallback((t: Track) => {
    setTrack(t);
    setLiked(isLiked(t.id));
    setPickerOpen(false);
  }, []);

  const close = () => {
    setTrack(null);
    setPickerOpen(false);
  };

  return (
    <Ctx.Provider value={open}>
      {children}
      {track && (
        <>
          <div className="sheet-backdrop" onClick={close} />
          <div className="sheet">
            <div className="grab" />
            <div style={{ display: "flex", alignItems: "center", gap: 14, padding: "4px 12px 14px" }}>
              {track.thumb ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={track.thumb}
                  alt=""
                  width={52}
                  height={52}
                  style={{ borderRadius: 14, objectFit: "cover" }}
                />
              ) : null}
              <div style={{ minWidth: 0, flex: 1 }}>
                <div style={{ fontWeight: 700, fontSize: 15, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                  {track.title}
                </div>
                <div className="muted" style={{ fontSize: 13, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                  {track.artist}
                </div>
              </div>
              <button className="icon-btn" onClick={close} aria-label="Tutup">
                <CloseIcon size={18} />
              </button>
            </div>

            {!pickerOpen ? (
              <>
                <button
                  className="sheet-item"
                  onClick={() => {
                    const now = toggleLike(track);
                    setLiked(now);
                    toast(now ? "Ditambahkan ke Lagu Disukai" : "Dihapus dari Lagu Disukai");
                    window.dispatchEvent(new Event("mv:liked-changed"));
                  }}
                >
                  <span style={{ color: liked ? "var(--accent)" : "var(--muted)" }}>
                    <HeartIcon filled={liked} size={20} />
                  </span>
                  {liked ? "Hapus dari Lagu Disukai" : "Suka Lagu Ini"}
                </button>
                <button
                  className="sheet-item"
                  onClick={() => {
                    player.addNext(track);
                    toast("Diputar berikutnya");
                    close();
                  }}
                >
                  <span className="muted"><NextIcon size={20} /></span>
                  Putar Berikutnya
                </button>
                <button
                  className="sheet-item"
                  onClick={() => {
                    player.addToQueue(track);
                    toast("Ditambahkan ke antrean");
                    close();
                  }}
                >
                  <span className="muted"><QueueIcon size={20} /></span>
                  Tambah ke Antrean
                </button>
                <button className="sheet-item" onClick={() => setPickerOpen(true)}>
                  <span className="muted"><PlusIcon size={20} /></span>
                  Tambah ke Playlist
                </button>
                <button
                  className="sheet-item"
                  onClick={() => {
                    const url = `https://music.youtube.com/watch?v=${track.id}`;
                    const text = `🎵 ${track.title} — ${track.artist}`;
                    if (navigator.share) {
                      navigator.share({ title: track.title, text, url }).catch(() => {});
                    } else {
                      navigator.clipboard.writeText(`${text}\n${url}`).then(() => {
                        toast("Link lagu disalin!");
                      }).catch(() => {
                        toast("Gagal menyalin link");
                      });
                    }
                    close();
                  }}
                >
                  <span className="muted"><ShareIcon size={20} /></span>
                  Bagikan Lagu
                </button>
              </>
            ) : (
              <PlaylistPicker
                onPick={(plId, plName) => {
                  const ok = addToPlaylist(plId, track);
                  toast(ok ? `Ditambahkan ke "${plName}"` : "Sudah ada di playlist itu");
                  window.dispatchEvent(new Event("mv:playlists-changed"));
                  close();
                }}
                onCreate={(name) => {
                  const pl = createPlaylist(name);
                  addToPlaylist(pl.id, track);
                  toast(`Playlist "${name}" dibuat`);
                  window.dispatchEvent(new Event("mv:playlists-changed"));
                  close();
                }}
              />
            )}
          </div>
        </>
      )}
    </Ctx.Provider>
  );
}

function PlaylistPicker({
  onPick,
  onCreate,
}: {
  onPick: (id: string, name: string) => void;
  onCreate: (name: string) => void;
}) {
  const [name, setName] = useState("");
  const pls = getPlaylists();
  return (
    <div>
      <div style={{ display: "flex", gap: 8, padding: "0 4px 12px" }}>
        <div className="searchbox" style={{ flex: 1, padding: "0 6px 0 16px" }}>
          <input
            placeholder="Nama playlist baru…"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && name.trim()) onCreate(name.trim());
            }}
          />
          <button
            className="chip active"
            style={{ padding: "8px 16px" }}
            onClick={() => name.trim() && onCreate(name.trim())}
          >
            Buat
          </button>
        </div>
      </div>
      {pls.length === 0 && (
        <div className="muted" style={{ padding: "8px 12px", fontSize: 13.5 }}>
          Belum ada playlist — buat dulu di atas.
        </div>
      )}
      {pls.map((p) => (
        <button key={p.id} className="sheet-item" onClick={() => onPick(p.id, p.name)}>
          <span className="muted"><MusicNoteIcon size={20} /></span>
          <span style={{ flex: 1, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{p.name}</span>
          <span className="dim" style={{ fontSize: 12.5 }}>{p.tracks.length} lagu</span>
        </button>
      ))}
    </div>
  );
}
