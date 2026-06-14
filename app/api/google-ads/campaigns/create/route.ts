import { NextRequest } from "next/server";
import { jsonError, requireUser } from "@/lib/api";
import { createServiceClient } from "@/lib/supabase/server";
import {
  addKeywords,
  createAd,
  createAdGroup,
  createCampaign,
  createCampaignBudget,
  createCampaignCriteria,
  type CreationState,
} from "@/lib/google-ads/campaigns";
import { dollarToMicros } from "@/lib/google-ads/utils";
import type { CampaignFormData, PushProgressEvent } from "@/lib/types";
import { campaignFormSchema } from "@/lib/validations";

export const dynamic = "force-dynamic";

function streamEvent(controller: ReadableStreamDefaultController<Uint8Array>, event: PushProgressEvent) {
  controller.enqueue(new TextEncoder().encode(`data: ${JSON.stringify(event)}\n\n`));
}

function collectAssetResourceNames(formData: CampaignFormData) {
  if (formData.campaignType === "DISPLAY") {
    return {
      marketingImages: formData.creative.display.landscapeImages.map((image) => image.assetResourceName).filter(Boolean),
      squareMarketingImages: formData.creative.display.squareImages.map((image) => image.assetResourceName).filter(Boolean),
    };
  }

  if (formData.campaignType === "DEMAND_GEN") {
    return {
      marketingImages: formData.creative.demandGen.landscapeImages.map((image) => image.assetResourceName).filter(Boolean),
      squareMarketingImages: formData.creative.demandGen.squareImages.map((image) => image.assetResourceName).filter(Boolean),
    };
  }

  if (formData.campaignType === "PERFORMANCE_MAX") {
    return {
      marketingImages: formData.creative.performanceMax.landscapeImages.map((image) => image.assetResourceName).filter(Boolean),
      squareMarketingImages: formData.creative.performanceMax.squareImages.map((image) => image.assetResourceName).filter(Boolean),
    };
  }

  return { marketingImages: [], squareMarketingImages: [] };
}

export async function POST(request: NextRequest) {
  try {
    const { user } = await requireUser();
    const body = await request.json();
    const parsed = campaignFormSchema.parse(body) as CampaignFormData;

    const stream = new ReadableStream<Uint8Array>({
      async start(controller) {
        const state: CreationState = {};
        const supabase = createServiceClient();

        try {
          streamEvent(controller, { step: "budget", status: "running", message: "Creating budget..." });
          state.budgetResourceName = await createCampaignBudget(user.id, parsed);
          streamEvent(controller, { step: "budget", status: "success", message: "Budget created.", data: { budgetResourceName: state.budgetResourceName } });

          streamEvent(controller, { step: "campaign", status: "running", message: "Creating campaign..." });
          state.campaignResourceName = await createCampaign(user.id, parsed, state.budgetResourceName);
          streamEvent(controller, { step: "campaign", status: "success", message: "Campaign created.", data: { campaignResourceName: state.campaignResourceName } });

          streamEvent(controller, { step: "criteria", status: "running", message: "Adding location and language targeting..." });
          state.criterionCount = await createCampaignCriteria(user.id, parsed, state.campaignResourceName);
          streamEvent(controller, { step: "criteria", status: "success", message: `${state.criterionCount} targeting criteria added.` });

          streamEvent(controller, { step: "adGroup", status: "running", message: "Creating ad group..." });
          state.adGroupResourceName = await createAdGroup(user.id, parsed, state.campaignResourceName);
          streamEvent(controller, { step: "adGroup", status: "success", message: "Ad group created.", data: { adGroupResourceName: state.adGroupResourceName } });

          streamEvent(controller, { step: "keywords", status: parsed.campaignType === "SEARCH" ? "running" : "skipped", message: parsed.campaignType === "SEARCH" ? "Adding keywords..." : "Keyword step skipped for this campaign type." });
          state.keywordCount = await addKeywords(user.id, parsed, state.adGroupResourceName);
          streamEvent(controller, { step: "keywords", status: "success", message: `${state.keywordCount} keywords added.` });

          const assets = collectAssetResourceNames(parsed);
          const assetCount = assets.marketingImages.length + assets.squareMarketingImages.length;
          streamEvent(controller, { step: "assets", status: assetCount > 0 ? "success" : "skipped", message: assetCount > 0 ? `${assetCount} uploaded image assets ready.` : "No image assets required for this campaign." });

          streamEvent(controller, { step: "ad", status: "running", message: "Creating ad..." });
          state.adResourceName = await createAd(user.id, parsed, state.adGroupResourceName, assets);
          streamEvent(controller, { step: "ad", status: "success", message: "Ad created.", data: { adResourceName: state.adResourceName } });

          await supabase.from("campaigns_log").upsert(
            {
              user_id: user.id,
              campaign_resource_name: state.campaignResourceName,
              campaign_name: parsed.basics.campaignName,
              campaign_type: parsed.campaignType,
              status: parsed.basics.launchStatus,
              daily_budget_micros: dollarToMicros(parsed.basics.dailyBudget),
              start_date: parsed.basics.startDate || null,
              end_date: parsed.basics.endDate || null,
              last_synced_at: new Date().toISOString(),
            },
            { onConflict: "user_id,campaign_resource_name" },
          );

          streamEvent(controller, {
            step: "complete",
            status: "success",
            message: "Campaign live in Google Ads.",
            data: {
              success: true,
              campaignResourceName: state.campaignResourceName,
              adGroupResourceName: state.adGroupResourceName,
              adResourceName: state.adResourceName,
            },
          });
        } catch (error) {
          const message = error instanceof Error ? error.message : "Campaign creation failed.";
          streamEvent(controller, {
            step: "error",
            status: "error",
            message,
            data: {
              rollbackAwareness: "Google Ads does not support transactional rollback. Any created budget, campaign, ad group, criteria, or ads may need manual cleanup in Google Ads UI.",
              ...state,
            },
          });
        } finally {
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream; charset=utf-8",
        "Cache-Control": "no-cache, no-transform",
        Connection: "keep-alive",
      },
    });
  } catch (error) {
    return jsonError(error, 400);
  }
}
