export interface Track {
  id: string;
  title: string;
  artist: string;
  artistId: string | null;
  album?: string | null;
  albumId?: string | null;
  duration: number;
  thumb: string;
}

export interface ArtistCard {
  id: string;
  name: string;
  thumb: string;
}

export interface AlbumCard {
  id: string;
  name: string;
  artist: string;
  year?: number | null;
  thumb: string;
}

export interface PlaylistCard {
  id: string;
  name: string;
  artist?: string;
  count?: number | null;
  thumb: string;
}

export interface HomeShelf {
  title: string;
  searchQuery: string;   /* query untuk "Lihat semua" → /search?q=... */
  items: ShelfItem[];
}

export type ShelfItem =
  | ({ kind: "song" } & Track)
  | ({ kind: "album" } & AlbumCard)
  | ({ kind: "playlist" } & PlaylistCard)
  | ({ kind: "artist" } & ArtistCard);

export interface LocalPlaylist {
  id: string;
  name: string;
  tracks: Track[];
  createdAt: number;
}

/* Playlist komunitas untuk beranda — covers dipakai untuk mosaic 2x2 */
export interface CommunityPlaylist {
  id: string;
  name: string;
  subtitle: string;
  thumb: string;
  covers: string[];
}
