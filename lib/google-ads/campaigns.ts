import type { SupabaseClient } from "@supabase/supabase-js";
import { callGoogleAdsAPI, getGoogleAdsAuthContext } from "@/lib/google-ads/auth";
import {
  buildAdGroupPayload,
  buildAdPayload,
  buildBudgetPayload,
  buildCampaignCriterionPayload,
  buildCampaignPayload,
  buildKeywordOperations,
  dollarToMicros,
  parseKeywords,
  parseNegativeKeywords,
  resourceIdFromName,
} from "@/lib/google-ads/utils";
import type { CampaignFormData, CampaignReportPoint, CampaignSummary } from "@/lib/types";

export interface CreationState {
  budgetResourceName?: string;
  campaignResourceName?: string;
  adGroupResourceName?: string;
  adResourceName?: string;
  keywordCount?: number;
  criterionCount?: number;
}

export async function createCampaignBudget(userId: string, formData: CampaignFormData) {
  const auth = await getGoogleAdsAuthContext(userId);
  const response = await callGoogleAdsAPI(
    "campaignBudgets:mutate",
    "POST",
    buildBudgetPayload(formData),
    auth.accessToken,
    auth.developerToken,
    auth.customerId,
    auth.managerCustomerId,
  );
  return response.results?.[0]?.resourceName as string;
}

export async function createCampaign(userId: string, formData: CampaignFormData, budgetResourceName: string) {
  const auth = await getGoogleAdsAuthContext(userId);
  const response = await callGoogleAdsAPI(
    "campaigns:mutate",
    "POST",
    buildCampaignPayload(formData, budgetResourceName),
    auth.accessToken,
    auth.developerToken,
    auth.customerId,
    auth.managerCustomerId,
  );
  return response.results?.[0]?.resourceName as string;
}

export async function createCampaignCriteria(userId: string, formData: CampaignFormData, campaignResourceName: string) {
  const auth = await getGoogleAdsAuthContext(userId);
  const payload = buildCampaignCriterionPayload(formData, campaignResourceName);

  if (payload.operations.length === 0) {
    return 0;
  }

  const response = await callGoogleAdsAPI(
    "campaignCriteria:mutate",
    "POST",
    payload,
    auth.accessToken,
    auth.developerToken,
    auth.customerId,
    auth.managerCustomerId,
  );

  return response.results?.length || 0;
}

export async function createAdGroup(userId: string, formData: CampaignFormData, campaignResourceName: string) {
  const auth = await getGoogleAdsAuthContext(userId);
  const response = await callGoogleAdsAPI(
    "adGroups:mutate",
    "POST",
    buildAdGroupPayload(formData, campaignResourceName),
    auth.accessToken,
    auth.developerToken,
    auth.customerId,
    auth.managerCustomerId,
  );
  return response.results?.[0]?.resourceName as string;
}

export async function addKeywords(userId: string, formData: CampaignFormData, adGroupResourceName: string) {
  if (formData.campaignType !== "SEARCH") {
    return 0;
  }

  const keywords = [
    ...parseKeywords(formData.keywords.rawKeywords, formData.keywords.matchType),
    ...parseNegativeKeywords(formData.keywords.negativeKeywords, formData.keywords.matchType),
  ];

  if (keywords.length === 0) {
    return 0;
  }

  const auth = await getGoogleAdsAuthContext(userId);
  const response = await callGoogleAdsAPI(
    "adGroupCriteria:mutate",
    "POST",
    buildKeywordOperations(adGroupResourceName, keywords),
    auth.accessToken,
    auth.developerToken,
    auth.customerId,
    auth.managerCustomerId,
  );

  return response.results?.length || 0;
}

export async function createAd(userId: string, formData: CampaignFormData, adGroupResourceName: string, assets: { marketingImages: string[]; squareMarketingImages: string[] }) {
  const auth = await getGoogleAdsAuthContext(userId);
  const response = await callGoogleAdsAPI(
    "adGroupAds:mutate",
    "POST",
    buildAdPayload(formData, adGroupResourceName, assets),
    auth.accessToken,
    auth.developerToken,
    auth.customerId,
    auth.managerCustomerId,
  );
  return response.results?.[0]?.resourceName as string;
}

export async function updateCampaignStatus(userId: string, campaignResourceName: string, status: "ENABLED" | "PAUSED") {
  const auth = await getGoogleAdsAuthContext(userId);
  return callGoogleAdsAPI(
    "campaigns:mutate",
    "POST",
    {
      operations: [
        {
          updateMask: "status",
          update: {
            resourceName: campaignResourceName,
            status,
          },
        },
      ],
    },
    auth.accessToken,
    auth.developerToken,
    auth.customerId,
    auth.managerCustomerId,
  );
}

export async function updateCampaignBudget(userId: string, budgetResourceName: string, dollars: number) {
  const auth = await getGoogleAdsAuthContext(userId);
  return callGoogleAdsAPI(
    "campaignBudgets:mutate",
    "POST",
    {
      operations: [
        {
          updateMask: "amount_micros",
          update: {
            resourceName: budgetResourceName,
            amountMicros: dollarToMicros(dollars),
          },
        },
      ],
    },
    auth.accessToken,
    auth.developerToken,
    auth.customerId,
    auth.managerCustomerId,
  );
}

export async function listCampaignsFromGoogleAds(userId: string): Promise<CampaignSummary[]> {
  const auth = await getGoogleAdsAuthContext(userId);
  const response = await callGoogleAdsAPI(
    "googleAds:searchStream",
    "POST",
    {
      query: "SELECT campaign.resource_name, campaign.name, campaign.status, campaign.advertising_channel_type, campaign_budget.amount_micros, campaign.start_date, campaign.end_date, metrics.impressions, metrics.clicks, metrics.cost_micros, metrics.ctr, metrics.average_cpc, metrics.conversions FROM campaign WHERE segments.date DURING LAST_7_DAYS ORDER BY campaign.name",
    },
    auth.accessToken,
    auth.developerToken,
    auth.customerId,
    auth.managerCustomerId,
  );

  const rows = Array.isArray(response) ? response.flatMap((chunk) => chunk.results || []) : [];
  return rows.map((row: any) => ({
    campaignResourceName: row.campaign.resourceName,
    campaignName: row.campaign.name,
    campaignType: row.campaign.advertisingChannelType,
    status: row.campaign.status,
    dailyBudgetMicros: Number(row.campaignBudget?.amountMicros || 0),
    startDate: row.campaign.startDate || null,
    endDate: row.campaign.endDate || null,
    impressions: Number(row.metrics?.impressions || 0),
    clicks: Number(row.metrics?.clicks || 0),
    spendMicros: Number(row.metrics?.costMicros || 0),
    conversions: Number(row.metrics?.conversions || 0),
    ctr: Number(row.metrics?.ctr || 0),
    avgCpcMicros: Number(row.metrics?.averageCpc || 0),
    lastSyncedAt: new Date().toISOString(),
  }));
}

export async function syncCampaignLogs(supabase: SupabaseClient, userId: string, campaigns: CampaignSummary[]) {
  if (campaigns.length === 0) {
    return [];
  }

  const rows = campaigns.map((campaign) => ({
    user_id: userId,
    campaign_resource_name: campaign.campaignResourceName,
    campaign_name: campaign.campaignName,
    campaign_type: campaign.campaignType,
    status: campaign.status,
    daily_budget_micros: campaign.dailyBudgetMicros,
    start_date: campaign.startDate,
    end_date: campaign.endDate,
    last_synced_at: campaign.lastSyncedAt,
    impressions: campaign.impressions,
    clicks: campaign.clicks,
    spend_micros: campaign.spendMicros,
    conversions: campaign.conversions,
    ctr: campaign.ctr,
    avg_cpc_micros: campaign.avgCpcMicros,
  }));

  const { data, error } = await supabase
    .from("campaigns_log")
    .upsert(rows, { onConflict: "user_id,campaign_resource_name" })
    .select();

  if (error) {
    throw new Error(error.message);
  }

  return data;
}

export async function getCampaignReport(userId: string, campaignResourceName: string, from: string, to: string): Promise<CampaignReportPoint[]> {
  const auth = await getGoogleAdsAuthContext(userId);
  const campaignId = resourceIdFromName(campaignResourceName);
  const response = await callGoogleAdsAPI(
    "googleAds:searchStream",
    "POST",
    {
      query: `SELECT segments.date, campaign.id, campaign.name, metrics.impressions, metrics.clicks, metrics.cost_micros, metrics.ctr, metrics.conversions, metrics.average_cpc FROM campaign WHERE campaign.id = ${campaignId} AND segments.date BETWEEN '${from}' AND '${to}' ORDER BY segments.date`,
    },
    auth.accessToken,
    auth.developerToken,
    auth.customerId,
    auth.managerCustomerId,
  );

  const rows = Array.isArray(response) ? response.flatMap((chunk) => chunk.results || []) : [];
  return rows.map((row: any) => ({
    date: row.segments.date,
    impressions: Number(row.metrics?.impressions || 0),
    clicks: Number(row.metrics?.clicks || 0),
    spendMicros: Number(row.metrics?.costMicros || 0),
    ctr: Number(row.metrics?.ctr || 0),
    conversions: Number(row.metrics?.conversions || 0),
    avgCpcMicros: Number(row.metrics?.averageCpc || 0),
  }));
}

export async function getCampaignDetailRows(userId: string, campaignResourceName: string) {
  const auth = await getGoogleAdsAuthContext(userId);
  const campaignId = resourceIdFromName(campaignResourceName);
  return callGoogleAdsAPI(
    "googleAds:searchStream",
    "POST",
    {
      query: `SELECT campaign.resource_name, campaign.name, campaign.status, campaign_budget.resource_name, campaign_budget.amount_micros, ad_group.resource_name, ad_group.name, ad_group.status, ad_group_criterion.resource_name, ad_group_criterion.keyword.text, ad_group_criterion.keyword.match_type, ad_group_criterion.quality_info.quality_score, ad_group_ad.resource_name, ad_group_ad.status, metrics.impressions, metrics.clicks, metrics.ctr, metrics.average_cpc FROM ad_group_ad WHERE campaign.id = ${campaignId} AND segments.date DURING LAST_30_DAYS`,
    },
    auth.accessToken,
    auth.developerToken,
    auth.customerId,
    auth.managerCustomerId,
  );
}
