import { jsonError, jsonSuccess, requireUser } from "@/lib/api";
import { getGoogleAdsAppConfig } from "@/lib/google-ads/auth";
import { createServiceClient } from "@/lib/supabase/server";
import type { GoogleAdsCredentials } from "@/lib/types";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const { user } = await requireUser();
    const supabase = createServiceClient();
    const appConfig = getGoogleAdsAppConfig();
    const { data, error } = await supabase
      .rpc("get_google_ads_credentials", { p_user_id: user.id })
      .maybeSingle();

    if (error) {
      throw error;
    }

    const credentials = data as GoogleAdsCredentials | null;

    return jsonSuccess({
      appConfig: {
        configured: appConfig.configured,
        missing: appConfig.missing,
        hasClientId: Boolean(appConfig.clientId),
        hasClientSecret: Boolean(appConfig.clientSecret),
        hasDeveloperToken: Boolean(appConfig.developerToken),
      },
      credentials: {
        saved: Boolean(credentials),
        hasOAuth: Boolean(credentials?.refresh_token),
        hasCustomerId: Boolean(credentials?.customer_id),
        customerId: credentials?.customer_id || "",
        managerCustomerId: credentials?.manager_customer_id || "",
      },
    });
  } catch (error) {
    return jsonError(error, 500);
  }
}
