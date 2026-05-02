import { useState } from "react";
import { Share2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { sfx } from "@/game/audio";

const SHARE_URL = "https://cat-chase-ueco.onrender.com";

const buildMessage = (score: number) =>
  `I scored ${score.toLocaleString()} in Cat Chase 🐱🔥 Can you beat me? 👉 ${SHARE_URL}`;

type Props = {
  score: number;
  className?: string;
  variant?: "secondary" | "default" | "ghost";
};

export const ShareButton = ({ score, className, variant = "secondary" }: Props) => {
  const [toast, setToast] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToast(msg);
    window.setTimeout(() => setToast(null), 2200);
  };

  const handleShare = async () => {
    sfx.click();
    const text = buildMessage(score);

    const canShare =
      typeof navigator !== "undefined" &&
      typeof navigator.share === "function";

    if (canShare) {
      try {
        await navigator.share({
          title: "Cat Chase: Mouse Hunt",
          text,
          url: SHARE_URL,
        });
        return;
      } catch (err) {
        const aborted =
          err instanceof DOMException && err.name === "AbortError";
        if (aborted) return;
      }
    }

    try {
      if (navigator?.clipboard?.writeText) {
        await navigator.clipboard.writeText(text);
      } else {
        const ta = document.createElement("textarea");
        ta.value = text;
        ta.style.position = "fixed";
        ta.style.opacity = "0";
        document.body.appendChild(ta);
        ta.select();
        document.execCommand("copy");
        document.body.removeChild(ta);
      }
      showToast("Link copied! Share it 🚀");
    } catch {
      showToast("Couldn't copy — long-press to share");
    }
  };

  return (
    <>
      <Button
        type="button"
        variant={variant}
        className={"font-display font-bold " + (className ?? "")}
        onClick={handleShare}
        data-testid="button-share-score"
        aria-label="Share your score"
      >
        <Share2 className="mr-2 h-4 w-4" />
        <span>Share Score 📤</span>
      </Button>

      {toast && (
        <div
          role="status"
          aria-live="polite"
          className="fixed left-1/2 -translate-x-1/2 bottom-6 z-[100] bg-foreground text-background px-4 py-2 rounded-full shadow-lg font-display font-bold text-sm animate-in fade-in slide-in-from-bottom-4"
          data-testid="toast-share"
        >
          {toast}
        </div>
      )}
    </>
  );
};
