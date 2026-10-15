/** @type {import('next').NextConfig} */
const nextConfig = {
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          {
            key: "Permissions-Policy",
            value: "autoplay=*, fullscreen=*, picture-in-picture=*",
          },
          {
            // CSP yang benar-benar mengizinkan YouTube iframe + audio streaming
            key: "Content-Security-Policy",
            value: [
              "default-src 'self'",
              // Script: izinkan YouTube iframe API
              "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://www.youtube.com https://s.ytimg.com https://www.gstatic.com",
              "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
              "font-src 'self' https://fonts.gstatic.com",
              // Img: semua HTTPS (gambar dari berbagai CDN Google)
              "img-src 'self' data: blob: https:",
              // Media: izinkan blob dan streaming
              "media-src 'self' blob: https: https://*.googlevideo.com",
              // Frame: YouTube dan youtube-nocookie
              "frame-src https://www.youtube.com https://www.youtube-nocookie.com https://www.youtube.com/embed/",
              // Connect: izinkan semua HTTPS termasuk YouTube API dan lrclib
              "connect-src 'self' https: wss:",
              // Worker: izinkan service worker
              "worker-src 'self' blob:",
            ].join("; "),
          },
        ],
      },
      {
        source: "/sw.js",
        headers: [
          { key: "Cache-Control", value: "public, max-age=0, must-revalidate" },
          { key: "Content-Type", value: "application/javascript; charset=utf-8" },
          { key: "Service-Worker-Allowed", value: "/" },
        ],
      },
      {
        source: "/manifest.webmanifest",
        headers: [
          { key: "Content-Type", value: "application/manifest+json" },
          { key: "Cache-Control", value: "public, max-age=86400" },
        ],
      },
    ];
  },
};

export default nextConfig;
