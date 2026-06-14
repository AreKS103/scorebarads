import { createBrowserClient } from "@supabase/ssr";

const PLACEHOLDER_SUPABASE_URL = "https://placeholder.supabase.co";
const PLACEHOLDER_SUPABASE_ANON_KEY = "placeholder-anon-key";

export function isSupabaseConfigured() {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );
}

export function createClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    console.error(
      "[Score Ads] NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY are not set. " +
        "Copy .env.local.example to .env.local and fill in your Supabase project credentials."
    );
    return createBrowserClient(
      PLACEHOLDER_SUPABASE_URL,
      PLACEHOLDER_SUPABASE_ANON_KEY
    );
  }

  return createBrowserClient(supabaseUrl, supabaseAnonKey);
}
