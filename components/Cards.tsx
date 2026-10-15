"use client";

import React from "react";
import { useRouter } from "next/navigation";
import type { Track, AlbumCard, ArtistCard, PlaylistCard } from "@/lib/types";
import { usePlayer } from "@/lib/player";
import { PlayIcon } from "./Icons";

export function SongCard({ track }: { track: Track }) {
  const player = usePlayer();
  return (
    <div className="card" onClick={() => player.playTrack(track)}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img className="art" src={track.thumb} alt="" loading="lazy" referrerPolicy="no-referrer" />
      <div className="t">{track.title}</div>
      <div className="s">{track.artist || "Artis tidak diketahui"}</div>
      <span className="hover-play">
        <PlayIcon size={20} />
      </span>
    </div>
  );
}

export function AlbumCardView({ album }: { album: AlbumCard }) {
  const router = useRouter();
  return (
    <div className="card" onClick={() => router.push(`/album/${album.id}`)}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img className="art" src={album.thumb} alt="" loading="lazy" referrerPolicy="no-referrer" />
      <div className="t">{album.name}</div>
      <div className="s">
        {album.year ? `${album.year} · ` : ""}
        {album.artist || "Album"}
      </div>
    </div>
  );
}

export function ArtistCardView({ artist }: { artist: ArtistCard }) {
  const router = useRouter();
  return (
    <div className="card" onClick={() => router.push(`/artist/${artist.id}`)}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img className="art round" src={artist.thumb} alt="" loading="lazy" referrerPolicy="no-referrer" />
      <div className="t" style={{ textAlign: "center" }}>{artist.name}</div>
      <div className="s" style={{ textAlign: "center" }}>Artis</div>
    </div>
  );
}

export function PlaylistCardView({ playlist }: { playlist: PlaylistCard }) {
  const router = useRouter();
  return (
    <div className="card" onClick={() => router.push(`/playlist/${playlist.id}`)}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img className="art" src={playlist.thumb} alt="" loading="lazy" referrerPolicy="no-referrer" />
      <div className="t">{playlist.name}</div>
      <div className="s">{playlist.artist || "Playlist"}</div>
    </div>
  );
}
