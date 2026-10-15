# 🎵 Nexaa Music

**Web music player modern ala Spotify — unlimited, tanpa API key, 100% local storage.**

Dibuat oleh **Egiuu** 

---

## 🏠 Pembaruan Studio v12 — Beranda & Navbar Kapsul

- Beranda baru: header (avatar + chat/notif/cari/pengaturan), sapaan, kartu profil emas dengan rank dari total jam dengar, chip pintasan (History / Stats / Liked / Downloaded), **Trending community playlists** (cover mosaic 2×2) dan **New releases**.
- Navbar kapsul liquid-glass 3 tab (Beranda · Jelajahi · Koleksi) dengan lensa kaca yang meluncur, melar saat pindah tab, dan ikon aktif beraksen amber. Mendukung `prefers-reduced-motion`.
- API baru di `/api/ytm`: `action=community` dan `action=newreleases`.
- `/library?tab=liked|recent|playlists` membuka tab langsung dari beranda.
- Nama & judul profil diubah di `app/page.tsx` (`PROFILE_NAME`, `PROFILE_TITLE`).

## 🎚️ Pembaruan Studio v9

- Player YouTube di-warm-up setelah render awal, dengan satu proses inisialisasi agar beberapa tap cepat tidak membuat iframe player ganda.
- Pemutaran tidak lagi memanggil `playVideo()` ulang 100 ms setelah `loadVideoById()`. Watchdog baru berjalan setelah player siap, supaya keterlambatan unduh API tidak dianggap sebagai lagu gagal.
- Frekuensi update progress dikurangi untuk menekan render ulang UI. Preconnect ke host YouTube juga ditambahkan.
- Tema diperhalus menjadi graphite dengan aksen lavender terbatas; glow, blur, gradien multiwarna, dan font eksternal yang blocking dikurangi.

> Catatan: YouTube/browser/Android tetap bisa membatasi pemutaran latar belakang atau buffering berdasarkan jaringan dan kebijakan platform.

## ✨ Fitur

- 🔍 **Pencarian tanpa batas** — lagu, artis, album, playlist dari YouTube Music, tanpa API key
- ▶️ **Mini player & full player** ala Spotify (seek, shuffle, repeat off/all/one, volume)
- 🎤 **Lirik sinkron (synced lyrics)** — baris lirik menyala & auto-scroll mengikuti lagu, dengan fallback lirik statis
- 📻 **Auto radio** — antrean otomatis diisi lagu serupa saat memutar satu lagu
- ❤️ **Lagu disukai, playlist lokal, riwayat putar** — semua tersimpan di localStorage, tanpa database
- 💊 **Floating pill navbar**, scroll reveal animation, UI studio gelap dengan aksen lavender yang lebih tenang
- 📲 **PWA** — bisa di-install ke home screen (Android/iOS/desktop), lengkap dengan service worker
- 🛡️ **Fallback pintar** — lagu yang embed-nya dibatasi otomatis dicarikan sumber alternatif yang sudah divalidasi

## 🧰 Tech Stack

| Bagian | Teknologi |
|---|---|
| Framework | [Next.js 14](https://nextjs.org) (App Router) + TypeScript |
| Data musik | [ytmusic-api](https://www.npmjs.com/package/ytmusic-api) — unofficial YouTube Music API, tanpa API key |
| Pemutar audio | YouTube IFrame Player API (streaming langsung browser ↔ YouTube) |
| Lirik sinkron | [LRCLIB](https://lrclib.net) — database lirik LRC gratis & terbuka |
| Lirik statis | YouTube Music (via ytmusic-api) |
| Penyimpanan | 100% `localStorage` — tanpa server database |
| Font | System UI stack (tanpa unduhan font eksternal) |

## 🚀 Menjalankan Secara Lokal

```bash
npm install
npm run dev
# buka http://localhost:3000
```

## ▲ Deploy ke Vercel

1. Push repo ini ke GitHub
2. Import di [vercel.com](https://vercel.com) → framework Next.js terdeteksi otomatis
3. Deploy — **tanpa environment variable apa pun**

> Route API sudah diset `runtime = "nodejs"` karena `ytmusic-api` tidak jalan di Edge runtime.

## 📁 Struktur Project

```
app/
├── api/ytm/route.ts    # proxy ke YouTube Music + LRCLIB (search, home, lirik, dll.)
├── page.tsx            # Beranda (rekomendasi + baru diputar)
├── search/             # pencarian + suggestion
├── library/            # playlist lokal, lagu disukai, riwayat
├── artist/[id]/        # halaman artis
├── album/[id]/         # halaman album
├── playlist/[id]/      # playlist YT Music & playlist lokal
└── dev/                # info developer
components/             # NavBar, MiniPlayer, FullPlayer, Cards, Icons (SVG fill), dll.
lib/
├── player.tsx          # engine pemutar (queue, shuffle, repeat, fallback error)
├── storage.ts          # semua operasi localStorage
└── types.ts            # tipe data bersama
public/
├── manifest.webmanifest
├── sw.js               # service worker PWA
└── icons/              # icon app
```

## 🙏 Atribusi

- Lirik sinkron disediakan oleh **[LRCLIB](https://lrclib.net)**
- Lirik statis & metadata musik dari **YouTube Music** melalui [ytmusic-api](https://github.com/zS1L3NT/ts-npm-ytmusic-api)
- Audio di-stream melalui **YouTube IFrame Player API** langsung di browser pengguna

Proyek ini tidak berafiliasi dengan YouTube/Google. Gunakan secara bijak sesuai ketentuan layanan masing-masing platform.

## 📄 Lisensi

Dilisensikan di bawah **[Apache License 2.0](LICENSE)**.

```
Copyright 2026 Egiuu

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

    http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.
```
