import "server-only";

import { cookies } from "next/headers";

import { createLocalClient } from "./client.ts";
import { DEMO_PASSWORD } from "./seed.ts";
import { SESSION_COOKIE, createSessionValue, readSessionValue } from "./session.ts";
import { loadTables } from "./store.ts";

/**
 * The local stand-in for `createServerClient` from @supabase/ssr: the query
 * builder from ./client plus the three auth methods the app calls, backed by a
 * signed cookie instead of a Supabase session.
 */
export async function createLocalServerClient() {
  const cookieStore = await cookies();
  const userId = await readSessionValue(cookieStore.get(SESSION_COOKIE)?.value);
  // A cookie that survives a reseed but no longer matches anybody is treated
  // as signed out, rather than as a viewer that every policy check fails.
  const viewer = userId && loadTables().profiles.some((p) => p.id === userId) ? { id: userId } : null;
  const client = createLocalClient(viewer);

  return {
    ...client,
    auth: {
      ...client.auth,

      async signInWithPassword({ email, password }: { email: string; password: string }) {
        const profile = loadTables().profiles.find(
          (p) => p.email.toLowerCase() === email.trim().toLowerCase()
        );
        if (!profile || password !== DEMO_PASSWORD) {
          return { data: { user: null }, error: { message: "Invalid login credentials" } };
        }
        cookieStore.set(SESSION_COOKIE, await createSessionValue(profile.id), {
          httpOnly: true,
          sameSite: "lax",
          path: "/",
          maxAge: 60 * 60 * 24 * 7,
        });
        return { data: { user: { id: profile.id } }, error: null };
      },

      async signOut() {
        cookieStore.delete(SESSION_COOKIE);
        return { error: null };
      },
    },
  };
}
