import "server-only";

import { createClient as createSupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/types/database";

// Service-role client. Bypasses Row Level Security -- only ever import this
// from server-only code (route handlers, server actions), and only for the
// specific writes that must not go through a user's own RLS policies (e.g.
// writing AI-generated evaluations). Never expose this client or its key to
// the browser.
export function createAdminClient() {
  return createSupabaseClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}
