import { NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/supabase/server";

export async function requireUser() {
  return getAuthenticatedUser();
}

export function jsonError(error: unknown, status = 400) {
  const message =
    error instanceof Error
      ? error.message
      : error && typeof error === "object" && "message" in error && typeof error.message === "string"
        ? error.message
        : typeof error === "string"
          ? error
          : "Unexpected server error.";

  console.error("[Score Ads API]", message, error);
  return NextResponse.json({ success: false, error: message }, { status });
}

export function jsonSuccess<T>(data: T, status = 200) {
  return NextResponse.json({ success: true, ...data }, { status });
}

function normalizeBaseUrl(value?: string | null) {
  return (value || "").trim().replace(/\/+$/, "");
}

function getRequestOrigin(request?: Request | URL | string | null) {
  if (!request) return "";

  try {
    if (typeof request === "string") {
      return new URL(request).origin;
    }

    if (request instanceof URL) {
      return request.origin;
    }

    return new URL(request.url).origin;
  } catch {
    return "";
  }
}

export function publicAppUrl(request?: Request | URL | string | null) {
  const configuredUrl = normalizeBaseUrl(process.env.NEXT_PUBLIC_APP_URL);
  const requestOrigin = normalizeBaseUrl(getRequestOrigin(request));
  const vercelUrl = normalizeBaseUrl(process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "");
  let base = configuredUrl || vercelUrl || requestOrigin || "http://localhost:3000";

  try {
    const baseUrl = new URL(base);
    const originUrl = requestOrigin ? new URL(requestOrigin) : null;

    if (
      process.env.NODE_ENV === "production" &&
      originUrl &&
      baseUrl.hostname === "localhost" &&
      originUrl.hostname !== "localhost"
    ) {
      base = requestOrigin;
    }
  } catch {
    base = requestOrigin || "http://localhost:3000";
  }

  return normalizeBaseUrl(base);
}

export function appUrl(path = "", request?: Request | URL | string | null) {
  const normalizedPath = path ? (path.startsWith("/") ? path : `/${path}`) : "";
  return `${publicAppUrl(request)}${normalizedPath}`;
}
