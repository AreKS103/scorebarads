import { NextResponse } from "next/server";
import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

const fallbackRateLimitStore = new Map<string, { count: number; resetAt: number }>();
const upstashLimiters = new Map<string, Ratelimit>();
let redisClient: Redis | null | undefined;

function configuredAppOrigin() {
  const appUrl = (process.env.NEXT_PUBLIC_APP_URL || "").trim();
  if (!appUrl) return "";

  try {
    return new URL(appUrl).origin;
  } catch {
    return "";
  }
}

function requestOrigin(request: Request) {
  try {
    return new URL(request.url).origin;
  } catch {
    return "";
  }
}

function originFromHeader(value: string | null) {
  if (!value) return "";

  try {
    return new URL(value).origin;
  } catch {
    return "";
  }
}

export function validateCsrfRequest(request: Request) {
  if (["GET", "HEAD", "OPTIONS"].includes(request.method)) {
    return null;
  }

  const expectedOrigin = configuredAppOrigin() || requestOrigin(request);
  const origin = originFromHeader(request.headers.get("origin"));
  const referer = originFromHeader(request.headers.get("referer"));
  const actualOrigin = origin || referer;

  if (!expectedOrigin || !actualOrigin || actualOrigin !== expectedOrigin) {
    return NextResponse.json(
      { success: false, error: "Invalid request origin." },
      { status: 403 },
    );
  }

  return null;
}

export function withCsrfCheck<RequestType extends Request, Args extends unknown[]>(
  handler: (request: RequestType, ...args: Args) => Promise<Response>,
) {
  return async (request: RequestType, ...args: Args) => {
    const csrfError = validateCsrfRequest(request);
    if (csrfError) return csrfError;
    return handler(request, ...args);
  };
}

export function getClientIp(request: Request) {
  const forwardedFor = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  return forwardedFor || request.headers.get("x-real-ip") || "127.0.0.1";
}

function getRedisClient() {
  if (typeof redisClient !== "undefined") {
    return redisClient;
  }

  const url = process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN;

  redisClient = url && token ? new Redis({ url, token }) : null;
  return redisClient;
}

function getUpstashLimiter(limit: number, window: `${number} ${"s" | "m" | "h" | "d"}`) {
  const redis = getRedisClient();
  if (!redis) return null;

  const key = `${limit}:${window}`;
  const existing = upstashLimiters.get(key);
  if (existing) return existing;

  const limiter = new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(limit, window),
    analytics: true,
    prefix: "score-ads-ratelimit",
  });
  upstashLimiters.set(key, limiter);
  return limiter;
}

function fallbackLimit(identifier: string, limit: number, windowMs: number) {
  const now = Date.now();
  const current = fallbackRateLimitStore.get(identifier);

  if (!current || current.resetAt <= now) {
    const resetAt = now + windowMs;
    fallbackRateLimitStore.set(identifier, { count: 1, resetAt });
    return { success: true, remaining: limit - 1, resetAt };
  }

  current.count += 1;
  fallbackRateLimitStore.set(identifier, current);

  return {
    success: current.count <= limit,
    remaining: Math.max(0, limit - current.count),
    resetAt: current.resetAt,
  };
}

export async function rateLimitResponse({
  identifier,
  limit,
  window = "1 m",
  windowMs = 60_000,
}: {
  identifier: string;
  limit: number;
  window?: `${number} ${"s" | "m" | "h" | "d"}`;
  windowMs?: number;
}) {
  const limiter = getUpstashLimiter(limit, window);
  const result = limiter
    ? await limiter.limit(identifier)
    : fallbackLimit(identifier, limit, windowMs);

  if (result.success) {
    return null;
  }

  const rawReset = "reset" in result ? result.reset : result.resetAt;
  const resetAt = typeof rawReset === "number" ? rawReset : new Date(rawReset).getTime();
  const retryAfter = Math.max(1, Math.ceil((resetAt - Date.now()) / 1000));

  return NextResponse.json(
    { success: false, error: "Too many requests. Please try again shortly." },
    {
      status: 429,
      headers: {
        "Retry-After": String(retryAfter),
        "X-RateLimit-Limit": String(limit),
        "X-RateLimit-Remaining": String(result.remaining),
        "X-RateLimit-Reset": String(resetAt),
      },
    },
  );
}
