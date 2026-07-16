---
name: Mouse Almanac feature
description: How mouse-kind tracking, discovery coin bonuses, and the Almanac page are implemented in Cat Chase.
---

## Rule
`MouseKind = MouseType | "golden" | "boss"` — 10 distinct catchable kinds total. Tracked in `SaveData.caughtMouseKinds: MouseKind[]`.

## Key files
- `src/game/types.ts` — `MouseKind` union type, `caughtMouseKinds` field on `SaveData`
- `src/game/mousePersonalities.ts` — static data (title, description, icon, id) for all 10 kinds; source of truth for the Almanac page
- `src/game/storage.ts` — `recordMouseKindsCaught(data, kinds)` returns `{data, newKinds}`; awards `MOUSE_DISCOVERY_COINS` (15) per newly-seen kind via `coinsForMouseDiscoveries`
- `src/game/economy.ts` — `MOUSE_DISCOVERY_COINS = 15`, `coinsForMouseDiscoveries(count)`
- `src/components/GameCanvas.tsx` — `onMouseCaughtKinds?: (kinds: MouseKind[]) => void` prop; fired in the catch block with `[m.mouseType ?? "normal", ...golden/boss sentinels if applicable]`
- `src/pages/Play.tsx` — `handleMouseCaughtKinds` calls `recordMouseKindsCaught` and sets `toastDiscoveries`; `MouseDiscoveryToast` rendered alongside `AchievementToastQueue`
- `src/components/MouseDiscoveryToast.tsx` — queued toast (same pattern as AchievementToastQueue, violet border, ✦ icon)
- `src/pages/MouseAlmanac.tsx` — grid page (same pattern as Achievements.tsx); shows MouseSprite + personality badge emoji, locked/unlocked state, coin value, description
- `src/App.tsx` — route `/mouse-almanac`
- `src/pages/Splash.tsx` — full-width violet nav button below the 2×2 grid showing `X / 10 discovered`

**Why:** Adds a collectible/discovery loop that rewards players for encountering each of the 10 mouse kinds for the first time (+15 coins each, toast notification), and gives them a reference page to see what they've found and what remains.

**How to apply:** When adding a new MouseType in future, add it to the `MouseKind` union, add an entry to `MOUSE_PERSONALITIES`, add to `MOUSE_COIN_VALUES` in economy.ts, and assign it to levels in levels.ts. No other Almanac wiring needed.
