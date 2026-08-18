import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Trophy, Star, Coins, Clock, Users, RefreshCw } from "lucide-react";
import { MenuShell } from "@/components/MenuShell";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import {
  fetchGlobalLeaderboard,
  fetchWeeklyLeaderboard,
  type GlobalEntry,
  type WeeklyEntry,
} from "@/lib/leaderboard-api";
import { AVATARS, gameAvatarIdFromUrl, isGameAvatarUrl } from "@/lib/avatars";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function relativeTime(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  return `${Math.floor(days / 30)}mo ago`;
}

function formatTime(secs: number | null | undefined): string {
  if (secs == null) return "—";
  return `${secs.toFixed(1)}s`;
}

function medalFor(rank: number): string {
  if (rank === 1) return "🥇";
  if (rank === 2) return "🥈";
  if (rank === 3) return "🥉";
  return "";
}

function rankColor(rank: number): string {
  if (rank === 1) return "text-yellow-500";
  if (rank === 2) return "text-slate-400";
  if (rank === 3) return "text-amber-600";
  return "text-muted-foreground";
}

// ---------------------------------------------------------------------------
// Avatar
// ---------------------------------------------------------------------------

function Avatar({
  name,
  url,
  size = 32,
}: {
  name: string;
  url: string | null | undefined;
  size?: number;
}) {
  const [imgFailed, setImgFailed] = useState(false);
  const letter = (name?.[0] ?? "?").toUpperCase();

  // Pastel background from name hash
  const colors = [
    "bg-orange-200 text-orange-700",
    "bg-violet-200 text-violet-700",
    "bg-green-200 text-green-700",
    "bg-blue-200 text-blue-700",
    "bg-rose-200 text-rose-700",
    "bg-amber-200 text-amber-700",
  ];
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = (hash * 31 + name.charCodeAt(i)) | 0;
  const colorClass = colors[Math.abs(hash) % colors.length];

  if (url && isGameAvatarUrl(url)) {
    const avatar = AVATARS.find((item) => item.id === gameAvatarIdFromUrl(url));
    return (
      <div
        className="rounded-full flex items-center justify-center flex-shrink-0"
        style={{
          width: size,
          height: size,
          fontSize: size * 0.5,
          backgroundColor: avatar?.bg ?? "#FED7AA",
        }}
        aria-label={name}
      >
        {avatar?.emoji ?? "🐱"}
      </div>
    );
  }

  if (url && !imgFailed) {
    return (
      <img
        src={url}
        alt={name}
        width={size}
        height={size}
        className="rounded-full object-cover flex-shrink-0"
        loading="lazy"
        style={{ width: size, height: size }}
        onError={() => setImgFailed(true)}
      />
    );
  }

  return (
    <div
      className={`rounded-full flex items-center justify-center font-display font-bold flex-shrink-0 ${colorClass}`}
      style={{ width: size, height: size, fontSize: size * 0.4 }}
    >
      {letter}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Tab type
// ---------------------------------------------------------------------------

type Tab = "global" | "weekly";

// ---------------------------------------------------------------------------
// Skeleton loader
// ---------------------------------------------------------------------------

function SkeletonRow({ i }: { i: number }) {
  return (
    <div
      className="flex items-center gap-3 px-4 py-3 border-b border-foreground/5 animate-pulse"
      style={{ animationDelay: `${i * 60}ms` }}
    >
      <div className="w-8 text-center">
        <div className="h-4 w-5 bg-foreground/10 rounded mx-auto" />
      </div>
      <div className="w-8 h-8 rounded-full bg-foreground/10 flex-shrink-0" />
      <div className="flex-1 space-y-1.5">
        <div className="h-3 bg-foreground/10 rounded w-2/5" />
        <div className="h-2.5 bg-foreground/5 rounded w-1/4" />
      </div>
      <div className="hidden sm:flex gap-4">
        {[0, 1, 2].map((j) => (
          <div key={j} className="h-3 w-8 bg-foreground/10 rounded" />
        ))}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Global row
// ---------------------------------------------------------------------------

function GlobalRow({
  entry,
  isMe,
}: {
  entry: GlobalEntry;
  isMe: boolean;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, x: -8 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.25 }}
      className={`flex items-center gap-3 px-4 py-3 border-b border-foreground/5 transition-colors ${
        isMe
          ? "bg-primary/8 border-l-4 border-l-primary"
          : "hover:bg-foreground/[0.025]"
      }`}
    >
      {/* Rank */}
      <div className={`w-8 text-center font-display font-bold text-sm flex-shrink-0 ${rankColor(entry.rank)}`}>
        {entry.rank <= 3 ? medalFor(entry.rank) : `#${entry.rank}`}
      </div>

      {/* Avatar + name */}
      <Avatar name={entry.displayName} url={entry.avatarUrl} size={32} />
      <div className="flex-1 min-w-0">
        <div className={`font-display font-bold text-sm truncate ${isMe ? "text-primary" : ""}`}>
          {entry.displayName}
          {isMe && (
            <span className="ml-1.5 text-[10px] font-black uppercase tracking-wider bg-primary text-primary-foreground rounded-full px-1.5 py-0.5">
              You
            </span>
          )}
        </div>
        <div className="text-[10px] text-muted-foreground font-semibold">
          {relativeTime(entry.lastActiveAt)}
        </div>
      </div>

      {/* Stats — all visible on sm+; stars always visible */}
      <div className="flex items-center gap-1 flex-shrink-0">
        <Star className="h-3.5 w-3.5 text-yellow-400 fill-yellow-400" />
        <span className="font-display font-bold text-sm">{entry.totalStars}</span>
      </div>

      <div className="hidden sm:flex items-center gap-1 flex-shrink-0 text-muted-foreground">
        <Trophy className="h-3.5 w-3.5 text-primary" />
        <span className="font-display font-bold text-sm">{entry.levelsCompleted}</span>
      </div>

      <div className="hidden md:flex items-center gap-1 flex-shrink-0 text-muted-foreground">
        <span className="text-sm">🐭</span>
        <span className="font-display font-bold text-sm">{entry.totalMiceCaught}</span>
      </div>

      <div className="hidden lg:flex items-center gap-1 flex-shrink-0">
        <Coins className="h-3.5 w-3.5 text-yellow-500 fill-yellow-400" />
        <span className="font-display font-bold text-sm">{entry.totalCoinsEarned.toLocaleString()}</span>
      </div>

      <div className="hidden lg:flex items-center gap-1 flex-shrink-0 text-muted-foreground">
        <Clock className="h-3.5 w-3.5" />
        <span className="font-display font-bold text-sm">{formatTime(entry.bestTimeRemaining)}</span>
      </div>
    </motion.div>
  );
}

// ---------------------------------------------------------------------------
// Weekly row
// ---------------------------------------------------------------------------

function WeeklyRow({
  entry,
  isMe,
}: {
  entry: WeeklyEntry;
  isMe: boolean;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, x: -8 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.25 }}
      className={`flex items-center gap-3 px-4 py-3 border-b border-foreground/5 transition-colors ${
        isMe
          ? "bg-primary/8 border-l-4 border-l-primary"
          : "hover:bg-foreground/[0.025]"
      }`}
    >
      {/* Rank */}
      <div className={`w-8 text-center font-display font-bold text-sm flex-shrink-0 ${rankColor(entry.rank)}`}>
        {entry.rank <= 3 ? medalFor(entry.rank) : `#${entry.rank}`}
      </div>

      {/* Avatar + name */}
      <Avatar name={entry.displayName} url={entry.avatarUrl} size={32} />
      <div className="flex-1 min-w-0">
        <div className={`font-display font-bold text-sm truncate ${isMe ? "text-primary" : ""}`}>
          {entry.displayName}
          {isMe && (
            <span className="ml-1.5 text-[10px] font-black uppercase tracking-wider bg-primary text-primary-foreground rounded-full px-1.5 py-0.5">
              You
            </span>
          )}
        </div>
        <div className="text-[10px] text-muted-foreground font-semibold">
          {relativeTime(entry.lastActiveAt)}
        </div>
      </div>

      {/* Weekly stars */}
      <div className="flex items-center gap-1 flex-shrink-0">
        <Star className="h-3.5 w-3.5 text-yellow-400 fill-yellow-400" />
        <span className="font-display font-bold text-sm">{entry.weekStars}</span>
      </div>

      <div className="hidden sm:flex items-center gap-1 flex-shrink-0 text-muted-foreground">
        <span className="text-sm">🐭</span>
        <span className="font-display font-bold text-sm">{entry.weekMiceCaught}</span>
      </div>

      <div className="hidden md:flex items-center gap-1 flex-shrink-0">
        <Coins className="h-3.5 w-3.5 text-yellow-500 fill-yellow-400" />
        <span className="font-display font-bold text-sm">{entry.weekCoins.toLocaleString()}</span>
      </div>

      <div className="hidden lg:flex items-center gap-1 flex-shrink-0 text-muted-foreground">
        <Clock className="h-3.5 w-3.5" />
        <span className="font-display font-bold text-sm">{formatTime(entry.weekBestTimeRemaining)}</span>
      </div>
    </motion.div>
  );
}

// ---------------------------------------------------------------------------
// Column header
// ---------------------------------------------------------------------------

function ColHeaders({ tab }: { tab: Tab }) {
  return (
    <div className="flex items-center gap-3 px-4 py-2 bg-foreground/[0.03] border-b border-foreground/10 text-[10px] font-black uppercase tracking-widest text-muted-foreground">
      <div className="w-8 text-center flex-shrink-0">#</div>
      <div className="w-8 flex-shrink-0" />
      <div className="flex-1">Player</div>
      <div className="flex-shrink-0">
        <Star className="h-3 w-3 text-yellow-400 fill-yellow-400 inline mr-0.5" />
        {tab === "global" ? "Stars" : "This Week"}
      </div>
      <div className="hidden sm:block flex-shrink-0">
        {tab === "global" ? "🏁 Lvls" : "🐭 Mice"}
      </div>
      <div className="hidden md:block flex-shrink-0">
        {tab === "global" ? "🐭 Mice" : "🪙 Coins"}
      </div>
      <div className="hidden lg:block flex-shrink-0">
        {tab === "global" ? "🪙 Coins" : "⏱ Best"}
      </div>
      <div className="hidden lg:block flex-shrink-0">
        {tab === "global" ? "⏱ Best" : ""}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// "Your rank" pinned footer (shown when user is outside top 100)
// ---------------------------------------------------------------------------

function MyRankFooter({
  myEntry,
  tab,
}: {
  myEntry: GlobalEntry | WeeklyEntry;
  tab: Tab;
}) {
  const isGlobal = tab === "global";
  const g = myEntry as GlobalEntry;
  const w = myEntry as WeeklyEntry;

  return (
    <motion.div
      initial={{ y: 20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      className="sticky bottom-0 border-t-2 border-primary bg-primary/5 backdrop-blur"
    >
      <div className="flex items-center gap-3 px-4 py-3">
        <div className="w-8 text-center font-display font-bold text-primary text-sm flex-shrink-0">
          #{myEntry.rank}
        </div>
        <Avatar name={myEntry.displayName} url={myEntry.avatarUrl} size={32} />
        <div className="flex-1 min-w-0">
          <div className="font-display font-bold text-sm text-primary truncate">
            {myEntry.displayName}
            <span className="ml-1.5 text-[10px] font-black uppercase tracking-wider bg-primary text-primary-foreground rounded-full px-1.5 py-0.5">
              You
            </span>
          </div>
          <div className="text-[10px] text-muted-foreground font-semibold">
            Your current rank — keep playing to climb!
          </div>
        </div>
        <div className="flex items-center gap-1 flex-shrink-0">
          <Star className="h-3.5 w-3.5 text-yellow-400 fill-yellow-400" />
          <span className="font-display font-bold text-sm">
            {isGlobal ? g.totalStars : w.weekStars}
          </span>
        </div>
      </div>
    </motion.div>
  );
}

// ---------------------------------------------------------------------------
// Main page
// ---------------------------------------------------------------------------

export const Leaderboard = () => {
  const { user } = useAuth();
  const [tab, setTab] = useState<Tab>("global");

  const [globalData, setGlobalData] = useState<{
    entries: GlobalEntry[];
    myEntry: GlobalEntry | null;
    total: number;
  } | null>(null);

  const [weeklyData, setWeeklyData] = useState<{
    entries: WeeklyEntry[];
    myEntry: WeeklyEntry | null;
    total: number;
    weekKey: string;
  } | null>(null);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(
    async (t: Tab) => {
      setLoading(true);
      setError(null);
      try {
        if (t === "global") {
          if (!globalData) {
            const data = await fetchGlobalLeaderboard();
            setGlobalData(data);
          }
        } else {
          if (!weeklyData) {
            const data = await fetchWeeklyLeaderboard();
            setWeeklyData(data);
          }
        }
      } catch {
        setError("Could not load leaderboard. Check your connection and try again.");
      } finally {
        setLoading(false);
      }
    },
    [globalData, weeklyData],
  );

  const refresh = useCallback(() => {
    if (tab === "global") setGlobalData(null);
    else setWeeklyData(null);
  }, [tab]);

  useEffect(() => {
    load(tab);
  }, [tab, load]);

  const switchTab = (t: Tab) => {
    if (t !== tab) setTab(t);
  };

  // Compute ISO week label for display
  const weekLabel = (() => {
    const now = new Date();
    const d = new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()));
    d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    const wn = Math.ceil((((d.getTime() - yearStart.getTime()) / 86_400_000) + 1) / 7);
    return `Week ${wn}, ${d.getUTCFullYear()}`;
  })();

  const entries = tab === "global" ? (globalData?.entries ?? []) : (weeklyData?.entries ?? []);
  const myEntry = tab === "global" ? globalData?.myEntry : weeklyData?.myEntry;
  const total = tab === "global" ? (globalData?.total ?? 0) : (weeklyData?.total ?? 0);

  // Is the user's entry already shown in the top list?
  const myEntryInList = myEntry
    ? entries.some((e) => e.userId === myEntry.userId)
    : false;

  return (
    <MenuShell showBack themeBg={["#fef3c7", "#ede9fe"]}>
      <div className="min-h-screen pt-20 pb-4 flex flex-col max-w-2xl mx-auto px-2">

        {/* Header */}
        <motion.div
          initial={{ y: -20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ type: "spring", stiffness: 120 }}
          className="text-center mb-6 px-4"
        >
          <div className="text-5xl mb-2">🏆</div>
          <h1 className="font-display font-bold text-4xl sm:text-5xl">Leaderboard</h1>
          <p className="text-muted-foreground font-semibold text-sm mt-1">
            {tab === "global" ? "All-time top players" : `Top players · ${weekLabel}`}
          </p>
        </motion.div>

        {/* Tab switcher */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.1 }}
          className="flex gap-1.5 bg-card/70 backdrop-blur border-2 border-card-border rounded-2xl p-1.5 mb-4 mx-2"
        >
          {(["global", "weekly"] as Tab[]).map((t) => (
            <button
              key={t}
              onClick={() => switchTab(t)}
              className={`flex-1 rounded-xl py-2.5 font-display font-bold text-sm transition-all duration-200 ${
                tab === t
                  ? "bg-primary text-primary-foreground shadow-md"
                  : "text-muted-foreground hover:text-foreground hover:bg-foreground/5"
              }`}
            >
              {t === "global" ? "🌍 Global" : "📅 This Week"}
            </button>
          ))}
        </motion.div>

        {/* Sign-in nudge */}
        {!user && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="mx-2 mb-4 bg-blue-50 border-2 border-blue-200 rounded-2xl px-4 py-3 text-center"
          >
            <p className="text-sm font-semibold text-blue-700">
              ☁️ Sign in to appear on the leaderboard and track your rank
            </p>
          </motion.div>
        )}

        {/* Card */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15, type: "spring", stiffness: 100 }}
          className="bg-card/80 backdrop-blur border-2 border-card-border rounded-3xl shadow-lg overflow-hidden mx-2 flex-1 flex flex-col"
        >
          {/* Card header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-foreground/10">
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-bold text-muted-foreground">
                {loading ? "Loading…" : `${total.toLocaleString()} player${total !== 1 ? "s" : ""}`}
              </span>
            </div>
            <Button
              size="icon"
              variant="ghost"
              className="h-8 w-8 rounded-full"
              onClick={refresh}
              disabled={loading}
              title="Refresh"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            </Button>
          </div>

          {/* Column headers */}
          {!loading && !error && entries.length > 0 && <ColHeaders tab={tab} />}

          {/* Content */}
          <div className="flex-1 overflow-y-auto">
            <AnimatePresence mode="wait">
              {/* Error state */}
              {error && (
                <motion.div
                  key="error"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="flex flex-col items-center justify-center py-16 px-6 text-center"
                >
                  <div className="text-4xl mb-3">😿</div>
                  <p className="font-display font-bold text-lg mb-1">Something went wrong</p>
                  <p className="text-sm text-muted-foreground font-semibold mb-4">{error}</p>
                  <Button onClick={refresh} variant="secondary" className="font-display font-bold">
                    Try Again
                  </Button>
                </motion.div>
              )}

              {/* Loading skeleton */}
              {loading && !error && (
                <motion.div
                  key="skeleton"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                >
                  {Array.from({ length: 10 }).map((_, i) => (
                    <SkeletonRow key={i} i={i} />
                  ))}
                </motion.div>
              )}

              {/* Empty state */}
              {!loading && !error && entries.length === 0 && (
                <motion.div
                  key="empty"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="flex flex-col items-center justify-center py-16 px-6 text-center"
                >
                  <div className="text-4xl mb-3">🐱</div>
                  <p className="font-display font-bold text-lg mb-1">No entries yet</p>
                  <p className="text-sm text-muted-foreground font-semibold">
                    {tab === "weekly"
                      ? "Be the first to complete a level this week!"
                      : "Complete a level to claim the top spot!"}
                  </p>
                </motion.div>
              )}

              {/* Entries */}
              {!loading && !error && entries.length > 0 && (
                <motion.div key={tab} initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                  {tab === "global"
                    ? (entries as GlobalEntry[]).map((e) => (
                        <GlobalRow
                          key={e.userId}
                          entry={e}
                          isMe={user?.id === e.userId}
                        />
                      ))
                    : (entries as WeeklyEntry[]).map((e) => (
                        <WeeklyRow
                          key={e.userId}
                          entry={e}
                          isMe={user?.id === e.userId}
                        />
                      ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Sticky "Your Rank" footer — shown when user is outside the top list */}
          {!loading && !error && myEntry && !myEntryInList && (
            <MyRankFooter myEntry={myEntry} tab={tab} />
          )}
        </motion.div>

        <p className="text-center text-[11px] text-muted-foreground font-semibold mt-4 px-4">
          {tab === "weekly"
            ? "Weekly leaderboard resets automatically every Monday at 00:00 UTC"
            : "Global leaderboard · Top 100 players · Updated after every level completion"}
        </p>
      </div>
    </MenuShell>
  );
};
