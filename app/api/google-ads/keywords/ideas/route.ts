import { NextRequest } from "next/server";
import { z } from "zod";
import { jsonError, jsonSuccess, requireUser } from "@/lib/api";
import { getKeywordIdeas } from "@/lib/google-ads/keywords";
import { withCsrfCheck } from "@/lib/security";

const keywordIdeasSchema = z.object({
  keywords: z.array(z.string().min(1)).min(1).max(20),
});

export const POST = withCsrfCheck(async function POST(request: NextRequest) {
  try {
    const { user } = await requireUser();
    const { keywords } = keywordIdeasSchema.parse(await request.json());
    const ideas = await getKeywordIdeas(user.id, keywords);
    return jsonSuccess({ ideas });
  } catch (error) {
    return jsonError(error, 400);
  }
});
