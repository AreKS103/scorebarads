import { z } from "zod";
import { jsonError, jsonSuccess, requireUser } from "@/lib/api";
import { withCsrfCheck } from "@/lib/security";
import { createServiceClient } from "@/lib/supabase/server";
import { connectCredentialsSchema } from "@/lib/validations";

export const dynamic = "force-dynamic";

const manualCredentialsSchema = connectCredentialsSchema.pick({
  developerToken: true,
  clientId: true,
  clientSecret: true,
});

export const POST = withCsrfCheck(async function POST(request: Request) {
  try {
    const { user } = await requireUser();
    const values = manualCredentialsSchema.parse(await request.json()) as z.infer<typeof manualCredentialsSchema>;
    const { error } = await createServiceClient().rpc("upsert_google_ads_credentials", {
      p_user_id: user.id,
      p_client_id: values.clientId,
      p_client_secret: values.clientSecret,
      p_refresh_token: null,
      p_developer_token: values.developerToken,
      p_customer_id: null,
      p_manager_customer_id: null,
    });

    if (error) {
      throw error;
    }

    return jsonSuccess({ message: "Google Ads credentials saved." });
  } catch (error) {
    return jsonError(error, 400);
  }
});
