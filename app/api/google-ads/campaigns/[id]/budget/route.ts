import { NextRequest } from "next/server";
import { z } from "zod";
import { jsonError, jsonSuccess, requireUser } from "@/lib/api";
import { updateCampaignBudget } from "@/lib/google-ads/campaigns";

const budgetSchema = z.object({
  budgetResourceName: z.string().min(1),
  dollars: z.coerce.number().positive(),
});

export async function POST(request: NextRequest) {
  try {
    const { user } = await requireUser();
    const { budgetResourceName, dollars } = budgetSchema.parse(await request.json());
    await updateCampaignBudget(user.id, budgetResourceName, dollars);
    return jsonSuccess({ budgetResourceName, dollars });
  } catch (error) {
    return jsonError(error, 400);
  }
}
