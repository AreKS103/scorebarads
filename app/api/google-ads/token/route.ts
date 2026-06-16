import { jsonError, jsonSuccess, requireUser } from "@/lib/api";
import { createServiceClient } from "@/lib/supabase/server";
import { refreshAccessToken } from "@/lib/google-ads/auth";
import { withCsrfCheck } from "@/lib/security";

export const POST = withCsrfCheck(async function POST() {
  try {
    const { user } = await requireUser();
    await refreshAccessToken(createServiceClient(), user.id);
    return jsonSuccess({ message: "Access token refreshed server-side." });
  } catch (error) {
    return jsonError(error, 401);
  }
});
