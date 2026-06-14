"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Eye, EyeOff, Lock } from "lucide-react";
import { LoadingSpinner } from "@/components/shared/LoadingSpinner";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/client";

export default function ResetPasswordPage() {
  const router = useRouter();
  const [email, setEmail] = useState<string | null>(null);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isChecking, setIsChecking] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let isMounted = true;

    async function prepareRecoverySession() {
      if (!isSupabaseConfigured()) {
        setError("Supabase is not configured. Add the public Supabase URL and anon key to .env.local.");
        setIsChecking(false);
        return;
      }

      const supabase = createClient();
      const params = new URLSearchParams(window.location.search);
      const code = params.get("code");
      const hasRecoveryHash = window.location.hash.includes("type=recovery") || window.location.hash.includes("access_token=");

      if (code) {
        const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
        if (exchangeError) {
          if (!isMounted) return;
          setError(exchangeError.message);
          setIsChecking(false);
          return;
        }
        window.history.replaceState(null, "", window.location.pathname);
      }

      if (hasRecoveryHash) {
        const recoverySession = await new Promise<{ email: string | null } | null>((resolve) => {
          const timeout = window.setTimeout(() => resolve(null), 3000);
          const {
            data: { subscription },
          } = supabase.auth.onAuthStateChange((event, session) => {
            if ((event === "SIGNED_IN" || event === "PASSWORD_RECOVERY") && session?.user) {
              window.clearTimeout(timeout);
              subscription.unsubscribe();
              resolve({ email: session.user.email ?? null });
            }
          });
        });

        if (!isMounted) return;

        if (recoverySession) {
          window.history.replaceState(null, "", window.location.pathname);
          setEmail(recoverySession.email);
          setIsChecking(false);
          return;
        }
      }

      const { data, error: userError } = await supabase.auth.getUser();
      if (!isMounted) return;

      if (userError || !data.user) {
        setError("This password reset link is expired or invalid. Request a new reset link to continue.");
        setIsChecking(false);
        return;
      }

      setEmail(data.user.email ?? null);
      setIsChecking(false);
    }

    void prepareRecoverySession();

    return () => {
      isMounted = false;
    };
  }, []);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");

    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setIsSubmitting(true);
    const supabase = createClient();
    const { error: updateError } = await supabase.auth.updateUser({ password });

    if (updateError) {
      setError(updateError.message);
      setIsSubmitting(false);
      return;
    }

    await supabase.auth.signOut();
    router.push("/login?reset=1");
    router.refresh();
  }

  if (isChecking) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-background p-4">
        <LoadingSpinner className="text-muted-foreground" />
      </main>
    );
  }

  const canShowPasswordForm = !error || Boolean(email);

  return (
    <main className="flex min-h-screen items-center justify-center bg-background p-4">
      <section className="w-full max-w-[380px] rounded-2xl border border-border bg-card px-8 py-10">
        <div className="mb-6 text-center">
          <div className="mx-auto mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-secondary text-primary">
            <Lock className="h-5 w-5" />
          </div>
          <h1 className="m-0 text-[22px] font-extrabold tracking-tight text-foreground">Set new password</h1>
          <p className="mt-1.5 text-[13px] leading-relaxed text-muted-foreground">
            {email ? <>Choose a new password for <span className="font-semibold text-foreground">{email}</span>.</> : "Choose a new password for your account."}
          </p>
        </div>

        {error ? (
          <div className="mb-4 rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-[13px] text-destructive">
            {error}
          </div>
        ) : null}

        {!canShowPasswordForm ? (
          <Link
            href="/forgot-password"
            className="flex w-full items-center justify-center rounded-lg bg-primary py-2.5 text-sm font-bold text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Request a new link
          </Link>
        ) : (
          <form onSubmit={handleSubmit}>
            <label className="mb-1.5 block text-xs font-semibold text-muted-foreground">New password</label>
            <div className="relative mb-4">
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                required
                minLength={8}
                autoComplete="new-password"
                autoFocus
                placeholder="At least 8 characters"
                className="w-full rounded-lg border border-border bg-background px-3 py-2.5 pr-10 text-sm text-foreground outline-none transition-colors placeholder:text-muted-foreground/60 focus:border-ring focus:ring-2 focus:ring-ring/30"
              />
              <button
                type="button"
                onClick={() => setShowPassword((value) => !value)}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 p-0.5 text-muted-foreground transition-colors hover:text-foreground"
                tabIndex={-1}
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>

            <label className="mb-1.5 block text-xs font-semibold text-muted-foreground">Confirm new password</label>
            <input
              type={showPassword ? "text" : "password"}
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
              required
              minLength={8}
              autoComplete="new-password"
              placeholder="Repeat your password"
              className="mb-4 w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm text-foreground outline-none transition-colors placeholder:text-muted-foreground/60 focus:border-ring focus:ring-2 focus:ring-ring/30"
            />

            <button
              type="submit"
              disabled={isSubmitting}
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-primary py-2.5 text-sm font-bold text-primary-foreground transition-colors hover:bg-primary/90 disabled:cursor-wait disabled:opacity-60"
            >
              {isSubmitting ? <LoadingSpinner /> : null}
              {isSubmitting ? "Saving..." : "Save password"}
            </button>
          </form>
        )}

        <div className="mt-4 text-center">
          <Link
            href="/login"
            className="text-xs font-medium text-muted-foreground underline underline-offset-2 transition-colors hover:text-foreground"
          >
            Back to sign in
          </Link>
        </div>
      </section>
    </main>
  );
}