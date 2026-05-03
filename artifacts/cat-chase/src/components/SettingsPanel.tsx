import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Modal } from "./Modal";
import { sfx, setAudioMuted } from "@/game/audio";
import { resetSave, updateSettings } from "@/game/storage";
import type { GameSettings, SaveData, Difficulty, ControlMode } from "@/game/types";
import { CAT_SKINS, getUnlockedSkins, nextLockedSkin } from "@/game/skins";
import { useState } from "react";
import { RotateCcw, X, Lock } from "lucide-react";

type Props = {
  open: boolean;
  onClose: () => void;
  save: SaveData;
  onSave: (s: SaveData) => void;
};

export const SettingsPanel = ({ open, onClose, save, onSave }: Props) => {
  const [confirmReset, setConfirmReset] = useState(false);

  const totalStars = Object.values(save.levels).reduce((s, p) => s + (p?.bestStars ?? 0), 0);
  const unlockedSkins = getUnlockedSkins(totalStars);
  const nextSkin = nextLockedSkin(totalStars);

  const setSound = (sound: boolean) => {
    setAudioMuted(!sound);
    onSave(updateSettings(save, { sound }));
    if (sound) sfx.click();
  };

  const setDifficulty = (difficulty: Difficulty) => {
    sfx.click();
    onSave(updateSettings(save, { difficulty }));
  };

  const setControlMode = (controlMode: ControlMode) => {
    sfx.click();
    onSave(updateSettings(save, { controlMode }));
  };

  const setSkin = (skinId: string) => {
    sfx.click();
    onSave(updateSettings(save, { catSkin: skinId }));
  };

  const handleReset = () => {
    resetSave();
    sfx.click();
    setConfirmReset(false);
    if (typeof window !== "undefined") window.location.reload();
  };

  const equippedSkin = save.settings.catSkin ?? "orange";

  return (
    <Modal open={open} onClose={onClose}>
      <div className="p-6 max-h-[85vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-5">
          <h2 className="font-display text-2xl font-bold">Settings</h2>
          <Button size="icon" variant="ghost" onClick={onClose} data-testid="button-close-settings">
            <X className="h-5 w-5" />
          </Button>
        </div>

        <div className="space-y-5">
          {/* Sound */}
          <div className="flex items-center justify-between">
            <div>
              <div className="font-bold">Sound</div>
              <div className="text-sm text-muted-foreground">Music & effects</div>
            </div>
            <Switch checked={save.settings.sound} onCheckedChange={setSound} data-testid="switch-sound" />
          </div>

          {/* Difficulty */}
          <div>
            <div className="font-bold mb-2">Difficulty</div>
            <div className="grid grid-cols-3 gap-2">
              {(["easy", "normal", "hard"] as Difficulty[]).map((d) => {
                const active = save.settings.difficulty === d;
                const labels: Record<Difficulty, string> = { easy: "Easy 😺", normal: "Normal 😼", hard: "Hard 😾" };
                return (
                  <Button
                    key={d}
                    variant={active ? "default" : "secondary"}
                    onClick={() => setDifficulty(d)}
                    className="font-display font-bold text-sm"
                    data-testid={`button-difficulty-${d}`}
                  >
                    {labels[d]}
                  </Button>
                );
              })}
            </div>
          </div>

          {/* Control Mode — mobile only */}
          <div className="md:hidden">
            <div className="font-bold mb-1">Control Mode</div>
            <div className="text-xs text-muted-foreground mb-2 font-bold">How you move on mobile</div>
            <div className="grid grid-cols-2 gap-2">
              {(["tap", "joystick"] as ControlMode[]).map((m) => {
                const active = (save.settings.controlMode ?? "tap") === m;
                const labels: Record<ControlMode, string> = {
                  tap: "✋ Hold & Drag",
                  joystick: "🕹️ Follow Finger",
                };
                const descs: Record<ControlMode, string> = {
                  tap: "Hold anywhere to move cat",
                  joystick: "Drag joystick to steer",
                };
                return (
                  <button
                    key={m}
                    onClick={() => setControlMode(m)}
                    className={`rounded-xl border-2 px-3 py-2.5 text-left transition-all ${
                      active
                        ? "border-primary bg-primary/10 shadow-sm"
                        : "border-card-border bg-muted hover:border-primary/50"
                    }`}
                  >
                    <div className="font-display font-bold text-sm">{labels[m]}</div>
                    <div className="text-[11px] text-muted-foreground mt-0.5">{descs[m]}</div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Cat Skins */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <div className="font-bold">Cat Skin</div>
              <div className="text-xs text-muted-foreground font-bold">{totalStars} ⭐ earned</div>
            </div>
            <div className="grid grid-cols-3 gap-2">
              {CAT_SKINS.map((skin) => {
                const isUnlocked = unlockedSkins.some((s) => s.id === skin.id);
                const isEquipped = equippedSkin === skin.id;
                return (
                  <button
                    key={skin.id}
                    disabled={!isUnlocked}
                    onClick={() => isUnlocked && setSkin(skin.id)}
                    className={`relative rounded-xl p-2.5 border-2 text-center transition-all ${
                      isEquipped
                        ? "border-primary bg-primary/10 shadow-md"
                        : isUnlocked
                        ? "border-card-border bg-muted hover:border-primary/60 active:scale-95"
                        : "border-card-border opacity-45 cursor-not-allowed"
                    }`}
                    data-testid={`button-skin-${skin.id}`}
                  >
                    {isEquipped && (
                      <div className="absolute -top-1.5 -right-1.5 bg-primary text-primary-foreground text-[10px] font-bold rounded-full w-5 h-5 flex items-center justify-center shadow">
                        ✓
                      </div>
                    )}
                    {!isUnlocked && (
                      <div className="absolute -top-1.5 -right-1.5 bg-muted-foreground/70 text-white rounded-full w-5 h-5 flex items-center justify-center shadow">
                        <Lock className="h-2.5 w-2.5" />
                      </div>
                    )}
                    <div className="text-2xl leading-none mb-1">{skin.emoji}</div>
                    <div className="text-xs font-display font-bold truncate">{skin.name}</div>
                    {!isUnlocked && (
                      <div className="text-[10px] text-muted-foreground font-bold">{skin.unlockStars}⭐</div>
                    )}
                  </button>
                );
              })}
            </div>
            {nextSkin && (
              <p className="text-xs text-muted-foreground text-center mt-2 font-bold">
                Earn {nextSkin.unlockStars - totalStars} more ⭐ to unlock <span className="text-foreground">{nextSkin.name}</span> {nextSkin.emoji}
              </p>
            )}
          </div>

          {/* Reset */}
          <div className="pt-2 border-t border-border">
            {!confirmReset ? (
              <Button
                variant="destructive"
                className="w-full font-display font-bold"
                onClick={() => setConfirmReset(true)}
                data-testid="button-reset"
              >
                <RotateCcw className="mr-2 h-4 w-4" /> Reset Progress
              </Button>
            ) : (
              <div className="space-y-2">
                <p className="text-sm text-center text-muted-foreground">All progress will be lost!</p>
                <div className="grid grid-cols-2 gap-2">
                  <Button variant="secondary" onClick={() => setConfirmReset(false)}>Cancel</Button>
                  <Button variant="destructive" onClick={handleReset}>Yes, reset</Button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </Modal>
  );
};
