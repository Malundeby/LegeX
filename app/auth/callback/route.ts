import { createClient } from "@/lib/supabase/server";
import { safeNextPath } from "@/lib/auth";
import { NextResponse } from "next/server";

/**
 * Landing point for links in Supabase e-mails (signup confirmation and
 * password reset). Exchanges the one-time code for a session cookie.
 */
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = safeNextPath(searchParams.get("next"));

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  return NextResponse.redirect(`${origin}/login?error=auth`);
}
