import { jsonError, jsonSuccess, requireUser } from "@/lib/api";
import { withCsrfCheck } from "@/lib/security";
import { createServiceClient } from "@/lib/supabase/server";
import { campaignFormSchema } from "@/lib/validations";

export const dynamic = "force-dynamic";

export const POST = withCsrfCheck(async function POST(request: Request) {
  try {
    const { user } = await requireUser();
    const formData = campaignFormSchema.parse(await request.json());
    const { error } = await createServiceClient().from("ad_drafts").insert({
      user_id: user.id,
      campaign_type: formData.campaignType,
      form_data: formData,
      status: "draft",
    });

    if (error) throw error;

    return jsonSuccess({ message: "Draft saved." });
  } catch (error) {
    return jsonError(error, 400);
  }
});
