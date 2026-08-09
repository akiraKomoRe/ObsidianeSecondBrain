import "server-only";

import { createClient as createSupabaseClient, type SupabaseClient } from "@supabase/supabase-js";

import { createLocalClient } from "@/lib/local/client";
import { isLocalMode } from "@/lib/local/mode";
import type { Database } from "@/types/database";

// Service-role client. Bypasses Row Level Security -- only ever import this
// from server-only code (route handlers, server actions), and only for the
// specific writes that must not go through a user's own RLS policies (e.g.
// writing AI-generated evaluations). Never expose this client or its key to
// the browser.
//
// In local mode the equivalent is a client with no viewer, which the local
// policy layer treats as the service role and exempts from every check --
// deliberately the same distinction as in Postgres.
export function createAdminClient(): SupabaseClient<Database> {
  if (isLocalMode()) {
    return createLocalClient(null) as unknown as SupabaseClient<Database>;
  }

  return createSupabaseClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}
