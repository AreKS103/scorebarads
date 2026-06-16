import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getClientIp, rateLimitResponse, withCsrfCheck } from "@/lib/security";

export const dynamic = "force-dynamic";

export const POST = withCsrfCheck(async (request: Request) => {
  const rateLimited = await rateLimitResponse({
    identifier: `login:${getClientIp(request)}`,
    limit: 5,
  });

  if (rateLimited) {
    return rateLimited;
  }

  const { email, password } = await request.json();
  const supabase = createClient();
  const { data, error } = await supabase.auth.signInWithPassword({
    email: String(email || ""),
    password: String(password || ""),
  });

  if (error || !data.user) {
    return NextResponse.json(
      { success: false, error: error?.message || "Invalid email or password." },
      { status: 401 },
    );
  }

  return NextResponse.json({ success: true, userId: data.user.id });
});
