/**
 * Player Profile API client.
 * All mutating requests require a valid session cookie (credentials: "include").
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
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error((body as { error?: string }).error ?? `API ${path} → ${res.status}`);
  }
  return res.json() as Promise<T>;
}

// ---------------------------------------------------------------------------
// Shared types
// ---------------------------------------------------------------------------

export type PlayerProfile = {
  userId: string;
  username: string | null;
  avatarType: "google" | "game";
  selectedAvatar: string | null;
  unlockedAvatars: string[];
  usernameLastChanged: string | null;
  createdAt: string;
};

export type UsernameCheckResult = {
  available: boolean;
  reason?: string;
};

export type PublicProfile = {
  userId: string;
  username: string | null;
  displayName: string;
  avatarType: string;
  selectedAvatar: string | null;
  googleImage: string | null;
  joinDate: string;
  globalStats: {
    totalStars: number;
    levelsCompleted: number;
    totalMiceCaught: number;
    totalCoinsEarned: number;
    bestTimeRemaining: number | null;
    lastActiveAt: string;
  } | null;
  rank: number | null;
};

// ---------------------------------------------------------------------------
// API calls
// ---------------------------------------------------------------------------

/** Fetch (or lazily create) the current user's profile. */
export async function fetchMyProfile(): Promise<PlayerProfile> {
  const data = await apiFetch<{ profile: PlayerProfile }>("/api/profile");
  return data.profile;
}

/** Check whether a username is available. */
export async function checkUsername(q: string): Promise<UsernameCheckResult> {
  return apiFetch<UsernameCheckResult>(
    `/api/profile/check-username?q=${encodeURIComponent(q)}`,
  );
}

/** Set or change the current user's username. Throws with a user-friendly error on failure. */
export async function setUsername(username: string): Promise<void> {
  await apiFetch<{ ok: boolean }>("/api/profile/username", {
    method: "PUT",
    body: JSON.stringify({ username }),
  });
}

/** Change the selected avatar. */
export async function setAvatar(
  avatarType: "google" | "game",
  selectedAvatar?: string,
): Promise<void> {
  await apiFetch<{ ok: boolean }>("/api/profile/avatar", {
    method: "PUT",
    body: JSON.stringify({ avatarType, selectedAvatar }),
  });
}

/** Unlock a game avatar (server records ownership; client deducts coins from save separately). */
export async function unlockAvatar(
  avatarId: string,
): Promise<{ ok: boolean; alreadyOwned?: boolean }> {
  return apiFetch<{ ok: boolean; alreadyOwned?: boolean }>(
    "/api/profile/unlock-avatar",
    {
      method: "POST",
      body: JSON.stringify({ avatarId }),
    },
  );
}

/** Fetch a player's public profile including leaderboard rank. */
export async function fetchPublicProfile(userId: string): Promise<PublicProfile> {
  return apiFetch<PublicProfile>(`/api/profile/public/${encodeURIComponent(userId)}`);
}
