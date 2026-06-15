import { jsonError, jsonSuccess, requireUser } from "@/lib/api";
import { getStoredCredentials, refreshAccessToken } from "@/lib/google-ads/auth";
import { GOOGLE_ADS_BASE_URL, normalizeCustomerId } from "@/lib/google-ads/utils";
import { createServiceClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

function formatCustomerId(customerId: string) {
  const clean = normalizeCustomerId(customerId);
  if (clean.length !== 10) return clean;
  return `${clean.slice(0, 3)}-${clean.slice(3, 6)}-${clean.slice(6)}`;
}

export async function GET() {
  try {
    const { user } = await requireUser();
    const supabase = createServiceClient();
    const credentials = await getStoredCredentials(user.id, supabase);
    const accessToken = await refreshAccessToken(supabase, user.id);

    const response = await fetch(`${GOOGLE_ADS_BASE_URL}/customers:listAccessibleCustomers`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "developer-token": credentials.developer_token,
      },
      cache: "no-store",
    });

    const body = await response.json();

    if (!response.ok) {
      throw new Error(body?.error?.message || "Could not list accessible Google Ads accounts.");
    }

    const customers = (body.resourceNames || []).map((resourceName: string) => {
      const id = normalizeCustomerId(resourceName);
      return {
        resourceName,
        id,
        formattedId: formatCustomerId(id),
      };
    });

    return jsonSuccess({ customers });
  } catch (error) {
    return jsonError(error, 400);
  }
}
