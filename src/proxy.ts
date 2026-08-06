import type { NextRequest } from "next/server";

import { updateSession } from "@/lib/supabase/middleware";

// API routes handle their own auth (session cookie or cron secret), so they
// are excluded here rather than being redirected to /login.
export async function proxy(request: NextRequest) {
  return updateSession(request);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|api/).*)"],
};
