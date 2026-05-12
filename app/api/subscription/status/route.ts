import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const sessionId = req.nextUrl.searchParams.get("session_id");

  if (!sessionId) {
    return NextResponse.json({ isPremium: false });
  }

  try {
    const { data, error } = await supabaseAdmin
      .from("subscriptions")
      .select("status, current_period_end")
      .eq("session_id", sessionId)
      .maybeSingle();

    if (error || !data) {
      return NextResponse.json({ isPremium: false });
    }

    const periodEnd = data.current_period_end ? new Date(data.current_period_end) : null;
    const isActive = data.status === "active" && (!periodEnd || periodEnd > new Date());

    return NextResponse.json({ isPremium: isActive, status: data.status });
  } catch {
    return NextResponse.json({ isPremium: false });
  }
}
