import { NextResponse } from "next/server";
import { requireUser } from "@/lib/api";
import { getGoogleAdsAppConfig, resolveGoogleAdsCredentials } from "@/lib/google-ads/auth";
import { normalizeCustomerId } from "@/lib/google-ads/utils";
import { createServiceClient } from "@/lib/supabase/server";
import type { GoogleAdsCredentials } from "@/lib/types";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  if (process.env.NODE_ENV !== "development") {
    return new NextResponse(null, { status: 404 });
  }

  try {
    const { user } = await requireUser();
    const supabase = createServiceClient();
    const appConfig = getGoogleAdsAppConfig(request);

    const [{ data: encryptedCredentials, error: encryptedError }, { data: credentials, error: credentialsError }] = await Promise.all([
      supabase
        .from("google_ads_credentials")
        .select("developer_token, manager_customer_id")
        .eq("user_id", user.id)
        .maybeSingle(),
      supabase
        .rpc("get_google_ads_credentials", { p_user_id: user.id })
        .maybeSingle(),
    ]);

    if (encryptedError) {
      throw encryptedError;
    }

    if (credentialsError) {
      throw credentialsError;
    }

    const resolved = resolveGoogleAdsCredentials(credentials as GoogleAdsCredentials | null, appConfig);
    const loginCustomerId = resolved.managerCustomerId ? normalizeCustomerId(resolved.managerCustomerId) : null;

    console.info("[Google Ads credentials debug]", {
      envDeveloperTokenSet: Boolean(appConfig.developerToken),
      supabaseEncryptedDeveloperTokenSet: Boolean(encryptedCredentials?.developer_token),
      resolvedCredentialSource: resolved.source,
      developerTokenSource: resolved.sources.developerToken,
      loginCustomerId,
    });

    return NextResponse.json({ success: true, message: "Credentials debug written to the server console." });
  } catch (error) {
    console.error("[Google Ads credentials debug] Failed to inspect credentials.", error);
    return NextResponse.json({ success: false, message: "Credentials debug failed. Check the server console." }, { status: 500 });
  }
}
