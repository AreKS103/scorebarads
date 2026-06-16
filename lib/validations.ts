import { z } from "zod";

const nonEmpty = z.string().trim().min(1, "Required");
const url = z.string().trim().url("Enter a valid URL.");
const optionalUrl = z.string().trim().optional().or(z.literal(""));

export const campaignTypeSchema = z.enum(["SEARCH", "DISPLAY", "PERFORMANCE_MAX", "VIDEO", "DEMAND_GEN"]);
export const launchStatusSchema = z.enum(["ENABLED", "PAUSED"]);
export const matchTypeSchema = z.enum(["BROAD", "PHRASE", "EXACT"]);
export const biddingStrategySchema = z.enum(["MANUAL_CPC", "MAXIMIZE_CLICKS", "TARGET_CPA", "TARGET_ROAS"]);

export const textAssetSchema = z.object({
  text: z.string(),
  pinnedField: z.enum(["HEADLINE_1", "HEADLINE_2", "HEADLINE_3", ""]).optional(),
});

export const uploadedImageAssetSchema = z.object({
  id: z.string().min(1),
  fileName: z.string().min(1),
  storagePath: z.string().min(1),
  assetResourceName: z.string().min(1),
  width: z.number().nonnegative(),
  height: z.number().nonnegative(),
  mimeType: z.string().min(1),
  previewUrl: z.string().optional(),
});

export const basicsSchema = z
  .object({
    campaignName: nonEmpty.max(255, "Campaign names must be shorter than 255 characters."),
    matchEvent: z.string().optional(),
    dailyBudget: z.coerce.number().positive("Daily budget must be greater than zero."),
    lifetimeBudgetEnabled: z.boolean(),
    lifetimeBudget: z.coerce.number().optional(),
    biddingStrategy: biddingStrategySchema,
    targetCpa: z.coerce.number().optional(),
    targetRoas: z.coerce.number().optional(),
    startDate: nonEmpty,
    endDate: z.string().optional(),
    launchStatus: launchStatusSchema.default("PAUSED"),
  })
  .superRefine((value, context) => {
    if (value.lifetimeBudgetEnabled && (!value.lifetimeBudget || value.lifetimeBudget <= 0)) {
      context.addIssue({ code: z.ZodIssueCode.custom, path: ["lifetimeBudget"], message: "Lifetime budget must be greater than zero." });
    }

    if (value.biddingStrategy === "TARGET_CPA" && (!value.targetCpa || value.targetCpa <= 0)) {
      context.addIssue({ code: z.ZodIssueCode.custom, path: ["targetCpa"], message: "Target CPA must be greater than zero." });
    }

    if (value.biddingStrategy === "TARGET_ROAS" && (!value.targetRoas || value.targetRoas <= 0)) {
      context.addIssue({ code: z.ZodIssueCode.custom, path: ["targetRoas"], message: "Target ROAS must be greater than zero." });
    }

    if (value.endDate && value.startDate && value.endDate < value.startDate) {
      context.addIssue({ code: z.ZodIssueCode.custom, path: ["endDate"], message: "End date must be after the start date." });
    }
  });

export const targetingSchema = z
  .object({
    locationPreset: z.enum(["CAMBODIA", "PHNOM_PENH", "BKK1_5KM", "CUSTOM"]),
    customGeoTarget: z.string().optional(),
    languages: z.array(z.enum(["English", "Khmer", "Korean", "French"])).min(1, "Choose at least one language."),
    adSchedule: z.array(
      z.object({
        day: z.enum(["MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY", "SATURDAY", "SUNDAY"]),
        enabled: z.boolean(),
        startHour: z.coerce.number().min(0).max(23),
        endHour: z.coerce.number().min(1).max(24),
      }),
    ),
    devices: z.array(z.enum(["MOBILE", "DESKTOP", "TABLET"])).min(1, "Choose at least one device."),
    geoRadiusKm: z.coerce.number().positive().optional(),
  })
  .superRefine((value, context) => {
    value.adSchedule.forEach((block, index) => {
      if (block.enabled && block.endHour <= block.startHour) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["adSchedule", index, "endHour"],
          message: "End time must be after the start time.",
        });
      }
    });
  });

export const keywordsSchema = z.object({
  rawKeywords: z.string(),
  negativeKeywords: z.string(),
  matchType: matchTypeSchema,
  ideas: z.array(
    z.object({
      keyword: z.string(),
      avgMonthlySearches: z.number(),
      competitionIndex: z.number(),
      lowTopOfPageBidMicros: z.number(),
      highTopOfPageBidMicros: z.number(),
      selected: z.boolean().optional(),
    }),
  ),
});

const searchCreativeSchema = z.object({
  headlines: z.array(textAssetSchema),
  descriptions: z.array(textAssetSchema),
  finalUrl: url,
  path1: z.string().max(15, "Path 1 must be 15 characters or fewer.").optional(),
  path2: z.string().max(15, "Path 2 must be 15 characters or fewer.").optional(),
});

const displayCreativeSchema = z.object({
  landscapeImages: z.array(uploadedImageAssetSchema),
  squareImages: z.array(uploadedImageAssetSchema),
  businessName: nonEmpty.max(25, "Business name must be 25 characters or fewer."),
  headlines: z.array(textAssetSchema),
  longHeadline: nonEmpty.max(90, "Long headline must be 90 characters or fewer."),
  descriptions: z.array(textAssetSchema),
  finalUrl: url,
});

const performanceMaxCreativeSchema = z.object({
  landscapeImages: z.array(uploadedImageAssetSchema),
  squareImages: z.array(uploadedImageAssetSchema),
  logoImages: z.array(uploadedImageAssetSchema),
  headlines: z.array(textAssetSchema),
  longHeadlines: z.array(textAssetSchema),
  descriptions: z.array(textAssetSchema),
  youtubeVideoUrl: optionalUrl,
  businessName: nonEmpty.max(25, "Business name must be 25 characters or fewer."),
  finalUrl: url,
});

const videoCreativeSchema = z.object({
  youtubeVideoUrl: z.string(),
  adType: z.literal("SKIPPABLE_IN_STREAM"),
  headline: nonEmpty.max(30, "Headline must be 30 characters or fewer."),
  description: nonEmpty.max(90, "Description must be 90 characters or fewer."),
  ctaText: nonEmpty.max(10, "CTA text must be 10 characters or fewer."),
  finalUrl: z.string(),
  displayUrl: z.string(),
});

const demandGenCreativeSchema = z.object({
  landscapeImages: z.array(uploadedImageAssetSchema),
  squareImages: z.array(uploadedImageAssetSchema),
  businessName: nonEmpty.max(25, "Business name must be 25 characters or fewer."),
  headlines: z.array(textAssetSchema),
  descriptions: z.array(textAssetSchema),
  finalUrl: url,
  ctaText: z.string().max(10).optional(),
});

export const creativeSchema = z.object({
  search: searchCreativeSchema,
  display: displayCreativeSchema,
  performanceMax: performanceMaxCreativeSchema,
  video: videoCreativeSchema,
  demandGen: demandGenCreativeSchema,
});

function countTextAssets(items: Array<{ text: string }>, limit: number) {
  return items.filter((item) => item.text.trim().length > 0 && item.text.trim().length <= limit).length;
}

export const campaignFormSchema = z
  .object({
    campaignType: campaignTypeSchema,
    basics: basicsSchema,
    targeting: targetingSchema,
    keywords: keywordsSchema,
    creative: creativeSchema,
  })
  .superRefine((value, context) => {
    if (value.campaignType === "SEARCH") {
      if (value.keywords.rawKeywords.split(/\r?\n/).filter((line) => line.trim()).length < 1) {
        context.addIssue({ code: z.ZodIssueCode.custom, path: ["keywords", "rawKeywords"], message: "Add at least one search keyword." });
      }

      if (countTextAssets(value.creative.search.headlines, 30) < 3) {
        context.addIssue({ code: z.ZodIssueCode.custom, path: ["creative", "search", "headlines"], message: "Responsive Search Ads need at least 3 valid headlines." });
      }

      if (countTextAssets(value.creative.search.descriptions, 90) < 2) {
        context.addIssue({ code: z.ZodIssueCode.custom, path: ["creative", "search", "descriptions"], message: "Responsive Search Ads need at least 2 valid descriptions." });
      }
    }

    if (value.campaignType === "DISPLAY") {
      if (value.creative.display.landscapeImages.length < 1 || value.creative.display.squareImages.length < 1) {
        context.addIssue({ code: z.ZodIssueCode.custom, path: ["creative", "display", "landscapeImages"], message: "Responsive Display Ads need at least one landscape and one square image." });
      }

      if (countTextAssets(value.creative.display.headlines, 30) < 1 || countTextAssets(value.creative.display.descriptions, 90) < 1) {
        context.addIssue({ code: z.ZodIssueCode.custom, path: ["creative", "display", "headlines"], message: "Add at least one headline and one description." });
      }
    }

    if (value.campaignType === "PERFORMANCE_MAX") {
      if (value.creative.performanceMax.landscapeImages.length + value.creative.performanceMax.squareImages.length < 1) {
        context.addIssue({ code: z.ZodIssueCode.custom, path: ["creative", "performanceMax", "landscapeImages"], message: "Performance Max needs at least one image asset." });
      }

      if (countTextAssets(value.creative.performanceMax.headlines, 30) < 1) {
        context.addIssue({ code: z.ZodIssueCode.custom, path: ["creative", "performanceMax", "headlines"], message: "Performance Max needs at least one headline." });
      }
    }

    if (value.campaignType === "VIDEO") {
      if (!/youtu\.be|youtube\.com|^[a-zA-Z0-9_-]{11}$/.test(value.creative.video.youtubeVideoUrl.trim())) {
        context.addIssue({ code: z.ZodIssueCode.custom, path: ["creative", "video", "youtubeVideoUrl"], message: "Enter a valid YouTube URL." });
      }

      if (!z.string().url().safeParse(value.creative.video.finalUrl).success) {
        context.addIssue({ code: z.ZodIssueCode.custom, path: ["creative", "video", "finalUrl"], message: "Enter a valid final URL." });
      }

      if (!value.creative.video.displayUrl.trim()) {
        context.addIssue({ code: z.ZodIssueCode.custom, path: ["creative", "video", "displayUrl"], message: "Enter a display URL." });
      }
    }

    if (value.campaignType === "DEMAND_GEN") {
      if (value.creative.demandGen.landscapeImages.length + value.creative.demandGen.squareImages.length < 1) {
        context.addIssue({ code: z.ZodIssueCode.custom, path: ["creative", "demandGen", "landscapeImages"], message: "Demand Gen needs at least one image asset." });
      }
    }
  });

export const connectCredentialsSchema = z.object({
  developerToken: nonEmpty,
  clientId: nonEmpty,
  clientSecret: nonEmpty,
  customerId: z.string().regex(/^[0-9-]+$/, "Use a Google Ads account ID with digits and optional hyphens."),
  managerCustomerId: z.string().regex(/^[0-9-]*$/, "Use digits and optional hyphens.").optional(),
});

export type CampaignFormValues = z.infer<typeof campaignFormSchema>;
