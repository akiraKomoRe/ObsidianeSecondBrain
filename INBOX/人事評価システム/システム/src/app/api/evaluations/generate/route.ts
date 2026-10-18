import { NextResponse, type NextRequest } from "next/server";

import { generateWeeklyEvaluation } from "@/lib/evaluation/generate";
import { addWeeks, getWeekRange } from "@/lib/date/week";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

// POST: a signed-in employee submitting their own weekly report -> generates
// just their own evaluation for the given week.
export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => ({}));
  const weekStart = typeof body.weekStart === "string" ? body.weekStart : getWeekRange(new Date()).weekStart;
  const weekEnd = typeof body.weekEnd === "string" ? body.weekEnd : getWeekRange(new Date()).weekEnd;

  const result = await generateWeeklyEvaluation({ userId: user.id, weekStart, weekEnd });
  return NextResponse.json(result);
}

// GET: scheduled batch trigger (Vercel Cron sends `Authorization: Bearer
// $CRON_SECRET` automatically). Generates last week's evaluation for every
// employee who hasn't been evaluated yet -- a safety net for anyone who
// didn't (or couldn't) trigger generation themselves via the weekly report
// screen.
export async function GET(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  if (!process.env.CRON_SECRET || authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  return runBatch();
}

async function runBatch() {
  // Evaluate the most recently completed week (last week, relative to today).
  const { weekStart: currentWeekStart } = getWeekRange(new Date());
  const weekStart = addWeeks(currentWeekStart, -1);
  const { weekEnd } = getWeekRange(new Date(`${weekStart}T00:00:00`));

  const admin = createAdminClient();
  const { data: profiles, error } = await admin.from("profiles").select("id").eq("role", "employee");
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const results = [];
  for (const profile of profiles ?? []) {
    const result = await generateWeeklyEvaluation({ userId: profile.id, weekStart, weekEnd });
    results.push({ userId: profile.id, ...result });
  }

  return NextResponse.json({ weekStart, weekEnd, results });
}
