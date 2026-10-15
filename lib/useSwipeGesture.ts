/**
 * useSwipeGesture — horizontal swipe detector untuk FullPlayer
 * Mendukung touch & mouse drag. Threshold 60px.
 * onSwipeLeft  → next track
 * onSwipeRight → prev track
 * onSwipeDown  → tutup player (vertical)
 */
import { useEffect, useRef } from "react";

interface SwipeOptions {
  onSwipeLeft?: () => void;
  onSwipeRight?: () => void;
  onSwipeDown?: () => void;
  threshold?: number;   // px minimum swipe, default 60
  enabled?: boolean;
}

export function useSwipeGesture(
  ref: React.RefObject<HTMLElement | null>,
  { onSwipeLeft, onSwipeRight, onSwipeDown, threshold = 60, enabled = true }: SwipeOptions
) {
  const startX = useRef<number | null>(null);
  const startY = useRef<number | null>(null);
  const startT = useRef<number>(0);

  useEffect(() => {
    const el = ref.current;
    if (!el || !enabled) return;

    const onTouchStart = (e: TouchEvent) => {
      startX.current = e.touches[0].clientX;
      startY.current = e.touches[0].clientY;
      startT.current = Date.now();
    };

    const onTouchEnd = (e: TouchEvent) => {
      if (startX.current === null || startY.current === null) return;
      const dx = e.changedTouches[0].clientX - startX.current;
      const dy = e.changedTouches[0].clientY - startY.current;
      const dt = Date.now() - startT.current;
      // max 500ms agar tidak trigger saat slow scroll
      if (dt > 500) { startX.current = null; return; }
      const absDx = Math.abs(dx);
      const absDy = Math.abs(dy);
      // Horizontal swipe: dx dominan
      if (absDx > absDy && absDx >= threshold) {
        if (dx < 0) onSwipeLeft?.();
        else onSwipeRight?.();
      }
      // Vertical swipe down: dy dominan, minimal 80px
      if (absDy > absDx && dy > 80) {
        onSwipeDown?.();
      }
      startX.current = null;
    };

    const onTouchCancel = () => { startX.current = null; };

    el.addEventListener("touchstart", onTouchStart, { passive: true });
    el.addEventListener("touchend", onTouchEnd, { passive: true });
    el.addEventListener("touchcancel", onTouchCancel, { passive: true });
    return () => {
      el.removeEventListener("touchstart", onTouchStart);
      el.removeEventListener("touchend", onTouchEnd);
      el.removeEventListener("touchcancel", onTouchCancel);
    };
  }, [ref, onSwipeLeft, onSwipeRight, onSwipeDown, threshold, enabled]);
}
