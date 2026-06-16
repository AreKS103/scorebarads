import { jsonError, jsonSuccess, requireUser } from "@/lib/api";
import { getGoogleAdsAppConfig, syncGoogleAdsAppCredentials } from "@/lib/google-ads/auth";
import { withCsrfCheck } from "@/lib/security";
import { createServiceClient } from "@/lib/supabase/server";
import type { GoogleAdsCredentials } from "@/lib/types";

export const dynamic = "force-dynamic";

export const POST = withCsrfCheck(async function POST() {
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

    await syncGoogleAdsAppCredentials(user.id, supabase, existing as GoogleAdsCredentials | null);

    return jsonSuccess({ message: "Google Ads app credentials are synced from environment variables for this user." });
  } catch (error) {
    return jsonError(error, 400);
  }
});
