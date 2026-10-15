"use client";

import type { Track, LocalPlaylist } from "./types";

const KEYS = {
  liked: "mv.liked",
  recent: "mv.recent",
  playlists: "mv.playlists",
  queue: "mv.queue",
  queueIndex: "mv.queueIndex",
  volume: "mv.volume",
  searches: "mv.searches",
  stats: "mv.stats",
  sleepTimer: "mv.sleepTimer",
};

function read<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function write(key: string, value: unknown) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {}
}

/* ---------- liked songs ---------- */
export function getLiked(): Track[] {
  return read<Track[]>(KEYS.liked, []);
}
export function isLiked(id: string): boolean {
  return getLiked().some((t) => t.id === id);
}
export function toggleLike(track: Track): boolean {
  const liked = getLiked();
  const idx = liked.findIndex((t) => t.id === track.id);
  if (idx >= 0) {
    liked.splice(idx, 1);
    write(KEYS.liked, liked);
    return false;
  }
  liked.unshift(track);
  write(KEYS.liked, liked);
  return true;
}

/* ---------- recently played ---------- */
export function getRecent(): Track[] {
  return read<Track[]>(KEYS.recent, []);
}
export function pushRecent(track: Track) {
  let recent = getRecent().filter((t) => t.id !== track.id);
  recent.unshift(track);
  recent = recent.slice(0, 50);
  write(KEYS.recent, recent);
}

/* ---------- local playlists ---------- */
export function getPlaylists(): LocalPlaylist[] {
  return read<LocalPlaylist[]>(KEYS.playlists, []);
}
export function createPlaylist(name: string): LocalPlaylist {
  const pls = getPlaylists();
  const pl: LocalPlaylist = {
    id: "local-" + Date.now().toString(36),
    name,
    tracks: [],
    createdAt: Date.now(),
  };
  pls.unshift(pl);
  write(KEYS.playlists, pls);
  return pl;
}
export function deletePlaylist(id: string) {
  write(KEYS.playlists, getPlaylists().filter((p) => p.id !== id));
}
export function renamePlaylist(id: string, name: string) {
  const pls = getPlaylists();
  const pl = pls.find((p) => p.id === id);
  if (pl) pl.name = name;
  write(KEYS.playlists, pls);
}
export function getPlaylist(id: string): LocalPlaylist | undefined {
  return getPlaylists().find((p) => p.id === id);
}
export function addToPlaylist(id: string, track: Track): boolean {
  const pls = getPlaylists();
  const pl = pls.find((p) => p.id === id);
  if (!pl) return false;
  if (pl.tracks.some((t) => t.id === track.id)) return false;
  pl.tracks.push(track);
  write(KEYS.playlists, pls);
  return true;
}
export function removeFromPlaylist(id: string, trackId: string) {
  const pls = getPlaylists();
  const pl = pls.find((p) => p.id === id);
  if (!pl) return;
  pl.tracks = pl.tracks.filter((t) => t.id !== trackId);
  write(KEYS.playlists, pls);
}

/* ---------- queue persistence ---------- */
export function saveQueue(queue: Track[], index: number) {
  write(KEYS.queue, queue.slice(0, 200));
  write(KEYS.queueIndex, index);
}
export function loadQueue(): { queue: Track[]; index: number } {
  return {
    queue: read<Track[]>(KEYS.queue, []),
    index: read<number>(KEYS.queueIndex, 0),
  };
}

/* ---------- volume ---------- */
export function saveVolume(v: number) {
  write(KEYS.volume, v);
}
export function loadVolume(): number {
  return read<number>(KEYS.volume, 80);
}

/* ---------- recent searches ---------- */
export function getSearches(): string[] {
  return read<string[]>(KEYS.searches, []);
}
export function pushSearch(q: string) {
  let s = getSearches().filter((x) => x.toLowerCase() !== q.toLowerCase());
  s.unshift(q);
  s = s.slice(0, 10);
  write(KEYS.searches, s);
}
export function clearSearches() {
  write(KEYS.searches, []);
}

/* ---------- play stats ---------- */
export interface PlayStats {
  totalPlays: number;
  totalSeconds: number;
  artists: Record<string, number>;   // artist -> play count
  tracks:  Record<string, { title: string; artist: string; thumb: string; count: number }>;
  dailyPlays: Record<string, number>; // "YYYY-MM-DD" -> count
}

const defaultStats = (): PlayStats => ({
  totalPlays: 0,
  totalSeconds: 0,
  artists: {},
  tracks: {},
  dailyPlays: {},
});

export function getStats(): PlayStats {
  return read<PlayStats>(KEYS.stats, defaultStats());
}

export function recordPlay(track: { id: string; title: string; artist: string; thumb: string }, seconds: number) {
  const s = getStats();
  s.totalPlays++;
  s.totalSeconds += Math.floor(seconds);
  s.artists[track.artist] = (s.artists[track.artist] || 0) + 1;
  if (!s.tracks[track.id]) {
    s.tracks[track.id] = { title: track.title, artist: track.artist, thumb: track.thumb, count: 0 };
  }
  s.tracks[track.id].count++;
  const today = new Date().toISOString().slice(0, 10);
  s.dailyPlays[today] = (s.dailyPlays[today] || 0) + 1;
  // keep daily only last 30 days
  const days = Object.keys(s.dailyPlays).sort();
  if (days.length > 30) {
    days.slice(0, days.length - 30).forEach((d) => delete s.dailyPlays[d]);
  }
  write(KEYS.stats, s);
}

export function resetStats() {
  write(KEYS.stats, defaultStats());
}
