export type CampaignType = "SEARCH" | "DISPLAY" | "PERFORMANCE_MAX" | "VIDEO" | "DEMAND_GEN";

export type LaunchStatus = "ENABLED" | "PAUSED";

export type KeywordMatchType = "BROAD" | "PHRASE" | "EXACT";

export type BiddingStrategy = "MANUAL_CPC" | "MAXIMIZE_CLICKS" | "TARGET_CPA" | "TARGET_ROAS";

export type LocationPreset = "CAMBODIA" | "PHNOM_PENH" | "BKK1_5KM" | "CUSTOM";

export type LanguageOption = "English" | "Khmer" | "Korean" | "French";

export type DeviceOption = "MOBILE" | "DESKTOP" | "TABLET";

export type DayOfWeek = "MONDAY" | "TUESDAY" | "WEDNESDAY" | "THURSDAY" | "FRIDAY" | "SATURDAY" | "SUNDAY";

export interface AdScheduleBlock {
  day: DayOfWeek;
  enabled: boolean;
  startHour: number;
  endHour: number;
}

export interface TextAssetInput {
  text: string;
  pinnedField?: "HEADLINE_1" | "HEADLINE_2" | "HEADLINE_3" | "";
}

export interface UploadedImageAsset {
  id: string;
  fileName: string;
  storagePath: string;
  assetResourceName: string;
  width: number;
  height: number;
  mimeType: string;
  previewUrl?: string;
}

export interface CampaignBasics {
  campaignName: string;
  matchEvent?: string;
  dailyBudget: number;
  lifetimeBudgetEnabled: boolean;
  lifetimeBudget?: number;
  biddingStrategy: BiddingStrategy;
  targetCpa?: number;
  targetRoas?: number;
  startDate: string;
  endDate?: string;
  launchStatus: LaunchStatus;
}

export interface CampaignTargeting {
  locationPreset: LocationPreset;
  customGeoTarget?: string;
  languages: LanguageOption[];
  adSchedule: AdScheduleBlock[];
  devices: DeviceOption[];
  geoRadiusKm?: number;
}

export interface CampaignKeywords {
  rawKeywords: string;
  negativeKeywords: string;
  matchType: KeywordMatchType;
  ideas: KeywordIdea[];
}

export interface SearchCreative {
  headlines: TextAssetInput[];
  descriptions: TextAssetInput[];
  finalUrl: string;
  path1?: string;
  path2?: string;
}

export interface DisplayCreative {
  landscapeImages: UploadedImageAsset[];
  squareImages: UploadedImageAsset[];
  businessName: string;
  headlines: TextAssetInput[];
  longHeadline: string;
  descriptions: TextAssetInput[];
  finalUrl: string;
}

export interface PerformanceMaxCreative {
  landscapeImages: UploadedImageAsset[];
  squareImages: UploadedImageAsset[];
  logoImages: UploadedImageAsset[];
  headlines: TextAssetInput[];
  longHeadlines: TextAssetInput[];
  descriptions: TextAssetInput[];
  youtubeVideoUrl?: string;
  businessName: string;
  finalUrl: string;
}

export interface VideoCreative {
  youtubeVideoUrl: string;
  adType: "SKIPPABLE_IN_STREAM";
  headline: string;
  description: string;
  ctaText: string;
  finalUrl: string;
  displayUrl: string;
}

export interface DemandGenCreative {
  landscapeImages: UploadedImageAsset[];
  squareImages: UploadedImageAsset[];
  businessName: string;
  headlines: TextAssetInput[];
  descriptions: TextAssetInput[];
  finalUrl: string;
  ctaText?: string;
}

export interface CampaignCreative {
  search: SearchCreative;
  display: DisplayCreative;
  performanceMax: PerformanceMaxCreative;
  video: VideoCreative;
  demandGen: DemandGenCreative;
}

export interface CampaignFormData {
  campaignType: CampaignType;
  basics: CampaignBasics;
  targeting: CampaignTargeting;
  keywords: CampaignKeywords;
  creative: CampaignCreative;
}

export interface KeywordInput {
  text: string;
  matchType: KeywordMatchType;
  negative?: boolean;
}

export interface KeywordIdea {
  keyword: string;
  avgMonthlySearches: number;
  competitionIndex: number;
  lowTopOfPageBidMicros: number;
  highTopOfPageBidMicros: number;
  selected?: boolean;
}

export interface CampaignSummary {
  id?: string;
  campaignResourceName: string;
  campaignName: string;
  campaignType: CampaignType;
  status: "ENABLED" | "PAUSED" | "REMOVED" | "UNKNOWN";
  dailyBudgetMicros: number;
  startDate?: string | null;
  endDate?: string | null;
  impressions: number;
  clicks: number;
  spendMicros: number;
  conversions: number;
  ctr: number;
  avgCpcMicros: number;
  lastSyncedAt?: string | null;
}

export interface CampaignReportPoint {
  date: string;
  impressions: number;
  clicks: number;
  spendMicros: number;
  ctr: number;
  conversions: number;
  avgCpcMicros: number;
}

export interface GoogleAdsCredentials {
  id: string;
  user_id: string;
  client_id: string;
  client_secret: string;
  refresh_token: string | null;
  developer_token: string;
  customer_id: string | null;
  manager_customer_id: string | null;
  created_at: string;
  updated_at?: string;
}

export interface GoogleAdsAuthContext {
  accessToken: string;
  developerToken: string;
  customerId: string;
  managerCustomerId?: string | null;
  clientId: string;
  clientSecret: string;
  refreshToken: string;
}

export interface PushProgressEvent {
  step: string;
  status: "pending" | "running" | "success" | "error" | "skipped";
  message: string;
  data?: Record<string, unknown>;
}
