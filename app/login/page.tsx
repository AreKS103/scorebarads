"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Eye, EyeOff, Lock, Mail } from "lucide-react";
import { LoadingSpinner } from "@/components/shared/LoadingSpinner";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/client";

type AuthMode = "signin" | "signup" | "verify";

function getInitialNotice() {
  if (typeof window === "undefined") return "";
  const params = new URLSearchParams(window.location.search);
  if (params.get("verified") === "1") {
    return "Your email is verified. You can sign in now.";
  }
  if (params.get("reset") === "1") {
    return "Your password has been updated. Sign in with the new password.";
  }
  return "";
}

export default function LoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState<AuthMode>("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  async function routeAfterAuth(userId: string) {
    const supabase = createClient();
    const { data } = await supabase.rpc("get_google_ads_credentials", { p_user_id: userId }).maybeSingle();
    const credentials = data as { refresh_token?: string | null; customer_id?: string | null } | null;

    if (credentials?.refresh_token && credentials?.customer_id) {
      router.push("/dashboard");
      router.refresh();
      return;
    }

    router.push("/connect");
    router.refresh();
  }

  useEffect(() => {
    setNotice(getInitialNotice());
    if (!isSupabaseConfigured()) return;

    const supabase = createClient();
    let isMounted = true;

    supabase.auth.getUser().then(({ data }) => {
      if (isMounted && data.user) {
        void routeAfterAuth(data.user.id);
      }
    });

    return () => {
      isMounted = false;
    };
  }, [router]);

  function selectMode(nextMode: AuthMode) {
    setMode(nextMode);
    setError("");
    setNotice("");
    setConfirmPassword("");
  }

  async function handleSignIn(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setNotice("");

    if (!isSupabaseConfigured()) {
      setError("Supabase is not configured. Add the public Supabase URL and anon key to .env.local.");
      return;
    }

    setIsSubmitting(true);
    const { error: signInError } = await createClient().auth.signInWithPassword({
      email,
      password,
    });

    if (signInError) {
      setError(signInError.message);
      setIsSubmitting(false);
      return;
    }

    const { data } = await createClient().auth.getUser();
    if (data.user) {
      await routeAfterAuth(data.user.id);
    }
  }

  async function handleSignUp(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setNotice("");

    if (!isSupabaseConfigured()) {
      setError("Supabase is not configured. Add the public Supabase URL and anon key to .env.local.");
      return;
    }

    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setIsSubmitting(true);
    const { data, error: signUpError } = await createClient().auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/login?verified=1`,
      },
    });

    setIsSubmitting(false);

    if (signUpError) {
      const message = signUpError.message.toLowerCase();
      if (message.includes("already") || message.includes("registered")) {
        setMode("signin");
        setError("An account with this email already exists. Sign in with your password instead.");
        return;
      }
      setError(signUpError.message);
      return;
    }

    if (data.session) {
      await routeAfterAuth(data.session.user.id);
      return;
    }

    setMode("verify");
  }

  if (mode === "verify") {
    return (
      <main className="flex min-h-screen items-center justify-center bg-background p-4">
        <section className="w-full max-w-[380px] rounded-2xl border border-border bg-card px-8 py-10 text-center">
          <div className="mx-auto mb-5 flex h-12 w-12 items-center justify-center rounded-xl bg-secondary text-primary">
            <Mail className="h-5 w-5" />
          </div>
          <h1 className="text-[20px] font-extrabold tracking-tight text-foreground">Check your inbox</h1>
          <p className="mt-2 text-[13px] leading-relaxed text-muted-foreground">
            We sent a verification link to <span className="font-semibold text-foreground">{email}</span>. Open it to activate your Score Ads account.
          </p>
          <button
            type="button"
            onClick={() => selectMode("signin")}
            className="mt-6 text-xs font-medium text-muted-foreground underline underline-offset-2 transition-colors hover:text-foreground"
          >
            Back to sign in
          </button>
        </section>
      </main>
    );
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-background p-4">
      <section className="w-full max-w-[380px] rounded-2xl border border-border bg-card px-8 py-10">
        <div className="mb-6 text-center">
          <div className="mx-auto mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-secondary text-primary">
            <Lock className="h-5 w-5" />
          </div>
          <h1 className="m-0 text-[22px] font-extrabold tracking-tight text-foreground">Score Ads Manager</h1>
          <p className="mt-1.5 text-[13px] text-muted-foreground">
            {mode === "signin" ? "Sign in to manage campaigns" : "Create your private owner account"}
          </p>
        </div>

        <div className="mb-6 flex gap-1 rounded-lg bg-secondary p-1">
          <button
            type="button"
            onClick={() => selectMode("signin")}
            className={`flex-1 rounded-md py-1.5 text-xs font-semibold transition-all ${mode === "signin" ? "bg-background text-foreground" : "text-muted-foreground hover:text-foreground"}`}
          >
            Sign in
          </button>
          <button
            type="button"
            onClick={() => selectMode("signup")}
            className={`flex-1 rounded-md py-1.5 text-xs font-semibold transition-all ${mode === "signup" ? "bg-background text-foreground" : "text-muted-foreground hover:text-foreground"}`}
          >
            Create account
          </button>
        </div>

        {notice ? (
          <div className="mb-4 rounded-lg border border-primary/20 bg-primary/10 px-3 py-2 text-[13px] text-primary">
            {notice}
          </div>
        ) : null}

        {error ? (
          <div className="mb-4 rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-[13px] text-destructive">
            {error}
          </div>
        ) : null}

        <form onSubmit={mode === "signin" ? handleSignIn : handleSignUp}>
          <label className="mb-1.5 block text-xs font-semibold text-muted-foreground">Email</label>
          <input
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            required
            autoComplete="email"
            autoFocus
            placeholder="you@example.com"
            className="mb-4 w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm text-foreground outline-none transition-colors placeholder:text-muted-foreground/60 focus:border-ring focus:ring-2 focus:ring-ring/30"
          />

          <label className="mb-1.5 block text-xs font-semibold text-muted-foreground">Password</label>
          <div className="relative mb-4">
            <input
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
              minLength={6}
              autoComplete={mode === "signin" ? "current-password" : "new-password"}
              placeholder="********"
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

          {mode === "signup" ? (
            <>
              <label className="mb-1.5 block text-xs font-semibold text-muted-foreground">Confirm password</label>
              <div className="relative mb-4">
                <input
                  type={showPassword ? "text" : "password"}
                  value={confirmPassword}
                  onChange={(event) => setConfirmPassword(event.target.value)}
                  required
                  minLength={6}
                  autoComplete="new-password"
                  placeholder="********"
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
            </>
          ) : null}

          <button
            type="submit"
            disabled={isSubmitting}
            className="mt-2 flex w-full items-center justify-center gap-2 rounded-lg bg-primary py-2.5 text-sm font-bold text-primary-foreground transition-colors hover:bg-primary/90 disabled:cursor-wait disabled:opacity-60"
          >
            {isSubmitting ? <LoadingSpinner /> : null}
            {isSubmitting ? (mode === "signin" ? "Signing in..." : "Creating account...") : mode === "signin" ? "Sign in" : "Create account"}
          </button>

          {mode === "signin" ? (
            <div className="mt-3 text-center">
              <Link
                href="/forgot-password"
                className="text-xs font-medium text-muted-foreground underline underline-offset-2 transition-colors hover:text-foreground"
              >
                Forgot your password?
              </Link>
            </div>
          ) : null}
        </form>
      </section>
    </main>
  );
}
