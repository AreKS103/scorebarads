import type { SupabaseClient } from "@supabase/supabase-js";
import { publicAppUrl } from "@/lib/api";
import { createServiceClient } from "@/lib/supabase/server";
import type { GoogleAdsAuthContext, GoogleAdsCredentials } from "@/lib/types";
import { GOOGLE_ADS_BASE_URL, normalizeCustomerId } from "@/lib/google-ads/utils";

export class GoogleAdsAPIError extends Error {
  status: number;
  details: unknown;

  constructor(message: string, status: number, details: unknown) {
    super(message);
    this.name = "GoogleAdsAPIError";
    this.status = status;
    this.details = details;
  }
}

export function getGoogleAdsAppConfig(request?: Request | URL | string | null) {
  const clientId = (process.env.GOOGLE_CLIENT_ID || "").trim();
  const clientSecret = (process.env.GOOGLE_CLIENT_SECRET || "").trim();
  const developerToken = (process.env.GOOGLE_ADS_DEVELOPER_TOKEN || "").trim();
  const configuredPublicAppUrl = (process.env.NEXT_PUBLIC_APP_URL || "").trim().replace(/\/+$/, "");
  const publicAppUrlValue = publicAppUrl(request);
  const redirectUri = `${publicAppUrlValue}/api/google-ads/auth/callback`;
  const missing = [
    ["GOOGLE_CLIENT_ID", clientId],
    ["GOOGLE_CLIENT_SECRET", clientSecret],
    ["GOOGLE_ADS_DEVELOPER_TOKEN", developerToken],
  ]
    .filter(([, value]) => !value)
    .map(([name]) => name);

  const warnings: string[] = [];
  try {
    const app = new URL(publicAppUrlValue);
    if (!/^https?:$/.test(app.protocol)) {
      warnings.push("NEXT_PUBLIC_APP_URL must start with http:// for local dev or https:// in production.");
    }
    if (process.env.NODE_ENV === "production" && app.hostname === "localhost") {
      warnings.push("NEXT_PUBLIC_APP_URL is still localhost in production. Set it to your deployed Vercel URL.");
    }

    if (configuredPublicAppUrl) {
      const configured = new URL(configuredPublicAppUrl);
      if (configured.origin !== app.origin) {
        warnings.push(`Runtime app URL is ${app.origin}, but NEXT_PUBLIC_APP_URL is ${configured.origin}. Make sure the Google OAuth redirect URI uses the URL shown here.`);
      }
    }
  } catch {
    warnings.push("NEXT_PUBLIC_APP_URL is not a valid URL.");
  }

  if (clientId && !clientId.endsWith(".apps.googleusercontent.com")) {
    warnings.push("GOOGLE_CLIENT_ID does not look like a Google OAuth web client ID.");
  }

  return {
    clientId,
    clientSecret,
    developerToken,
    publicAppUrl: publicAppUrlValue,
    redirectUri,
    configured: missing.length === 0,
    missing,
    warnings,
  };
}

type GoogleAdsAppConfig = ReturnType<typeof getGoogleAdsAppConfig>;
type CredentialSource = "environment" | "stored" | "missing";

function resolveCredentialValue(envValue: string, storedValue: string | null | undefined) {
  const cleanEnvValue = envValue.trim();
  const cleanStoredValue = (storedValue || "").trim();

  if (cleanEnvValue) {
    return { value: cleanEnvValue, source: "environment" as const };
  }

  if (cleanStoredValue) {
    return { value: cleanStoredValue, source: "stored" as const };
  }

  return { value: "", source: "missing" as const };
}

export function resolveGoogleAdsCredentials(credentials: GoogleAdsCredentials | null | undefined, appConfig: GoogleAdsAppConfig = getGoogleAdsAppConfig()) {
  const clientId = resolveCredentialValue(appConfig.clientId, credentials?.client_id);
  const clientSecret = resolveCredentialValue(appConfig.clientSecret, credentials?.client_secret);
  const developerToken = resolveCredentialValue(appConfig.developerToken, credentials?.developer_token);
  const primarySources = [clientId.source, clientSecret.source, developerToken.source] as CredentialSource[];
  const source = primarySources.every((item) => item === "environment")
    ? "environment"
    : primarySources.every((item) => item === "stored")
      ? "stored"
      : primarySources.every((item) => item === "missing")
        ? "missing"
        : "mixed";

  return {
    clientId: clientId.value,
    clientSecret: clientSecret.value,
    developerToken: developerToken.value,
    refreshToken: credentials?.refresh_token || null,
    customerId: credentials?.customer_id || null,
    managerCustomerId: credentials?.manager_customer_id || null,
    source,
    sources: {
      clientId: clientId.source,
      clientSecret: clientSecret.source,
      developerToken: developerToken.source,
    },
  };
}

export function credentialsMatchAppConfig(credentials: GoogleAdsCredentials | null | undefined, appConfig: GoogleAdsAppConfig = getGoogleAdsAppConfig()) {
  return Boolean(
    appConfig.configured &&
      credentials &&
      credentials.client_id === appConfig.clientId &&
      credentials.client_secret === appConfig.clientSecret &&
      credentials.developer_token === appConfig.developerToken
  );
}

export async function syncGoogleAdsAppCredentials(
  userId: string,
  supabase: SupabaseClient = createServiceClient(),
  existingCredentials?: GoogleAdsCredentials | null,
): Promise<GoogleAdsCredentials | null> {
  const appConfig = getGoogleAdsAppConfig();

  if (!appConfig.configured) {
    throw new Error(`Google Ads app credentials are missing: ${appConfig.missing.join(", ")}.`);
  }

  let credentials = existingCredentials;
  if (typeof existingCredentials === "undefined") {
    const { data, error } = await supabase
      .rpc("get_google_ads_credentials", { p_user_id: userId })
      .maybeSingle();

    if (error) {
      throw error;
    }

    credentials = data as GoogleAdsCredentials | null;
  }

  const refreshTokenForUpsert = credentials?.client_id && credentials.client_id !== appConfig.clientId
    ? ""
    : credentials?.refresh_token || null;

  const { error } = await supabase.rpc("upsert_google_ads_credentials", {
    p_user_id: userId,
    p_client_id: appConfig.clientId,
    p_client_secret: appConfig.clientSecret,
    p_refresh_token: refreshTokenForUpsert,
    p_developer_token: appConfig.developerToken,
    p_customer_id: credentials?.customer_id || null,
    p_manager_customer_id: credentials?.manager_customer_id || null,
  });

  if (error) {
    throw error;
  }

  const { data: refreshed, error: refreshedError } = await supabase
    .rpc("get_google_ads_credentials", { p_user_id: userId })
    .maybeSingle();

  if (refreshedError) {
    throw refreshedError;
  }

  return refreshed as GoogleAdsCredentials | null;
}

export async function getStoredCredentials(userId: string, supabase: SupabaseClient = createServiceClient()): Promise<GoogleAdsCredentials> {
  const { data, error } = await supabase.rpc("get_google_ads_credentials", { p_user_id: userId }).single();

  if (error || !data) {
    throw new Error("Google Ads credentials are not connected yet.");
  }

  return data as GoogleAdsCredentials;
}

export async function refreshAccessToken(supabase: SupabaseClient, userId: string): Promise<string> {
  const credentials = await getStoredCredentials(userId, supabase);
  const resolved = resolveGoogleAdsCredentials(credentials);

  if (!resolved.refreshToken) {
    throw new Error("Google OAuth refresh token is missing. Reconnect your Google account from Settings.");
  }

  if (!resolved.clientId || !resolved.clientSecret) {
    throw new Error("Google OAuth client ID or secret is missing. Add Google app credentials in environment variables or reconnect with manual credentials.");
  }

  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: resolved.clientId,
      client_secret: resolved.clientSecret,
      refresh_token: resolved.refreshToken,
      grant_type: "refresh_token",
    }),
    cache: "no-store",
  });

  const tokenBody = await response.json().catch(() => ({}));

  if (!response.ok || !tokenBody.access_token) {
    const message = tokenBody.error_description || tokenBody.error || "Failed to refresh Google OAuth access token.";
    throw new Error(message);
  }

  return tokenBody.access_token as string;
}

export async function getGoogleAdsAuthContext(userId: string): Promise<GoogleAdsAuthContext> {
  const supabase = createServiceClient();
  const credentials = await getStoredCredentials(userId, supabase);
  const resolved = resolveGoogleAdsCredentials(credentials);

  if (!resolved.refreshToken) {
    throw new Error("Google OAuth refresh token is missing. Complete the connect wizard first.");
  }

  if (!resolved.customerId) {
    throw new Error("Google Ads customer ID is missing. Add it on the Connect page.");
  }

  const accessToken = await refreshAccessToken(supabase, userId);

  return {
    accessToken,
    developerToken: resolved.developerToken,
    customerId: normalizeCustomerId(resolved.customerId),
    managerCustomerId: resolved.managerCustomerId ? normalizeCustomerId(resolved.managerCustomerId) : null,
    clientId: resolved.clientId,
    clientSecret: resolved.clientSecret,
    refreshToken: resolved.refreshToken,
  };
}

export function extractGoogleAdsError(body: unknown): string {
  if (Array.isArray(body)) {
    const messages = body.map((item) => extractGoogleAdsError(item)).filter(Boolean);
    return messages.length > 0 ? [...new Set(messages)].join("; ") : "Google Ads API returned an unknown error.";
  }

  if (!body || typeof body !== "object") {
    return typeof body === "string" && body.trim() ? body : "Google Ads API returned an unknown error.";
  }

  const envelope = body as {
    error?: {
      message?: string;
      status?: string;
      details?: Array<{
        requestId?: string;
        errors?: Array<{ message?: string; errorCode?: Record<string, string> }>;
      }>;
    };
  };
  const nestedErrors = envelope.error?.details?.flatMap((detail) => detail.errors || []) || [];
  const requestId = envelope.error?.details?.map((detail) => detail.requestId).find(Boolean);

  if (nestedErrors.length > 0) {
    const message = nestedErrors
      .map((error) => {
        const code = error.errorCode ? Object.values(error.errorCode).join("/") : "GoogleAdsError";
        return `${code}: ${error.message || "No message provided"}`;
      })
      .join("; ");
    return requestId ? `${message} (Google request ID: ${requestId})` : message;
  }

  const message = envelope.error?.message || "Google Ads API returned an unknown error.";
  return requestId ? `${message} (Google request ID: ${requestId})` : message;
}

export function buildGoogleAdsHeaders({
  accessToken,
  developerToken,
  managerCustomerId,
  json = false,
}: {
  accessToken: string;
  developerToken: string;
  managerCustomerId?: string | null;
  json?: boolean;
}) {
  const headers: Record<string, string> = {
    Authorization: `Bearer ${accessToken}`,
    "developer-token": developerToken,
  };

  if (json) {
    headers["Content-Type"] = "application/json";
  }

  const loginCustomerId = managerCustomerId ? normalizeCustomerId(managerCustomerId) : "";
  if (loginCustomerId) {
    headers["login-customer-id"] = loginCustomerId;
  }

  return headers;
}

export async function callGoogleAdsAPI(
  endpoint: string,
  method: "GET" | "POST" | "PATCH" | "DELETE",
  body: unknown,
  accessToken: string,
  developerToken: string,
  customerId: string,
  managerCustomerId?: string | null,
): Promise<any> {
  const cleanEndpoint = endpoint.startsWith("/") ? endpoint.slice(1) : endpoint;
  const url = cleanEndpoint.startsWith("http") ? cleanEndpoint : `${GOOGLE_ADS_BASE_URL}/customers/${normalizeCustomerId(customerId)}/${cleanEndpoint}`;
  const headers = buildGoogleAdsHeaders({
    accessToken,
    developerToken,
    managerCustomerId,
    json: method !== "GET",
  });

  const response = await fetch(url, {
    method,
    headers,
    body: method === "GET" || body == null ? undefined : JSON.stringify(body),
    cache: "no-store",
  });

  const text = await response.text();
  let responseBody: any = null;
  try {
    responseBody = text ? JSON.parse(text) : null;
  } catch {
    responseBody = { error: { message: text || "Google Ads API returned a non-JSON response." } };
  }

  if (!response.ok) {
    throw new GoogleAdsAPIError(extractGoogleAdsError(responseBody), response.status, responseBody);
  }

  return responseBody;
}
