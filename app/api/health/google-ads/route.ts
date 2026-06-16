import { NextResponse } from "next/server";
import { getGoogleAdsAppConfig } from "@/lib/google-ads/auth";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const config = getGoogleAdsAppConfig(request);

  return NextResponse.json({
    ok: config.configured && config.warnings.length === 0,
    configured: config.configured,
    missing: config.missing,
    warnings: config.warnings,
    redirectUri: config.redirectUri,
    checks: {
      hasClientId: Boolean(config.clientId),
      hasClientSecret: Boolean(config.clientSecret),
      hasDeveloperToken: Boolean(config.developerToken),
      appUrl: config.publicAppUrl,
    },
  }, { status: config.configured ? 200 : 503 });
}
