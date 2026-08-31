import { createClient } from "@supabase/supabase-js";

/**
 * SERVER-ONLY. Never import this from a client component or anything that
 * could end up in the client bundle — it uses SUPABASE_SERVICE_ROLE_KEY,
 * which bypasses Row Level Security entirely.
 */
export function createAdminClient() {
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error("SUPABASE_SERVICE_ROLE_KEY mangler i miljøvariablene");
  }

  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}
