import { useState } from "react";
import { motion } from "framer-motion";
import { Coins, Check, Lock } from "lucide-react";
import { MenuShell } from "@/components/MenuShell";
import { sfx } from "@/game/audio";
import { purchaseItem, equipCosmetic } from "@/game/storage";
import { analytics } from "@/analytics";
import { SHOP_ITEMS, itemsByCategory, isOwned, type CosmeticCategory } from "@/game/shop";
import type { SaveData } from "@/game/types";

type Props = {
  save: SaveData;
  onSave: (s: SaveData) => void;
};

const CATEGORIES: { id: CosmeticCategory; label: string; emoji: string }[] = [
  { id: "hat", label: "Hats", emoji: "🎩" },
  { id: "trail", label: "Trails", emoji: "✨" },
  { id: "paw", label: "Paw Effects", emoji: "🐾" },
];

const equippedKey = (cat: CosmeticCategory): keyof SaveData["settings"] =>
  cat === "hat" ? "equippedHat" : cat === "trail" ? "equippedTrail" : "equippedPaw";

export const Shop = ({ save, onSave }: Props) => {
  const [tab, setTab] = useState<CosmeticCategory>("hat");
  const [insufficient, setInsufficient] = useState<string | null>(null);

  const owned = save.ownedCosmetics ?? [];
  const items = itemsByCategory(tab);
  const equipped = save.settings[equippedKey(tab)] as string;

  const handleBuyOrEquip = (itemId: string, price: number) => {
    const item = SHOP_ITEMS.find((i) => i.id === itemId)!;
    if (isOwned(owned, item)) {
      sfx.click();
      onSave(equipCosmetic(save, tab, itemId));
      return;
    }
    const { data, success } = purchaseItem(save, itemId, price);
    if (!success) {
      sfx.fail?.();
      setInsufficient(itemId);
      setTimeout(() => setInsufficient(null), 900);
      return;
    }
    sfx.win?.();
    onSave(equipCosmetic(data, tab, itemId));
    analytics.shopPurchase(item.name, price);
    analytics.coinsSpent(price, item.name);
  };

  return (
    <MenuShell showBack>
      <div className="relative z-10 min-h-screen px-4 py-12 max-w-xl mx-auto">
        <motion.div
          initial={{ y: -20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="text-center mb-6"
        >
          <h1 className="font-display font-bold text-4xl sm:text-5xl mb-2">Shop</h1>
          <div className="inline-flex items-center gap-2 bg-card border-2 border-card-border rounded-full px-4 py-1.5 shadow-md">
            <Coins className="h-5 w-5 text-yellow-500 fill-yellow-400" />
            <span className="font-display font-bold text-lg" data-testid="text-coin-balance">
              {save.coins ?? 0}
            </span>
            <span className="text-xs text-muted-foreground font-bold">coins</span>
          </div>
        </motion.div>

        {/* Category tabs */}
        <div className="grid grid-cols-3 gap-2 mb-5">
          {CATEGORIES.map((c) => (
            <button
              key={c.id}
              onClick={() => { sfx.click(); setTab(c.id); }}
              data-testid={`tab-${c.id}`}
              className={`rounded-2xl py-3 flex flex-col items-center gap-1 border-2 transition-all ${
                tab === c.id
                  ? "border-primary bg-primary/10 shadow-md"
                  : "border-card-border bg-card/60 hover:border-primary/40"
              }`}
            >
              <span className="text-2xl leading-none">{c.emoji}</span>
              <span className="font-display font-bold text-xs">{c.label}</span>
            </button>
          ))}
        </div>

        {/* Items grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {items.map((item, i) => {
            const owns = isOwned(owned, item);
            const isEquipped = equipped === item.id;
            const canAfford = (save.coins ?? 0) >= item.price;
            const shake = insufficient === item.id;
            return (
              <motion.button
                key={item.id}
                initial={{ opacity: 0, y: 12 }}
                animate={{
                  opacity: 1,
                  y: 0,
                  x: shake ? [0, -6, 6, -4, 4, 0] : 0,
                }}
                transition={{ delay: i * 0.03, x: { duration: 0.4 } }}
                onClick={() => handleBuyOrEquip(item.id, item.price)}
                data-testid={`item-${item.id}`}
                className={`relative flex flex-col items-center text-center rounded-2xl px-3 py-4 border-2 transition-colors ${
                  isEquipped
                    ? "bg-primary/10 border-primary shadow-md"
                    : owns
                    ? "bg-card border-card-border hover:border-primary/50"
                    : canAfford
                    ? "bg-card/70 border-card-border hover:border-primary/40"
                    : "bg-card/40 border-card-border opacity-70"
                }`}
              >
                {isEquipped && (
                  <div className="absolute top-2 right-2 bg-primary text-primary-foreground rounded-full w-5 h-5 flex items-center justify-center shadow">
                    <Check className="h-3 w-3" />
                  </div>
                )}
                {!owns && !canAfford && (
                  <div className="absolute top-2 right-2 bg-muted-foreground/70 text-white rounded-full w-5 h-5 flex items-center justify-center shadow">
                    <Lock className="h-2.5 w-2.5" />
                  </div>
                )}
                <div
                  className="text-3xl w-14 h-14 flex items-center justify-center rounded-xl mb-2"
                  style={{ background: item.color && item.color !== "rainbow" ? `${item.color}22` : undefined }}
                >
                  {item.emoji}
                </div>
                <div className="font-display font-bold text-xs mb-1">{item.name}</div>
                {owns ? (
                  <div className="text-[10px] font-bold text-primary">
                    {isEquipped ? "Equipped" : "Owned · Tap to equip"}
                  </div>
                ) : (
                  <div className="flex items-center gap-1 text-[11px] font-bold">
                    <Coins className="h-3 w-3 text-yellow-500 fill-yellow-400" />
                    {item.price}
                  </div>
                )}
              </motion.button>
            );
          })}
        </div>

        <p className="text-center text-xs text-muted-foreground font-semibold mt-6">
          Earn coins by clearing levels and logging in daily. Cat skins still unlock free with ⭐ stars in Settings.
        </p>
      </div>
    </MenuShell>
  );
};
