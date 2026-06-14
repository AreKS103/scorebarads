import { NextRequest } from "next/server";
import { jsonError, jsonSuccess, requireUser } from "@/lib/api";
import { callGoogleAdsAPI, getGoogleAdsAuthContext } from "@/lib/google-ads/auth";
import { resourceIdFromName } from "@/lib/google-ads/utils";

export const dynamic = "force-dynamic";

function rowsFromStream(response: any) {
  return Array.isArray(response) ? response.flatMap((chunk) => chunk.results || []) : [];
}

async function runQuery(userId: string, query: string) {
  const auth = await getGoogleAdsAuthContext(userId);
  const response = await callGoogleAdsAPI("googleAds:searchStream", "POST", { query }, auth.accessToken, auth.developerToken, auth.customerId, auth.managerCustomerId);
  return rowsFromStream(response);
}

export async function GET(_request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { user } = await requireUser();
    const campaignResourceName = decodeURIComponent(params.id);
    const campaignId = resourceIdFromName(campaignResourceName);

    const [campaignRows, adGroupRows, keywordRows, adRows] = await Promise.all([
      runQuery(user.id, `SELECT campaign.resource_name, campaign.name, campaign.status, campaign.advertising_channel_type, campaign_budget.resource_name, campaign_budget.amount_micros FROM campaign WHERE campaign.id = ${campaignId} LIMIT 1`),
      runQuery(user.id, `SELECT ad_group.resource_name, ad_group.name, ad_group.status, metrics.impressions, metrics.clicks, metrics.ctr, metrics.average_cpc FROM ad_group WHERE campaign.id = ${campaignId} AND segments.date DURING LAST_30_DAYS`),
      runQuery(user.id, `SELECT ad_group.name, ad_group.resource_name, ad_group_criterion.resource_name, ad_group_criterion.status, ad_group_criterion.keyword.text, ad_group_criterion.keyword.match_type, ad_group_criterion.quality_info.quality_score, metrics.impressions, metrics.clicks, metrics.ctr, metrics.average_cpc FROM keyword_view WHERE campaign.id = ${campaignId} AND segments.date DURING LAST_30_DAYS`),
      runQuery(user.id, `SELECT ad_group.name, ad_group_ad.resource_name, ad_group_ad.status, ad_group_ad.ad.type, metrics.impressions, metrics.clicks, metrics.ctr, metrics.average_cpc FROM ad_group_ad WHERE campaign.id = ${campaignId} AND segments.date DURING LAST_30_DAYS`),
    ]);

    const campaignRow = campaignRows[0];
    return jsonSuccess({
      campaign: campaignRow ? {
        resourceName: campaignRow.campaign.resourceName,
        name: campaignRow.campaign.name,
        status: campaignRow.campaign.status,
        type: campaignRow.campaign.advertisingChannelType,
        budgetResourceName: campaignRow.campaignBudget?.resourceName,
        budgetMicros: Number(campaignRow.campaignBudget?.amountMicros || 0),
      } : null,
      adGroups: adGroupRows.map((row: any) => ({
        resourceName: row.adGroup.resourceName,
        name: row.adGroup.name,
        status: row.adGroup.status,
        impressions: Number(row.metrics?.impressions || 0),
        clicks: Number(row.metrics?.clicks || 0),
        ctr: Number(row.metrics?.ctr || 0),
        avgCpcMicros: Number(row.metrics?.averageCpc || 0),
      })),
      keywords: keywordRows.map((row: any) => ({
        resourceName: row.adGroupCriterion.resourceName,
        adGroupResourceName: row.adGroup.resourceName,
        adGroupName: row.adGroup.name,
        text: row.adGroupCriterion.keyword?.text || "",
        matchType: row.adGroupCriterion.keyword?.matchType || "BROAD",
        qualityScore: Number(row.adGroupCriterion.qualityInfo?.qualityScore || 0),
        status: row.adGroupCriterion.status,
        impressions: Number(row.metrics?.impressions || 0),
        clicks: Number(row.metrics?.clicks || 0),
        ctr: Number(row.metrics?.ctr || 0),
        avgCpcMicros: Number(row.metrics?.averageCpc || 0),
      })),
      ads: adRows.map((row: any) => ({
        resourceName: row.adGroupAd.resourceName,
        adGroupName: row.adGroup.name,
        status: row.adGroupAd.status,
        type: row.adGroupAd.ad?.type || "UNKNOWN",
        impressions: Number(row.metrics?.impressions || 0),
        clicks: Number(row.metrics?.clicks || 0),
        ctr: Number(row.metrics?.ctr || 0),
        avgCpcMicros: Number(row.metrics?.averageCpc || 0),
      })),
    });
  } catch (error) {
    return jsonError(error, 400);
  }
}
