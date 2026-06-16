import { NextRequest, NextResponse } from "next/server";
import { appUrl } from "@/lib/api";
import { getGoogleAdsAppConfig, resolveGoogleAdsCredentials } from "@/lib/google-ads/auth";
import { createServiceClient, getAuthenticatedUser } from "@/lib/supabase/server";
import type { GoogleAdsCredentials } from "@/lib/types";

function redirectAndClearState(path: string, request: NextRequest) {
  const response = NextResponse.redirect(appUrl(path, request));
  response.cookies.set("score_ads_oauth_state", "", { path: "/", maxAge: 0 });
  return response;
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const error = searchParams.get("error");
  const state = searchParams.get("state") || "";
  const expectedState = request.cookies.get("score_ads_oauth_state")?.value || "";

  if (error) {
    return redirectAndClearState(`/connect?step=3&error=${encodeURIComponent(error)}`, request);
  }

  if (!code) {
    return redirectAndClearState("/connect?step=3&error=missing_oauth_code", request);
  }

  if (!state || !expectedState || state !== expectedState) {
    return redirectAndClearState("/connect?step=google&error=missing_or_expired_oauth_state", request);
  }

  try {
    const { user } = await getAuthenticatedUser();
    if (!state.startsWith(`${user.id}.`)) {
      return redirectAndClearState("/connect?step=google&error=oauth_state_user_mismatch", request);
    }

    const supabase = createServiceClient();
    const appConfig = getGoogleAdsAppConfig(request);
    const { data: existing, error: credentialsError } = await supabase
      .rpc("get_google_ads_credentials", { p_user_id: user.id })
      .maybeSingle();

    if (credentialsError) {
      return redirectAndClearState(`/connect?error=${encodeURIComponent(credentialsError.message)}`, request);
    }

    const existingCredentials = existing as GoogleAdsCredentials | null;
    const resolved = resolveGoogleAdsCredentials(existingCredentials, appConfig);

    if (!resolved.clientId || !resolved.clientSecret || !resolved.developerToken) {
      return redirectAndClearState("/connect?error=missing_google_app_credentials", request);
    }

    const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code,
        client_id: resolved.clientId,
        client_secret: resolved.clientSecret,
        redirect_uri: appConfig.redirectUri,
        grant_type: "authorization_code",
      }),
      cache: "no-store",
    });

    const tokenBody = await tokenResponse.json().catch(() => ({}));
    const existingRefreshToken = existingCredentials?.client_id === resolved.clientId ? existingCredentials?.refresh_token : null;
    const refreshToken = tokenBody.refresh_token || existingRefreshToken || null;

    if (!tokenResponse.ok || !refreshToken) {
      const message = tokenBody.error_description || tokenBody.error || "Google OAuth did not return a refresh token. Reconnect with prompt=consent.";
      return redirectAndClearState(`/connect?step=3&error=${encodeURIComponent(message)}`, request);
    }

    const { error: saveError } = await supabase.rpc("upsert_google_ads_credentials", {
      p_user_id: user.id,
      p_client_id: resolved.clientId,
      p_client_secret: resolved.clientSecret,
      p_refresh_token: refreshToken,
      p_developer_token: resolved.developerToken,
      p_customer_id: existingCredentials?.customer_id || null,
      p_manager_customer_id: existingCredentials?.manager_customer_id || null,
    });

    if (saveError) {
      return redirectAndClearState(`/connect?step=3&error=${encodeURIComponent(saveError.message)}`, request);
    }

    return redirectAndClearState("/connect?step=customer", request);
  } catch (routeError) {
    const message = routeError instanceof Error ? routeError.message : "OAuth callback failed.";
    return redirectAndClearState(`/connect?step=3&error=${encodeURIComponent(message)}`, request);
  }
}
