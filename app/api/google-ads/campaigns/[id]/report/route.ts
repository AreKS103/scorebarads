import { NextRequest } from "next/server";
import { jsonError, jsonSuccess, requireUser } from "@/lib/api";
import { getCampaignReport } from "@/lib/google-ads/campaigns";
import { createServiceClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

function toDateParam(date: Date) {
  return date.toISOString().slice(0, 10);
}

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { user } = await requireUser();
    const { searchParams } = new URL(request.url);
    const to = searchParams.get("to") || toDateParam(new Date());
    const from = searchParams.get("from") || toDateParam(new Date(Date.now() - 29 * 24 * 60 * 60 * 1000));
    const decodedResourceName = decodeURIComponent(params.id);
    const report = await getCampaignReport(user.id, decodedResourceName, from, to);

    const supabase = createServiceClient();
    const { data: campaign } = await supabase
      .from("campaigns_log")
      .select("*")
      .eq("user_id", user.id)
      .eq("campaign_resource_name", decodedResourceName)
      .single();

    return jsonSuccess({ report, campaign: campaign || null });
  } catch (error) {
    return jsonError(error, 400);
  }
}
