import { useState, useEffect } from "react";
import { Link } from "wouter";
import { motion } from "framer-motion";
import {
  Star, Trophy, Coins, Clock, Zap, Medal, Calendar,
  Edit2, ChevronRight, LogOut, Loader2,
} from "lucide-react";
import { MenuShell } from "@/components/MenuShell";
import { Button } from "@/components/ui/button";
import { ChooseUsernameModal } from "@/components/ChooseUsernameModal";
import { AvatarPicker } from "@/components/AvatarPicker";
import { useAuth } from "@/contexts/AuthContext";
import { useProfile } from "@/contexts/ProfileContext";
import { AVATARS, isGameAvatarUrl, gameAvatarIdFromUrl } from "@/lib/avatars";
import { fetchPublicProfile, type PublicProfile } from "@/lib/profile-api";
import { sfx } from "@/game/audio";
import { formatPlayTime, readTotalPlayTimeMs } from "@/lib/play-time";
import type { SaveData } from "@/game/types";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function relDate(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString(undefined, { year: "numeric", month: "long", day: "numeric" });
}

function formatTime(secs: number | null | undefined): string {
  if (!secs) return "—";
  return `${secs.toFixed(1)}s`;
}

// ---------------------------------------------------------------------------
// Large avatar display
// ---------------------------------------------------------------------------

function BigAvatar({
  name,
  url,
  googleImage,
  size = 88,
  onClick,
}: {
  name: string;
  url: string | null;
  googleImage: string | null;
  size?: number;
  onClick?: () => void;
}) {
  const [imgFailed, setImgFailed] = useState(false);
  const letter = (name?.[0] ?? "?").toUpperCase();

  if (url && isGameAvatarUrl(url)) {
    const avatarId = gameAvatarIdFromUrl(url);
    const def = AVATARS.find((a) => a.id === avatarId);
    return (
      <motion.div
        whileTap={onClick ? { scale: 0.95 } : {}}
        className={`flex-shrink-0 rounded-3xl flex items-center justify-center shadow-lg ${onClick ? "cursor-pointer" : ""}`}
        style={{ width: size, height: size, backgroundColor: def?.bg ?? "#FED7AA" }}
        onClick={onClick}
      >
        <span style={{ fontSize: size * 0.48 }}>{def?.emoji ?? "🐱"}</span>
      </motion.div>
    );
  }

  const imgSrc = url ?? googleImage;
  if (imgSrc && !imgFailed) {
    return (
      <motion.div
        whileTap={onClick ? { scale: 0.95 } : {}}
        className={`flex-shrink-0 ${onClick ? "cursor-pointer" : ""}`}
        style={{ width: size, height: size }}
        onClick={onClick}
      >
        <img
          src={imgSrc}
          alt={name}
          loading="lazy"
          className="rounded-3xl object-cover w-full h-full shadow-lg"
          onError={() => setImgFailed(true)}
        />
      </motion.div>
    );
  }

  const colors = ["bg-orange-400", "bg-violet-400", "bg-green-400", "bg-blue-400", "bg-rose-400"];
  let hash = 0;
  for (const c of name) hash = (hash * 31 + c.charCodeAt(0)) | 0;
  return (
    <motion.div
      whileTap={onClick ? { scale: 0.95 } : {}}
      className={`flex-shrink-0 rounded-3xl flex items-center justify-center text-white shadow-lg ${colors[Math.abs(hash) % colors.length]} ${onClick ? "cursor-pointer" : ""}`}
      style={{ width: size, height: size, fontSize: size * 0.44 }}
      onClick={onClick}
    >
      <span className="font-display font-bold">{letter}</span>
    </motion.div>
  );
}

// ---------------------------------------------------------------------------
// Stat card
// ---------------------------------------------------------------------------

function StatCard({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string | number;
}) {
  return (
    <div className="bg-card/80 border-2 border-card-border rounded-2xl px-3 py-3 flex flex-col items-center gap-1 text-center">
      <div className="text-muted-foreground">{icon}</div>
      <div className="font-display font-bold text-lg leading-none">{value}</div>
      <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-wide leading-tight">
        {label}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main page
// ---------------------------------------------------------------------------

interface Props {
  save: SaveData;
  onSave: (s: SaveData) => void;
}

export const Profile = ({ save, onSave }: Props) => {
  const { user, signOut } = useAuth();
  const { profile, displayName, avatarDisplayUrl, isPending, refreshProfile } = useProfile();

  const [publicData, setPublicData] = useState<PublicProfile | null>(null);
  const [publicLoading, setPublicLoading] = useState(false);
  const [usernameModalOpen, setUsernameModalOpen] = useState(false);
  const [avatarPickerOpen, setAvatarPickerOpen] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const [totalPlayTimeMs] = useState(() => readTotalPlayTimeMs());

  // Compute stats from save
  const levelsData = Object.values(save.levels ?? {});
  const totalStars = levelsData.reduce((s, l) => s + (l.bestStars ?? 0), 0);
  const levelsCompleted = levelsData.filter((l) => (l.bestStars ?? 0) > 0).length;
  const bestTime = Math.max(0, ...levelsData.map((l) => l.bestTimeRemaining ?? 0));
  const achievementCount = (save.earnedAchievements ?? []).length;

  // Fetch public profile for rank + join date
  useEffect(() => {
    if (!user) return;
    setPublicLoading(true);
    fetchPublicProfile(user.id)
      .then(setPublicData)
      .catch(() => setPublicData(null))
      .finally(() => setPublicLoading(false));
  }, [user?.id]);

  const handleSignOut = async () => {
    sfx.click();
    setSigningOut(true);
    await signOut();
    setSigningOut(false);
  };

  if (!user) {
    return (
      <MenuShell showBack themeBg={["#ede9fe", "#fef3c7"]}>
        <div className="min-h-screen flex flex-col items-center justify-center gap-4 px-6 pt-20">
          <div className="text-5xl mb-2">👤</div>
          <h1 className="font-display font-bold text-3xl">Profile</h1>
          <p className="text-muted-foreground text-center font-semibold text-sm max-w-xs">
            Sign in to create your player profile and appear on the leaderboard.
          </p>
        </div>
      </MenuShell>
    );
  }

  return (
    <MenuShell showBack themeBg={["#ede9fe", "#fef3c7"]}>
      <div className="min-h-screen pt-20 pb-8 max-w-lg mx-auto px-4 flex flex-col gap-5">

        {/* Identity card */}
        <motion.div
          initial={{ opacity: 0, y: -16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ type: "spring", stiffness: 120 }}
          className="bg-card/80 backdrop-blur border-2 border-card-border rounded-3xl p-5 shadow-lg"
        >
          <div className="flex items-center gap-4">
            {/* Avatar */}
            <div className="relative">
              <BigAvatar
                name={displayName}
                url={avatarDisplayUrl}
                googleImage={user.image ?? null}
                size={80}
                onClick={() => { sfx.click(); setAvatarPickerOpen(true); }}
              />
              <button
                onClick={() => { sfx.click(); setAvatarPickerOpen(true); }}
                className="absolute -bottom-1 -right-1 w-7 h-7 bg-primary text-primary-foreground rounded-full flex items-center justify-center shadow-md hover:bg-primary/90 transition-colors"
                aria-label="Change avatar"
              >
                <Edit2 className="h-3.5 w-3.5" />
              </button>
            </div>

            {/* Name + rank */}
            <div className="flex-1 min-w-0">
              {isPending ? (
                <div className="h-6 w-32 bg-foreground/10 rounded animate-pulse mb-1" />
              ) : (
                <div className="flex items-center gap-2 mb-0.5">
                  <h1 className="font-display font-bold text-xl truncate">
                    {profile?.username
                      ? `@${profile.username}`
                      : (user.name ?? "Player")}
                  </h1>
                  {!profile?.username && (
                    <span className="text-[10px] bg-orange-100 text-orange-700 font-black px-1.5 py-0.5 rounded-full">
                      No username
                    </span>
                  )}
                </div>
              )}
              <div className="text-xs text-muted-foreground font-semibold truncate">
                {user.email}
              </div>
              {publicData?.rank && (
                <div className="mt-1.5 inline-flex items-center gap-1 bg-primary/10 text-primary rounded-full px-2 py-0.5">
                  <Trophy className="h-3 w-3" />
                  <span className="font-display font-bold text-xs">
                    Rank #{publicData.rank}
                  </span>
                </div>
              )}
              {publicLoading && !publicData && (
                <div className="mt-1.5 h-5 w-20 bg-foreground/10 rounded-full animate-pulse" />
              )}
            </div>
          </div>

          {/* Change username button */}
          <button
            onClick={() => { sfx.click(); setUsernameModalOpen(true); }}
            className="mt-4 w-full flex items-center justify-between bg-muted/60 rounded-xl px-4 py-3 hover:bg-muted transition-colors group"
          >
            <div className="flex items-center gap-2">
              <Edit2 className="h-4 w-4 text-muted-foreground group-hover:text-foreground transition-colors" />
              <span className="font-display font-bold text-sm">
                {profile?.username ? "Change Username" : "Choose Username"}
              </span>
            </div>
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          </button>
        </motion.div>

        {/* Stats grid */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.08, type: "spring", stiffness: 100 }}
        >
          <div className="text-xs font-black uppercase tracking-widest text-muted-foreground mb-2 px-1">
            Stats
          </div>
          <div className="grid grid-cols-3 gap-2">
            <StatCard
              icon={<Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />}
              label="Stars"
              value={totalStars}
            />
            <StatCard
              icon={<Trophy className="h-4 w-4 text-primary" />}
              label="Levels"
              value={levelsCompleted}
            />
            <StatCard
              icon={<span className="text-base">🐭</span>}
              label="Mice"
              value={save.totalCaught ?? 0}
            />
            <StatCard
              icon={<Coins className="h-4 w-4 fill-yellow-400 text-yellow-500" />}
              label="Coins"
              value={(save.coins ?? 0).toLocaleString()}
            />
            <StatCard
              icon={<Clock className="h-4 w-4 text-muted-foreground" />}
              label="Best Time"
              value={formatTime(bestTime || null)}
            />
            <StatCard
              icon={<Zap className="h-4 w-4 text-orange-400" />}
              label="Streak"
              value={`${save.loginStreak ?? 0}d`}
            />
            <StatCard
              icon={<Clock className="h-4 w-4 text-violet-500" />}
              label="Play Time"
              value={formatPlayTime(totalPlayTimeMs)}
            />
            <StatCard
              icon={<Medal className="h-4 w-4 text-amber-500" />}
              label="Badges"
              value={achievementCount}
            />
            {publicData?.rank ? (
              <StatCard
                icon={<Trophy className="h-4 w-4 text-primary" />}
                label="Global Rank"
                value={`#${publicData.rank}`}
              />
            ) : null}
            {publicData?.joinDate && (
              <StatCard
                icon={<Calendar className="h-4 w-4 text-muted-foreground" />}
                label="Joined"
                value={relDate(publicData.joinDate)}
              />
            )}
          </div>
        </motion.div>

        {/* Action buttons */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.14 }}
          className="flex flex-col gap-2"
        >
          <Link href="/achievements" onClick={() => sfx.click()}>
            <div className="flex items-center justify-between bg-card/80 border-2 border-card-border rounded-2xl px-4 py-3 hover:bg-card cursor-pointer transition-colors">
              <div className="flex items-center gap-3">
                <span className="text-lg">🏅</span>
                <span className="font-display font-bold text-sm">View Achievements</span>
              </div>
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            </div>
          </Link>
          <Link href="/leaderboard" onClick={() => sfx.click()}>
            <div className="flex items-center justify-between bg-card/80 border-2 border-card-border rounded-2xl px-4 py-3 hover:bg-card cursor-pointer transition-colors">
              <div className="flex items-center gap-3">
                <span className="text-lg">🏆</span>
                <span className="font-display font-bold text-sm">View Leaderboard</span>
              </div>
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            </div>
          </Link>
          <button
            onClick={() => { sfx.click(); setAvatarPickerOpen(true); }}
            className="w-full flex items-center justify-between bg-card/80 border-2 border-card-border rounded-2xl px-4 py-3 hover:bg-card cursor-pointer transition-colors text-left"
          >
            <div className="flex items-center gap-3">
              <span className="text-lg">🎨</span>
              <span className="font-display font-bold text-sm">Change Avatar</span>
            </div>
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          </button>
        </motion.div>

        {/* Sign out */}
        <Button
          variant="ghost"
          className="w-full text-muted-foreground hover:text-destructive gap-2"
          onClick={handleSignOut}
          disabled={signingOut}
        >
          {signingOut ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <LogOut className="h-4 w-4" />
          )}
          Sign Out
        </Button>
      </div>

      {/* Modals */}
      {usernameModalOpen && (
        <ChooseUsernameModal
          mode={profile?.username ? "change" : "setup"}
          onClose={() => setUsernameModalOpen(false)}
        />
      )}
      {avatarPickerOpen && (
        <AvatarPicker
          save={save}
          onSave={onSave}
          onClose={() => setAvatarPickerOpen(false)}
        />
      )}
    </MenuShell>
  );
};
