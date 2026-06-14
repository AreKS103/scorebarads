import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

type HealthCheck = {
  configured: boolean;
  projectUrl: boolean;
  anonKey: boolean;
  serviceRoleKey: boolean;
  schemaReady: boolean;
};

export async function GET() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  const checks: HealthCheck = {
    configured: Boolean(supabaseUrl && anonKey),
    projectUrl: Boolean(supabaseUrl),
    anonKey: Boolean(anonKey),
    serviceRoleKey: Boolean(serviceRoleKey),
    schemaReady: false,
  };

  if (!supabaseUrl || !anonKey) {
    return NextResponse.json(
      {
        ok: false,
        checks,
        message: "Supabase is missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY.",
      },
      { status: 503 }
    );
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey || anonKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  const { error } = await supabase
    .from("campaigns_log")
    .select("id", { count: "exact", head: true });

  checks.schemaReady = !error;

  return NextResponse.json(
    {
      ok: !error,
      checks,
      message: error ? error.message : "Supabase environment and schema are reachable.",
    },
    { status: error ? 503 : 200 }
  );
}
