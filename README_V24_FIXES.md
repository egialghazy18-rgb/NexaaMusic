# Nexaa Studio v24 — Visualizer polish & playback notes

## Perubahan
- Logo home mempertahankan equalizer radial mengelilingi logo, dengan animasi lebih organik, beberapa puncak dan jeda pendek, serta glow lebih halus.
- Catatan Equalizer diperjelas: preset saat YouTube iframe digunakan tidak dapat menerapkan filter frekuensi langsung ke stream lintas-origin.
- Pemulihan playback saat tab kembali aktif tetap guarded dan hanya mencoba resume bila player benar-benar berhenti; tidak menginterupsi state buffering.

## Batasan penting
- Project ini masih web app Next.js dengan YouTube IFrame Player. Browser Android mengontrol audio background dan audio focus; halaman web tidak dapat menjamin pemutaran tidak dihentikan saat aplikasi lain mengambil audio focus atau OS membatasi browser.
- Untuk audio focus Android yang konsisten dan EQ frekuensi sungguhan, diperlukan aplikasi Android native/bridge dengan sumber audio yang dapat diproses. YouTube iframe tidak dapat disambungkan begitu saja ke Web Audio API karena cross-origin.
- Equalizer logo adalah animasi simulasi, bukan pembacaan beat/frekuensi lagu.

## Build
Jalankan `npm install`, lalu `npm run build`. Build belum dijalankan di lingkungan pembuatan arsip ini.
