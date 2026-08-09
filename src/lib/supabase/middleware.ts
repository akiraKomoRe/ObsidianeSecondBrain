import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

import { isLocalMode } from "@/lib/local/mode";
import { SESSION_COOKIE, readSessionValue } from "@/lib/local/session";

const PUBLIC_PATHS = ["/login"];

export async function updateSession(request: NextRequest) {
  if (isLocalMode()) {
    // Only the signed cookie is inspected here. The proxy may run on the edge
    // runtime, where the file-backed store is not reachable -- and it does not
    // need it: every page re-reads the session server-side anyway, so this is
    // just the redirect gate.
    const userId = await readSessionValue(request.cookies.get(SESSION_COOKIE)?.value);
    return gate(request, userId !== null);
  }

  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          for (const { name, value } of cookiesToSet) {
            request.cookies.set(name, value);
          }
          response = NextResponse.next({ request });
          for (const { name, value, options } of cookiesToSet) {
            response.cookies.set(name, value, options);
          }
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  return gate(request, user !== null, response);
}

/** Signed-out users go to /login; signed-in users never sit on /login. */
function gate(request: NextRequest, signedIn: boolean, response?: NextResponse) {
  const isPublicPath = PUBLIC_PATHS.some((path) => request.nextUrl.pathname.startsWith(path));

  if (!signedIn && !isPublicPath) {
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = "/login";
    loginUrl.searchParams.set("redirectTo", request.nextUrl.pathname);
    return NextResponse.redirect(loginUrl);
  }

  if (signedIn && request.nextUrl.pathname === "/login") {
    const homeUrl = request.nextUrl.clone();
    homeUrl.pathname = "/";
    homeUrl.search = "";
    return NextResponse.redirect(homeUrl);
  }

  return response ?? NextResponse.next({ request });
}
