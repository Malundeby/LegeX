import { createClient } from "@/lib/supabase/server";

/**
 * There are exactly two states in this app: ADMIN_EMAIL (full admin rights)
 * and everyone else. A logged-in non-admin user has no more access than an
 * anonymous visitor — this check is the ONLY access gate in the app.
 */
export async function requireAdmin() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user || !process.env.ADMIN_EMAIL || user.email !== process.env.ADMIN_EMAIL) {
    return null;
  }

  return user;
}
