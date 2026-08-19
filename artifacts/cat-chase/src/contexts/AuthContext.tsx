import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  useCallback,
  type ReactNode,
} from "react";
import { authClient, type User } from "@/lib/auth-client";
import { fetchCloudSave, pushCloudSave, mergeSaves } from "@/lib/cloud-sync";
import type { SaveData } from "@/game/types";

export type SyncStatus = "idle" | "syncing" | "synced" | "error" | "offline";

interface AuthContextValue {
  /** Authenticated user, or null if guest */
  user: User | null;
  /** True while the session is being fetched on first load */
  isPending: boolean;
  /** Cloud sync status */
  syncStatus: SyncStatus;
  /**
   * Called by App after every save.  If the user is logged in, queues an
   * upload to the cloud (debounced 2 s to batch rapid saves).
   */
  syncSave: (save: SaveData) => void;
  /**
   * If non-null, the AuthContext has fetched + merged the cloud save and
   * the App should apply it then call clearPendingMerge().
   */
  pendingMerge: SaveData | null;
  clearPendingMerge: () => void;
  /** Force an immediate sync of the latest save */
  forceSync: () => void;
  /** Sign out and clear pending sync */
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({
  children,
  getCurrentSave,
}: {
  children: ReactNode;
  /** Getter so the provider can read the latest save without a prop dependency */
  getCurrentSave: () => SaveData;
}) {
  const { data: sessionData, isPending } = authClient.useSession();
  const user = sessionData?.user ?? null;

  const [syncStatus, setSyncStatus] = useState<SyncStatus>("idle");
  const [pendingMerge, setPendingMerge] = useState<SaveData | null>(null);

  const latestSaveRef = useRef<SaveData>(getCurrentSave());
  const syncTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const prevUserIdRef = useRef<string | null>(null);

  // --------------------------------------------------------------------------
  // On login: fetch cloud save, merge with local, notify App
  // --------------------------------------------------------------------------
  useEffect(() => {
    if (isPending) return;

    const userId = user?.id ?? null;
    const justLoggedIn = userId !== null && prevUserIdRef.current !== userId;
    prevUserIdRef.current = userId;

    if (!justLoggedIn) return;

    (async () => {
      setSyncStatus("syncing");
      try {
        const cloudSave = await fetchCloudSave();

        if (cloudSave) {
          const local = getCurrentSave();
          const merged = mergeSaves(local, cloudSave);
          setPendingMerge(merged);
          // Push the merged result back so cloud is authoritative
          await pushCloudSave(merged);
        } else {
          // No cloud save yet — push local progress to cloud immediately
          await pushCloudSave(getCurrentSave());
        }
        setSyncStatus("synced");
      } catch {
        // Authentication must remain usable even if cloud storage is unavailable.
        setSyncStatus("error");
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, isPending]);

  // --------------------------------------------------------------------------
  // Debounced upload whenever syncSave() is called
  // --------------------------------------------------------------------------
  const syncSave = useCallback((save: SaveData) => {
    latestSaveRef.current = save;

    if (!user) return; // guest — nothing to sync

    if (syncTimerRef.current) clearTimeout(syncTimerRef.current);
    setSyncStatus("syncing");

    syncTimerRef.current = setTimeout(async () => {
      const ok = await pushCloudSave(latestSaveRef.current);
      setSyncStatus(ok ? "synced" : "error");
    }, 2000);
  }, [user]);

  const forceSync = useCallback(async () => {
    if (!user) return;
    if (syncTimerRef.current) clearTimeout(syncTimerRef.current);
    setSyncStatus("syncing");
    const ok = await pushCloudSave(latestSaveRef.current);
    setSyncStatus(ok ? "synced" : "error");
  }, [user]);

  const clearPendingMerge = useCallback(() => setPendingMerge(null), []);

  const signOut = useCallback(async () => {
    if (syncTimerRef.current) {
      clearTimeout(syncTimerRef.current);
      // Flush any pending save before signing out
      await pushCloudSave(latestSaveRef.current);
    }
    await authClient.signOut();
    setSyncStatus("idle");
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        isPending,
        syncStatus,
        syncSave,
        pendingMerge,
        clearPendingMerge,
        forceSync,
        signOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside <AuthProvider>");
  return ctx;
}
