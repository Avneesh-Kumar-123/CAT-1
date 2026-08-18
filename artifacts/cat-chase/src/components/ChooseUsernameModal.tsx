import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, CheckCircle2, XCircle, Loader2, AlertCircle, AtSign } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useProfile } from "@/contexts/ProfileContext";
import { checkUsername, setUsername } from "@/lib/profile-api";
import { sfx } from "@/game/audio";

interface Props {
  /** "setup" = first-time prompt; "change" = changing existing username */
  mode?: "setup" | "change";
  onClose: () => void;
}

type AvailStatus = "idle" | "checking" | "available" | "taken" | "invalid";

const USERNAME_REGEX = /^[a-zA-Z0-9_]{3,20}$/;

export function ChooseUsernameModal({ mode = "setup", onClose }: Props) {
  const { refreshProfile } = useProfile();

  const [value, setValue] = useState("");
  const [status, setStatus] = useState<AvailStatus>("idle");
  const [statusMsg, setStatusMsg] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setTimeout(() => inputRef.current?.focus(), 120);
  }, []);

  // Debounced availability check
  const handleChange = (v: string) => {
    setValue(v);
    setError(null);
    clearTimeout(debounceRef.current);

    if (!v) {
      setStatus("idle");
      setStatusMsg("");
      return;
    }

    if (!USERNAME_REGEX.test(v)) {
      setStatus("invalid");
      setStatusMsg("3–20 chars, letters / numbers / underscores only");
      return;
    }

    setStatus("checking");
    setStatusMsg("");
    debounceRef.current = setTimeout(async () => {
      try {
        const res = await checkUsername(v);
        if (res.available) {
          setStatus("available");
          setStatusMsg("Username is available!");
        } else {
          setStatus("taken");
          setStatusMsg(res.reason ?? "Already taken");
        }
      } catch {
        setStatus("idle");
      }
    }, 450);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading || status === "taken" || status === "invalid" || !value) return;

    setError(null);
    setLoading(true);
    sfx.click();

    try {
      await setUsername(value);
      sfx.achievement();
      await refreshProfile();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to set username");
    } finally {
      setLoading(false);
    }
  };

  const canSubmit =
    !loading && value.length >= 3 && (status === "available" || status === "idle");

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
      >
        <motion.div
          className="bg-card border-2 border-card-border rounded-3xl p-6 w-full max-w-sm shadow-2xl"
          initial={{ scale: 0.9, y: 20, opacity: 0 }}
          animate={{ scale: 1, y: 0, opacity: 1 }}
          exit={{ scale: 0.9, y: 20, opacity: 0 }}
          transition={{ type: "spring", stiffness: 300, damping: 26 }}
        >
          {/* Header */}
          <div className="flex items-center justify-between mb-5">
            <div>
              <div className="font-display font-bold text-lg">
                {mode === "setup" ? "🎮 Choose Your Username" : "✏️ Change Username"}
              </div>
              {mode === "setup" && (
                <div className="text-xs text-muted-foreground mt-0.5 font-semibold">
                  This is your public identity on the leaderboard
                </div>
              )}
            </div>
            {mode === "change" && (
              <button
                onClick={onClose}
                className="w-8 h-8 rounded-full bg-muted flex items-center justify-center hover:bg-muted/80 transition-colors"
                aria-label="Close"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            {/* Input */}
            <div className="relative">
              <AtSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
              <input
                ref={inputRef}
                type="text"
                value={value}
                onChange={(e) => handleChange(e.target.value)}
                placeholder="e.g. CatHunter_99"
                maxLength={20}
                className={`w-full pl-10 pr-10 py-3 rounded-xl border-2 bg-background text-sm font-semibold focus:outline-none transition-colors ${
                  status === "available"
                    ? "border-green-400 focus:border-green-400"
                    : status === "taken" || status === "invalid"
                    ? "border-red-400 focus:border-red-400"
                    : "border-input focus:border-primary"
                }`}
              />
              {/* Status icon */}
              <div className="absolute right-3 top-1/2 -translate-y-1/2">
                {status === "checking" && (
                  <Loader2 className="h-4 w-4 text-muted-foreground animate-spin" />
                )}
                {status === "available" && (
                  <CheckCircle2 className="h-4 w-4 text-green-500" />
                )}
                {(status === "taken" || status === "invalid") && (
                  <XCircle className="h-4 w-4 text-red-500" />
                )}
              </div>
            </div>

            {/* Status message */}
            <AnimatePresence mode="wait">
              {statusMsg && (
                <motion.div
                  key={statusMsg}
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -4 }}
                  className={`text-xs font-bold px-1 -mt-1 ${
                    status === "available" ? "text-green-600" : "text-red-500"
                  }`}
                >
                  {statusMsg}
                </motion.div>
              )}
            </AnimatePresence>

            {/* Error from server */}
            {error && (
              <div className="flex items-center gap-2 text-xs font-bold text-destructive bg-destructive/10 rounded-xl px-3 py-2">
                <AlertCircle className="h-3.5 w-3.5 flex-shrink-0" /> {error}
              </div>
            )}

            {/* Rules hint */}
            <div className="text-[11px] text-muted-foreground font-semibold bg-muted/50 rounded-xl px-3 py-2 leading-relaxed">
              3–20 characters · Letters, numbers, underscores only
              {mode === "change" && " · 30-day cooldown applies after change"}
            </div>

            {/* Submit */}
            <Button
              type="submit"
              className="w-full font-display font-bold h-12 game-button"
              disabled={!canSubmit}
            >
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : mode === "setup" ? (
                "Set Username"
              ) : (
                "Save Username"
              )}
            </Button>

            {/* Skip (first-time only) */}
            {mode === "setup" && (
              <button
                type="button"
                onClick={onClose}
                className="text-xs text-muted-foreground font-semibold hover:text-foreground transition-colors text-center"
              >
                Skip for now
              </button>
            )}
          </form>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
