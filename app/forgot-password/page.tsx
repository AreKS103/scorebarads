"use client";

import { useState } from "react";
import Link from "next/link";
import { Mail } from "lucide-react";
import { LoadingSpinner } from "@/components/shared/LoadingSpinner";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/client";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSent, setIsSent] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");

    if (!isSupabaseConfigured()) {
      setError("Supabase is not configured. Add the public Supabase URL and anon key to .env.local.");
      return;
    }

    setIsSubmitting(true);
    const { error: resetError } = await createClient().auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    setIsSubmitting(false);

    if (resetError) {
      setError(resetError.message);
      return;
    }

    setIsSent(true);
  }

  if (isSent) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-background p-4">
        <section className="w-full max-w-[380px] rounded-2xl border border-border bg-card px-8 py-10 text-center">
          <div className="mx-auto mb-5 flex h-12 w-12 items-center justify-center rounded-xl bg-secondary text-primary">
            <Mail className="h-5 w-5" />
          </div>
          <h1 className="text-[20px] font-extrabold tracking-tight text-foreground">Check your inbox</h1>
          <p className="mt-2 text-[13px] leading-relaxed text-muted-foreground">
            We sent a password reset link to <span className="font-semibold text-foreground">{email}</span>.
          </p>
          <Link
            href="/login"
            className="mt-6 inline-flex text-xs font-medium text-muted-foreground underline underline-offset-2 transition-colors hover:text-foreground"
          >
            Back to sign in
          </Link>
        </section>
      </main>
    );
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-background p-4">
      <section className="w-full max-w-[380px] rounded-2xl border border-border bg-card px-8 py-10">
        <div className="mb-6 text-center">
          <h1 className="m-0 text-[22px] font-extrabold tracking-tight text-foreground">Reset password</h1>
          <p className="mt-1.5 text-[13px] text-muted-foreground">Enter your email and we will send you a reset link.</p>
        </div>

        {error ? (
          <div className="mb-4 rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-[13px] text-destructive">
            {error}
          </div>
        ) : null}

        <form onSubmit={handleSubmit}>
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

          <button
            type="submit"
            disabled={isSubmitting}
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-primary py-2.5 text-sm font-bold text-primary-foreground transition-colors hover:bg-primary/90 disabled:cursor-wait disabled:opacity-60"
          >
            {isSubmitting ? <LoadingSpinner /> : null}
            {isSubmitting ? "Sending..." : "Send reset link"}
          </button>
        </form>

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