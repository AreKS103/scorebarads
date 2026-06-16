import { jsonError, jsonSuccess, requireUser } from "@/lib/api";
import { getGoogleAdsAppConfig, resolveGoogleAdsCredentials } from "@/lib/google-ads/auth";
import { normalizeCustomerId } from "@/lib/google-ads/utils";
import { withCsrfCheck } from "@/lib/security";
import { createServiceClient } from "@/lib/supabase/server";
import type { GoogleAdsCredentials } from "@/lib/types";

export const dynamic = "force-dynamic";

export const POST = withCsrfCheck(async function POST(request: Request) {
  try {
    const { user } = await requireUser();
    const body = await request.json();
    const customerId = normalizeCustomerId(String(body.customerId || ""));
    const managerCustomerId = normalizeCustomerId(String(body.managerCustomerId || ""));

    if (!customerId) {
      throw new Error("Choose a Google Ads customer ID before continuing.");
    }

    const supabase = createServiceClient();
    const { data: existing, error: existingError } = await supabase
      .rpc("get_google_ads_credentials", { p_user_id: user.id })
      .maybeSingle();

    if (existingError) {
      throw existingError;
    }

    const credentials = existing as GoogleAdsCredentials | null;
    const appConfig = getGoogleAdsAppConfig(request);
    const resolved = resolveGoogleAdsCredentials(credentials, appConfig);

    if (!resolved.clientId || !resolved.clientSecret || !resolved.developerToken) {
      throw new Error("Google Ads app credentials are missing. Add them in Vercel environment variables or use manual setup.");
    }

    const { error } = await supabase.rpc("upsert_google_ads_credentials", {
      p_user_id: user.id,
      p_client_id: resolved.clientId,
      p_client_secret: resolved.clientSecret,
      p_refresh_token: resolved.refreshToken,
      p_developer_token: resolved.developerToken,
      p_customer_id: customerId,
      p_manager_customer_id: managerCustomerId || null,
    });

    if (error) {
      throw error;
    }

    return jsonSuccess({ customerId, managerCustomerId: managerCustomerId || null });
  } catch (error) {
    return jsonError(error, 400);
  }
});
