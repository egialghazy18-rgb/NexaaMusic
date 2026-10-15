import type { Metadata, Viewport } from "next";
import "./globals.css";
import { PlayerProvider } from "@/lib/player";
import { ToastProvider } from "@/components/Toast";
import { TrackSheetProvider } from "@/components/TrackSheet";
import NavBar from "@/components/NavBar";
import MiniPlayer from "@/components/MiniPlayer";
import FullPlayer from "@/components/FullPlayer";
import PWARegister from "@/components/PWARegister";
import KeyboardShortcuts from "@/components/KeyboardShortcuts";

export const metadata: Metadata = {
  title: "Nexaa Music",
  description: "Temukan musik untuk setiap suasana dengan Nexaa Music.",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    title: "Nexaa Music",
    statusBarStyle: "black-translucent",
  },
  icons: {
    icon: "/icons/icon-192.png",
    apple: "/icons/apple-touch-icon.png",
  },
};

export const viewport: Viewport = {
  themeColor: "#0b0a0f",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="id">
      <head>
        <link rel="preconnect" href="https://www.youtube.com" />
        <link rel="preconnect" href="https://www.google.com" />
        <link rel="preconnect" href="https://i.ytimg.com" />
      </head>
      <body>
        {/* ── Nexaa Studio background ── */}
        <div id="aurora-bg" aria-hidden="true">
          <div className="aurora-orb aurora-orb-1" />
          <div className="aurora-orb aurora-orb-2" />
          <div className="aurora-orb aurora-orb-3" />
          <div className="aurora-streak aurora-streak-1" />
          <div className="aurora-streak aurora-streak-2" />
          <div className="aurora-streak aurora-streak-3" />
          <div className="aurora-noise" />
        </div>
        <PWARegister />
        <ToastProvider>
          <PlayerProvider>
            <TrackSheetProvider>
              {children}
              <MiniPlayer />
              <FullPlayer />
              <NavBar />
              {/* Keyboard shortcuts — aktif global, tekan ? untuk overlay */}
              <KeyboardShortcuts />
            </TrackSheetProvider>
          </PlayerProvider>
        </ToastProvider>
      </body>
    </html>
  );
}
