import { jsonError, jsonSuccess, requireUser } from "@/lib/api";
import { buildGoogleAdsHeaders, extractGoogleAdsError, getStoredCredentials, refreshAccessToken, resolveGoogleAdsCredentials } from "@/lib/google-ads/auth";
import { GOOGLE_ADS_BASE_URL, normalizeCustomerId } from "@/lib/google-ads/utils";
import { createServiceClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

function formatCustomerId(customerId: string) {
  const clean = normalizeCustomerId(customerId);
  if (clean.length !== 10) return clean;
  return `${clean.slice(0, 3)}-${clean.slice(3, 6)}-${clean.slice(6)}`;
}

async function probeCustomer(accessToken: string, developerToken: string, customerId: string, managerCustomerId?: string | null) {
  const response = await fetch(`${GOOGLE_ADS_BASE_URL}/customers/${customerId}/googleAds:searchStream`, {
    method: "POST",
    headers: buildGoogleAdsHeaders({ accessToken, developerToken, managerCustomerId, json: true }),
    body: JSON.stringify({ query: "SELECT customer.id, customer.descriptive_name, customer.test_account FROM customer LIMIT 1" }),
    cache: "no-store",
  });
  const text = await response.text();
  let body: unknown = null;

  try {
    body = text ? JSON.parse(text) : null;
  } catch {
    body = text;
  }

  if (!response.ok) {
    return {
      apiAccessible: false,
      accessError: extractGoogleAdsError(body),
      testAccount: null,
      descriptiveName: "",
    };
  }

  const rows = Array.isArray(body) ? body.flatMap((chunk: any) => chunk.results || []) : [];
  const customer = rows[0]?.customer;

  return {
    apiAccessible: true,
    accessError: "",
    testAccount: Boolean(customer?.testAccount),
    descriptiveName: customer?.descriptiveName || "",
  };
}

export async function GET() {
  try {
    const { user } = await requireUser();
    const supabase = createServiceClient();
    const credentials = await getStoredCredentials(user.id, supabase);
    const resolved = resolveGoogleAdsCredentials(credentials);
    const accessToken = await refreshAccessToken(supabase, user.id);

    const response = await fetch(`${GOOGLE_ADS_BASE_URL}/customers:listAccessibleCustomers`, {
      method: "GET",
      headers: buildGoogleAdsHeaders({
        accessToken,
        developerToken: resolved.developerToken,
        managerCustomerId: resolved.managerCustomerId,
      }),
      cache: "no-store",
    });

    const body = await response.json();

    if (!response.ok) {
      throw new Error(body?.error?.message || "Could not list accessible Google Ads accounts.");
    }

    const customers = await Promise.all((body.resourceNames || []).map(async (resourceName: string) => {
      const id = normalizeCustomerId(resourceName);
      const probe = await probeCustomer(accessToken, resolved.developerToken, id, resolved.managerCustomerId);
      return {
        resourceName,
        id,
        formattedId: formatCustomerId(id),
        ...probe,
      };
    }));

    return jsonSuccess({ customers });
  } catch (error) {
    return jsonError(error, 400);
  }
}
