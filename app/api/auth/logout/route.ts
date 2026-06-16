import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { withCsrfCheck } from "@/lib/security";

export const dynamic = "force-dynamic";

export const POST = withCsrfCheck(async () => {
  const supabase = createClient();
  const { error } = await supabase.auth.signOut({ scope: "global" });

  if (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 400 });
  }

  return NextResponse.json({ success: true });
});
