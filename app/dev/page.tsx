"use client";

import React, { useEffect, useState } from "react";
import { Space_Grotesk } from "next/font/google";
import Reveal from "@/components/Reveal";
import { useToast } from "@/components/Toast";
import { MusicNoteIcon, HeartIcon, PlusIcon, SparkleIcon } from "@/components/Icons";

const grotesk = Space_Grotesk({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const IG_URL = "https://www.instagram.com/egi_alghazy18";

function IGIcon({ size = 24 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
    </svg>
  );
}

function VerifiedIcon({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 22 22" fill="none">
      <path
        fill="#1D9BF0"
        d="M20.396 11c-.018-.646-.215-1.275-.57-1.816-.354-.54-.852-.972-1.438-1.246.223-.607.27-1.264.14-1.897-.131-.634-.437-1.218-.882-1.687-.47-.445-1.053-.75-1.687-.882-.633-.13-1.29-.083-1.897.14-.273-.587-.704-1.086-1.245-1.44S11.647 1.62 11 1.604c-.646.017-1.273.213-1.813.568s-.969.854-1.24 1.44c-.608-.223-1.267-.272-1.902-.14-.635.13-1.22.436-1.69.882-.445.47-.749 1.055-.878 1.688-.13.633-.08 1.29.144 1.896-.587.274-1.087.705-1.443 1.245-.356.54-.555 1.17-.574 1.817.02.647.218 1.276.574 1.817.356.54.856.972 1.443 1.245-.224.606-.274 1.263-.144 1.896.13.634.433 1.218.877 1.688.47.443 1.054.747 1.687.878.633.13 1.29.08 1.897-.136.274.586.705 1.084 1.246 1.439.54.354 1.17.551 1.816.569.647-.016 1.276-.213 1.817-.567s.972-.854 1.245-1.44c.604.239 1.266.296 1.903.164.636-.132 1.22-.447 1.68-.907.46-.46.776-1.044.908-1.681s.075-1.299-.165-1.903c.586-.274 1.084-.705 1.439-1.246.354-.54.551-1.17.569-1.816zM9.662 14.85l-3.429-3.428 1.293-1.302 2.072 2.072 4.4-4.794 1.347 1.246z"
      />
    </svg>
  );
}

/**
 * Video source priority:
 * 1. /nexaa-preview.mp4  — self-hosted di Vercel /public (tercepat, 24jam, CDN global)
 * 2. catbox fallback      — backup kalau file lokal belum diupload
 *
 * Cara self-host:
 *   → Taruh file video kamu di:  /public/nexaa-preview.mp4
 *   → Commit + push ke Vercel
 *   → Selesai. Video akan served dari Vercel CDN 24jam non-stop.
 */
const VIDEO_LOCAL   = "/nexaa-preview.mp4";
const VIDEO_FALLBACK = "https://files.catbox.moe/j4eaq3.mp4";

function DevVideo() {
  const ref  = React.useRef<HTMLVideoElement>(null);
  const [src, setSrc] = React.useState(VIDEO_LOCAL);
  const [ready, setReady] = React.useState(false);

  React.useEffect(() => {
    const v = ref.current;
    if (!v) return;

    // Kalau video sudah cached / readyState sudah cukup → langsung tampil
    if (v.readyState >= 3) {
      setReady(true);
      v.play().catch(() => {});
      return;
    }

    const onReady = () => {
      setReady(true);
      v.play().catch(() => {});
    };

    const onError = () => {
      if (src === VIDEO_LOCAL) setSrc(VIDEO_FALLBACK);
    };

    // canplaythrough = buffered cukup; loadeddata = frame pertama ada
    v.addEventListener("loadeddata",    onReady, { once: true });
    v.addEventListener("canplay",       onReady, { once: true });
    v.addEventListener("error",         onError, { once: true });

    return () => {
      v.removeEventListener("loadeddata",    onReady);
      v.removeEventListener("canplay",       onReady);
      v.removeEventListener("error",         onError);
    };
  }, [src]);

  return (
    <div style={{
      margin: "22px 0 28px",
      borderRadius: "var(--r-xl)",
      overflow: "hidden",
      border: "1px solid rgba(255,255,255,0.09)",
      boxShadow: "0 16px 48px rgba(0,0,0,0.50), 0 0 0 0.5px rgba(124,92,252,0.12)",
      background: "#0D1324",
      position: "relative",
    }}>
      {/* Accent line atas */}
      <div style={{
        position: "absolute",
        top: 0, left: 0, right: 0, height: 2,
        background: "linear-gradient(90deg, transparent, rgba(124,92,252,0.65), rgba(79,140,255,0.55), transparent)",
        zIndex: 3,
      }} />

      {/* Shimmer placeholder — hilang begitu video ready */}
      {!ready && (
        <div style={{
          position: "absolute", inset: 0,
          background: "#0D1324",
          zIndex: 1,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          aspectRatio: "16/9",
          transition: "opacity 0.2s ease",
        }}>
          <span style={{ fontSize: 28, opacity: 0.2 }}>▶</span>
        </div>
      )}

      <video
        ref={ref}
        src={src}
        loop
        muted
        autoPlay
        playsInline
        preload="auto"
        style={{
          position: "relative", zIndex: 2,
          width: "100%", display: "block",
          aspectRatio: "16/9", objectFit: "cover",
          opacity: ready ? 1 : 0,
          transition: "opacity 0.3s ease",
        }}
      />
    </div>
  );
}

export default function DevPage() {
  const toast = useToast();
  const [canInstall, setCanInstall] = useState(false);
  const [installed, setInstalled] = useState(false);
  const [showHelp, setShowHelp] = useState(false);

  useEffect(() => {
    const standalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      (navigator as any).standalone === true;
    setInstalled(standalone);

    if (window.__nexaaInstallPrompt) setCanInstall(true);
    const onCan = () => setCanInstall(true);
    const onInstalled = () => {
      setInstalled(true);
      setCanInstall(false);
      toast("Nexaa Music berhasil ditambahkan! 🎉");
    };
    window.addEventListener("nexaa:can-install", onCan);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("nexaa:can-install", onCan);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, [toast]);

  const handleInstall = async () => {
    const prompt = window.__nexaaInstallPrompt;
    if (prompt) {
      prompt.prompt();
      const choice = await prompt.userChoice.catch(() => null);
      if (choice?.outcome === "accepted") {
        window.__nexaaInstallPrompt = undefined;
        setCanInstall(false);
      }
      return;
    }
    setShowHelp(true);
    toast("Lihat panduan install di bawah 👇");
  };

  const openIG = (e: React.MouseEvent) => {
    e.preventDefault();
    const w = window.open(IG_URL, "_blank", "noopener,noreferrer");
    if (!w) {
      navigator.clipboard?.writeText(IG_URL)
        .then(() => toast("Link Instagram disalin! 📋"))
        .catch(() => toast("Buka: " + IG_URL));
    }
  };

  return (
    <main className="page" style={{ maxWidth: 640 }}>
      <Reveal>
        <div style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          textAlign: "center",
          padding: "26px 0 10px",
        }}>
          {/* Avatar dengan gradient IG */}
          <div style={{ position: "relative", marginBottom: 22 }}>
            <div style={{
              width: 132,
              height: 132,
              borderRadius: 999,
              padding: 3,
              background: "linear-gradient(45deg, #f09433, #e6683c, #dc2743, #cc2366, #bc1888)",
              boxShadow: "0 24px 60px rgba(220,39,67,.25)",
            }}>
              <div style={{
                width: "100%",
                height: "100%",
                borderRadius: 999,
                background: "linear-gradient(135deg, #0D1324, #080B14)",
                border: "2px solid rgba(255,255,255,0.06)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 52,
                fontWeight: 800,
                color: "var(--accent)",
                fontFamily: grotesk.style.fontFamily,
              }}>
                E
              </div>
            </div>
            {/* Online dot */}
            <span style={{
              position: "absolute",
              bottom: 6,
              right: 6,
              width: 18,
              height: 18,
              borderRadius: 999,
              background: "#46a758",
              border: "2.5px solid #080B14",
            }} />
          </div>

          {/* Label developer */}
          <div style={{
            fontSize: 11,
            fontWeight: 700,
            letterSpacing: "0.18em",
            textTransform: "uppercase",
            color: "var(--accent)",
            display: "flex",
            alignItems: "center",
            gap: 6,
            marginBottom: 8,
          }}>
            <SparkleIcon size={13} /> Developer <SparkleIcon size={13} />
          </div>

          {/* Nama + centang biru */}
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
            <h1
              className={grotesk.className}
              style={{
                fontSize: "clamp(36px, 9vw, 54px)",
                fontWeight: 700,
                letterSpacing: "-0.03em",
                lineHeight: 1.05,
                margin: 0,
                background: "linear-gradient(120deg, #f5efe6 20%, #ffc63d 55%, #e8871e 85%)",
                WebkitBackgroundClip: "text",
                backgroundClip: "text",
                color: "transparent",
              }}
            >
              Egiuu
            </h1>
            <VerifiedIcon size={28} />
          </div>

          {/* Handle IG */}
          <a
            href={IG_URL}
            target="_blank"
            rel="noopener noreferrer"
            onClick={openIG}
            style={{
              fontSize: 14,
              color: "var(--muted)",
              marginBottom: 12,
              letterSpacing: "0.01em",
              textDecoration: "none",
              transition: "color .2s",
            }}
            onMouseEnter={e => (e.currentTarget.style.color = "var(--text)")}
            onMouseLeave={e => (e.currentTarget.style.color = "var(--muted)")}
          >
            @egi_alghazy18
          </a>

          <p
            className={`muted ${grotesk.className}`}
            style={{ fontSize: 15, maxWidth: 400, lineHeight: 1.7, marginTop: 4, marginBottom: 0 }}
          >
            Kreator di balik{" "}
            <strong style={{ color: "var(--text)" }}>Nexaa Music</strong> —
            web music player modern, unlimited, dan 100% local storage.
          </p>
        </div>
      </Reveal>

      {/* ── VIDEO LANSKAP — langsung di bawah deskripsi, tanpa Reveal delay ── */}
      <DevVideo />

      {/* Card Instagram */}
      <Reveal delay={100}>
        <a
          href={IG_URL}
          target="_blank"
          rel="noopener noreferrer"
          onClick={openIG}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 16,
            margin: "0 0 14px",
            padding: "18px 22px",
            borderRadius: "var(--r-lg)",
            background: "linear-gradient(120deg, rgba(220,39,67,.15), rgba(188,24,136,.12))",
            border: "1px solid rgba(220,39,67,.3)",
            transition: "transform .25s var(--ease), box-shadow .25s var(--ease)",
            textDecoration: "none",
          }}
          onMouseEnter={e => {
            e.currentTarget.style.transform = "translateY(-3px)";
            e.currentTarget.style.boxShadow = "0 18px 44px rgba(220,39,67,.2)";
          }}
          onMouseLeave={e => {
            e.currentTarget.style.transform = "";
            e.currentTarget.style.boxShadow = "";
          }}
        >
          <span style={{
            width: 52, height: 52, borderRadius: 999,
            background: "linear-gradient(45deg, #f09433, #e6683c, #dc2743, #cc2366, #bc1888)",
            color: "#fff",
            display: "flex", alignItems: "center", justifyContent: "center",
            flexShrink: 0,
          }}>
            <IGIcon size={26} />
          </span>
          <span style={{ minWidth: 0, flex: 1 }}>
            <span className={grotesk.className} style={{ display: "flex", alignItems: "center", gap: 6, fontWeight: 700, fontSize: 16.5 }}>
              @egi_alghazy18 <VerifiedIcon size={16} />
            </span>
            <span className="muted" style={{ fontSize: 13.5 }}>
              Follow di Instagram · developer Nexaa Music
            </span>
          </span>
          <span className="chip active" style={{ padding: "9px 18px", background: "linear-gradient(120deg,#e6683c,#bc1888)", color: "#fff", border: "none", flexShrink: 0 }}>
            Follow
          </span>
        </a>
      </Reveal>

      {/* Install PWA */}
      <Reveal delay={160}>
        {!installed ? (
          <>
            <button
              onClick={handleInstall}
              style={{
                display: "flex", alignItems: "center", gap: 16,
                width: "100%", textAlign: "left", marginBottom: 14,
                padding: "18px 22px", borderRadius: "var(--r-lg)",
                background: "linear-gradient(120deg, rgba(124,92,252,.15), rgba(79,140,255,.10))",
                border: "1px solid rgba(124,92,252,.30)",
                transition: "transform .25s var(--ease), box-shadow .25s var(--ease)",
              }}
              onMouseEnter={e => {
                e.currentTarget.style.transform = "translateY(-3px)";
                e.currentTarget.style.boxShadow = "0 18px 44px rgba(124,92,252,.2)";
              }}
              onMouseLeave={e => {
                e.currentTarget.style.transform = "";
                e.currentTarget.style.boxShadow = "";
              }}
            >
              <span style={{
                width: 52, height: 52, borderRadius: 999,
                background: "linear-gradient(135deg, var(--accent), var(--accent-2))",
                color: "#fff",
                display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
              }}>
                <PlusIcon size={26} />
              </span>
              <span style={{ minWidth: 0, flex: 1 }}>
                <span className={grotesk.className} style={{ display: "block", fontWeight: 700, fontSize: 16.5 }}>
                  Tambahkan ke Layar Utama
                </span>
                <span className="muted" style={{ fontSize: 13.5 }}>
                  Install Nexaa Music sebagai aplikasi di device kamu
                </span>
              </span>
              <span className="chip active" style={{ padding: "9px 18px", flexShrink: 0 }}>
                {canInstall ? "Install" : "Cara"}
              </span>
            </button>

            {showHelp && !canInstall && (
              <div style={{
                marginBottom: 14, padding: "16px 20px",
                borderRadius: "var(--r-lg)",
                background: "rgba(124,92,252,0.06)",
                border: "1px solid rgba(124,92,252,0.15)",
                fontSize: 13.5, lineHeight: 1.7,
              }} className="muted">
                <strong style={{ color: "var(--text)" }}>Cara install manual:</strong>
                <br />📱 <strong style={{ color: "var(--text)" }}>iPhone/iPad (Safari):</strong> tombol
                Bagikan <span style={{ color: "var(--accent)" }}>⎋</span> → <em>Tambahkan ke Layar Utama</em>
                <br />🤖 <strong style={{ color: "var(--text)" }}>Android (Chrome):</strong> menu ⋮ →{" "}
                <em>Tambahkan ke layar utama</em> / <em>Install app</em>
                <br />💻 <strong style={{ color: "var(--text)" }}>Desktop (Chrome/Edge):</strong> ikon install di address bar
              </div>
            )}
          </>
        ) : (
          <div style={{
            display: "flex", alignItems: "center", gap: 12, marginBottom: 14,
            padding: "16px 22px", borderRadius: "var(--r-lg)",
            background: "rgba(70,167,88,.08)",
            border: "1px solid rgba(70,167,88,.35)",
          }}>
            <span style={{ color: "var(--ok)", fontSize: 20 }}>✓</span>
            <span className={grotesk.className} style={{ fontWeight: 600, fontSize: 14.5 }}>
              Nexaa Music sudah terinstall di device ini
            </span>
          </div>
        )}
      </Reveal>

      {/* Info cards */}
      <Reveal delay={200}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginTop: 6 }}>
          {[
            { icon: <MusicNoteIcon size={22} />, t: "Unlimited", s: "Streaming tanpa API key" },
            { icon: <HeartIcon filled size={22} />, t: "100% Lokal", s: "Data tersimpan di device" },
          ].map((f) => (
            <div key={f.t} style={{
              padding: "18px",
              borderRadius: "var(--r-lg)",
              background: "var(--glass-bg)",
              backdropFilter: "var(--glass-blur)",
              WebkitBackdropFilter: "var(--glass-blur)",
              border: "var(--glass-border)",
              boxShadow: "var(--glass-shadow)",
            }}>
              <span style={{ color: "var(--accent)" }}>{f.icon}</span>
              <div className={grotesk.className} style={{ fontWeight: 700, fontSize: 15.5, marginTop: 10 }}>{f.t}</div>
              <div className="muted" style={{ fontSize: 13, marginTop: 3 }}>{f.s}</div>
            </div>
          ))}
        </div>
      </Reveal>

      <Reveal delay={260}>
        <p className={`dim ${grotesk.className}`} style={{ textAlign: "center", fontSize: 12.5, marginTop: 34, letterSpacing: "0.06em" }}>
          Nexaa Music · dibuat dengan 🧡 oleh Egiuu · Next.js + ytmusic-api
        </p>
      </Reveal>
    </main>
  );
}
