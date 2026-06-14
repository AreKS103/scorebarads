import { jsonError, jsonSuccess, requireUser } from "@/lib/api";
import { listCampaignsFromGoogleAds, syncCampaignLogs } from "@/lib/google-ads/campaigns";
import { createServiceClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const { user } = await requireUser();
    const campaigns = await listCampaignsFromGoogleAds(user.id);
    await syncCampaignLogs(createServiceClient(), user.id, campaigns);
    return jsonSuccess({ campaigns });
  } catch (error) {
    return jsonError(error, 400);
  }
}
