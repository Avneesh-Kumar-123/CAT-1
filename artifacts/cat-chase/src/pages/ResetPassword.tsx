import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { motion } from "framer-motion";
import { Lock, CheckCircle2, AlertCircle, Loader2, ArrowLeft, Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { authClient } from "@/lib/auth-client";
import { sfx } from "@/game/audio";

function PasswordInput({
  value, onChange, placeholder = "New password", required,
}: {
  value: string; onChange: (v: string) => void; placeholder?: string; required?: boolean;
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
        minLength={8}
        autoComplete="new-password"
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

export function ResetPassword() {
  const [, setLocation] = useLocation();
  const [token, setToken]             = useState<string | null | undefined>(undefined); // undefined = loading
  const [password, setPassword]       = useState("");
  const [confirmPw, setConfirmPw]     = useState("");
  const [loading, setLoading]         = useState(false);
  const [error, setError]             = useState<string | null>(null);
  const [success, setSuccess]         = useState(false);

  // Extract token from URL. With hash-based routing the token may be:
  //   • window.location.search  → ?token=xxx (non-hash query, works when Better Auth
  //     redirects to http://host/?token=xxx#/reset-password)
  //   • embedded in hash        → #/reset-password?token=xxx
  useEffect(() => {
    let t: string | null = new URLSearchParams(window.location.search).get("token");
    if (!t) {
      const hash  = window.location.hash; // e.g. "#/reset-password?token=xxx"
      const qIdx  = hash.indexOf("?");
      if (qIdx !== -1) t = new URLSearchParams(hash.slice(qIdx + 1)).get("token");
    }
    setToken(t); // null = definitively missing
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token)              { setError("Invalid or missing reset token."); return; }
    if (password !== confirmPw) { setError("Passwords don't match."); return; }
    if (password.length < 8) { setError("Password must be at least 8 characters."); return; }

    setError(null);
    setLoading(true);
    sfx.click();

    try {
      const apiBase = import.meta.env.VITE_API_BASE_URL ?? "";
      const res = await fetch(`${apiBase}/api/auth/reset-password`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ newPassword: password, token }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error((body as any)?.message ?? "Reset failed");
      }
      setSuccess(true);
      sfx.achievement();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "";
      if (msg.toLowerCase().includes("token") || msg.toLowerCase().includes("expired")) {
        setError("This reset link is invalid or has expired. Please request a new one.");
      } else {
        setError(msg || "Something went wrong. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  // ─── Loading token ───
  if (token === undefined) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <motion.div
        className="bg-card border-2 border-card-border rounded-3xl p-8 w-full max-w-sm shadow-2xl"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ type: "spring", stiffness: 300, damping: 28 }}
      >
        <div className="flex items-center gap-2 mb-6">
          <span className="text-xl" aria-hidden>🔐</span>
          <div className="font-display font-bold text-lg">Reset Password</div>
        </div>

        {/* ── Success ── */}
        {success && (
          <div className="flex flex-col items-center gap-4 text-center py-2">
            <div className="w-14 h-14 rounded-2xl bg-green-100 border-2 border-green-200 flex items-center justify-center">
              <CheckCircle2 className="h-7 w-7 text-green-600" />
            </div>
            <div>
              <div className="font-display font-bold text-base">Password updated!</div>
              <div className="text-xs text-muted-foreground mt-1">
                You can now sign in with your new password.
              </div>
            </div>
            <Button className="w-full game-button font-display font-bold" onClick={() => setLocation("/")}>
              Back to Game
            </Button>
          </div>
        )}

        {/* ── Invalid / missing token ── */}
        {!success && !token && (
          <div className="flex flex-col items-center gap-4 text-center py-2">
            <div className="w-14 h-14 rounded-2xl bg-red-100 border-2 border-red-200 flex items-center justify-center">
              <AlertCircle className="h-7 w-7 text-destructive" />
            </div>
            <div>
              <div className="font-display font-bold text-base">Invalid link</div>
              <div className="text-xs text-muted-foreground mt-1 max-w-[220px] mx-auto leading-relaxed">
                This reset link is invalid or has expired. Please request a new one from the sign-in page.
              </div>
            </div>
            <Button variant="outline" className="w-full gap-2" onClick={() => setLocation("/")}>
              <ArrowLeft className="h-4 w-4" /> Back to Game
            </Button>
          </div>
        )}

        {/* ── Reset form ── */}
        {!success && token && (
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div className="text-sm text-muted-foreground">
              Enter your new password below.
            </div>

            <PasswordInput
              value={password}
              onChange={setPassword}
              placeholder="New password"
              required
            />
            <PasswordInput
              value={confirmPw}
              onChange={setConfirmPw}
              placeholder="Confirm new password"
              required
            />

            {error && (
              <div className="flex items-center gap-2 text-xs font-bold text-destructive bg-destructive/10 rounded-xl px-3 py-2">
                <AlertCircle className="h-3.5 w-3.5 flex-shrink-0" /> {error}
              </div>
            )}

            <Button
              type="submit"
              className="w-full game-button font-display font-bold h-11"
              disabled={loading}
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Update Password"}
            </Button>

            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setLocation("/")}
              className="gap-1.5"
            >
              <ArrowLeft className="h-3.5 w-3.5" /> Back to Game
            </Button>
          </form>
        )}
      </motion.div>
    </div>
  );
}
