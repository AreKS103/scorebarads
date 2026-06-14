import { NextRequest } from "next/server";
import { z } from "zod";
import { jsonError, jsonSuccess, requireUser } from "@/lib/api";
import { updateCampaignStatus } from "@/lib/google-ads/campaigns";
import { createServiceClient } from "@/lib/supabase/server";

const statusSchema = z.object({ status: z.enum(["ENABLED", "PAUSED"]) });

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { user } = await requireUser();
    const { status } = statusSchema.parse(await request.json());
    const campaignResourceName = decodeURIComponent(params.id);
    await updateCampaignStatus(user.id, campaignResourceName, status);

    await createServiceClient()
      .from("campaigns_log")
      .update({ status, last_synced_at: new Date().toISOString() })
      .eq("user_id", user.id)
      .eq("campaign_resource_name", campaignResourceName);

    return jsonSuccess({ status });
  } catch (error) {
    return jsonError(error, 400);
  }
}
