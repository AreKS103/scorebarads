import { create } from "zustand";
import type { CampaignFormData, CampaignType, KeywordIdea, TextAssetInput } from "@/lib/types";
import { addDaysISO, todayISO } from "@/lib/utils";

const defaultHeadlines = (count: number): TextAssetInput[] => Array.from({ length: count }, () => ({ text: "", pinnedField: "" }));
const defaultDescriptions = (count: number): TextAssetInput[] => Array.from({ length: count }, () => ({ text: "", pinnedField: "" }));

export const defaultCampaignFormData: CampaignFormData = {
  campaignType: "SEARCH",
  basics: {
    campaignName: "WC2026 Search - Score Bar",
    matchEvent: "",
    dailyBudget: 25,
    lifetimeBudgetEnabled: false,
    lifetimeBudget: undefined,
    biddingStrategy: "MAXIMIZE_CLICKS",
    targetCpa: undefined,
    targetRoas: undefined,
    startDate: todayISO(),
    endDate: addDaysISO(14),
    launchStatus: "PAUSED",
  },
  targeting: {
    locationPreset: "PHNOM_PENH",
    customGeoTarget: "",
    languages: ["English", "Khmer"],
    adSchedule: [
      { day: "MONDAY", enabled: false, startHour: 17, endHour: 24 },
      { day: "TUESDAY", enabled: false, startHour: 17, endHour: 24 },
      { day: "WEDNESDAY", enabled: false, startHour: 17, endHour: 24 },
      { day: "THURSDAY", enabled: false, startHour: 17, endHour: 24 },
      { day: "FRIDAY", enabled: true, startHour: 17, endHour: 24 },
      { day: "SATURDAY", enabled: true, startHour: 17, endHour: 24 },
      { day: "SUNDAY", enabled: true, startHour: 17, endHour: 24 },
    ],
    devices: ["MOBILE", "DESKTOP", "TABLET"],
    geoRadiusKm: 5,
  },
  keywords: {
    rawKeywords: "sports bar phnom penh\nwatch football phnom penh\nworld cup bar phnom penh",
    negativeKeywords: "jobs\nrecipe\nfree stream",
    matchType: "PHRASE",
    ideas: [],
  },
  creative: {
    search: {
      headlines: [
        { text: "Watch Football Live", pinnedField: "HEADLINE_1" as const },
        { text: "Score Bar Phnom Penh", pinnedField: "" as const },
        { text: "Cold Beer Big Screens", pinnedField: "" as const },
        ...defaultHeadlines(12),
      ].slice(0, 15),
      descriptions: [
        { text: "Catch every big match at Score Sports Bar & Grill in Phnom Penh.", pinnedField: "" as const },
        { text: "Book a table for World Cup nights, live sports, food and drinks.", pinnedField: "" as const },
        ...defaultDescriptions(2),
      ].slice(0, 4),
      finalUrl: "https://scorebarphnompenh.com",
      path1: "live-sports",
      path2: "phnom-penh",
    },
    display: {
      landscapeImages: [],
      squareImages: [],
      businessName: "Score Bar",
      headlines: [{ text: "Live Sports Tonight", pinnedField: "" as const }, ...defaultHeadlines(4)].slice(0, 5),
      longHeadline: "Watch World Cup matches live at Score Sports Bar & Grill",
      descriptions: [{ text: "Big screens, cold drinks and match-night energy in Phnom Penh.", pinnedField: "" as const }, ...defaultDescriptions(4)].slice(0, 5),
      finalUrl: "https://scorebarphnompenh.com",
    },
    performanceMax: {
      landscapeImages: [],
      squareImages: [],
      logoImages: [],
      headlines: [{ text: "Score Bar Live Sports", pinnedField: "" as const }, ...defaultHeadlines(14)].slice(0, 15),
      longHeadlines: [{ text: "Watch football, rugby and fight nights live at Score Bar", pinnedField: "" as const }],
      descriptions: [{ text: "Phnom Penh sports bar with big screens, food, beer and match-night atmosphere.", pinnedField: "" as const }],
      youtubeVideoUrl: "",
      businessName: "Score Bar",
      finalUrl: "https://scorebarphnompenh.com",
    },
    video: {
      youtubeVideoUrl: "",
      adType: "SKIPPABLE_IN_STREAM",
      headline: "Watch Live Sports",
      description: "Join match night at Score Bar Phnom Penh.",
      ctaText: "Book Now",
      finalUrl: "https://scorebarphnompenh.com",
      displayUrl: "scorebarphnompenh.com",
    },
    demandGen: {
      landscapeImages: [],
      squareImages: [],
      businessName: "Score Bar",
      headlines: [{ text: "Match Night At Score", pinnedField: "" as const }, ...defaultHeadlines(4)].slice(0, 5),
      descriptions: [{ text: "Discover live sports nights, great food and drinks in Phnom Penh.", pinnedField: "" as const }, ...defaultDescriptions(4)].slice(0, 5),
      finalUrl: "https://scorebarphnompenh.com",
      ctaText: "Book Now",
    },
  },
};

type CampaignSectionKey = Exclude<keyof CampaignFormData, "campaignType">;

interface WizardStore {
  currentStep: number;
  formData: CampaignFormData;
  setStep: (step: number) => void;
  setCampaignType: (campaignType: CampaignType) => void;
  updateFormData: (data: Partial<CampaignFormData>) => void;
  updateSection: <Section extends CampaignSectionKey>(section: Section, data: Partial<CampaignFormData[Section]>) => void;
  setKeywordIdeas: (ideas: KeywordIdea[]) => void;
  reset: () => void;
}

export const useWizardStore = create<WizardStore>((set) => ({
  currentStep: 1,
  formData: defaultCampaignFormData,
  setStep: (step) => set({ currentStep: Math.min(Math.max(step, 1), 6) }),
  setCampaignType: (campaignType) => set((state) => ({ formData: { ...state.formData, campaignType } })),
  updateFormData: (data) => set((state) => ({ formData: { ...state.formData, ...data } })),
  updateSection: (section, data) =>
    set((state) => ({
      formData: {
        ...state.formData,
        [section]: {
          ...state.formData[section],
          ...data,
        },
      },
    })),
  setKeywordIdeas: (ideas) =>
    set((state) => ({
      formData: {
        ...state.formData,
        keywords: {
          ...state.formData.keywords,
          ideas,
        },
      },
    })),
  reset: () => set({ currentStep: 1, formData: defaultCampaignFormData }),
}));
