import { GoogleAdsAPIError, callGoogleAdsAPI, getGoogleAdsAuthContext } from "@/lib/google-ads/auth";
import { CAMBODIA_GEO_TARGET, ENGLISH_LANGUAGE } from "@/lib/google-ads/utils";
import type { KeywordIdea } from "@/lib/types";

export async function getKeywordIdeas(userId: string, seedKeywords: string[]): Promise<KeywordIdea[]> {
  const auth = await getGoogleAdsAuthContext(userId);
  const cleanedSeeds = seedKeywords.map((keyword) => keyword.trim()).filter(Boolean).slice(0, 20);

  if (cleanedSeeds.length === 0) {
    throw new Error("Enter at least one seed keyword before requesting Keyword Planner ideas.");
  }

  try {
    const response = await callGoogleAdsAPI(
      ":generateKeywordIdeas",
      "POST",
      {
        keywordSeed: { keywords: cleanedSeeds },
        geoTargetConstants: [CAMBODIA_GEO_TARGET],
        language: ENGLISH_LANGUAGE,
        includeAdultKeywords: false,
        pageSize: 50,
      },
      auth.accessToken,
      auth.developerToken,
      auth.customerId,
      auth.managerCustomerId,
    );

    const ideas = response.results || [];
    return ideas
      .map((idea: any) => ({
        keyword: idea.text,
        avgMonthlySearches: Number(idea.keywordIdeaMetrics?.avgMonthlySearches || 0),
        competitionIndex: Number(idea.keywordIdeaMetrics?.competitionIndex || 0),
        lowTopOfPageBidMicros: Number(idea.keywordIdeaMetrics?.lowTopOfPageBidMicros || 0),
        highTopOfPageBidMicros: Number(idea.keywordIdeaMetrics?.highTopOfPageBidMicros || 0),
      }))
      .sort((a: KeywordIdea, b: KeywordIdea) => b.avgMonthlySearches - a.avgMonthlySearches);
  } catch (error) {
    if (error instanceof GoogleAdsAPIError && /developer token|access|permission|test account/i.test(error.message)) {
      throw new Error("Keyword Planner requires a Basic Access Google Ads developer token. Test account tokens cannot generate production keyword ideas.");
    }

    throw error;
  }
}
