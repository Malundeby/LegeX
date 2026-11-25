import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

/**
 * Paths that are reachable without being logged in. Everything else in the
 * app requires a session; anonymous visitors are sent to /login.
 */
const PUBLIC_PATHS = ["/login", "/signup", "/glemt-passord", "/auth"];

/** Static files that must load before login (PWA manifest, service worker). */
const PUBLIC_FILES = ["/manifest.webmanifest", "/sw.js", "/icon", "/icons/"];

/** API routes that do their own access checks or must work anonymously. */
const PUBLIC_API = ["/api/track"];

function matches(pathname: string, prefixes: string[]) {
  return prefixes.some((prefix) =>
    prefix.endsWith("/")
      ? pathname.startsWith(prefix)
      : pathname === prefix || pathname.startsWith(`${prefix}/`)
  );
}

export function isPublicPath(pathname: string) {
  return (
    matches(pathname, PUBLIC_PATHS) ||
    matches(pathname, PUBLIC_FILES) ||
    matches(pathname, PUBLIC_API)
  );
}

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // Refreshes the session cookie if needed — required for Server Components
  // to see a valid session, since they can't set cookies themselves.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname, search } = request.nextUrl;

  if (!user && !isPublicPath(pathname)) {
    if (pathname.startsWith("/api/")) {
      return NextResponse.json({ error: "Ikke innlogget" }, { status: 401 });
    }

    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = "/login";
    loginUrl.search = "";
    if (pathname !== "/") {
      loginUrl.searchParams.set("next", `${pathname}${search}`);
    }
    return withSessionCookies(NextResponse.redirect(loginUrl), supabaseResponse);
  }

  // Logged-in users have no reason to see the login or signup forms.
  if (user && (pathname === "/login" || pathname === "/signup")) {
    const homeUrl = request.nextUrl.clone();
    homeUrl.pathname = "/";
    homeUrl.search = "";
    return withSessionCookies(NextResponse.redirect(homeUrl), supabaseResponse);
  }

  return supabaseResponse;
}

/** Carry refreshed auth cookies over to a redirect response. */
function withSessionCookies(target: NextResponse, source: NextResponse) {
  source.cookies.getAll().forEach((cookie) => target.cookies.set(cookie));
  return target;
}
