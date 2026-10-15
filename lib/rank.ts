/* Rank pendengar — dihitung dari total durasi dengar (jam) di statistik lokal */
export interface RankTier {
  name: string;
  minHours: number;
  color: string; // warna medali / lingkaran emblem
}

export const RANKS: RankTier[] = [
  { name: "Rookie",   minHours: 0,   color: "#7b8194" },
  { name: "Bronze",   minHours: 5,   color: "#b9774a" },
  { name: "Silver",   minHours: 25,  color: "#aeb8c9" },
  { name: "Gold",     minHours: 75,  color: "#e2b53e" },
  { name: "Platinum", minHours: 150, color: "#35c4b4" },
  { name: "Diamond",  minHours: 300, color: "#4f9dff" },
  { name: "Immortal", minHours: 600, color: "#8a5cf6" },
];

export function getRank(hours: number): RankTier {
  let rank = RANKS[0];
  for (const tier of RANKS) {
    if (hours >= tier.minHours) rank = tier;
  }
  return rank;
}

/* 0 detik → "0 Menit", < 1 jam → "45 Menit", < 10 jam → "2,5 Jam", selebihnya → "600 Jam" */
export function formatListening(totalSeconds: number): string {
  const s = Math.max(0, Math.floor(totalSeconds || 0));
  if (s < 3600) return `${Math.floor(s / 60)} Menit`;
  const hours = s / 3600;
  if (hours < 10) return `${hours.toFixed(1).replace(".", ",")} Jam`;
  return `${Math.floor(hours).toLocaleString("id-ID")} Jam`;
}
