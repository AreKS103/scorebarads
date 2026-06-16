import { NextRequest } from "next/server";
import { z } from "zod";
import { jsonError, jsonSuccess, requireUser } from "@/lib/api";
import { callGoogleAdsAPI, getGoogleAdsAuthContext } from "@/lib/google-ads/auth";
import { buildKeywordOperations, resourceIdFromName } from "@/lib/google-ads/utils";
import { withCsrfCheck } from "@/lib/security";

const addKeywordSchema = z.object({
  adGroupResourceName: z.string().optional(),
  keyword: z.string().trim().min(1),
  matchType: z.enum(["BROAD", "PHRASE", "EXACT"]),
});

const removeKeywordSchema = z.object({
  criterionResourceName: z.string().min(1),
});

async function firstAdGroupResourceName(userId: string, campaignResourceName: string) {
  const auth = await getGoogleAdsAuthContext(userId);
  const campaignId = resourceIdFromName(campaignResourceName);
  const response = await callGoogleAdsAPI(
    "googleAds:searchStream",
    "POST",
    { query: `SELECT ad_group.resource_name FROM ad_group WHERE campaign.id = ${campaignId} LIMIT 1` },
    auth.accessToken,
    auth.developerToken,
    auth.customerId,
    auth.managerCustomerId,
  );
  const rows = Array.isArray(response) ? response.flatMap((chunk) => chunk.results || []) : [];
  return rows[0]?.adGroup?.resourceName as string | undefined;
}

export const POST = withCsrfCheck(async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { user } = await requireUser();
    const { adGroupResourceName, keyword, matchType } = addKeywordSchema.parse(await request.json());
    const auth = await getGoogleAdsAuthContext(user.id);
    const campaignResourceName = decodeURIComponent(params.id);
    const resolvedAdGroup = adGroupResourceName || await firstAdGroupResourceName(user.id, campaignResourceName);

    if (!resolvedAdGroup) {
      throw new Error("No ad group found for this campaign. Create an ad group in Google Ads before adding keywords.");
    }

    const response = await callGoogleAdsAPI(
      "adGroupCriteria:mutate",
      "POST",
      buildKeywordOperations(resolvedAdGroup, [{ text: keyword, matchType, negative: false }]),
      auth.accessToken,
      auth.developerToken,
      auth.customerId,
      auth.managerCustomerId,
    );

    return jsonSuccess({ result: response.results?.[0] });
  } catch (error) {
    return jsonError(error, 400);
  }
});

export const DELETE = withCsrfCheck(async function DELETE(request: NextRequest) {
  try {
    const { user } = await requireUser();
    const { criterionResourceName } = removeKeywordSchema.parse(await request.json());
    const auth = await getGoogleAdsAuthContext(user.id);
    await callGoogleAdsAPI(
      "adGroupCriteria:mutate",
      "POST",
      { operations: [{ remove: criterionResourceName }] },
      auth.accessToken,
      auth.developerToken,
      auth.customerId,
      auth.managerCustomerId,
    );
    return jsonSuccess({ criterionResourceName });
  } catch (error) {
    return jsonError(error, 400);
  }
});
