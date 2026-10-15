import { NextRequest, NextResponse } from "next/server";
import YTMusic from "ytmusic-api";
import type { Track, HomeShelf, ShelfItem, CommunityPlaylist } from "@/lib/types";

export const dynamic = "force-dynamic";
// Vercel: pakai Node.js runtime (ytmusic-api tidak jalan di Edge) + beri waktu cukup
export const runtime = "nodejs";
export const maxDuration = 30;

let ytm: YTMusic | null = null;
let initPromise: Promise<YTMusic> | null = null;

async function getYT(): Promise<YTMusic> {
  if (ytm) return ytm;
  if (!initPromise) {
    initPromise = (async () => {
      const y = new YTMusic();
      await y.initialize();
      ytm = y;
      return y;
    })().catch((e) => {
      initPromise = null;
      throw e;
    });
  }
  return initPromise;
}

function bestThumb(thumbs: { url: string; width: number }[] | undefined): string {
  if (!thumbs || thumbs.length === 0) return "";
  const sorted = [...thumbs].sort((a, b) => b.width - a.width);
  return sorted[0].url;
}

function hiRes(url: string): string {
  // upgrade googleusercontent thumbs to a bigger square
  return url.replace(/=w\d+-h\d+/, "=w544-h544");
}

// Wrap URL gambar lewat proxy internal agar bisa dimuat di WebView/APK
function proxyImg(url: string): string {
  if (!url) return url;
  // Hanya proxy domain Google/YouTube yang sering diblokir di WebView
  const needsProxy = [
    "lh3.googleusercontent.com",
    "yt3.ggpht.com",
    "yt3.googleusercontent.com",
    "i.ytimg.com",
  ].some((d) => url.includes(d));
  if (!needsProxy) return url;
  return `/api/img?url=${encodeURIComponent(url)}`;
}

function mapSong(s: any): Track {
  const artistName =
    s.artist?.name ??
    s.artists?.[0]?.name ??
    (Array.isArray(s.artists) ? s.artists.map((a: any) => a.name).filter(Boolean).join(", ") : null) ??
    s.channelName ??
    "";
  return {
    id: s.videoId,
    title: s.name,
    artist: artistName,
    artistId: s.artist?.artistId ?? s.artists?.[0]?.artistId ?? null,
    album: s.album?.name ?? null,
    albumId: s.album?.albumId ?? null,
    duration: s.duration ?? 0,
    thumb: proxyImg(hiRes(bestThumb(s.thumbnails))),
  };
}

/* ---------- beranda: playlist komunitas + rilis baru ---------- */
const COMMUNITY_QUERIES = [
  "playlist lagu indonesia 90an",
  "playlist galau inggris",
  "playlist lagu indo viral",
  "playlist rock alternative",
  "playlist lagu santai kopi",
  "playlist hits 2000an",
];
const COMMUNITY_TTL = 1000 * 60 * 30; // 30 menit
let communityCache: { at: number; data: CommunityPlaylist[] } | null = null;

function withTimeout<T>(p: Promise<T>, ms: number, fallback: T): Promise<T> {
  return new Promise<T>((resolve) => {
    const t = setTimeout(() => resolve(fallback), ms);
    p.then(
      (v) => {
        clearTimeout(t);
        resolve(v);
      },
      () => {
        clearTimeout(t);
        resolve(fallback);
      }
    );
  });
}

function parseDur(d: string | number | null | undefined): number {
  if (typeof d === "number") return d;
  if (!d) return 0;
  const parts = String(d).split(":").map(Number);
  return parts.reduce((acc, p) => acc * 60 + p, 0);
}

/* ---------- lirik: cache + util ---------- */
const lyricsCache = new Map<string, { at: number; data: any }>();
const LYRICS_TTL = 1000 * 60 * 60 * 24; // 24 jam

function cleanTitle(s: string): string {
  return s
    // hapus semua bracket content yg bukan penting
    .replace(/\((official|lyric|lirik|audio|video|mv|visualizer|hd|4k|performance|stage|ver\.|version|prod\.|remaster|remastered|remix|edit|live|cover|acoustic|piano|inst\.?|instrumental|karaoke|ost|original|full|teaser|m\/v|music video)[^)]*\)/gi, "")
    .replace(/\[(official|lyric|lirik|audio|video|mv|visualizer|hd|4k|ver\.|version|prod\.|remaster|remastered|remix|edit|live|cover|acoustic|piano|inst\.?|instrumental|karaoke|ost|original|full|teaser|m\/v|music video)[^\]]*\]/gi, "")
    // hapus feat
    .replace(/\s*[\(\[]?(?:feat|ft|featuring)\.?\s.+?[\)\]]?$/i, "")
    // hapus trailing dash + kata
    .replace(/\s*[-–—]\s*(official|audio|video|lyric|lirik|mv|live|cover).*$/i, "")
    .replace(/\s+/g, " ")
    .trim();
}

function cleanArtist(s: string): string {
  // ambil artis utama saja (sebelum koma, &, x, feat, /)
  return s
    .split(/\s*[,&×x\/]\s*|\s+(?:feat|ft|featuring|and|dan|with)\s+/i)[0]
    .replace(/\s*\([^)]*\)/, "")
    .trim();
}

async function fetchJson(url: string, ms = 6000): Promise<any> {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), ms);
  try {
    const r = await fetch(url, {
      headers: { "User-Agent": "Nexaa Music/1.0 (https://github.com)" },
      signal: ctrl.signal,
    });
    if (!r.ok) return null;
    return await r.json();
  } catch {
    return null;
  } finally {
    clearTimeout(t);
  }
}

export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const action = sp.get("action") || "";
  const q = sp.get("q") || "";
  const id = sp.get("id") || "";

  try {
    const yt = await getYT();

    switch (action) {
      case "home": {
        // getHomeSections() memerlukan cookies YouTube — diganti dengan parallel search
        const queries = [
          { title: "🔥 Trending Sekarang",   q: "top hits 2026" },
          { title: "💜 Hits Indonesia",       q: "lagu hits indonesia 2026" },
          { title: "🎵 Lagu Populer Global", q: "billboard hot 100 2026" },
          { title: "🌙 Santai & Chill",       q: "chill lofi acoustic 2026" },
          { title: "⚡ Hip-Hop & R&B",        q: "hip hop rnb hits 2026" },
        ];

        const results = await Promise.allSettled(
          queries.map(({ q }) => yt.searchSongs(q).catch(() => []))
        );

        const shelves: HomeShelf[] = queries
          .map(({ title, q }, i) => {
            const res = results[i];
            const songs: any[] = res.status === "fulfilled" ? (res.value as any[]) : [];
            const items: ShelfItem[] = songs.slice(0, 10).map((s: any) => ({
              kind: "song" as const,
              ...mapSong(s),
            }));
            return { title, searchQuery: q, items };
          })
          .filter((s) => s.items.length > 0);

        return NextResponse.json({ shelves }, {
          headers: {
            "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600",
          },
        });
      }

      case "community": {
        const headers = {
          "Cache-Control": "public, s-maxage=600, stale-while-revalidate=1800",
        };
        if (communityCache && Date.now() - communityCache.at < COMMUNITY_TTL) {
          return NextResponse.json({ playlists: communityCache.data }, { headers });
        }

        const found = await Promise.all(
          COMMUNITY_QUERIES.map(async (query): Promise<CommunityPlaylist | null> => {
            const res: any[] = await withTimeout(
              yt.searchPlaylists(query) as Promise<any[]>,
              6000,
              [] as any[]
            );
            const pl = (res || []).find((x: any) => x && x.playlistId);
            if (!pl) return null;
            const vids: any[] = await withTimeout(
              yt.getPlaylistVideos(pl.playlistId) as Promise<any[]>,
              5000,
              [] as any[]
            );
            const covers: string[] = (vids || [])
              .slice(0, 4)
              .map((v: any) => proxyImg(hiRes(bestThumb(v.thumbnails))))
              .filter(Boolean);
            const thumb = proxyImg(hiRes(bestThumb(pl.thumbnails))) || covers[0] || "";
            return {
              id: pl.playlistId,
              name: pl.name,
              subtitle:
                vids && vids.length > 0
                  ? `${vids.length} lagu`
                  : pl.artist?.name || "Playlist komunitas",
              thumb,
              covers: covers.length >= 4 ? covers : [],
            };
          })
        );

        const seen = new Set<string>();
        const playlists: CommunityPlaylist[] = [];
        for (const item of found) {
          if (!item || !item.name || (!item.thumb && item.covers.length === 0)) continue;
          if (seen.has(item.id)) continue;
          seen.add(item.id);
          playlists.push(item);
        }

        if (playlists.length > 0) communityCache = { at: Date.now(), data: playlists };
        return NextResponse.json({ playlists }, { headers });
      }

      case "newreleases": {
        const queries = ["lagu indonesia terbaru 2026", "new songs 2026"];
        const results = await Promise.allSettled(queries.map((qq) => yt.searchSongs(qq)));
        const lists: any[][] = results.map((r) =>
          r.status === "fulfilled" ? (r.value as any[]) : []
        );
        const max = Math.max(0, ...lists.map((l) => l.length));
        const seen = new Set<string>();
        const songs: Track[] = [];
        for (let i = 0; i < max && songs.length < 14; i++) {
          for (const list of lists) {
            const sg = list[i];
            if (!sg || !sg.videoId || seen.has(sg.videoId) || songs.length >= 14) continue;
            const t = mapSong(sg);
            if (!t.thumb) continue;
            seen.add(sg.videoId);
            songs.push(t);
          }
        }
        return NextResponse.json({ songs }, {
          headers: {
            "Cache-Control": "public, s-maxage=600, stale-while-revalidate=1800",
          },
        });
      }

      case "search": {
        const [songs, artists, albums, playlists] = await Promise.all([
          yt.searchSongs(q).catch(() => []),
          yt.searchArtists(q).catch(() => []),
          yt.searchAlbums(q).catch(() => []),
          yt.searchPlaylists(q).catch(() => []),
        ]);
        return NextResponse.json({
          // Return semua lagu (min ~20 dari API), biarkan frontend yang slice
          songs: (songs as any[]).map(mapSong),
          artists: (artists as any[]).map((a: any) => ({
            id: a.artistId,
            name: a.name,
            thumb: proxyImg(hiRes(bestThumb(a.thumbnails))),
          })),
          albums: (albums as any[]).map((a: any) => ({
            id: a.albumId,
            name: a.name,
            artist: a.artist?.name ?? "",
            year: a.year,
            thumb: proxyImg(hiRes(bestThumb(a.thumbnails))),
          })),
          playlists: (playlists as any[]).map((p: any) => ({
            id: p.playlistId,
            name: p.name,
            artist: p.artist?.name ?? "",
            count: p.videoCount,
            thumb: proxyImg(hiRes(bestThumb(p.thumbnails))),
          })),
        });
      }

      case "suggest": {
        const sugg = await yt.getSearchSuggestions(q);
        return NextResponse.json({ suggestions: sugg.slice(0, 8) });
      }

      case "artist": {
        const a: any = await yt.getArtist(id);

        // Deskripsi artis — cek berbagai field
        const description: string =
          a.description ?? a.bio ?? a.header?.description ?? "";

        // Subscriber count
        const subscribers: string = a.subscribers ?? a.subscriberCount ?? "";

        // Fetch playlist artis
        const rawPlaylists: any[] = [
          ...(a.featuredPlaylists ?? []),
          ...(a.playlists ?? []),
          ...(a.communityPlaylists ?? []),
        ];

        let artistPlaylists = rawPlaylists;
        if (artistPlaylists.length === 0 && a.name) {
          const searched = await yt.searchPlaylists(a.name).catch(() => []);
          artistPlaylists = (searched as any[]).slice(0, 10);
        }

        // Related / similar artists
        const rawRelated: any[] = [
          ...(a.relatedArtists ?? []),
          ...(a.similarArtists ?? []),
          ...(a.related ?? []),
        ];

        return NextResponse.json({
          id: a.artistId,
          name: a.name,
          thumb: proxyImg(hiRes(bestThumb(a.thumbnails))),
          description,
          subscribers,
          topSongs: (a.topSongs || []).map(mapSong),
          topAlbums: (a.topAlbums || []).map((al: any) => ({
            id: al.albumId,
            name: al.name,
            artist: al.artist?.name ?? a.name,
            year: al.year,
            thumb: proxyImg(hiRes(bestThumb(al.thumbnails))),
          })),
          playlists: artistPlaylists.map((p: any) => ({
            id: p.playlistId ?? p.id ?? "",
            name: p.name ?? p.title ?? "",
            artist: p.artist?.name ?? a.name,
            count: p.videoCount ?? p.trackCount ?? null,
            thumb: proxyImg(hiRes(bestThumb(p.thumbnails))),
          })).filter((p: any) => p.id),
          relatedArtists: rawRelated.slice(0, 8).map((ra: any) => ({
            id: ra.artistId ?? ra.id ?? "",
            name: ra.name ?? "",
            thumb: proxyImg(hiRes(bestThumb(ra.thumbnails))),
            subscribers: ra.subscribers ?? ra.subscriberCount ?? "",
          })).filter((ra: any) => ra.id && ra.name),
        });
      }

      case "album": {
        const al: any = await yt.getAlbum(id);
        return NextResponse.json({
          id: al.albumId,
          name: al.name,
          artist: al.artist?.name ?? "",
          artistId: al.artist?.artistId ?? null,
          year: al.year,
          thumb: proxyImg(hiRes(bestThumb(al.thumbnails))),
          tracks: (al.songs || []).map((s: any) => {
            const t = mapSong(s);
            if (!t.thumb) t.thumb = proxyImg(hiRes(bestThumb(al.thumbnails)));
            return t;
          }),
        });
      }

      case "playlist": {
        const [pl, vids]: any[] = await Promise.all([
          yt.getPlaylist(id),
          yt.getPlaylistVideos(id).catch(() => []),
        ]);
        return NextResponse.json({
          id: pl.playlistId,
          name: pl.name,
          artist: pl.artist?.name ?? "",
          thumb: proxyImg(hiRes(bestThumb(pl.thumbnails))),
          tracks: (vids || []).map((v: any) => ({
            id: v.videoId,
            title: v.name,
            artist: v.artist?.name ?? "",
            artistId: v.artist?.artistId ?? null,
            duration: v.duration ?? 0,
            thumb: proxyImg(hiRes(bestThumb(v.thumbnails))),
          })),
        });
      }

      case "upnext": {
        const ups: any[] = await yt.getUpNexts(id);
        const tracks: Track[] = ups.map((u) => ({
          id: u.videoId,
          title: u.title,
          artist: u.artists,
          artistId: null,
          duration: parseDur(u.duration),
          thumb: proxyImg(hiRes(u.thumbnail || "")),
        }));
        return NextResponse.json({ tracks });
      }

      case "lyrics": {
        const title = sp.get("title") || "";
        const artist = sp.get("artist") || "";
        const dur = Number(sp.get("dur") || 0);

        // cache 24 jam per lagu → LRCLIB tidak di-hit berulang utk lagu yang sama
        const cacheKey = `${id}|${title}|${artist}`.toLowerCase();
        const hit = lyricsCache.get(cacheKey);
        if (hit && Date.now() - hit.at < LYRICS_TTL) {
          return NextResponse.json(hit.data);
        }

        let synced: { time: number; text: string }[] | null = null;
        let plain: string[] | null = null;

        const parseSynced = (raw: string) => {
          const out = String(raw)
            .split("\n")
            .map((line: string) => {
              const m = line.match(/^\[(\d+):(\d+)(?:\.(\d+))?\](.*)$/);
              if (!m) return null;
              const cs = m[3] ? Number(m[3].padEnd(2, "0").slice(0, 2)) : 0;
              return {
                time: Number(m[1]) * 60 + Number(m[2]) + cs / 100,
                text: m[4].trim(),
              };
            })
            .filter(Boolean) as { time: number; text: string }[];
          return out.length ? out : null;
        };

        if (title && artist) {
          const ct = cleanTitle(title);
          const ca = cleanArtist(artist);

          const tryLrclib = async (t: string, a: string) => {
            // 1) exact GET dulu
            const params = new URLSearchParams({ track_name: t, artist_name: a });
            if (dur > 0) params.set("duration", String(dur));
            let lr: any = await fetchJson(`https://lrclib.net/api/get?${params}`);
            if (lr?.syncedLyrics || lr?.plainLyrics) return lr;

            // 2) search fallback
            const found: any[] =
              (await fetchJson(
                `https://lrclib.net/api/search?q=${encodeURIComponent(`${t} ${a}`)}`
              )) || [];

            // prioritas: synced + durasi cocok
            return (
              found.find(
                (x) => x.syncedLyrics && (!dur || Math.abs((x.duration || 0) - dur) <= 8)
              ) ||
              found.find((x) => x.syncedLyrics) ||
              found.find((x) => x.plainLyrics) ||
              null
            );
          };

          // Coba artis utama dulu
          let lr = await tryLrclib(ct, ca);

          // Fallback: coba tanpa artis sama sekali (judul aja)
          if (!lr?.syncedLyrics && !lr?.plainLyrics) {
            const found: any[] =
              (await fetchJson(
                `https://lrclib.net/api/search?q=${encodeURIComponent(ct)}`
              )) || [];
            lr = lr ||
              found.find((x) => x.syncedLyrics && (!dur || Math.abs((x.duration || 0) - dur) <= 8)) ||
              found.find((x) => x.syncedLyrics && x.trackName?.toLowerCase().includes(ct.toLowerCase())) ||
              found.find((x) => x.plainLyrics && x.trackName?.toLowerCase().includes(ct.toLowerCase())) ||
              null;
          }

          // Fallback: artis lain di string (misal "AKMU, IU" → coba "IU")
          if (!lr?.syncedLyrics && !lr?.plainLyrics) {
            const allArtists = artist.split(/[,&×x\/]|\s+(?:feat|ft|featuring|and|dan)\s+/i)
              .map((a) => a.trim()).filter(Boolean).slice(1, 3);
            for (const alt of allArtists) {
              const r = await tryLrclib(ct, alt.replace(/\s*\([^)]*\)/, "").trim());
              if (r?.syncedLyrics || r?.plainLyrics) { lr = r; break; }
            }
          }

          if (lr?.syncedLyrics) synced = parseSynced(lr.syncedLyrics);
          if (!synced && lr?.plainLyrics) plain = String(lr.plainLyrics).split("\n");
        }

        // 3) fallback terakhir: lirik polos dari YouTube Music
        if (!synced && !plain && id) {
          plain = (await yt.getLyrics(id).catch(() => null)) as string[] | null;
        }

        const data = { synced, lyrics: plain };
        // cache juga hasil kosong (5 menit saja) biar gak spam saat lagu tanpa lirik
        lyricsCache.set(cacheKey, {
          at: synced || plain ? Date.now() : Date.now() - LYRICS_TTL + 1000 * 60 * 5,
          data,
        });
        if (lyricsCache.size > 500) {
          let oldestKey: string | null = null;
          let oldestAt = Infinity;
          lyricsCache.forEach((v, k) => {
            if (v.at < oldestAt) {
              oldestAt = v.at;
              oldestKey = k;
            }
          });
          if (oldestKey) lyricsCache.delete(oldestKey);
        }
        return NextResponse.json(data);
      }

      case "alt": {
        // Cari videoId alternatif utk lagu yang embed-nya dibatasi.
        // Strategi: 2 query paralel (biasa + "lyrics"), prioritaskan video
        // lirik/audio dari channel pihak ketiga (hampir selalu embeddable,
        // video official label justru sering diblokir), saring durasi,
        // lalu validasi via oembed.
        const dur = Number(sp.get("dur") || 0);
        const [v1, v2] = await Promise.all([
          yt.searchVideos(q).catch(() => []),
          yt.searchVideos(`${q} lyrics`).catch(() => []),
        ]);
        const seen = new Set<string>();
        const all = [...(v2 as any[]), ...(v1 as any[])].filter((v) => {
          if (!v.videoId || seen.has(v.videoId)) return false;
          seen.add(v.videoId);
          return true;
        });

        const score = (v: any): number => {
          const name = String(v.name || "").toLowerCase();
          let s = 0;
          // video lirik/audio/visualizer → paling mungkin embeddable
          if (/lyric|lirik|audio only|\baudio\b|visualizer|letra/.test(name)) s += 50;
          // video official label (sering diblokir embednya) → turunkan drastis
          if (/official (music )?video|\bm\/?v\b|official mv/.test(name)) s -= 40;
          // VEVO channel biasanya diblokir embed
          if (/vevo/i.test(String(v.channelName || ""))) s -= 30;
          if (/live|concert|konser/.test(name)) s -= 15;
          if (/cover|remix|sped up|slowed/.test(name)) s -= 10;
          // durasi mirip lagu asli
          if (dur > 0 && v.duration) {
            const diff = Math.abs(v.duration - dur);
            if (diff <= 5) s += 25;
            else if (diff <= 20) s += 10;
            else if (diff > 60) s -= 30;
          }
          return s;
        };

        const cands = all
          .filter((v) => !dur || !v.duration || Math.abs(v.duration - dur) <= 150)
          .sort((a, b) => score(b) - score(a))
          .slice(0, 20);

        // Ambil langsung dari kandidat yang sudah diranking (oembed tidak reliabel
        // untuk mendeteksi embed restriction — mengembalikan 200 bahkan untuk video
        // yang diblokir embednya). Filter berdasarkan skor saja sudah cukup.
        const ids = cands.map((c) => c.videoId).slice(0, 6);
        return NextResponse.json({ ids });
      }

      default:
        return NextResponse.json({ error: "unknown action" }, { status: 400 });
    }
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "failed" }, { status: 500 });
  }
}
