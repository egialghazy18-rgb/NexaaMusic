=================================================
  CARA SELF-HOST VIDEO DEV PAGE (WAJIB DIBACA)
=================================================

Supaya video di halaman Dev muncul 24jam non-stop
tanpa tergantung catbox.moe, lakukan ini:

LANGKAH:
  1. Download videomu dari:
     https://files.catbox.moe/j4eaq3.mp4

  2. Rename jadi:
     nexaa-preview.mp4

  3. Taruh di folder ini:
     /public/nexaa-preview.mp4

  4. Commit + push ke GitHub → Vercel auto-deploy

  5. Selesai! Video akan served dari:
     https://[domain-kamu].vercel.app/nexaa-preview.mp4
     (Vercel CDN global, 24jam, gratis)

KENAPA INI LEBIH BAIK DARI CATBOX:
  ✓ Vercel CDN = edge server di seluruh dunia
  ✓ Tidak ada rate limit / 403
  ✓ Tidak bisa down karena server orang lain
  ✓ Load time < 1 detik karena CDN
  ✓ HTTPS otomatis

UKURAN FILE:
  Vercel free plan: max 100MB per file
  Kalau video > 100MB, compress dulu pakai HandBrake
  Target: < 20MB untuk loading paling cepat

=================================================
