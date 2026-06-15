import { NextRequest, NextResponse } from "next/server";
import { appUrl } from "@/lib/api";
import { getGoogleAdsAppConfig } from "@/lib/google-ads/auth";
import { createServiceClient, getAuthenticatedUser } from "@/lib/supabase/server";
import type { GoogleAdsCredentials } from "@/lib/types";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const error = searchParams.get("error");

  if (error) {
    return NextResponse.redirect(appUrl(`/connect?step=3&error=${encodeURIComponent(error)}`));
  }

  if (!code) {
    return NextResponse.redirect(appUrl("/connect?step=3&error=missing_oauth_code"));
  }

  try {
    const { user } = await getAuthenticatedUser();
    const supabase = createServiceClient();
    const appConfig = getGoogleAdsAppConfig();
    const { data: existing, error: credentialsError } = await supabase
      .rpc("get_google_ads_credentials", { p_user_id: user.id })
      .maybeSingle();

    if (credentialsError) {
      return NextResponse.redirect(appUrl(`/connect?error=${encodeURIComponent(credentialsError.message)}`));
    }

    const existingCredentials = existing as GoogleAdsCredentials | null;
    const clientId = existingCredentials?.client_id || appConfig.clientId;
    const clientSecret = existingCredentials?.client_secret || appConfig.clientSecret;
    const developerToken = existingCredentials?.developer_token || appConfig.developerToken;

    if (!clientId || !clientSecret || !developerToken) {
      return NextResponse.redirect(appUrl("/connect?error=missing_google_app_credentials"));
    }

    const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: appUrl("/api/google-ads/auth/callback"),
        grant_type: "authorization_code",
      }),
      cache: "no-store",
    });

    const tokenBody = await tokenResponse.json();

    if (!tokenResponse.ok || !tokenBody.refresh_token) {
      const message = tokenBody.error_description || tokenBody.error || "Google OAuth did not return a refresh token. Reconnect with prompt=consent.";
      return NextResponse.redirect(appUrl(`/connect?step=3&error=${encodeURIComponent(message)}`));
    }

    const { error: saveError } = await supabase.rpc("upsert_google_ads_credentials", {
      p_user_id: user.id,
      p_client_id: clientId,
      p_client_secret: clientSecret,
      p_refresh_token: tokenBody.refresh_token,
      p_developer_token: developerToken,
      p_customer_id: existingCredentials?.customer_id || null,
      p_manager_customer_id: existingCredentials?.manager_customer_id || null,
    });

    if (saveError) {
      return NextResponse.redirect(appUrl(`/connect?step=3&error=${encodeURIComponent(saveError.message)}`));
    }

    return NextResponse.redirect(appUrl("/connect?step=customer"));
  } catch (routeError) {
    const message = routeError instanceof Error ? routeError.message : "OAuth callback failed.";
    return NextResponse.redirect(appUrl(`/connect?step=3&error=${encodeURIComponent(message)}`));
  }
}

export async function POST(request: NextRequest) {
  return GET(request);
}
