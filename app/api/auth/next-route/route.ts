import { NextResponse } from "next/server";
import { requireUser } from "@/lib/api";
import { createServiceClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const { user } = await requireUser();
    const { data } = await createServiceClient()
      .rpc("get_google_ads_credentials", { p_user_id: user.id })
      .maybeSingle();
    const credentials = data as { refresh_token?: string | null; customer_id?: string | null } | null;
    const path = credentials?.refresh_token && credentials?.customer_id ? "/dashboard" : "/connect";
    return NextResponse.json({ success: true, path });
  } catch {
    return NextResponse.json({ success: false, error: "Not authenticated." }, { status: 401 });
  }
}
