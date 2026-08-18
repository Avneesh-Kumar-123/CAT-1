const PLAY_TIME_KEY = "cat-chase-total-play-time-ms";

export function readTotalPlayTimeMs(): number {
  const raw = localStorage.getItem(PLAY_TIME_KEY);
  const value = raw ? Number(raw) : 0;
  return Number.isFinite(value) && value >= 0 ? value : 0;
}

export function formatPlayTime(ms: number): string {
  const totalMinutes = Math.floor(Math.max(0, ms) / 60_000);
  if (totalMinutes < 60) return `${totalMinutes}m`;
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return `${hours}h ${minutes}m`;
}

/**
 * Counts visible time spent in the actual level routes. It is intentionally
 * local-only: total play time is a convenience stat, not an auth/security
 * value, and should not affect gameplay or cloud-save merges.
 */
export function startPlayTimeTracking(isPlaying: () => boolean): () => void {
  let last = Date.now();
  const timer = window.setInterval(() => {
    const now = Date.now();
    if (isPlaying() && document.visibilityState === "visible") {
      const elapsed = Math.max(0, now - last);
      localStorage.setItem(
        PLAY_TIME_KEY,
        String(readTotalPlayTimeMs() + elapsed),
      );
    }
    last = now;
  }, 1000);

  return () => window.clearInterval(timer);
}