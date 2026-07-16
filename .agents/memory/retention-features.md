---
name: Retention features
description: Beat Your Best, Weekly Challenge, and Streak Milestone cosmetics — where each piece lives.
---

## Beat Your Best (WinPanel)
- `SaveData.levels[id].bestTimeRemaining` already stored by `recordLevelComplete`.
- In `handleCatch` (Play.tsx), read `prevBestTimeRemaining` from `save.levels[level.id]?.bestTimeRemaining ?? 0` BEFORE calling `recordLevelComplete`, then pass it through the `Outcome` type's `prevBestTimeRemaining` field.
- `WinPanel` renders a green "New Personal Best! ⚡" badge when `timeRemaining > prevBestTimeRemaining && prevBestTimeRemaining > 0`.

## Weekly Challenge
- Type `WeeklyChallengeDef` + pool + `currentWeekKey()` + `pickWeeklyChallenge()` defined in `economy.ts`.
- State field `weeklyChallenge: DailyChallengeState | null` added to `SaveData` (reuses same shape).
- `getOrCreateWeeklyChallenge()` and `progressWeeklyChallenge()` in `storage.ts` — same pattern as daily.
- Initialised on both `Splash` mount (useEffect alongside claimDailyReward) and `Play` mount.
- Progressed in `Play.tsx` for `finish_levels`, `no_damage_clear`, `catch_mice`, `collect_cheese` — alongside daily challenge calls.
- Shown as a card on Splash: desktop right panel (full card) + mobile center (compact banner), both with animated progress bar.

**Why:** Weekly rotation gives players a Monday anchor to return; larger targets (60–100 mice, 300–600 coin reward) vs daily create a different timescale of engagement.

## Streak Milestone Cosmetics
- Three new exclusive shop items in `shop.ts`: `streak3-clover` (hat 🍀, day 3), `streak14-lightning` (trail ⚡, day 14), `streak30-champion` (hat 🏆, day 30).
- `STREAK_MILESTONES` array in `economy.ts` maps streak → cosmeticId/label/emoji.
- `claimDailyReward` in `storage.ts` now iterates `STREAK_MILESTONES` after awarding coins, grants the first unclaimed milestone cosmetic that the new streak qualifies for, and returns `exclusiveCosmeticName` + `exclusiveCosmeticEmoji` in its result.
- Daily reward popup in `Splash.tsx` shows a violet "Exclusive Unlocked!" sub-card when a cosmetic was awarded.

**Why:** Gives the streak system a payoff beyond coins — visible milestones players can wear, motivating multi-week retention.
