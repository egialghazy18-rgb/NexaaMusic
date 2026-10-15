"use client";

import React, { Suspense, useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import type { Track, ArtistCard, AlbumCard, PlaylistCard } from "@/lib/types";
import { getSearches, pushSearch, clearSearches } from "@/lib/storage";
import Reveal from "@/components/Reveal";
import TrackRow from "@/components/TrackRow";
import { ArtistCardView, AlbumCardView, PlaylistCardView } from "@/components/Cards";
import { SearchIcon, CloseIcon, HistoryIcon } from "@/components/Icons";

interface Results {
  songs: Track[];
  artists: ArtistCard[];
  albums: AlbumCard[];
  playlists: PlaylistCard[];
}

type Tab = "all" | "songs" | "artists" | "albums" | "playlists";
type DurFilter = "all" | "short" | "medium" | "long";

function filterByDur(songs: Track[], f: DurFilter): Track[] {
  if (f === "short")  return songs.filter((t) => t.duration > 0 && t.duration < 180);
  if (f === "medium") return songs.filter((t) => t.duration >= 180 && t.duration <= 300);
  if (f === "long")   return songs.filter((t) => t.duration > 300);
  return songs;
}

function SearchInner() {
  const searchParams = useSearchParams();
  const [q, setQ] = useState(() => searchParams.get("q") ?? "");
  const [results, setResults] = useState<Results | null>(null);
  const [loading, setLoading] = useState(false);
  const [tab, setTab] = useState<Tab>("all");
  const [durFilter, setDurFilter] = useState<DurFilter>("all");
  const [songsShown, setSongsShown] = useState(8);
  const [history, setHistory] = useState<string[]>([]);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const abortRef = useRef<AbortController | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setHistory(getSearches());
    const initialQ = searchParams.get("q");
    if (initialQ?.trim()) {
      doSearch(initialQ);
    } else {
      inputRef.current?.focus();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const doSearch = (query: string) => {
    if (!query.trim()) return;
    setLoading(true);
    setSuggestions([]);
    setSongsShown(8);
    setDurFilter("all");
    abortRef.current?.abort();
    const ctrl = new AbortController();
    abortRef.current = ctrl;
    fetch(`/api/ytm?action=search&q=${encodeURIComponent(query)}`, { signal: ctrl.signal })
      .then((r) => r.json())
      .then((d) => {
        setResults(d);
        setLoading(false);
        pushSearch(query);
        setHistory(getSearches());
      })
      .catch((e) => {
        if (e.name !== "AbortError") setLoading(false);
      });
  };

  const onChange = (v: string) => {
    setQ(v);
    clearTimeout(debounceRef.current);
    if (!v.trim()) {
      setResults(null);
      setSuggestions([]);
      return;
    }
    debounceRef.current = setTimeout(() => {
      fetch(`/api/ytm?action=suggest&q=${encodeURIComponent(v)}`)
        .then((r) => r.json())
        .then((d) => setSuggestions(d.suggestions || []))
        .catch(() => {});
    }, 250);
  };

  const tabs: { id: Tab; label: string }[] = [
    { id: "all",       label: "Semua" },
    { id: "songs",     label: "Lagu" },
    { id: "artists",   label: "Artis" },
    { id: "albums",    label: "Album" },
    { id: "playlists", label: "Playlist" },
  ];

  const durFilters: { id: DurFilter; label: string }[] = [
    { id: "all",    label: "Semua durasi" },
    { id: "short",  label: "< 3 menit" },
    { id: "medium", label: "3–5 menit" },
    { id: "long",   label: "> 5 menit" },
  ];

  return (
    <main className="page">
      <Reveal>
        <h1 className="h1" style={{ marginBottom: 18 }}>Cari</h1>
        <div className="searchbox">
          <span className="dim"><SearchIcon size={19} /></span>
          <input
            ref={inputRef}
            placeholder="Lagu, artis, album, playlist…"
            value={q}
            onChange={(e) => onChange(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") doSearch(q);
            }}
          />
          {q && (
            <button
              className="icon-btn"
              aria-label="Bersihkan"
              onClick={() => {
                setQ("");
                setResults(null);
                setSuggestions([]);
                inputRef.current?.focus();
              }}
            >
              <CloseIcon size={17} />
            </button>
          )}
        </div>
      </Reveal>

      {/* suggestions */}
      {suggestions.length > 0 && !results && (
        <div style={{ marginTop: 14, display: "flex", flexDirection: "column", gap: 2 }}>
          {suggestions.map((s) => (
            <button
              key={s}
              className="sheet-item"
              onClick={() => {
                setQ(s);
                doSearch(s);
              }}
            >
              <span className="dim"><SearchIcon size={17} /></span>
              {s}
            </button>
          ))}
        </div>
      )}

      {/* history */}
      {!results && !loading && suggestions.length === 0 && history.length > 0 && (
        <Reveal delay={80}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", margin: "26px 0 12px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span className="muted"><HistoryIcon size={18} /></span>
              <h2 className="h2">Pencarian Terakhir</h2>
            </div>
            <button
              className="chip"
              style={{ padding: "7px 14px", fontSize: 12.5 }}
              onClick={() => {
                clearSearches();
                setHistory([]);
              }}
            >
              Hapus
            </button>
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            {history.map((h) => (
              <button
                key={h}
                className="chip"
                onClick={() => {
                  setQ(h);
                  doSearch(h);
                }}
              >
                {h}
              </button>
            ))}
          </div>
        </Reveal>
      )}

      {loading && (
        <div style={{ marginTop: 24 }}>
          {[0, 1, 2, 3, 4, 5, 6, 7].map((i) => (
            <div key={i} style={{ display: "flex", gap: 12, alignItems: "center", padding: "8px 10px" }}>
              <div className="skel" style={{ width: 46, height: 46, borderRadius: 12 }} />
              <div style={{ flex: 1 }}>
                <div className="skel" style={{ width: "55%", height: 14, borderRadius: 999, marginBottom: 7 }} />
                <div className="skel" style={{ width: "35%", height: 12, borderRadius: 999 }} />
              </div>
            </div>
          ))}
        </div>
      )}

      {results && !loading && (() => {
        const filteredSongs = filterByDur(results.songs, durFilter);
        return (
          <>
            {/* Tab bar */}
            <div style={{ display: "flex", gap: 8, margin: "20px 0 6px", flexWrap: "wrap" }}>
              {tabs.map((t) => (
                <button
                  key={t.id}
                  className={`chip ${tab === t.id ? "active" : ""}`}
                  onClick={() => { setTab(t.id); setSongsShown(8); }}
                >
                  {t.label}
                </button>
              ))}
            </div>

            {/* Duration filter — hanya muncul saat tab songs aktif atau all */}
            {(tab === "all" || tab === "songs") && results.songs.length > 0 && (
              <div style={{ display: "flex", gap: 6, margin: "8px 0 2px", flexWrap: "wrap" }}>
                {durFilters.map((d) => (
                  <button
                    key={d.id}
                    className={`chip ${durFilter === d.id ? "active" : ""}`}
                    style={{ padding: "5px 12px", fontSize: 12 }}
                    onClick={() => { setDurFilter(d.id); setSongsShown(8); }}
                  >
                    {d.label}
                  </button>
                ))}
              </div>
            )}

            {/* Songs */}
            {(tab === "all" || tab === "songs") && filteredSongs.length > 0 && (
              <Reveal className="shelf">
                <div className="shelf-head" style={{ marginTop: 16 }}>
                  <h2 className="h2">Lagu</h2>
                  <span className="dim" style={{ fontSize: 12.5 }}>
                    {filteredSongs.length} hasil
                  </span>
                </div>
                <div>
                  {filteredSongs.slice(0, songsShown).map((t) => (
                    <TrackRow key={t.id} track={t} queue={filteredSongs} />
                  ))}
                </div>
                {/* Load more / Load less */}
                {filteredSongs.length > 8 && (
                  <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
                    {songsShown < filteredSongs.length && (
                      <button
                        className="chip"
                        style={{ flex: 1, padding: "10px", justifyContent: "center" }}
                        onClick={() => setSongsShown((n) => Math.min(n + 10, filteredSongs.length))}
                      >
                        + Tampilkan {Math.min(10, filteredSongs.length - songsShown)} lagu lagi
                      </button>
                    )}
                    {songsShown > 8 && (
                      <button
                        className="chip"
                        style={{ padding: "10px 16px" }}
                        onClick={() => setSongsShown(8)}
                      >
                        Ringkas
                      </button>
                    )}
                  </div>
                )}
              </Reveal>
            )}

            {(tab === "all" || tab === "songs") && filteredSongs.length === 0 && results.songs.length > 0 && (
              <div className="empty" style={{ marginTop: 24 }}>
                <div className="big">🎵</div>
                <p>Tidak ada lagu dengan durasi tersebut.</p>
              </div>
            )}

            {(tab === "all" || tab === "artists") && results.artists.length > 0 && (
              <Reveal className="shelf">
                <div className="shelf-head" style={{ marginTop: 16 }}>
                  <h2 className="h2">Artis</h2>
                </div>
                <div className="shelf-row">
                  {results.artists.map((a) => (
                    <ArtistCardView key={a.id} artist={a} />
                  ))}
                </div>
              </Reveal>
            )}

            {(tab === "all" || tab === "albums") && results.albums.length > 0 && (
              <Reveal className="shelf">
                <div className="shelf-head" style={{ marginTop: 16 }}>
                  <h2 className="h2">Album</h2>
                </div>
                <div className="shelf-row">
                  {results.albums.map((a) => (
                    <AlbumCardView key={a.id} album={a} />
                  ))}
                </div>
              </Reveal>
            )}

            {(tab === "all" || tab === "playlists") && results.playlists.length > 0 && (
              <Reveal className="shelf">
                <div className="shelf-head" style={{ marginTop: 16 }}>
                  <h2 className="h2">Playlist</h2>
                </div>
                <div className="shelf-row">
                  {results.playlists.map((p) => (
                    <PlaylistCardView key={p.id} playlist={p} />
                  ))}
                </div>
              </Reveal>
            )}
          </>
        );
      })()}

      {!results && !loading && suggestions.length === 0 && (
        <section className="search-discover">
          {history.length === 0 ? (
            <>
              <div className="discover-heading">
                <span className="discover-kicker">MULAI DARI SINI</span>
                <h2 className="h2">Lagi pengin dengerin apa?</h2>
                <p>Pilih suasana atau cari lagu favoritmu.</p>
              </div>
              <div className="mood-grid">
                {[
                  { label: "Lagi viral", query: "lagu viral indonesia 2026", tone: "rose", icon: "↗" },
                  { label: "Santai dulu", query: "chill relaxing music", tone: "sage", icon: "☁" },
                  { label: "Biar semangat", query: "upbeat pop hits", tone: "amber", icon: "✳" },
                  { label: "Lagu Indonesia", query: "lagu indonesia populer", tone: "blue", icon: "♫" },
                ].map((item) => (
                  <button key={item.label} className={`mood-tile mood-${item.tone}`} onClick={() => { setQ(item.query); doSearch(item.query); }}>
                    <span className="mood-icon">{item.icon}</span><span>{item.label}</span><span className="mood-arrow">↗</span>
                  </button>
                ))}
              </div>
              <div className="discover-foot"><span className="discover-line" /> <span>ATAU COBA YANG POPULER</span> <span className="discover-line" /></div>
              <div className="popular-searches">
                {["Miley Cyrus", "NIKI", "Lagu galau", "The Weeknd", "Hindia", "Lagu 2000-an"].map((item) => (
                  <button key={item} className="popular-pill" onClick={() => { setQ(item); doSearch(item); }}>{item}</button>
                ))}
              </div>
            </>
          ) : null}
        </section>
      )}
      <style jsx>{`
        .search-discover { margin-top: 38px; padding-bottom: 28px; }
        .discover-heading { margin-bottom: 17px; }
        .discover-kicker { color: var(--dim); font-size: 10px; font-weight: 800; letter-spacing: .16em; }
        .discover-heading .h2 { margin: 8px 0 5px; font-size: 21px; letter-spacing: -.035em; }
        .discover-heading p { color: var(--muted); font-size: 13px; }
        .mood-grid { display:grid; grid-template-columns:repeat(2,minmax(0,1fr)); gap:10px; }
        .mood-tile { min-height:94px; position:relative; display:flex; flex-direction:column; align-items:flex-start; justify-content:space-between; gap:12px; padding:14px; border:1px solid rgba(255,255,255,.075); border-radius:16px; color:#f5f3f7; font-size:13px; font-weight:700; text-align:left; overflow:hidden; transition:transform .16s ease,border-color .16s ease; }
        .mood-tile:active { transform:scale(.985); }
        .mood-icon { font-size:20px; line-height:1; opacity:.9; }
        .mood-arrow { position:absolute; right:13px; top:13px; color:rgba(255,255,255,.55); font-size:13px; }
        .mood-rose { background:linear-gradient(135deg,#33232d,#1c171e 80%); }
        .mood-sage { background:linear-gradient(135deg,#26312f,#171b1a 80%); }
        .mood-amber { background:linear-gradient(135deg,#342c20,#1d1915 80%); }
        .mood-blue { background:linear-gradient(135deg,#232d3a,#17191f 80%); }
        .discover-foot { display:flex; align-items:center; gap:10px; margin:26px 0 13px; color:var(--dim); font-size:9px; font-weight:800; letter-spacing:.12em; white-space:nowrap; }
        .discover-line { height:1px; flex:1; background:rgba(255,255,255,.09); }
        .popular-searches { display:flex; gap:8px; flex-wrap:wrap; }
        .popular-pill { border:1px solid var(--line); border-radius:999px; padding:9px 12px; background:rgba(255,255,255,.025); color:var(--muted); font-size:12px; }
        @media(min-width:700px) { .mood-grid { grid-template-columns:repeat(4,minmax(0,1fr)); } }
      `}</style>
    </main>
  );
}

export default function SearchPage() {
  return (
    <Suspense fallback={<main className="page" />}>
      <SearchInner />
    </Suspense>
  );
}

