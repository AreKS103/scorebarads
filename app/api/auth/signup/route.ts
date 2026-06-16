import { NextResponse } from "next/server";
import { publicAppUrl } from "@/lib/api";
import { getClientIp, rateLimitResponse, withCsrfCheck } from "@/lib/security";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export const POST = withCsrfCheck(async function POST(request: Request) {
  const rateLimited = await rateLimitResponse({
    identifier: `signup:${getClientIp(request)}`,
    limit: 5,
  });

  if (rateLimited) {
    return rateLimited;
  }

  const { email, password } = await request.json();
  const supabase = createClient();
  const { data, error } = await supabase.auth.signUp({
    email: String(email || ""),
    password: String(password || ""),
    options: {
      emailRedirectTo: `${publicAppUrl(request)}/login?verified=1`,
    },
  });

  if (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 400 });
  }

  return NextResponse.json({
    success: true,
    userId: data.session?.user.id || data.user?.id || null,
    hasSession: Boolean(data.session),
  });
});
