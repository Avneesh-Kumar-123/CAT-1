import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  useCallback,
  type ReactNode,
} from "react";
import { useAuth } from "@/contexts/AuthContext";
import { fetchMyProfile, type PlayerProfile } from "@/lib/profile-api";

interface ProfileContextValue {
  /** Null while loading or if not signed in */
  profile: PlayerProfile | null;
  /** True while the initial profile fetch is in-flight */
  isPending: boolean;
  /** Display name: custom username if set, else Google name, else "Player" */
  displayName: string;
  /**
   * URL-like string for the avatar to display:
   *   "game:orange-cat"  → game avatar (render emoji)
   *   any other string   → Google profile picture URL
   *   null               → no image (letter fallback)
   */
  avatarDisplayUrl: string | null;
  /** True if the user is logged in but has not set a username yet */
  needsUsername: boolean;
  /** Re-fetch the profile from the server (call after any mutation). */
  refreshProfile: () => Promise<void>;
}

const ProfileContext = createContext<ProfileContextValue | null>(null);

export function ProfileProvider({ children }: { children: ReactNode }) {
  const { user, isPending: authPending } = useAuth();
  const [profile, setProfile] = useState<PlayerProfile | null>(null);
  const [isPending, setIsPending] = useState(false);
  const prevUserIdRef = useRef<string | null>(null);

  // Fetch profile on login; clear it on logout
  useEffect(() => {
    if (authPending) return;

    const userId = user?.id ?? null;

    if (userId !== prevUserIdRef.current) {
      prevUserIdRef.current = userId;

      if (!userId) {
        setProfile(null);
        return;
      }

      setIsPending(true);
      fetchMyProfile()
        .then(setProfile)
        .catch(() => setProfile(null))
        .finally(() => setIsPending(false));
    }
  }, [user?.id, authPending]);

  const refreshProfile = useCallback(async () => {
    if (!user) return;
    try {
      const p = await fetchMyProfile();
      setProfile(p);
    } catch {
      // ignore — stale profile is acceptable
    }
  }, [user]);

  const displayName =
    profile?.username ?? user?.name ?? (user ? "Player" : "");

  const avatarDisplayUrl: string | null =
    profile?.avatarType === "game" && profile.selectedAvatar
      ? `game:${profile.selectedAvatar}`
      : (user?.image ?? null);

  const needsUsername = Boolean(user && !isPending && profile && !profile.username);

  return (
    <ProfileContext.Provider
      value={{
        profile,
        isPending,
        displayName,
        avatarDisplayUrl,
        needsUsername,
        refreshProfile,
      }}
    >
      {children}
    </ProfileContext.Provider>
  );
}

export function useProfile(): ProfileContextValue {
  const ctx = useContext(ProfileContext);
  if (!ctx) throw new Error("useProfile must be used inside <ProfileProvider>");
  return ctx;
}
