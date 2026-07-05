/* global gtag */
declare function gtag(...args: unknown[]): void;

function track(event: string, params?: Record<string, unknown>): void {
  try {
    if (typeof gtag === "function") {
      gtag("event", event, params ?? {});
    }
  } catch {
    // GA unavailable — fail silently
  }
}

export const analytics = {
  playButtonClicked: () =>
    track("play_button_clicked"),

  levelStart: (levelNumber: number) =>
    track("level_start", { level_number: levelNumber }),

  levelComplete: (levelNumber: number, stars: number, score: number, coinsEarned: number) =>
    track("level_complete", { level_number: levelNumber, stars, score, coins_earned: coinsEarned }),

  levelFailed: (levelNumber: number) =>
    track("level_failed", { level_number: levelNumber }),

  coinsEarned: (amount: number, source: string) =>
    track("coins_earned", { amount, source }),

  coinsSpent: (amount: number, itemName: string) =>
    track("coins_spent", { amount, item_name: itemName }),

  achievementUnlocked: (achievementName: string) =>
    track("achievement_unlocked", { achievement_name: achievementName }),

  shopPurchase: (itemName: string, cost: number) =>
    track("shop_purchase", { item_name: itemName, cost }),
};
