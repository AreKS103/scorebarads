import { NextRequest, NextResponse } from "next/server";
import { appUrl } from "@/lib/api";
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
    const { data: existing, error: credentialsError } = await supabase
      .rpc("get_google_ads_credentials", { p_user_id: user.id })
      .single();

    if (credentialsError || !existing) {
      return NextResponse.redirect(appUrl("/connect?step=2&error=save_oauth_credentials_first"));
    }

    const existingCredentials = existing as GoogleAdsCredentials;

    const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code,
        client_id: existingCredentials.client_id,
        client_secret: existingCredentials.client_secret,
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
      p_client_id: existingCredentials.client_id,
      p_client_secret: existingCredentials.client_secret,
      p_refresh_token: tokenBody.refresh_token,
      p_developer_token: existingCredentials.developer_token,
      p_customer_id: existingCredentials.customer_id,
      p_manager_customer_id: existingCredentials.manager_customer_id,
    });

    if (saveError) {
      return NextResponse.redirect(appUrl(`/connect?step=3&error=${encodeURIComponent(saveError.message)}`));
    }

    return NextResponse.redirect(appUrl("/connect?step=4"));
  } catch (routeError) {
    const message = routeError instanceof Error ? routeError.message : "OAuth callback failed.";
    return NextResponse.redirect(appUrl(`/connect?step=3&error=${encodeURIComponent(message)}`));
  }
}

export async function POST(request: NextRequest) {
  return GET(request);
}
