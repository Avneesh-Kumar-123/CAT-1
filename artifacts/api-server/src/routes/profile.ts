import { Router } from "express";
import { eq, and, ne, or, gt, count, sql } from "drizzle-orm";
import {
  db,
  playerProfiles,
  leaderboardGlobal,
  leaderboardWeekly,
  cloudSaves,
  authUser,
} from "@workspace/db";
import { requireAuth } from "../middleware/require-auth";
import { AVATARS, AVATAR_ID_SET, FREE_AVATAR_IDS } from "../lib/avatars";

const router = Router();

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const USERNAME_REGEX = /^[a-zA-Z0-9_]{3,20}$/;
const USERNAME_COOLDOWN_DAYS = Math.max(
  1,
  Number(process.env.USERNAME_CHANGE_COOLDOWN_DAYS ?? 30),
);
const USERNAME_COOLDOWN_MS =
  USERNAME_COOLDOWN_DAYS * 24 * 60 * 60 * 1000;

function isoWeekKey(date: Date): string {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil((((d.getTime() - yearStart.getTime()) / 86_400_000) + 1) / 7);
  return `${d.getUTCFullYear()}-W${String(weekNo).padStart(2, "0")}`;
}

function avatarUrlFor(
  profile: { avatarType: string; selectedAvatar: string | null } | null | undefined,
  googleImage: string | null | undefined,
): string | null {
  return profile?.avatarType === "game" && profile.selectedAvatar
    ? `game:${profile.selectedAvatar}`
    : (googleImage ?? null);
}

async function syncLeaderboardIdentity(
  userId: string,
  displayName: string,
  avatarUrl: string | null,
): Promise<void> {
  await Promise.all([
    db
      .update(leaderboardGlobal)
      .set({ displayName, avatarUrl })
      .where(eq(leaderboardGlobal.userId, userId)),
    db
      .update(leaderboardWeekly)
      .set({ displayName, avatarUrl })
      .where(
        and(
          eq(leaderboardWeekly.userId, userId),
          eq(leaderboardWeekly.weekKey, isoWeekKey(new Date())),
        ),
      ),
  ]);
}

// ---------------------------------------------------------------------------
// GET /api/profile/avatars  — public avatar catalog
// ---------------------------------------------------------------------------

router.get("/avatars", (_req, res) => {
  res.json({ avatars: AVATARS });
});

// ---------------------------------------------------------------------------
// GET /api/profile/check-username?q=xxx  — public availability check
// ---------------------------------------------------------------------------

router.get("/check-username", async (req, res) => {
  const q = String(req.query.q ?? "").trim();

  if (!USERNAME_REGEX.test(q)) {
    res.json({
      available: false,
      reason: "Must be 3–20 characters using only letters, numbers, and underscores",
    });
    return;
  }

  try {
    const existing = await db.query.playerProfiles.findFirst({
      where: eq(playerProfiles.username, q),
    });
    res.json(existing ? { available: false, reason: "Username already taken" } : { available: true });
  } catch {
    res.status(500).json({ available: false, reason: "Could not check username" });
  }
});

// ---------------------------------------------------------------------------
// GET /api/profile  — get (or lazily create) the current user's profile
// ---------------------------------------------------------------------------

router.get("/", requireAuth, async (req, res) => {
  const userId = req.authUser!.id;

  try {
    let profile = await db.query.playerProfiles.findFirst({
      where: eq(playerProfiles.userId, userId),
    });

    if (!profile) {
      const [created] = await db
        .insert(playerProfiles)
        .values({
          userId,
          username: null,
          avatarType: "google",
          selectedAvatar: null,
          unlockedAvatars: FREE_AVATAR_IDS,
        })
        .returning();
      profile = created;
    }

    res.json({ profile });
  } catch (err) {
    console.error("GET /profile error", err);
    res.status(500).json({ error: "Failed to fetch profile" });
  }
});

// ---------------------------------------------------------------------------
// PUT /api/profile/username  — set or change username (30-day cooldown)
// ---------------------------------------------------------------------------

router.put("/username", requireAuth, async (req, res) => {
  const userId = req.authUser!.id;
  const username = String(req.body?.username ?? "").trim();

  if (!USERNAME_REGEX.test(username)) {
    res.status(400).json({
      error: "Username must be 3–20 characters (letters, numbers, underscores only)",
    });
    return;
  }

  try {
    const profile = await db.query.playerProfiles.findFirst({
      where: eq(playerProfiles.userId, userId),
    });

    // 30-day cooldown applies after the username has been set at least once
    if (profile?.usernameLastChanged) {
      const elapsed = Date.now() - new Date(profile.usernameLastChanged).getTime();
      if (elapsed < USERNAME_COOLDOWN_MS) {
        const daysLeft = Math.ceil((USERNAME_COOLDOWN_MS - elapsed) / 86_400_000);
        res.status(429).json({
          error: `Username can be changed again in ${daysLeft} day${daysLeft !== 1 ? "s" : ""}`,
        });
        return;
      }
    }

    // Uniqueness check — allow same user to re-set the same name without error
    if (profile) {
      const conflict = await db.query.playerProfiles.findFirst({
        where: and(
          sql`lower(${playerProfiles.username}) = lower(${username})`,
          ne(playerProfiles.userId, userId),
        ),
      });
      if (conflict) {
        res.status(409).json({ error: "Username already taken" });
        return;
      }
    } else {
      const conflict = await db.query.playerProfiles.findFirst({
        where: sql`lower(${playerProfiles.username}) = lower(${username})`,
      });
      if (conflict) {
        res.status(409).json({ error: "Username already taken" });
        return;
      }
    }

    const now = new Date();

    if (!profile) {
      await db.insert(playerProfiles).values({
        userId,
        username,
        avatarType: "google",
        unlockedAvatars: FREE_AVATAR_IDS,
        usernameLastChanged: now,
      });
    } else {
      await db
        .update(playerProfiles)
        .set({ username, usernameLastChanged: now })
        .where(eq(playerProfiles.userId, userId));
    }

    await syncLeaderboardIdentity(
      userId,
      username,
      avatarUrlFor(profile, req.authUser!.image),
    );
    res.json({ ok: true });
  } catch (err) {
    console.error("PUT /profile/username error", err);
    res.status(500).json({ error: "Failed to update username" });
  }
});

// ---------------------------------------------------------------------------
// PUT /api/profile/avatar  — change avatar type/selection
// ---------------------------------------------------------------------------

router.put("/avatar", requireAuth, async (req, res) => {
  const userId = req.authUser!.id;
  const { avatarType, selectedAvatar } = req.body ?? {};

  if (avatarType !== "google" && avatarType !== "game") {
    res.status(400).json({ error: "avatarType must be 'google' or 'game'" });
    return;
  }

  if (avatarType === "game") {
    if (!selectedAvatar || !AVATAR_ID_SET.has(selectedAvatar)) {
      res.status(400).json({ error: "Invalid avatar ID" });
      return;
    }

    try {
      const profile = await db.query.playerProfiles.findFirst({
        where: eq(playerProfiles.userId, userId),
      });
      const unlocked: string[] = (profile?.unlockedAvatars ?? []) as string[];
      if (!unlocked.includes(selectedAvatar)) {
        res.status(403).json({ error: "Avatar not unlocked" });
        return;
      }
    } catch (err) {
      console.error("PUT /profile/avatar ownership check error", err);
      res.status(500).json({ error: "Failed to verify avatar ownership" });
      return;
    }
  }

  try {
    await db
      .insert(playerProfiles)
      .values({
        userId,
        avatarType,
        selectedAvatar: avatarType === "game" ? (selectedAvatar ?? null) : null,
        unlockedAvatars: FREE_AVATAR_IDS,
      })
      .onConflictDoUpdate({
        target: playerProfiles.userId,
        set: {
          avatarType,
          selectedAvatar: avatarType === "game" ? (selectedAvatar ?? null) : null,
        },
      });

    const updatedProfile = await db.query.playerProfiles.findFirst({
      where: eq(playerProfiles.userId, userId),
    });
    await syncLeaderboardIdentity(
      userId,
      updatedProfile?.username ?? req.authUser!.name ?? req.authUser!.email,
      avatarType === "game"
        ? `game:${selectedAvatar}`
        : (req.authUser!.image ?? null),
    );

    res.json({ ok: true });
  } catch (err) {
    console.error("PUT /profile/avatar error", err);
    res.status(500).json({ error: "Failed to update avatar" });
  }
});

// ---------------------------------------------------------------------------
// POST /api/profile/unlock-avatar  — record a new avatar unlock
// ---------------------------------------------------------------------------

router.post("/unlock-avatar", requireAuth, async (req, res) => {
  const userId = req.authUser!.id;
  const avatarId = String(req.body?.avatarId ?? "");

  const avatarDef = AVATARS.find((a) => a.id === avatarId);
  if (!avatarDef) {
    res.status(400).json({ error: "Unknown avatar ID" });
    return;
  }

  try {
    let profile = await db.query.playerProfiles.findFirst({
      where: eq(playerProfiles.userId, userId),
    });

    if (!profile) {
      const [created] = await db
        .insert(playerProfiles)
        .values({ userId, unlockedAvatars: FREE_AVATAR_IDS, avatarType: "google" })
        .returning();
      profile = created;
    }

    const unlocked: string[] = (profile.unlockedAvatars ?? []) as string[];

    if (unlocked.includes(avatarId)) {
      res.json({ ok: true, alreadyOwned: true });
      return;
    }

    // Validate level-based unlocks server-side
    const { unlock } = avatarDef;
    if (unlock.type === "level") {
      const lbRow = await db.query.leaderboardGlobal.findFirst({
        where: eq(leaderboardGlobal.userId, userId),
      });
      if (!lbRow || lbRow.levelsCompleted < unlock.levelId) {
        res.status(403).json({
          error: `Complete level ${unlock.levelId} first to unlock ${avatarDef.name}`,
        });
        return;
      }
    }

    if (unlock.type === "achievement") {
      const cloud = await db.query.cloudSaves.findFirst({
        where: eq(cloudSaves.userId, userId),
      });
      const cloudSave =
        cloud?.saveData && typeof cloud.saveData === "object"
          ? (cloud.saveData as Record<string, unknown>)
          : null;
      const achievements = Array.isArray(cloudSave?.earnedAchievements)
        ? cloudSave.earnedAchievements
        : [];
      if (!achievements.includes(unlock.achievementId)) {
        res.status(403).json({
          error: `Earn the required achievement first to unlock ${avatarDef.name}`,
        });
        return;
      }
    }

    // Coin unlocks are checked against the server-side cloud save. The client
    // may request an unlock, but it cannot grant itself coins.
    if (unlock.type === "coins") {
      const cloud = await db.query.cloudSaves.findFirst({
        where: eq(cloudSaves.userId, userId),
      });
      const cloudSave =
        cloud?.saveData && typeof cloud.saveData === "object"
          ? (cloud.saveData as Record<string, unknown>)
          : null;
      const serverCoins =
        cloudSave && typeof cloudSave.coins === "number" ? cloudSave.coins : 0;

      if (!cloud || serverCoins < unlock.amount) {
        res.status(403).json({
          error: `You need ${unlock.amount} coins to unlock ${avatarDef.name}`,
        });
        return;
      }

      await db
        .update(cloudSaves)
        .set({
          saveData: { ...cloudSave, coins: serverCoins - unlock.amount },
          updatedAt: new Date(),
        })
        .where(eq(cloudSaves.userId, userId));
    }

    // Append avatarId to the JSONB array
    await db
      .update(playerProfiles)
      .set({
        unlockedAvatars: sql`${playerProfiles.unlockedAvatars} || ${JSON.stringify([avatarId])}::jsonb`,
      })
      .where(eq(playerProfiles.userId, userId));

    res.json({ ok: true });
  } catch (err) {
    console.error("POST /profile/unlock-avatar error", err);
    res.status(500).json({ error: "Failed to unlock avatar" });
  }
});

// ---------------------------------------------------------------------------
// GET /api/profile/public/:userId  — public profile + leaderboard rank
// ---------------------------------------------------------------------------

router.get("/public/:userId", async (req, res) => {
  const { userId } = req.params;

  try {
    const [user, profile, lbRow] = await Promise.all([
      db.query.authUser.findFirst({ where: eq(authUser.id, userId) }),
      db.query.playerProfiles.findFirst({ where: eq(playerProfiles.userId, userId) }),
      db.query.leaderboardGlobal.findFirst({ where: eq(leaderboardGlobal.userId, userId) }),
    ]);

    if (!user) {
      res.status(404).json({ error: "User not found" });
      return;
    }

    let rank: number | null = null;
    if (lbRow) {
      const [{ betterCount }] = await db
        .select({ betterCount: count() })
        .from(leaderboardGlobal)
        .where(
          or(
            gt(leaderboardGlobal.totalStars, lbRow.totalStars),
            and(
              eq(leaderboardGlobal.totalStars, lbRow.totalStars),
              gt(leaderboardGlobal.levelsCompleted, lbRow.levelsCompleted),
            ),
          ),
        );
      rank = Number(betterCount) + 1;
    }

    res.json({
      userId,
      username: profile?.username ?? null,
      displayName: profile?.username ?? "Player",
      avatarType: profile?.avatarType ?? "google",
      selectedAvatar: profile?.selectedAvatar ?? null,
      googleImage: user.image ?? null,
      joinDate: user.createdAt,
      globalStats: lbRow ?? null,
      rank,
    });
  } catch (err) {
    console.error("GET /profile/public error", err);
    res.status(500).json({ error: "Failed to fetch public profile" });
  }
});

export default router;
