import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Mail, Lock, User, Cloud, CloudOff, LogOut, Loader2, CheckCircle2, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { authClient } from "@/lib/auth-client";
import { useAuth } from "@/contexts/AuthContext";
import { sfx } from "@/game/audio";

type Tab = "signin" | "signup";

interface Props {
  open: boolean;
  onClose: () => void;
}

function SyncBadge() {
  const { syncStatus } = useAuth();
  if (syncStatus === "idle" || syncStatus === "offline") return null;
  return (
    <div className={`flex items-center gap-1.5 text-xs font-bold px-3 py-1 rounded-full ${
      syncStatus === "synced"  ? "bg-green-100 text-green-700" :
      syncStatus === "syncing" ? "bg-blue-100 text-blue-700"   :
                                 "bg-red-100 text-red-700"
    }`}>
      {syncStatus === "synced"  && <CheckCircle2 className="h-3.5 w-3.5" />}
      {syncStatus === "syncing" && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
      {syncStatus === "error"   && <AlertCircle className="h-3.5 w-3.5" />}
      {syncStatus === "synced"  ? "Synced"   :
       syncStatus === "syncing" ? "Syncing…" : "Sync error"}
    </div>
  );
}

function LoggedInView({ onClose }: { onClose: () => void }) {
  const { user, signOut, forceSync, syncStatus } = useAuth();
  const [signingOut, setSigningOut] = useState(false);

  const handleSignOut = async () => {
    sfx.click();
    setSigningOut(true);
    await signOut();
    setSigningOut(false);
    onClose();
  };

  const initials = user?.name
    ? user.name.split(" ").map((w) => w[0]).join("").toUpperCase().slice(0, 2)
    : "?";

  return (
    <div className="flex flex-col gap-5">
      {/* Avatar + name */}
      <div className="flex items-center gap-4">
        <div className="w-14 h-14 rounded-2xl bg-primary/10 border-2 border-primary/20 flex items-center justify-center text-xl font-display font-bold text-primary">
          {initials}
        </div>
        <div className="flex-1 min-w-0">
          <div className="font-display font-bold text-base truncate">{user?.name ?? "Player"}</div>
          <div className="text-xs text-muted-foreground truncate">{user?.email}</div>
          <div className="mt-1"><SyncBadge /></div>
        </div>
      </div>

      {/* Cloud sync status card */}
      <div className="bg-green-50 border-2 border-green-200 rounded-2xl p-4 flex items-center gap-3">
        <Cloud className="h-5 w-5 text-green-600 flex-shrink-0" />
        <div>
          <div className="font-display font-bold text-sm text-green-800">Cloud Save Active</div>
          <div className="text-xs text-green-700 mt-0.5">
            Your progress, coins, and skins are backed up automatically.
          </div>
        </div>
      </div>

      {/* Force sync */}
      <Button
        variant="outline"
        className="w-full gap-2"
        onClick={() => { sfx.click(); forceSync(); }}
        disabled={syncStatus === "syncing"}
      >
        {syncStatus === "syncing"
          ? <Loader2 className="h-4 w-4 animate-spin" />
          : <Cloud className="h-4 w-4" />}
        {syncStatus === "syncing" ? "Syncing…" : "Sync Now"}
      </Button>

      {/* Sign out */}
      <Button
        variant="ghost"
        className="w-full gap-2 text-muted-foreground"
        onClick={handleSignOut}
        disabled={signingOut}
      >
        {signingOut ? <Loader2 className="h-4 w-4 animate-spin" /> : <LogOut className="h-4 w-4" />}
        Sign Out
      </Button>
    </div>
  );
}

function AuthForm({ onClose }: { onClose: () => void }) {
  const [tab, setTab] = useState<Tab>("signin");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const hasGoogle = Boolean(
    // Vite replaces this at build time; undefined = no Google in dev
    import.meta.env.VITE_GOOGLE_AUTH_ENABLED,
  );

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;
    setError(null);
    setLoading(true);
    sfx.click();

    try {
      if (tab === "signin") {
        const res = await authClient.signIn.email({ email, password });
        if (res.error) throw new Error(res.error.message ?? "Sign-in failed");
      } else {
        if (!name.trim()) { setError("Name is required"); setLoading(false); return; }
        const res = await authClient.signUp.email({ name, email, password });
        if (res.error) throw new Error(res.error.message ?? "Sign-up failed");
      }
      sfx.achievement();
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  const handleGoogle = async () => {
    sfx.click();
    await authClient.signIn.social({ provider: "google" });
  };

  return (
    <div className="flex flex-col gap-4">
      {/* Why sign in — short pitch */}
      <div className="bg-violet-50 border-2 border-violet-200 rounded-2xl p-3 flex items-start gap-3">
        <Cloud className="h-5 w-5 text-violet-600 flex-shrink-0 mt-0.5" />
        <div className="text-xs text-violet-800 font-semibold leading-snug">
          Sign in to back up your progress, coins, and skins — and pick up where you left off on any device.
        </div>
      </div>

      {/* Tabs */}
      <div className="flex rounded-xl bg-muted p-1 gap-1">
        {(["signin", "signup"] as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => { sfx.click(); setTab(t); setError(null); }}
            className={`flex-1 py-2 rounded-lg text-xs font-display font-bold transition-colors ${
              tab === t ? "bg-card shadow text-foreground" : "text-muted-foreground"
            }`}
          >
            {t === "signin" ? "Sign In" : "Create Account"}
          </button>
        ))}
      </div>

      {/* Google */}
      {hasGoogle && (
        <Button
          variant="outline"
          className="w-full gap-2 font-display font-bold"
          onClick={handleGoogle}
          type="button"
        >
          <svg className="h-4 w-4" viewBox="0 0 24 24">
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
          </svg>
          Continue with Google
        </Button>
      )}

      {hasGoogle && (
        <div className="flex items-center gap-2">
          <div className="flex-1 h-px bg-border" />
          <span className="text-xs text-muted-foreground font-bold">or</span>
          <div className="flex-1 h-px bg-border" />
        </div>
      )}

      {/* Email form */}
      <form onSubmit={handleEmailAuth} className="flex flex-col gap-3">
        {tab === "signup" && (
          <div className="relative">
            <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 rounded-xl border-2 border-input bg-background text-sm font-semibold focus:outline-none focus:border-primary transition-colors"
              required
            />
          </div>
        )}
        <div className="relative">
          <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-xl border-2 border-input bg-background text-sm font-semibold focus:outline-none focus:border-primary transition-colors"
            required
          />
        </div>
        <div className="relative">
          <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-xl border-2 border-input bg-background text-sm font-semibold focus:outline-none focus:border-primary transition-colors"
            required
            minLength={8}
          />
        </div>

        {error && (
          <div className="flex items-center gap-2 text-xs font-bold text-destructive bg-destructive/10 rounded-xl px-3 py-2">
            <AlertCircle className="h-3.5 w-3.5 flex-shrink-0" />
            {error}
          </div>
        )}

        <Button
          type="submit"
          className="w-full font-display font-bold game-button"
          disabled={loading}
        >
          {loading
            ? <Loader2 className="h-4 w-4 animate-spin" />
            : tab === "signin" ? "Sign In" : "Create Account"}
        </Button>
      </form>

      <div className="flex items-center gap-1 justify-center">
        <CloudOff className="h-3 w-3 text-muted-foreground" />
        <span className="text-[11px] text-muted-foreground font-semibold">
          You can always play as a guest without signing in.
        </span>
      </div>
    </div>
  );
}

export function AccountModal({ open, onClose }: Props) {
  const { user } = useAuth();

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />
          <motion.div
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            initial={{ opacity: 0, scale: 0.92, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.92, y: 20 }}
            transition={{ type: "spring", stiffness: 300, damping: 28 }}
          >
            <div className="bg-card border-2 border-card-border rounded-3xl p-6 w-full max-w-sm shadow-2xl">
              {/* Header */}
              <div className="flex items-center justify-between mb-5">
                <div className="flex items-center gap-2">
                  <span className="text-xl">☁️</span>
                  <div className="font-display font-bold text-base">
                    {user ? "Your Account" : "Save to Cloud"}
                  </div>
                </div>
                <button
                  onClick={onClose}
                  className="w-8 h-8 rounded-full bg-muted flex items-center justify-center hover:bg-muted/80 transition-colors"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              {user ? <LoggedInView onClose={onClose} /> : <AuthForm onClose={onClose} />}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
