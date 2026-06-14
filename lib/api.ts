import { NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/supabase/server";

export async function requireUser() {
  return getAuthenticatedUser();
}

export function jsonError(error: unknown, status = 400) {
  const message = error instanceof Error ? error.message : "Unexpected server error.";
  return NextResponse.json({ success: false, error: message }, { status });
}

export function jsonSuccess<T>(data: T, status = 200) {
  return NextResponse.json({ success: true, ...data }, { status });
}

export function appUrl(path = "") {
  const base = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  return `${base.replace(/\/$/, "")}${path}`;
}
