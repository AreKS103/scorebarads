import { jsonError, jsonSuccess, requireUser } from "@/lib/api";
import { getGoogleAdsAppConfig } from "@/lib/google-ads/auth";
import { createServiceClient } from "@/lib/supabase/server";
import type { GoogleAdsCredentials } from "@/lib/types";

export const dynamic = "force-dynamic";

export async function POST() {
  try {
    const { user } = await requireUser();
    const appConfig = getGoogleAdsAppConfig();

    if (!appConfig.configured) {
      throw new Error(`Google Ads app credentials are missing: ${appConfig.missing.join(", ")}.`);
    }

    const supabase = createServiceClient();
    const { data: existing, error: existingError } = await supabase
      .rpc("get_google_ads_credentials", { p_user_id: user.id })
      .maybeSingle();

    if (existingError) {
      throw existingError;
    }

    const credentials = existing as GoogleAdsCredentials | null;
    const { error } = await supabase.rpc("upsert_google_ads_credentials", {
      p_user_id: user.id,
      p_client_id: appConfig.clientId,
      p_client_secret: appConfig.clientSecret,
      p_refresh_token: credentials?.refresh_token || null,
      p_developer_token: appConfig.developerToken,
      p_customer_id: credentials?.customer_id || null,
      p_manager_customer_id: credentials?.manager_customer_id || null,
    });

    if (error) {
      throw error;
    }

    return jsonSuccess({ message: "Google Ads app credentials are ready for this user." });
  } catch (error) {
    return jsonError(error, 400);
  }
}
