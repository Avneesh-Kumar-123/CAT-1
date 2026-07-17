import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
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

type MainTab = "hat" | "trail" | "paw" | "mice";
type MouseSubTab = "mouse-skin" | "mouse-eye" | "mouse-tail";

const MAIN_TABS: { id: MainTab; label: string; emoji: string }[] = [
  { id: "hat",   label: "Hats",   emoji: "🎩" },
  { id: "trail", label: "Trails", emoji: "✨" },
  { id: "paw",   label: "Paw FX", emoji: "🐾" },
  { id: "mice",  label: "Mice",   emoji: "🐭" },
];

const MOUSE_SUB_TABS: { id: MouseSubTab; label: string; emoji: string }[] = [
  { id: "mouse-skin", label: "Fur",   emoji: "🎨" },
  { id: "mouse-eye",  label: "Eyes",  emoji: "👀" },
  { id: "mouse-tail", label: "Tails", emoji: "〰️" },
];

const equippedKey = (cat: CosmeticCategory): keyof SaveData["settings"] => {
  if (cat === "hat")        return "equippedHat";
  if (cat === "trail")      return "equippedTrail";
  if (cat === "paw")        return "equippedPaw";
  if (cat === "mouse-skin") return "equippedMouseSkin";
  if (cat === "mouse-eye")  return "equippedMouseEye";
  return "equippedMouseTail";
};

export const Shop = ({ save, onSave }: Props) => {
  const [tab, setTab] = useState<MainTab>("hat");
  const [mouseSubTab, setMouseSubTab] = useState<MouseSubTab>("mouse-skin");
  const [insufficient, setInsufficient] = useState<string | null>(null);

  // Which CosmeticCategory is currently active
  const activeCat: CosmeticCategory = tab === "mice" ? mouseSubTab : (tab as CosmeticCategory);
  const owned = save.ownedCosmetics ?? [];
  const items = itemsByCategory(activeCat);
  const equipped = save.settings[equippedKey(activeCat)] as string;

  const handleBuyOrEquip = (itemId: string, price: number) => {
    const item = SHOP_ITEMS.find((i) => i.id === itemId)!;
    if (isOwned(owned, item)) {
      sfx.click();
      onSave(equipCosmetic(save, activeCat, itemId));
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
    onSave(equipCosmetic(data, activeCat, itemId));
    analytics.shopPurchase(item.name, price);
    analytics.coinsSpent(price, item.name);
  };

  return (
    <MenuShell showBack>
      <div className="relative z-10 min-h-screen px-4 py-12 max-w-xl mx-auto">
        {/* Header */}
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

        {/* Main category tabs — 2×2 grid */}
        <div className="grid grid-cols-4 gap-2 mb-4">
          {MAIN_TABS.map((c) => (
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
              <span className="text-xl leading-none">{c.emoji}</span>
              <span className="font-display font-bold text-[10px]">{c.label}</span>
            </button>
          ))}
        </div>

        {/* Mouse sub-tabs — only shown when Mice tab is active */}
        <AnimatePresence>
          {tab === "mice" && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="overflow-hidden mb-4"
            >
              <div className="grid grid-cols-3 gap-2">
                {MOUSE_SUB_TABS.map((s) => (
                  <button
                    key={s.id}
                    onClick={() => { sfx.click(); setMouseSubTab(s.id); }}
                    className={`rounded-xl py-2.5 flex flex-col items-center gap-0.5 border-2 transition-all text-sm ${
                      mouseSubTab === s.id
                        ? "border-primary bg-primary/10 shadow"
                        : "border-card-border bg-card/60 hover:border-primary/40"
                    }`}
                  >
                    <span className="text-lg leading-none">{s.emoji}</span>
                    <span className="font-display font-bold text-[10px]">{s.label}</span>
                  </button>
                ))}
              </div>

              {/* Context tip */}
              <p className="text-center text-[11px] text-muted-foreground font-semibold mt-2">
                {mouseSubTab === "mouse-skin" && "Change the fur colour of every mouse in the game."}
                {mouseSubTab === "mouse-eye"  && "Give mice a brand-new look — from sleepy to hypnotic!"}
                {mouseSubTab === "mouse-tail" && "Style the tail — curly, lightning, rainbow and more."}
              </p>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Items grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {items.map((item, i) => {
            const owns = isOwned(owned, item);
            const isEquipped = equipped === item.id;
            const canAfford = (save.coins ?? 0) >= item.price;
            const shake = insufficient === item.id;
            const isSkin = item.category === "mouse-skin";

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

                {/* Item preview */}
                {isSkin && item.color ? (
                  /* Mouse skin: coloured swatch circle with emoji overlay */
                  <div
                    className="w-14 h-14 rounded-xl mb-2 flex items-center justify-center relative overflow-hidden border-2"
                    style={{
                      background: item.color,
                      borderColor: isEquipped ? "var(--primary)" : `${item.color}88`,
                    }}
                  >
                    <span className="text-2xl drop-shadow-sm">🐭</span>
                  </div>
                ) : (
                  <div
                    className="text-3xl w-14 h-14 flex items-center justify-center rounded-xl mb-2"
                    style={{
                      background: item.color && item.color !== "rainbow"
                        ? `${item.color}22`
                        : item.category === "mouse-eye" || item.category === "mouse-tail"
                        ? "rgba(99,102,241,0.1)"
                        : undefined,
                    }}
                  >
                    {item.emoji}
                  </div>
                )}

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
