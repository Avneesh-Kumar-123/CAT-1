/**
 * Leaderboard API client.
 *
 * All requests use credentials: "include" so the session cookie is sent,
 * and go through the Vite proxy (/api → API server at $API_PORT).
 */

const API_BASE = import.meta.env.VITE_API_BASE_URL ?? "";

async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    ...init,
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
  });
  if (!res.ok) throw new Error(`API ${path} → ${res.status}`);
  return res.json() as Promise<T>;
}

// ---------------------------------------------------------------------------
// Shared types
// ---------------------------------------------------------------------------

export type GlobalEntry = {
  rank: number;
  userId: string;
  displayName: string;
  avatarUrl: string | null;
  totalStars: number;
  levelsCompleted: number;
  totalMiceCaught: number;
  totalCoinsEarned: number;
  bestTimeRemaining: number | null;
  lastActiveAt: string;
};

export type WeeklyEntry = {
  rank: number;
  userId: string;
  displayName: string;
  avatarUrl: string | null;
  weekStars: number;
  weekCoins: number;
  weekMiceCaught: number;
  weekBestTimeRemaining: number | null;
  lastActiveAt: string;
};

export type GlobalLeaderboardResponse = {
  entries: GlobalEntry[];
  myEntry: GlobalEntry | null;
  total: number;
  page: number;
  limit: number;
};

export type WeeklyLeaderboardResponse = {
  entries: WeeklyEntry[];
  myEntry: WeeklyEntry | null;
  total: number;
  page: number;
  limit: number;
  weekKey: string;
};

export type UpdateLeaderboardPayload = {
  levelId: number;
  stars: number;
  timeRemaining: number;
  miceCaught: number;
  coinsEarned: number;
  snapshot: {
    totalStars: number;
    levelsCompleted: number;
    totalMiceCaught: number;
    totalCoinsEarned: number;
  };
};

// ---------------------------------------------------------------------------
// API calls
// ---------------------------------------------------------------------------

export async function fetchGlobalLeaderboard(
  page = 0,
  limit = 100,
): Promise<GlobalLeaderboardResponse> {
  return apiFetch<GlobalLeaderboardResponse>(
    `/api/leaderboard/global?page=${page}&limit=${limit}`,
  );
}

export async function fetchWeeklyLeaderboard(
  page = 0,
  limit = 100,
): Promise<WeeklyLeaderboardResponse> {
  return apiFetch<WeeklyLeaderboardResponse>(
    `/api/leaderboard/weekly?page=${page}&limit=${limit}`,
  );
}

export async function updateLeaderboard(
  payload: UpdateLeaderboardPayload,
): Promise<void> {
  await apiFetch<{ ok: boolean }>("/api/leaderboard/update", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}
