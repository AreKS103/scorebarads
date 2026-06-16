import { NextResponse } from "next/server";
import { requireUser } from "@/lib/api";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const { user } = await requireUser();
    return NextResponse.json({ success: true, userId: user.id });
  } catch {
    return NextResponse.json({ success: false, error: "Not authenticated." }, { status: 401 });
  }
}
