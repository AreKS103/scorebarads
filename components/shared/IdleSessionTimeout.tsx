"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useWizardStore } from "@/lib/store";

const IDLE_TIMEOUT_MS = 30 * 60 * 1000;
const WARNING_MS = 60 * 1000;
const PUBLIC_PATH_PREFIXES = ["/login", "/forgot-password", "/reset-password"];

export function IdleSessionTimeout() {
  const router = useRouter();
  const pathname = usePathname();
  const [showWarning, setShowWarning] = useState(false);
  const warningTimerRef = useRef<number | null>(null);
  const timeoutTimerRef = useRef<number | null>(null);
  const isPublicPage = PUBLIC_PATH_PREFIXES.some((prefix) => pathname.startsWith(prefix));

  const clearTimers = useCallback(() => {
    if (warningTimerRef.current) {
      window.clearTimeout(warningTimerRef.current);
      warningTimerRef.current = null;
    }

    if (timeoutTimerRef.current) {
      window.clearTimeout(timeoutTimerRef.current);
      timeoutTimerRef.current = null;
    }
  }, []);

  const timeoutSignOut = useCallback(async () => {
    clearTimers();
    setShowWarning(false);
    await fetch("/api/auth/logout", { method: "POST" }).catch(() => null);
    await createClient().auth.signOut({ scope: "local" }).catch(() => null);
    useWizardStore.getState().reset();
    router.replace("/login?reason=timeout");
  }, [clearTimers, router]);

  const resetTimers = useCallback(() => {
    if (isPublicPage) return;

    clearTimers();
    setShowWarning(false);
    warningTimerRef.current = window.setTimeout(() => setShowWarning(true), IDLE_TIMEOUT_MS - WARNING_MS);
    timeoutTimerRef.current = window.setTimeout(() => void timeoutSignOut(), IDLE_TIMEOUT_MS);
  }, [clearTimers, isPublicPage, timeoutSignOut]);

  useEffect(() => {
    if (isPublicPage) {
      clearTimers();
      setShowWarning(false);
      return;
    }

    resetTimers();
    window.addEventListener("mousemove", resetTimers);
    window.addEventListener("keydown", resetTimers);

    return () => {
      window.removeEventListener("mousemove", resetTimers);
      window.removeEventListener("keydown", resetTimers);
      clearTimers();
    };
  }, [clearTimers, isPublicPage, resetTimers]);

  if (!showWarning || isPublicPage) {
    return null;
  }

  return (
    <div role="status" className="fixed bottom-4 right-4 z-50 rounded-lg border border-border bg-card p-4 text-sm text-foreground shadow-lg">
      You will be logged out in 60 seconds
    </div>
  );
}
