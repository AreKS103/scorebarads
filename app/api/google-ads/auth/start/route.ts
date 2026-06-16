import crypto from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { appUrl } from "@/lib/api";
import { getGoogleAdsAppConfig, resolveGoogleAdsCredentials } from "@/lib/google-ads/auth";
import { getClientIp, rateLimitResponse } from "@/lib/security";
import { createServiceClient, getAuthenticatedUser } from "@/lib/supabase/server";
import type { GoogleAdsCredentials } from "@/lib/types";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const rateLimited = await rateLimitResponse({
      identifier: `google-oauth-start:${getClientIp(request)}`,
      limit: 10,
    });

    if (rateLimited) {
      return rateLimited;
    }

    const { user } = await getAuthenticatedUser();
    const supabase = createServiceClient();
    const appConfig = getGoogleAdsAppConfig(request);
    const { data } = await supabase
      .rpc("get_google_ads_credentials", { p_user_id: user.id })
      .maybeSingle();
    const credentials = data as GoogleAdsCredentials | null;
    const resolved = resolveGoogleAdsCredentials(credentials, appConfig);

    if (!resolved.clientId) {
      return NextResponse.redirect(appUrl("/connect?error=missing_google_oauth_client_id", request));
    }

    const stateNonce = crypto.randomBytes(24).toString("hex");
    const state = `${user.id}.${stateNonce}`;
    const params = new URLSearchParams({
      client_id: resolved.clientId,
      redirect_uri: appConfig.redirectUri,
      response_type: "code",
      scope: "https://www.googleapis.com/auth/adwords",
      access_type: "offline",
      prompt: "consent",
      include_granted_scopes: "true",
      state,
    });

    const response = NextResponse.redirect(`https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`);
    response.cookies.set("score_ads_oauth_state", state, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 10 * 60,
    });
    return response;
  } catch (error) {
    const message = error instanceof Error ? error.message : "Google OAuth setup failed.";
    return NextResponse.redirect(appUrl(`/connect?error=${encodeURIComponent(message)}`, request));
  }
}
