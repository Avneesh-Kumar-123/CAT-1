import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Lock, CheckCircle2, Loader2, AlertCircle, Coins } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AVATARS, type AvatarDef } from "@/lib/avatars";
import { useProfile } from "@/contexts/ProfileContext";
import { setAvatar, unlockAvatar } from "@/lib/profile-api";
import { useAuth } from "@/contexts/AuthContext";
import { sfx } from "@/game/audio";
import type { SaveData } from "@/game/types";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function unlockLabel(a: AvatarDef): string {
  switch (a.unlock.type) {
    case "free":    return "Free";
    case "level":   return `Clear level ${a.unlock.levelId}`;
    case "achievement": return "Earn an achievement";
    case "coins":   return `${a.unlock.amount} coins`;
  }
}

// ---------------------------------------------------------------------------
// Single avatar tile
// ---------------------------------------------------------------------------

function AvatarTile({
  avatar,
  isOwned,
  isSelected,
  canAfford,
  levelsCompleted,
  achievements,
  onSelect,
  onUnlock,
  unlockLoading,
}: {
  avatar: AvatarDef;
  isOwned: boolean;
  isSelected: boolean;
  canAfford: boolean;
  levelsCompleted: number;
  achievements: string[];
  onSelect: (id: string) => void;
  onUnlock: (id: string) => void;
  unlockLoading: string | null;
}) {
  const locked = !isOwned;
  const meetsLevel =
    avatar.unlock.type === "level"
      ? levelsCompleted >= avatar.unlock.levelId
      : true;
  const canUnlock =
    locked &&
    (avatar.unlock.type === "free" ||
      (avatar.unlock.type === "level" && meetsLevel) ||
      (avatar.unlock.type === "achievement" &&
        achievements.includes(avatar.unlock.achievementId)) ||
      (avatar.unlock.type === "coins" && canAfford));

  return (
    <motion.div
      whileTap={isOwned ? { scale: 0.92 } : {}}
      className={`relative rounded-2xl p-3 flex flex-col items-center gap-1.5 cursor-pointer border-2 transition-all select-none ${
        isSelected
          ? "border-primary shadow-lg shadow-primary/20 scale-105"
          : locked
          ? "border-foreground/10 opacity-70"
          : "border-transparent hover:border-foreground/20"
      }`}
      style={{ backgroundColor: avatar.bg + "33" }}
      onClick={() => {
        if (!locked) {
          sfx.click();
          onSelect(avatar.id);
        }
      }}
    >
      {/* Emoji */}
      <div
        className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl select-none"
        style={{ backgroundColor: avatar.bg }}
      >
        {avatar.emoji}
      </div>

      {/* Name */}
      <span className="text-[10px] font-bold text-center leading-tight truncate w-full text-center">
        {avatar.name}
      </span>

      {/* Selected badge */}
      {isSelected && (
        <div className="absolute -top-1.5 -right-1.5 bg-primary text-primary-foreground rounded-full w-5 h-5 flex items-center justify-center">
          <CheckCircle2 className="h-3.5 w-3.5" />
        </div>
      )}

      {/* Lock overlay */}
      {locked && (
        <div className="absolute inset-0 rounded-2xl bg-background/60 flex flex-col items-center justify-center gap-1">
          <Lock className="h-4 w-4 text-muted-foreground" />
          <span className="text-[9px] font-bold text-muted-foreground text-center px-1 leading-tight">
            {unlockLabel(avatar)}
          </span>
          {canUnlock && (
            <motion.button
              whileTap={{ scale: 0.9 }}
              className={`mt-0.5 text-[10px] font-black px-2 py-0.5 rounded-full transition-colors ${
                avatar.unlock.type === "coins"
                  ? "bg-yellow-400 text-yellow-900 hover:bg-yellow-300"
                  : "bg-primary text-primary-foreground hover:bg-primary/90"
              }`}
              onClick={(e) => {
                e.stopPropagation();
                sfx.click();
                onUnlock(avatar.id);
              }}
              disabled={unlockLoading === avatar.id}
            >
              {unlockLoading === avatar.id ? (
                <Loader2 className="h-2.5 w-2.5 animate-spin" />
              ) : (
                avatar.unlock.type === "coins" ? "Unlock" : "Claim"
              )}
            </motion.button>
          )}
        </div>
      )}
    </motion.div>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

interface Props {
  save: SaveData;
  onSave: (s: SaveData) => void;
  onClose: () => void;
}

export function AvatarPicker({ save, onSave, onClose }: Props) {
  const { user } = useAuth();
  const { profile, avatarDisplayUrl, refreshProfile } = useProfile();

  const [avatarType, setAvatarType] = useState<"google" | "game">(
    profile?.avatarType === "game" ? "game" : "google",
  );
  const [selectedGame, setSelectedGame] = useState<string | null>(
    profile?.selectedAvatar ?? null,
  );
  const [unlockLoading, setUnlockLoading] = useState<string | null>(null);
  const [saveLoading, setSaveLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const unlockedAvatars: string[] = (profile?.unlockedAvatars ?? []) as string[];

  // Stats for unlock validation
  const levelsCompleted = Object.values(save.levels ?? {}).filter(
    (l) => (l.bestStars ?? 0) > 0,
  ).length;
  const achievements = save.earnedAchievements ?? [];

  const handleUnlock = async (avatarId: string) => {
    const avatarDef = AVATARS.find((a) => a.id === avatarId)!;
    setError(null);

    // For coin-based unlocks, check affordability
    if (avatarDef.unlock.type === "coins") {
      if ((save.coins ?? 0) < avatarDef.unlock.amount) {
        setError(`Not enough coins — need ${avatarDef.unlock.amount}`);
        return;
      }
    }

    setUnlockLoading(avatarId);
    try {
      const res = await unlockAvatar(avatarId);
      if (!res.alreadyOwned) {
        // Deduct coins from save for coin-based unlocks
        if (avatarDef.unlock.type === "coins") {
          onSave({ ...save, coins: (save.coins ?? 0) - avatarDef.unlock.amount });
        }
        sfx.achievement();
      }
      await refreshProfile();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to unlock");
    } finally {
      setUnlockLoading(null);
    }
  };

  const handleSave = async () => {
    setSaveLoading(true);
    setError(null);
    sfx.click();
    try {
      await setAvatar(avatarType, selectedGame ?? undefined);
      await refreshProfile();
      sfx.achievement();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save avatar");
    } finally {
      setSaveLoading(false);
    }
  };

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-end sm:items-center justify-center"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
      >
        <motion.div
          className="bg-card border-2 border-card-border rounded-t-3xl sm:rounded-3xl p-6 w-full max-w-md shadow-2xl max-h-[92dvh] overflow-y-auto"
          initial={{ y: "100%", opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: "100%", opacity: 0 }}
          transition={{ type: "spring", stiffness: 260, damping: 26 }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between mb-5">
            <div className="font-display font-bold text-lg">🎨 Choose Avatar</div>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-muted flex items-center justify-center hover:bg-muted/80 transition-colors"
              aria-label="Close"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Tab: Google vs Game */}
          <div className="flex gap-1.5 bg-muted/50 rounded-xl p-1 mb-5">
            {(["google", "game"] as const).map((t) => (
              <button
                key={t}
                onClick={() => { sfx.click(); setAvatarType(t); }}
                className={`flex-1 rounded-lg py-2 font-display font-bold text-xs transition-all ${
                  avatarType === t
                    ? "bg-card shadow text-foreground"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {t === "google" ? "🌐 Google Picture" : "🎮 Game Avatar"}
              </button>
            ))}
          </div>

          {avatarType === "google" && (
            <div className="flex flex-col items-center gap-3 py-4">
              {user?.image ? (
                <img
                  src={user.image}
                  alt="Google profile"
                  loading="lazy"
                  className="w-24 h-24 rounded-2xl object-cover border-4 border-primary shadow-lg"
                />
              ) : (
                <div className="w-24 h-24 rounded-2xl bg-primary/10 border-4 border-primary flex items-center justify-center text-4xl font-display font-bold text-primary">
                  {user?.name?.[0]?.toUpperCase() ?? "?"}
                </div>
              )}
              <div className="text-sm font-semibold text-muted-foreground text-center">
                Your Google profile picture will be displayed
              </div>
            </div>
          )}

          {avatarType === "game" && (
            <>
              <div className="flex items-center justify-between mb-3">
                <div className="text-xs font-bold text-muted-foreground uppercase tracking-wide">
                  Avatar Gallery
                </div>
                <div className="flex items-center gap-1 text-xs font-bold text-yellow-600">
                  <Coins className="h-3 w-3 fill-yellow-400 text-yellow-500" />
                  {save.coins ?? 0} coins
                </div>
              </div>
              <div className="grid grid-cols-4 gap-2 mb-4">
                {AVATARS.map((a) => (
                  <AvatarTile
                    key={a.id}
                    avatar={a}
                    isOwned={unlockedAvatars.includes(a.id)}
                    isSelected={selectedGame === a.id}
                    canAfford={
                      a.unlock.type === "coins"
                        ? (save.coins ?? 0) >= a.unlock.amount
                        : true
                    }
                    levelsCompleted={levelsCompleted}
                    achievements={achievements}
                    onSelect={(id) => setSelectedGame(id)}
                    onUnlock={handleUnlock}
                    unlockLoading={unlockLoading}
                  />
                ))}
              </div>
            </>
          )}

          {error && (
            <div className="flex items-center gap-2 text-xs font-bold text-destructive bg-destructive/10 rounded-xl px-3 py-2 mb-3">
              <AlertCircle className="h-3.5 w-3.5 flex-shrink-0" /> {error}
            </div>
          )}

          <Button
            className="w-full font-display font-bold h-12 game-button"
            onClick={handleSave}
            disabled={
              saveLoading ||
              (avatarType === "game" && !selectedGame) ||
              (avatarType === "game" &&
                selectedGame !== null &&
                !unlockedAvatars.includes(selectedGame))
            }
          >
            {saveLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save Avatar"}
          </Button>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
