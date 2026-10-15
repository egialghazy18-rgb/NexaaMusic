import React from "react";

type P = { size?: number; className?: string };

/* Ikon outline (stroke) */
const L = ({
  size = 24,
  className,
  children,
  strokeWidth = 2,
}: P & { children: React.ReactNode; strokeWidth?: number }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={strokeWidth}
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
    aria-hidden="true"
  >
    {children}
  </svg>
);

/* Ikon solid (fill) */
const F = ({ size = 24, className, children }: P & { children: React.ReactNode }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="currentColor"
    className={className}
    aria-hidden="true"
  >
    {children}
  </svg>
);

export const ChatIcon = (p: P) => (
  <F {...p}>
    <path
      fillRule="evenodd"
      d="M7 3h11a3 3 0 0 1 3 3v8a3 3 0 0 1-3 3H9l-4.2 3.5a.5.5 0 0 1-.8-.4V6a3 3 0 0 1 3-3ZM8 8h8a.8.8 0 0 1 0 1.6H8A.8.8 0 0 1 8 8Zm0 3.4h5a.8.8 0 0 1 0 1.6H8a.8.8 0 0 1 0-1.6Z"
    />
  </F>
);

export const BellIcon = (p: P) => (
  <L {...p}>
    <path d="M6 10a6 6 0 0 1 12 0c0 4.2 1.2 5.6 2 6.6.3.4 0 .9-.5.9h-15c-.5 0-.8-.5-.5-.9.8-1 2-2.4 2-6.6Z" />
    <path d="M10 20.2a2.2 2.2 0 0 0 4 0" />
  </L>
);

export const SearchLineIcon = (p: P) => (
  <L {...p}>
    <circle cx="11" cy="11" r="6.5" />
    <path d="m16 16 4.5 4.5" />
  </L>
);

/* ProfileIcon — menggantikan GearIcon di navbar */
export const ProfileIcon = (p: P) => (
  <L {...p} strokeWidth={1.9}>
    <circle cx="12" cy="8" r="3.8" />
    <path d="M4 20c0-4.4 3.6-8 8-8s8 3.6 8 8" />
  </L>
);

/* GearIcon tetap dipertahankan jika dipakai di tempat lain */
export const GearIcon = (p: P) => (
  <L {...p} strokeWidth={1.8}>
    <circle cx="12" cy="12" r="3" />
    <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1Z" />
  </L>
);

export const CompassIcon = (p: P) => (
  <L {...p}>
    <circle cx="12" cy="12" r="9" />
    <path d="m15.6 8.4-2 5.2-5.2 2 2-5.2 5.2-2Z" fill="currentColor" />
  </L>
);

export const LibraryStackIcon = (p: P) => (
  <L {...p}>
    <rect x="3.5" y="3.5" width="17" height="17" rx="3.5" />
    <path d="M10.2 16.2V8.4l5.3-1.3v7.6" />
    <circle cx="8.8" cy="16.4" r="1.5" fill="currentColor" />
    <circle cx="14.1" cy="15" r="1.5" fill="currentColor" />
  </L>
);

export const CrownIcon = (p: P) => (
  <F {...p}>
    <path d="M3 8.2 7.4 12 12 4.5 16.6 12 21 8.2 19.2 17H4.8L3 8.2ZM5 19h14v1.8H5V19Z" />
  </F>
);

export const VerifiedIcon = ({ size = 18, className }: P) => (
  <svg width={size} height={size} viewBox="0 0 24 24" className={className} aria-hidden="true">
    <circle cx="12" cy="12" r="11" fill="#2f9bff" />
    <path d="m7.4 12.4 3 3 6.2-6.4" fill="none" stroke="#fff" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

export const ChevronRightIcon = (p: P) => (
  <L {...p} strokeWidth={2.4}>
    <path d="m9 6 6 6-6 6" />
  </L>
);

export const ArrowRightIcon = (p: P) => (
  <L {...p} strokeWidth={2.2}>
    <path d="M4 12h15M13 6l6 6-6 6" />
  </L>
);

/* Medali kecil di samping nama rank */
export const RankMedalIcon = ({ size = 22, color = "#8a5cf6" }: P & { color?: string }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
    <circle cx="12" cy="12" r="10.2" fill="none" stroke="#aeb3c4" strokeWidth="1.6" />
    <circle cx="12" cy="12" r="6.6" fill="#2a2d3a" stroke="#aeb3c4" strokeWidth="1.2" />
    <circle cx="12" cy="12" r="2.6" fill={color} />
  </svg>
);

/* Emblem sayap emas + lingkaran berwarna rank */
export function RankEmblem({ color, letter, size = 60 }: { color: string; letter: string; size?: number }) {
  const feathers = [
    "M29 46C15 40 6 28 4 11c13 6 24 17 31 30Z",
    "M28 53C13 51 3 43 1 30c13 3 25 9 33 17Z",
    "M28 60C14 62 4 58 2 48c13-2 24 1 32 7Z",
    "M29 67C18 71 9 70 6 62c10-3 20-2 28 1Z",
  ];
  return (
    <svg
      width={size * 1.16}
      height={size}
      viewBox="0 6 100 86"
      aria-hidden="true"
      style={{ display: "block", overflow: "visible" }}
    >
      <defs>
        <linearGradient id="hm-gold" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#ffe9a0" />
          <stop offset="0.55" stopColor="#e0a92e" />
          <stop offset="1" stopColor="#a8741a" />
        </linearGradient>
        <radialGradient id="hm-orb" cx="0.35" cy="0.3" r="0.9">
          <stop offset="0" stopColor="#ffffff" stopOpacity="0.55" />
          <stop offset="0.45" stopColor={color} />
          <stop offset="1" stopColor={color} stopOpacity="0.85" />
        </radialGradient>
      </defs>
      <g fill="url(#hm-gold)" stroke="#7a5410" strokeWidth="0.6" strokeLinejoin="round">
        {feathers.map((d, i) => (
          <path key={`l${i}`} d={d} />
        ))}
        <g transform="translate(100 0) scale(-1 1)">
          {feathers.map((d, i) => (
            <path key={`r${i}`} d={d} />
          ))}
        </g>
        <path d="M39 33 41.5 20 46 27 50 16 54 27 58.5 20 61 33Z" />
      </g>
      <circle cx="50" cy="57" r="25" fill="url(#hm-orb)" stroke="#f3c64a" strokeWidth="3.4" />
      <circle cx="50" cy="57" r="20.5" fill="none" stroke="rgba(255,255,255,.28)" strokeWidth="1" />
      <text
        x="50"
        y="58"
        textAnchor="middle"
        dominantBaseline="central"
        fontSize="28"
        fontWeight="800"
        fill="#fff"
        style={{ fontFamily: "inherit" }}
      >
        {letter}
      </text>
    </svg>
  );
}
