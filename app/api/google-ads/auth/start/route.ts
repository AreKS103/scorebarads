import { NextResponse } from "next/server";
import { appUrl } from "@/lib/api";
import { getGoogleAdsAppConfig } from "@/lib/google-ads/auth";
import { createServiceClient, getAuthenticatedUser } from "@/lib/supabase/server";
import type { GoogleAdsCredentials } from "@/lib/types";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const { user } = await getAuthenticatedUser();
    const supabase = createServiceClient();
    const appConfig = getGoogleAdsAppConfig();
    const { data } = await supabase
      .rpc("get_google_ads_credentials", { p_user_id: user.id })
      .maybeSingle();
    const credentials = data as GoogleAdsCredentials | null;
    const clientId = credentials?.client_id || appConfig.clientId;

    if (!clientId) {
      return NextResponse.redirect(appUrl("/connect?error=missing_google_oauth_client_id"));
    }

    const params = new URLSearchParams({
      client_id: clientId,
      redirect_uri: appUrl("/api/google-ads/auth/callback"),
      response_type: "code",
      scope: "https://www.googleapis.com/auth/adwords",
      access_type: "offline",
      prompt: "consent",
    });

    return NextResponse.redirect(`https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Google OAuth setup failed.";
    return NextResponse.redirect(appUrl(`/connect?error=${encodeURIComponent(message)}`));
  }
}
