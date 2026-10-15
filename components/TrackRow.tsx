"use client";

import React from "react";
import type { Track } from "@/lib/types";
import { usePlayer, fmtTime } from "@/lib/player";
import { useTrackSheet } from "./TrackSheet";
import { MoreIcon } from "./Icons";

export default function TrackRow({
  track,
  index,
  queue,
  showIndex = false,
  showThumb = true,
  onPlay,
}: {
  track: Track;
  index?: number;
  queue?: Track[];
  showIndex?: boolean;
  showThumb?: boolean;
  onPlay?: () => void;
}) {
  const player = usePlayer();
  const openSheet = useTrackSheet();
  const isCurrent = player.current?.id === track.id;

  return (
    <div
      className={`trow ${isCurrent ? "playing" : ""}`}
      onClick={() => {
        if (onPlay) onPlay();
        else player.playTrack(track, queue);
      }}
      role="button"
    >
      {showIndex && (
        <span className="num">
          {isCurrent ? (
            <span className={`eq ${player.playing ? "" : "paused"}`}>
              <span style={{ height: "40%" }} />
              <span style={{ height: "90%" }} />
              <span style={{ height: "60%" }} />
            </span>
          ) : (
            (index ?? 0) + 1
          )}
        </span>
      )}
      {showThumb && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={track.thumb} alt="" loading="lazy" referrerPolicy="no-referrer" />
      )}
      <div className="meta">
        <div className="tt">{track.title}</div>
        <div className="ts">{track.artist || "Artis tidak diketahui"}</div>
      </div>
      <span className="dur">{track.duration ? fmtTime(track.duration) : ""}</span>
      <div className="row-actions">
        <button
          className="icon-btn"
          aria-label="Menu lagu"
          onClick={(e) => {
            e.stopPropagation();
            openSheet(track);
          }}
        >
          <MoreIcon size={19} />
        </button>
      </div>
    </div>
  );
}
