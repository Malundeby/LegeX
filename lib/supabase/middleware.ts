import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

/**
 * The app is open to everyone. Login is optional and only gives you your own
 * link page (Lenker). The middleware therefore only refreshes the session
 * cookie, plus two small redirects around the auth pages.
 */
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
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
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

  const { pathname } = request.nextUrl;
  const redirectTarget = authRedirect(pathname, Boolean(user));
  if (!redirectTarget) return supabaseResponse;

  const url = request.nextUrl.clone();
  url.pathname = redirectTarget;
  url.search = "";
  const redirect = NextResponse.redirect(url);
  // Keep any refreshed auth cookies on the redirect.
  supabaseResponse.cookies.getAll().forEach((cookie) => redirect.cookies.set(cookie));
  return redirect;
}

/** Where to send the user instead, or null to let the request through. */
export function authRedirect(pathname: string, loggedIn: boolean): string | null {
  if (loggedIn && (pathname === "/login" || pathname === "/signup")) return "/";
  if (!loggedIn && pathname === "/nytt-passord") return "/login";
  return null;
}
