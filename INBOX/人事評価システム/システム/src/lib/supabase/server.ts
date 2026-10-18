import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";

import { isLocalMode } from "@/lib/local/mode";
import { createLocalServerClient } from "@/lib/local/server-client";
import type { Database } from "@/types/database";

/**
 * Server Components / Server Actions / Route Handlers client.
 * Reads and (where possible) writes the auth cookies for the current request.
 *
 * With no Supabase project configured this returns the local, file-backed
 * stand-in instead (see src/lib/local/). It implements the same query surface
 * and the same row-level policies, so every caller in the app is written
 * against one client and neither knows nor cares which is behind it. The cast
 * is the single place that seam is acknowledged.
 */
export async function createClient(): Promise<SupabaseClient<Database>> {
  if (isLocalMode()) {
    return (await createLocalServerClient()) as unknown as SupabaseClient<Database>;
  }

  const cookieStore = await cookies();

  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            for (const { name, value, options } of cookiesToSet) {
              cookieStore.set(name, value, options);
            }
          } catch {
            // Called from a Server Component with no request/response to
            // attach cookies to -- the middleware refreshes the session
            // instead, so this is safe to ignore.
          }
        },
      },
    }
  );
}
