import { jsonError, jsonSuccess, requireUser } from "@/lib/api";
import { withCsrfCheck } from "@/lib/security";
import { createServiceClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export const DELETE = withCsrfCheck(async function DELETE() {
  try {
    const { user } = await requireUser();
    const supabase = createServiceClient();
    const [campaigns, drafts] = await Promise.all([
      supabase.from("campaigns_log").delete().eq("user_id", user.id),
      supabase.from("ad_drafts").delete().eq("user_id", user.id),
    ]);

    if (campaigns.error || drafts.error) {
      throw campaigns.error || drafts.error;
    }

    return jsonSuccess({ message: "Cached campaign logs and drafts cleared." });
  } catch (error) {
    return jsonError(error, 400);
  }
});
