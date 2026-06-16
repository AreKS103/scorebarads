import { jsonError, jsonSuccess, requireUser } from "@/lib/api";
import { withCsrfCheck } from "@/lib/security";
import { createServiceClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export const DELETE = withCsrfCheck(async function DELETE() {
  try {
    const { user } = await requireUser();
    const { error } = await createServiceClient()
      .from("google_ads_credentials")
      .delete()
      .eq("user_id", user.id);

    if (error) throw error;

    return jsonSuccess({ message: "Google Ads credentials disconnected." });
  } catch (error) {
    return jsonError(error, 400);
  }
});
