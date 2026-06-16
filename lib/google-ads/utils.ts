import type {
  CampaignFormData,
  CampaignType,
  DisplayCreative,
  KeywordInput,
  KeywordMatchType,
  PerformanceMaxCreative,
  SearchCreative,
  TextAssetInput,
} from "@/lib/types";

export const GOOGLE_ADS_API_VERSION = "v23";
export const GOOGLE_ADS_BASE_URL = `https://googleads.googleapis.com/${GOOGLE_ADS_API_VERSION}`;
export const CAMBODIA_GEO_TARGET = "geoTargetConstants/2116";
export const PHNOM_PENH_GEO_TARGET = "geoTargetConstants/1015069";
export const ENGLISH_LANGUAGE = "languageConstants/1000";

export function dollarToMicros(dollars: number): number {
  return Math.round(Number(dollars || 0) * 1_000_000);
}

export function microsToDollar(micros: number): string {
  const dollars = Number(micros || 0) / 1_000_000;
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(dollars);
}

export function formatGAQLDate(date: Date): string {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  const day = String(date.getUTCDate()).padStart(2, "0");
  // Google Ads REST fields and GAQL date literals use ISO calendar dates.
  return `${year}-${month}-${day}`;
}

export function toGoogleAdsDate(input?: string | Date): string | undefined {
  if (!input) {
    return undefined;
  }

  const date = input instanceof Date ? input : new Date(`${input}T00:00:00Z`);
  return formatGAQLDate(date);
}

export function cleanGoogleAdsName(name: string): string {
  return name.replace(/[\n\r\u0000]/g, " ").replace(/\s+/g, " ").trim();
}

export function normalizeCustomerId(customerId: string): string {
  return customerId.replace(/[^0-9]/g, "");
}

export function campaignTypeToChannelType(campaignType: CampaignType): string {
  return campaignType;
}

export function buildBiddingStrategy(formData: CampaignFormData) {
  const { biddingStrategy, targetCpa, targetRoas } = formData.basics;

  if (biddingStrategy === "MANUAL_CPC") {
    return { manualCpc: { enhancedCpcEnabled: false } };
  }

  if (biddingStrategy === "TARGET_CPA") {
    return { targetCpa: { targetCpaMicros: dollarToMicros(targetCpa || 0) } };
  }

  if (biddingStrategy === "TARGET_ROAS") {
    return { targetRoas: { targetRoas: Number(targetRoas || 0) } };
  }

  return { maximizeClicks: {} };
}

export function buildCampaignPayload(formData: CampaignFormData, budgetResourceName: string) {
  const advertisingChannelType = campaignTypeToChannelType(formData.campaignType);
  const startDate = toGoogleAdsDate(formData.basics.startDate);
  const endDate = toGoogleAdsDate(formData.basics.endDate);
  const campaign: Record<string, unknown> = {
    name: cleanGoogleAdsName(formData.basics.campaignName),
    status: formData.basics.launchStatus || "PAUSED",
    advertisingChannelType,
    campaignBudget: budgetResourceName,
    startDate,
    ...buildBiddingStrategy(formData),
  };

  if (endDate) {
    campaign.endDate = endDate;
  }

  if (formData.campaignType === "SEARCH") {
    campaign.networkSettings = {
      targetGoogleSearch: true,
      targetSearchNetwork: true,
      targetContentNetwork: false,
      targetPartnerSearchNetwork: false,
    };
    campaign.geoTargetTypeSetting = {
      positiveGeoTargetType: "PRESENCE_OR_INTEREST",
      negativeGeoTargetType: "PRESENCE",
    };
  }

  if (formData.campaignType === "PERFORMANCE_MAX") {
    campaign.advertisingChannelSubType = "PERFORMANCE_MAX";
  }

  return {
    operations: [
      {
        create: campaign,
      },
    ],
  };
}

export function buildBudgetPayload(formData: CampaignFormData) {
  const amountMicros = formData.basics.lifetimeBudgetEnabled
    ? dollarToMicros(formData.basics.lifetimeBudget || formData.basics.dailyBudget)
    : dollarToMicros(formData.basics.dailyBudget);

  return {
    operations: [
      {
        create: {
          name: `${cleanGoogleAdsName(formData.basics.campaignName)} Budget ${Date.now()}`,
          amountMicros,
          deliveryMethod: "STANDARD",
          explicitlyShared: false,
        },
      },
    ],
  };
}

export function buildAdGroupPayload(formData: CampaignFormData, campaignResourceName: string) {
  return {
    operations: [
      {
        create: {
          name: `${cleanGoogleAdsName(formData.basics.campaignName)} Ad Group`,
          campaign: campaignResourceName,
          status: formData.basics.launchStatus || "PAUSED",
          type: formData.campaignType === "SEARCH" ? "SEARCH_STANDARD" : "DISPLAY_STANDARD",
          cpcBidMicros: formData.basics.biddingStrategy === "MANUAL_CPC" ? dollarToMicros(1.25) : undefined,
        },
      },
    ],
  };
}

function inferKeywordMatchType(rawKeyword: string, fallback: KeywordMatchType): { text: string; matchType: KeywordMatchType } {
  const keyword = rawKeyword.trim();

  if (keyword.startsWith("[") && keyword.endsWith("]")) {
    return { text: keyword.slice(1, -1).trim(), matchType: "EXACT" };
  }

  if (keyword.startsWith('"') && keyword.endsWith('"')) {
    return { text: keyword.slice(1, -1).trim(), matchType: "PHRASE" };
  }

  return { text: keyword, matchType: fallback };
}

export function parseKeywords(rawKeywords: string, fallbackMatchType: KeywordMatchType): KeywordInput[] {
  return rawKeywords
    .split(/\r?\n/)
    .map((line) => inferKeywordMatchType(line, fallbackMatchType))
    .filter((keyword) => keyword.text.length > 0)
    .map((keyword) => ({ ...keyword, negative: false }));
}

export function parseNegativeKeywords(rawKeywords: string, fallbackMatchType: KeywordMatchType): KeywordInput[] {
  return rawKeywords
    .split(/\r?\n/)
    .map((line) => inferKeywordMatchType(line, fallbackMatchType))
    .filter((keyword) => keyword.text.length > 0)
    .map((keyword) => ({ ...keyword, negative: true }));
}

export function buildKeywordOperations(adGroupResourceName: string, keywords: KeywordInput[]) {
  return {
    operations: keywords.map((keyword) => ({
      create: {
        adGroup: adGroupResourceName,
        status: "ENABLED",
        negative: Boolean(keyword.negative),
        keyword: {
          text: keyword.text,
          matchType: keyword.matchType,
        },
      },
    })),
  };
}

function textAssets(items: TextAssetInput[], maxLength: number) {
  return items
    .map((item) => ({ text: item.text.trim(), pinnedField: item.pinnedField || undefined }))
    .filter((item) => item.text.length > 0 && item.text.length <= maxLength)
    .map((item) => ({
      text: item.text,
      ...(item.pinnedField ? { pinnedField: item.pinnedField } : {}),
    }));
}

export function buildRSAPayload(headlines: TextAssetInput[], descriptions: TextAssetInput[], finalUrl: string, path1?: string, path2?: string) {
  return {
    responsiveSearchAd: {
      headlines: textAssets(headlines, 30),
      descriptions: textAssets(descriptions, 90),
      path1: path1?.trim() || undefined,
      path2: path2?.trim() || undefined,
    },
    finalUrls: [finalUrl],
  };
}

export function buildRDAPayload(assets: { marketingImages: string[]; squareMarketingImages: string[] }, fields: DisplayCreative) {
  return {
    responsiveDisplayAd: {
      marketingImages: assets.marketingImages.map((asset) => ({ asset })),
      squareMarketingImages: assets.squareMarketingImages.map((asset) => ({ asset })),
      headlines: textAssets(fields.headlines, 30),
      longHeadline: { text: fields.longHeadline.trim() },
      descriptions: textAssets(fields.descriptions, 90),
      businessName: fields.businessName.trim(),
    },
    finalUrls: [fields.finalUrl],
  };
}

export function buildPerformanceMaxAssetGroupPayload(
  customerId: string,
  campaignResourceName: string,
  assets: { marketingImages: string[]; squareMarketingImages: string[]; logoImages: string[] },
  fields: PerformanceMaxCreative,
) {
  const assetGroupResourceName = `customers/${customerId}/assetGroups/${Date.now()}`;
  const operations = [
    {
      create: {
        resourceName: assetGroupResourceName,
        campaign: campaignResourceName,
        name: `${fields.businessName || "Score"} Asset Group ${Date.now()}`,
        finalUrls: [fields.finalUrl],
        finalMobileUrls: [fields.finalUrl],
        status: "ENABLED",
      },
    },
  ];

  const allLinks = [
    ...textAssets(fields.headlines, 30).map((asset) => ({ fieldType: "HEADLINE", textAsset: asset })),
    ...textAssets(fields.longHeadlines, 90).map((asset) => ({ fieldType: "LONG_HEADLINE", textAsset: asset })),
    ...textAssets(fields.descriptions, 90).map((asset) => ({ fieldType: "DESCRIPTION", textAsset: asset })),
    ...assets.marketingImages.map((asset) => ({ fieldType: "MARKETING_IMAGE", asset })),
    ...assets.squareMarketingImages.map((asset) => ({ fieldType: "SQUARE_MARKETING_IMAGE", asset })),
    ...assets.logoImages.map((asset) => ({ fieldType: "LOGO", asset })),
  ];

  return { assetGroupResourceName, operations, allLinks };
}

export function buildAdPayload(formData: CampaignFormData, adGroupResourceName: string, uploadedAssets: { marketingImages: string[]; squareMarketingImages: string[] }) {
  if (formData.campaignType === "SEARCH") {
    return {
      operations: [
        {
          create: {
            adGroup: adGroupResourceName,
            status: formData.basics.launchStatus || "PAUSED",
            ad: buildRSAPayload(
              formData.creative.search.headlines,
              formData.creative.search.descriptions,
              formData.creative.search.finalUrl,
              formData.creative.search.path1,
              formData.creative.search.path2,
            ),
          },
        },
      ],
    };
  }

  if (formData.campaignType === "DISPLAY") {
    return {
      operations: [
        {
          create: {
            adGroup: adGroupResourceName,
            status: formData.basics.launchStatus || "PAUSED",
            ad: buildRDAPayload(uploadedAssets, formData.creative.display),
          },
        },
      ],
    };
  }

  if (formData.campaignType === "VIDEO") {
    return {
      operations: [
        {
          create: {
            adGroup: adGroupResourceName,
            status: formData.basics.launchStatus || "PAUSED",
            ad: {
              videoAd: {
                video: { youtubeVideoId: extractYouTubeVideoId(formData.creative.video.youtubeVideoUrl) },
                inStream: {
                  actionButtonLabel: formData.creative.video.ctaText,
                  actionHeadline: formData.creative.video.headline,
                  companionBanner: undefined,
                },
              },
              finalUrls: [formData.creative.video.finalUrl],
              displayUrl: formData.creative.video.displayUrl,
            },
          },
        },
      ],
    };
  }

  return {
    operations: [
      {
        create: {
          adGroup: adGroupResourceName,
          status: formData.basics.launchStatus || "PAUSED",
          ad: buildRDAPayload(
            {
              marketingImages: uploadedAssets.marketingImages,
              squareMarketingImages: uploadedAssets.squareMarketingImages,
            },
            {
              ...formData.creative.demandGen,
              longHeadline: formData.creative.demandGen.headlines[0]?.text || "Score Sports Bar & Grill",
            },
          ),
        },
      },
    ],
  };
}

export function extractYouTubeVideoId(url: string): string {
  const trimmed = url.trim();
  const patterns = [
    /youtu\.be\/([a-zA-Z0-9_-]{11})/,
    /youtube\.com\/watch\?v=([a-zA-Z0-9_-]{11})/,
    /youtube\.com\/embed\/([a-zA-Z0-9_-]{11})/,
    /youtube\.com\/shorts\/([a-zA-Z0-9_-]{11})/,
  ];

  for (const pattern of patterns) {
    const match = trimmed.match(pattern);
    if (match?.[1]) {
      return match[1];
    }
  }

  return trimmed.length === 11 ? trimmed : "";
}

export function getGeoTargetConstants(formData: CampaignFormData): string[] {
  if (formData.targeting.locationPreset === "PHNOM_PENH" || formData.targeting.locationPreset === "BKK1_5KM") {
    return [PHNOM_PENH_GEO_TARGET];
  }

  if (formData.targeting.locationPreset === "CUSTOM" && formData.targeting.customGeoTarget) {
    return [formData.targeting.customGeoTarget];
  }

  return [CAMBODIA_GEO_TARGET];
}

export function buildCampaignCriterionPayload(formData: CampaignFormData, campaignResourceName: string) {
  const geoOperations = getGeoTargetConstants(formData).map((geoTargetConstant) => ({
    create: {
      campaign: campaignResourceName,
      location: { geoTargetConstant },
    },
  }));

  const languageOperations = formData.targeting.languages.map((language) => {
    const languageConstant = language === "Khmer" ? "languageConstants/1072" : language === "Korean" ? "languageConstants/1012" : language === "French" ? "languageConstants/1002" : ENGLISH_LANGUAGE;
    return {
      create: {
        campaign: campaignResourceName,
        language: { languageConstant },
      },
    };
  });

  const adScheduleOperations = formData.targeting.adSchedule
    .filter((block) => block.enabled)
    .map((block) => ({
      create: {
        campaign: campaignResourceName,
        adSchedule: {
          dayOfWeek: block.day,
          startHour: block.startHour,
          startMinute: "ZERO",
          endHour: block.endHour,
          endMinute: "ZERO",
        },
      },
    }));

  // Google Ads targets all devices by default. If the form excludes a device,
  // create a device criterion with bidModifier -1 to opt out of that device.
  const allDevices: Array<"MOBILE" | "DESKTOP" | "TABLET"> = ["MOBILE", "DESKTOP", "TABLET"];
  const selectedDevices = new Set(formData.targeting.devices);
  const deviceOperations = allDevices
    .filter((device) => !selectedDevices.has(device))
    .map((device) => ({
      create: {
        campaign: campaignResourceName,
        device: { type: device },
        bidModifier: -1,
      },
    }));

  return {
    operations: [...geoOperations, ...languageOperations, ...adScheduleOperations, ...deviceOperations],
  };
}

export function resourceIdFromName(resourceName: string): string {
  return resourceName.split("/").pop() || resourceName;
}
