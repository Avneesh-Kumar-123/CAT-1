import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X, Mail, Lock, User, Cloud, CloudOff, LogOut,
  Loader2, CheckCircle2, AlertCircle, Eye, EyeOff, ArrowLeft,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { authClient } from "@/lib/auth-client";
import { useAuth } from "@/contexts/AuthContext";
import { sfx } from "@/game/audio";
import { useLocation } from "wouter";

// ─── Types ───────────────────────────────────────────────────────────────────

type View = "signin" | "signup" | "forgot" | "forgot-sent";

// ─── Helpers ─────────────────────────────────────────────────────────────────

function friendlyError(msg: string | undefined | null): string {
  if (!msg) return "Something went wrong. Please try again.";
  const m = msg.toLowerCase();
  if (m.includes("invalid email or password") || m.includes("user not found"))
    return "Incorrect email or password.";
  if (m.includes("already exists") || m.includes("email already"))
    return "An account with this email already exists.";
  if (m.includes("invalid token") || m.includes("expired"))
    return "This link is invalid or has expired.";
  if (m.includes("too many") || m.includes("rate limit"))
    return "Too many attempts. Please wait a few minutes.";
  return msg;
}

function getPasswordStrength(pw: string): { score: number; label: string; color: string } {
  if (!pw) return { score: 0, label: "", color: "" };
  let score = 0;
  if (pw.length >= 8) score++;
  if (/[A-Z]/.test(pw) && /[a-z]/.test(pw)) score++;
  if (/\d/.test(pw)) score++;
  if (/[^A-Za-z0-9]/.test(pw)) score++;
  const labels = ["Too weak", "Weak", "Good", "Strong"];
  const colors = ["bg-red-400", "bg-orange-400", "bg-yellow-400", "bg-green-500"];
  const i = Math.max(0, Math.min(score - 1, 3));
  return { score, label: labels[i], color: colors[i] };
}

// ─── Small shared components ──────────────────────────────────────────────────

function GoogleIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" aria-hidden>
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
    </svg>
  );
}

function SyncBadge() {
  const { syncStatus } = useAuth();
  if (syncStatus === "idle" || syncStatus === "offline") return null;
  return (
    <div className={`flex items-center gap-1.5 text-xs font-bold px-2.5 py-0.5 rounded-full ${
      syncStatus === "synced"  ? "bg-green-100 text-green-700" :
      syncStatus === "syncing" ? "bg-blue-100  text-blue-700"  :
                                 "bg-red-100   text-red-700"
    }`}>
      {syncStatus === "synced"  && <CheckCircle2 className="h-3 w-3" />}
      {syncStatus === "syncing" && <Loader2      className="h-3 w-3 animate-spin" />}
      {syncStatus === "error"   && <AlertCircle  className="h-3 w-3" />}
      {syncStatus === "synced" ? "Synced" : syncStatus === "syncing" ? "Syncing…" : "Sync error"}
    </div>
  );
}

/** Password input with show/hide toggle */
function PasswordInput({
  value, onChange, placeholder = "Password", required, minLength,
}: {
  value: string; onChange: (v: string) => void;
  placeholder?: string; required?: boolean; minLength?: number;
}) {
  const [show, setShow] = useState(false);
  return (
    <div className="relative">
      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
      <input
        type={show ? "text" : "password"}
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full pl-10 pr-10 py-2.5 rounded-xl border-2 border-input bg-background text-sm font-semibold focus:outline-none focus:border-primary transition-colors"
        required={required}
        minLength={minLength}
        autoComplete={placeholder.toLowerCase().includes("confirm") ? "new-password" : undefined}
      />
      <button
        type="button"
        onClick={() => setShow((s) => !s)}
        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
        tabIndex={-1}
        aria-label={show ? "Hide password" : "Show password"}
      >
        {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
      </button>
    </div>
  );
}

// ─── Logged-in view ───────────────────────────────────────────────────────────

function LoggedInView({ onClose }: { onClose: () => void }) {
  const { user, signOut, forceSync, syncStatus } = useAuth();
  const [, setLocation] = useLocation();
  const [signingOut, setSigningOut] = useState(false);
  const [syncDone, setSyncDone] = useState(false);

  const handleSignOut = async () => {
    sfx.click();
    setSigningOut(true);
    await signOut();
    setSigningOut(false);
    onClose();
  };

  const handleForceSync = async () => {
    sfx.click();
    await forceSync();
    setSyncDone(true);
    setTimeout(() => setSyncDone(false), 2500);
  };

  const initials = user?.name
    ? user.name.split(" ").map((w: string) => w[0]).join("").toUpperCase().slice(0, 2)
    : "?";

  return (
    <div className="flex flex-col gap-4">
      {/* Avatar + identity */}
      <div className="flex items-center gap-4">
        <div className="w-14 h-14 rounded-2xl bg-primary/10 border-2 border-primary/20 flex items-center justify-center text-xl font-display font-bold text-primary select-none overflow-hidden flex-shrink-0">
          {user?.image
            ? <img src={user.image} alt={user.name ?? "avatar"} className="w-full h-full object-cover" />
            : initials}
        </div>
        <div className="flex-1 min-w-0">
          <div className="font-display font-bold text-base truncate">{user?.name ?? "Player"}</div>
          <div className="text-xs text-muted-foreground truncate">{user?.email}</div>
          <div className="mt-1.5"><SyncBadge /></div>
        </div>
      </div>

      {/* Cloud save card */}
      <div className="bg-green-50 border-2 border-green-200 rounded-2xl p-4 flex items-center gap-3">
        <Cloud className="h-5 w-5 text-green-600 flex-shrink-0" />
        <div>
          <div className="font-display font-bold text-sm text-green-800">Cloud Save Active</div>
          <div className="text-xs text-green-700 mt-0.5">
            Your progress, coins, and skins are backed up automatically.
          </div>
        </div>
      </div>

      {/* Sync Now */}
      <Button
        variant="outline"
        className="w-full gap-2"
        onClick={handleForceSync}
        disabled={syncStatus === "syncing"}
      >
        {syncStatus === "syncing" ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : syncDone ? (
          <CheckCircle2 className="h-4 w-4 text-green-500" />
        ) : (
          <Cloud className="h-4 w-4" />
        )}
        {syncStatus === "syncing" ? "Syncing…" : syncDone ? "Synced!" : "Sync Now"}
      </Button>

      {/* Profile / username / avatar management */}
      <Button
        variant="outline"
        className="w-full gap-2"
        onClick={() => {
          sfx.click();
          onClose();
          setLocation("/profile");
        }}
      >
        <User className="h-4 w-4" />
        Manage Player Profile
      </Button>

      {/* Sign out */}
      <Button
        variant="ghost"
        className="w-full gap-2 text-muted-foreground hover:text-destructive"
        onClick={handleSignOut}
        disabled={signingOut}
      >
        {signingOut ? <Loader2 className="h-4 w-4 animate-spin" /> : <LogOut className="h-4 w-4" />}
        Sign Out
      </Button>
    </div>
  );
}

// ─── Auth form (sign-in / sign-up / forgot) ───────────────────────────────────

function AuthForm({ onClose }: { onClose: () => void }) {
  const [view, setView]                   = useState<View>("signin");
  const [name, setName]                   = useState("");
  const [email, setEmail]                 = useState("");
  const [password, setPassword]           = useState("");
  const [confirmPw, setConfirmPw]         = useState("");
  const [loading, setLoading]             = useState(false);
  const [error, setError]                 = useState<string | null>(null);

  const strength  = getPasswordStrength(password);

  const switchView = (v: View) => {
    sfx.click();
    setError(null);
    setPassword("");
    setConfirmPw("");
    setView(v);
  };

  // ── Sign-in / Sign-up ──
  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;

    if (view === "signup") {
      if (!name.trim())         { setError("Display name is required.");       return; }
      if (strength.score < 2)   { setError("Please choose a stronger password."); return; }
      if (password !== confirmPw){ setError("Passwords don't match.");         return; }
    }

    setError(null);
    setLoading(true);
    sfx.click();

    try {
      if (view === "signin") {
        const res = await authClient.signIn.email({ email, password });
        if (res.error) throw new Error(res.error.message ?? "Sign-in failed");
      } else {
        const res = await authClient.signUp.email({ name: name.trim(), email, password });
        if (res.error) throw new Error(res.error.message ?? "Sign-up failed");
      }
      sfx.achievement();
      onClose();
    } catch (err: unknown) {
      setError(friendlyError(err instanceof Error ? err.message : null));
    } finally {
      setLoading(false);
    }
  };

  // ── Forgot password ──
  const handleForgot = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;
    setError(null);
    setLoading(true);
    sfx.click();

    try {
      const redirectTo = `${window.location.origin}/#/reset-password`;
      const apiBase = import.meta.env.VITE_API_BASE_URL ?? "";
      const res = await fetch(`${apiBase}/api/auth/request-password-reset`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, redirectTo }),
      });
      // Better Auth returns 200 regardless of whether the email exists (prevents enumeration)
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error((body as any)?.message ?? "Request failed");
      }
      setView("forgot-sent");
    } catch (err: unknown) {
      setError(friendlyError(err instanceof Error ? err.message : null));
    } finally {
      setLoading(false);
    }
  };

  // ── Google ──
  const handleGoogle = async () => {
    if (loading) return;
    sfx.click();
    setError(null);
    setLoading(true);
    try {
      const callbackURL = `${window.location.origin}/`;
      const res = await authClient.signIn.social({ provider: "google", callbackURL });
      if (res.error) throw new Error(res.error.message ?? "Google sign-in failed");
      // Better Auth normally redirects immediately. Keep the loading state until
      // navigation so a slow provider cannot receive duplicate requests.
    } catch (err: unknown) {
      setError(friendlyError(err instanceof Error ? err.message : null));
      setLoading(false);
    }
  };

  // ─── Forgot-sent success screen ───
  if (view === "forgot-sent") {
    return (
      <motion.div
        key="forgot-sent"
        initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
        className="flex flex-col items-center gap-4 text-center py-2"
      >
        <div className="w-14 h-14 rounded-2xl bg-green-100 border-2 border-green-200 flex items-center justify-center">
          <CheckCircle2 className="h-7 w-7 text-green-600" />
        </div>
        <div>
          <div className="font-display font-bold text-base">Check your email</div>
          <div className="text-xs text-muted-foreground mt-1.5 max-w-[220px] mx-auto leading-relaxed">
            If an account exists for <strong className="text-foreground">{email}</strong>,
            a reset link is on its way.
          </div>
        </div>
        <Button variant="ghost" size="sm" onClick={() => switchView("signin")} className="gap-1.5 text-xs mt-1">
          <ArrowLeft className="h-3.5 w-3.5" /> Back to sign in
        </Button>
      </motion.div>
    );
  }

  // ─── Forgot-password form ───
  if (view === "forgot") {
    return (
      <motion.div key="forgot" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
        className="flex flex-col gap-4"
      >
        <button
          onClick={() => switchView("signin")}
          className="flex items-center gap-1.5 text-xs font-bold text-muted-foreground hover:text-foreground transition-colors w-fit"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> Back to sign in
        </button>

        <div>
          <div className="font-display font-bold text-sm">Reset your password</div>
          <div className="text-xs text-muted-foreground mt-0.5">
            Enter your email and we'll send a reset link.
          </div>
        </div>

        <form onSubmit={handleForgot} className="flex flex-col gap-3">
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
            <input
              type="email"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 rounded-xl border-2 border-input bg-background text-sm font-semibold focus:outline-none focus:border-primary transition-colors"
              required
              autoFocus
            />
          </div>

          {error && (
            <div className="flex items-center gap-2 text-xs font-bold text-destructive bg-destructive/10 rounded-xl px-3 py-2">
              <AlertCircle className="h-3.5 w-3.5 flex-shrink-0" /> {error}
            </div>
          )}

          <Button type="submit" className="w-full font-display font-bold game-button h-11" disabled={loading}>
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Send Reset Link"}
          </Button>
        </form>
      </motion.div>
    );
  }

  // ─── Sign-in / Sign-up ───
  return (
    <motion.div key={view} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
      className="flex flex-col gap-4"
    >
      {/* Cloud pitch */}
      <div className="bg-violet-50 border-2 border-violet-200 rounded-2xl p-3 flex items-start gap-3">
        <Cloud className="h-5 w-5 text-violet-600 flex-shrink-0 mt-0.5" />
        <div className="text-xs text-violet-800 font-semibold leading-snug">
          Sign in to back up your progress, coins, and skins — and pick up where you left off on any device.
        </div>
      </div>

      {/* Google button */}
      <>
        <Button
          variant="outline"
          className="w-full gap-2.5 font-display font-bold h-11 border-2"
          onClick={handleGoogle}
          type="button"
          disabled={loading}
        >
          <GoogleIcon className="h-4 w-4" />
          Continue with Google
        </Button>

        <div className="flex items-center gap-2">
          <div className="flex-1 h-px bg-border" />
          <span className="text-xs text-muted-foreground font-bold">or</span>
          <div className="flex-1 h-px bg-border" />
        </div>
      </>

      {/* Email form */}
      <form onSubmit={handleEmailAuth} className="flex flex-col gap-3">
        {view === "signup" && (
          <div className="relative">
            <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
            <input
              type="text"
              placeholder="Display name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 rounded-xl border-2 border-input bg-background text-sm font-semibold focus:outline-none focus:border-primary transition-colors"
              required
            />
          </div>
        )}

        <div className="relative">
          <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-xl border-2 border-input bg-background text-sm font-semibold focus:outline-none focus:border-primary transition-colors"
            required
          />
        </div>

        {/* Password + strength */}
        <div className="flex flex-col gap-1.5">
          <PasswordInput value={password} onChange={setPassword} required minLength={8} />
          {view === "signup" && password && (
            <div className="flex items-center gap-2 px-0.5">
              <div className="flex gap-0.5 flex-1">
                {[1, 2, 3, 4].map((i) => (
                  <div
                    key={i}
                    className={`h-1 flex-1 rounded-full transition-all duration-300 ${
                      strength.score >= i ? strength.color : "bg-muted"
                    }`}
                  />
                ))}
              </div>
              <span className="text-[10px] font-bold text-muted-foreground w-16 text-right leading-none">
                {strength.label}
              </span>
            </div>
          )}
        </div>

        {/* Confirm password (signup only) */}
        {view === "signup" && (
          <PasswordInput
            value={confirmPw}
            onChange={setConfirmPw}
            placeholder="Confirm password"
            required
            minLength={8}
          />
        )}

        {/* Forgot password link (sign-in only) */}
        {view === "signin" && (
          <div className="flex justify-end -mt-1">
            <button
              type="button"
              onClick={() => switchView("forgot")}
              className="text-[11px] font-bold text-muted-foreground hover:text-primary transition-colors"
            >
              Forgot password?
            </button>
          </div>
        )}

        {error && (
          <div className="flex items-center gap-2 text-xs font-bold text-destructive bg-destructive/10 rounded-xl px-3 py-2">
            <AlertCircle className="h-3.5 w-3.5 flex-shrink-0" /> {error}
          </div>
        )}

        <Button
          type="submit"
          className="w-full font-display font-bold game-button h-11"
          disabled={loading}
        >
          {loading
            ? <Loader2 className="h-4 w-4 animate-spin" />
            : view === "signin" ? "Sign In" : "Create Account"}
        </Button>
      </form>

      {/* Toggle sign-in ↔ sign-up */}
      <div className="text-center text-xs text-muted-foreground">
        {view === "signin" ? (
          <>Don't have an account?{" "}
            <button
              type="button"
              onClick={() => switchView("signup")}
              className="font-bold text-primary hover:underline"
            >
              Create one
            </button>
          </>
        ) : (
          <>Already have an account?{" "}
            <button
              type="button"
              onClick={() => switchView("signin")}
              className="font-bold text-primary hover:underline"
            >
              Sign in
            </button>
          </>
        )}
      </div>

      {/* Guest note */}
      <div className="flex items-center gap-1 justify-center">
        <CloudOff className="h-3 w-3 text-muted-foreground" />
        <span className="text-[11px] text-muted-foreground font-semibold">
          You can always play as a guest without signing in.
        </span>
      </div>
    </motion.div>
  );
}

// ─── Modal wrapper ────────────────────────────────────────────────────────────

interface Props { open: boolean; onClose: () => void; }

export function AccountModal({ open, onClose }: Props) {
  const { user } = useAuth();

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={onClose}
          />
          <motion.div
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            initial={{ opacity: 0, scale: 0.92, y: 20 }}
            animate={{ opacity: 1, scale: 1,   y: 0  }}
            exit={{   opacity: 0, scale: 0.92, y: 20 }}
            transition={{ type: "spring", stiffness: 300, damping: 28 }}
          >
            <div className="bg-card border-2 border-card-border rounded-3xl p-6 w-full max-w-sm shadow-2xl max-h-[92dvh] overflow-y-auto">
              {/* Header */}
              <div className="flex items-center justify-between mb-5">
                <div className="flex items-center gap-2">
                  <span className="text-xl" aria-hidden>☁️</span>
                  <div className="font-display font-bold text-base">
                    {user ? "Your Account" : "Save to Cloud"}
                  </div>
                </div>
                <button
                  onClick={onClose}
                  className="w-8 h-8 rounded-full bg-muted flex items-center justify-center hover:bg-muted/80 transition-colors"
                  aria-label="Close"
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
