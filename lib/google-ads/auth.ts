import type { SupabaseClient } from "@supabase/supabase-js";
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

export async function getStoredCredentials(userId: string, supabase: SupabaseClient = createServiceClient()): Promise<GoogleAdsCredentials> {
  const { data, error } = await supabase.rpc("get_google_ads_credentials", { p_user_id: userId }).single();

  if (error || !data) {
    throw new Error("Google Ads credentials are not connected yet.");
  }

  return data as GoogleAdsCredentials;
}

export async function refreshAccessToken(supabase: SupabaseClient, userId: string): Promise<string> {
  const credentials = await getStoredCredentials(userId, supabase);

  if (!credentials.refresh_token) {
    throw new Error("Google OAuth refresh token is missing. Reconnect your Google account from Settings.");
  }

  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: credentials.client_id,
      client_secret: credentials.client_secret,
      refresh_token: credentials.refresh_token,
      grant_type: "refresh_token",
    }),
    cache: "no-store",
  });

  const tokenBody = await response.json();

  if (!response.ok || !tokenBody.access_token) {
    throw new Error(tokenBody.error_description || tokenBody.error || "Failed to refresh Google OAuth access token.");
  }

  return tokenBody.access_token as string;
}

export async function getGoogleAdsAuthContext(userId: string): Promise<GoogleAdsAuthContext> {
  const supabase = createServiceClient();
  const credentials = await getStoredCredentials(userId, supabase);

  if (!credentials.refresh_token) {
    throw new Error("Google OAuth refresh token is missing. Complete the connect wizard first.");
  }

  if (!credentials.customer_id) {
    throw new Error("Google Ads customer ID is missing. Add it on the Connect page.");
  }

  const accessToken = await refreshAccessToken(supabase, userId);

  return {
    accessToken,
    developerToken: credentials.developer_token,
    customerId: normalizeCustomerId(credentials.customer_id),
    managerCustomerId: credentials.manager_customer_id ? normalizeCustomerId(credentials.manager_customer_id) : null,
    clientId: credentials.client_id,
    clientSecret: credentials.client_secret,
    refreshToken: credentials.refresh_token,
  };
}

function extractGoogleAdsError(body: unknown): string {
  if (!body || typeof body !== "object") {
    return "Google Ads API returned an unknown error.";
  }

  const envelope = body as { error?: { message?: string; details?: Array<{ errors?: Array<{ message?: string; errorCode?: Record<string, string> }> }> } };
  const nestedErrors = envelope.error?.details?.flatMap((detail) => detail.errors || []) || [];

  if (nestedErrors.length > 0) {
    return nestedErrors
      .map((error) => {
        const code = error.errorCode ? Object.values(error.errorCode).join("/") : "GoogleAdsError";
        return `${code}: ${error.message || "No message provided"}`;
      })
      .join("; ");
  }

  return envelope.error?.message || "Google Ads API returned an unknown error.";
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
  const headers: Record<string, string> = {
    Authorization: `Bearer ${accessToken}`,
    "developer-token": developerToken,
  };

  if (method !== "GET") {
    headers["Content-Type"] = "application/json";
  }

  if (managerCustomerId) {
    headers["login-customer-id"] = normalizeCustomerId(managerCustomerId);
  }

  const response = await fetch(url, {
    method,
    headers,
    body: method === "GET" || body == null ? undefined : JSON.stringify(body),
    cache: "no-store",
  });

  const text = await response.text();
  const responseBody = text ? JSON.parse(text) : null;

  if (!response.ok) {
    throw new GoogleAdsAPIError(extractGoogleAdsError(responseBody), response.status, responseBody);
  }

  return responseBody;
}
