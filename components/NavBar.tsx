"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { HomeIcon } from "./Icons";
import { CompassIcon, LibraryStackIcon, ProfileIcon } from "./HomeIcons";
import "./navbar.css";

type NavItem = {
  href: string;
  label: string;
  icon: React.ComponentType<{ size?: number }>;
  match: (path: string) => boolean;
};

/* Beranda · Jelajahi · Koleksi · Aktivitas · Profil (Dev) */
const items: NavItem[] = [
  { href: "/",        label: "Beranda",   icon: HomeIcon,         match: (p) => p === "/" },
  { href: "/search",  label: "Jelajahi",  icon: CompassIcon,      match: (p) => p.startsWith("/search") || p.startsWith("/trending") },
  { href: "/library", label: "Koleksi",   icon: LibraryStackIcon, match: (p) => p.startsWith("/library") },
  { href: "/stats",   label: "Aktivitas", icon: ActivityIcon,     match: (p) => p.startsWith("/stats") },
  { href: "/dev",     label: "Profil",    icon: ProfileIcon,      match: (p) => p.startsWith("/dev") },
];

/* Ikon aktivitas lokal */
function ActivityIcon({ size = 24 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
    </svg>
  );
}

function tap() {
  try {
    if (typeof navigator !== "undefined" && typeof navigator.vibrate === "function") navigator.vibrate(8);
  } catch {}
}

export default function NavBar() {
  const pathname = usePathname() || "/";
  const found = items.findIndex((it) => it.match(pathname));
  const hasActive = found >= 0;
  const index = hasActive ? found : 0;

  return (
    <nav className="nx-nav" aria-label="Navigasi utama">
      <div
        className="nx-track"
        data-idle={hasActive ? "false" : "true"}
        style={{ "--i": index } as React.CSSProperties}
      >
        <span className="nx-lens" aria-hidden="true">
          <span className="nx-lens-core" key={index} />
        </span>
        {items.map(({ href, label, icon: Icon }, i) => {
          const active = hasActive && i === index;
          return (
            <Link
              key={href}
              href={href}
              className={`nx-item${active ? " is-active" : ""}`}
              aria-label={label}
              aria-current={active ? "page" : undefined}
              onClick={tap}
            >
              <span className="nx-ico">
                <Icon size={24} />
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
