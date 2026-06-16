import { jsonError, jsonSuccess, requireUser } from "@/lib/api";
import { credentialsMatchAppConfig, getGoogleAdsAppConfig, resolveGoogleAdsCredentials, syncGoogleAdsAppCredentials } from "@/lib/google-ads/auth";
import { createServiceClient } from "@/lib/supabase/server";
import type { GoogleAdsCredentials } from "@/lib/types";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const { user } = await requireUser();
    const supabase = createServiceClient();
    const appConfig = getGoogleAdsAppConfig(request);
    const { data, error } = await supabase
      .rpc("get_google_ads_credentials", { p_user_id: user.id })
      .maybeSingle();

    if (error) {
      throw error;
    }

    let credentials = data as GoogleAdsCredentials | null;
    const credentialsWereSynced = appConfig.configured && !credentialsMatchAppConfig(credentials, appConfig);

    if (credentialsWereSynced) {
      credentials = await syncGoogleAdsAppCredentials(user.id, supabase, credentials);
    }

    const resolved = resolveGoogleAdsCredentials(credentials, appConfig);

    return jsonSuccess({
      appConfig: {
        configured: appConfig.configured,
        missing: appConfig.missing,
        warnings: appConfig.warnings,
        appUrl: appConfig.publicAppUrl,
        redirectUri: appConfig.redirectUri,
        hasClientId: Boolean(appConfig.clientId),
        hasClientSecret: Boolean(appConfig.clientSecret),
        hasDeveloperToken: Boolean(appConfig.developerToken),
      },
      credentials: {
        saved: Boolean(credentials),
        hasOAuth: Boolean(resolved.refreshToken),
        hasCustomerId: Boolean(resolved.customerId),
        customerId: resolved.customerId || "",
        managerCustomerId: resolved.managerCustomerId || "",
        usingEnvironmentCredentials: resolved.source === "environment",
        appCredentialsSynced: credentialsWereSynced,
      },
    });
  } catch (error) {
    return jsonError(error, 500);
  }
}
