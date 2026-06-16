import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

type HealthCheck = {
  configured: boolean;
  projectUrl: boolean;
  anonKey: boolean;
  serviceRoleKey: boolean;
  schemaReady: boolean;
  encryptionKeyReady: boolean;
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
    encryptionKeyReady: false,
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

  const { error: schemaError } = await supabase
    .from("campaigns_log")
    .select("id", { count: "exact", head: true });

  checks.schemaReady = !schemaError;

  const { error: encryptionError } = serviceRoleKey
    ? await supabase.rpc("google_ads_encryption_key")
    : { error: new Error("SUPABASE_SERVICE_ROLE_KEY is required to verify encrypted credential storage.") };

  checks.encryptionKeyReady = !encryptionError;
  const error = schemaError || encryptionError;

  return NextResponse.json(
    {
      ok: !error,
      checks,
      message: error ? error.message : "Supabase environment, schema, and encrypted credential storage are reachable.",
    },
    { status: error ? 503 : 200 }
  );
}
