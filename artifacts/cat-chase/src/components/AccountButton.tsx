import { motion } from "framer-motion";
import { Cloud, Loader2, CheckCircle2, AlertCircle } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { sfx } from "@/game/audio";

interface Props {
  onClick: () => void;
}

export function AccountButton({ onClick }: Props) {
  const { user, isPending, syncStatus } = useAuth();

  const handleClick = () => { sfx.click(); onClick(); };

  if (isPending) return null;

  if (user) {
    const initials = user.name
      ? user.name.split(" ").map((w: string) => w[0]).join("").toUpperCase().slice(0, 2)
      : "?";

    return (
      <motion.button
        whileTap={{ scale: 0.92 }}
        onClick={handleClick}
        className="relative flex items-center gap-1.5 bg-card/80 backdrop-blur border-2 border-card-border rounded-2xl px-3 py-2 shadow-md hover:bg-card transition-colors cursor-pointer"
        title="Account & Cloud Save"
      >
        <div className="w-6 h-6 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center text-[10px] font-display font-bold text-primary leading-none">
          {initials}
        </div>
        {syncStatus === "syncing" && (
          <Loader2 className="h-3 w-3 text-blue-500 animate-spin" />
        )}
        {syncStatus === "synced" && (
          <CheckCircle2 className="h-3 w-3 text-green-500" />
        )}
        {syncStatus === "error" && (
          <AlertCircle className="h-3 w-3 text-red-500" />
        )}
        {(syncStatus === "idle" || syncStatus === "offline") && (
          <Cloud className="h-3 w-3 text-muted-foreground" />
        )}
      </motion.button>
    );
  }

  return (
    <motion.button
      whileTap={{ scale: 0.92 }}
      onClick={handleClick}
      className="flex items-center gap-1.5 bg-card/80 backdrop-blur border-2 border-card-border rounded-2xl px-3 py-2 shadow-md hover:bg-card transition-colors cursor-pointer"
      title="Sign in to save progress to cloud"
    >
      <Cloud className="h-3.5 w-3.5 text-muted-foreground" />
      <span className="font-display font-bold text-xs text-muted-foreground">Save</span>
    </motion.button>
  );
}
