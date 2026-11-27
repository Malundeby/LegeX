import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/supabase/adminAuth";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

/**
 * Lets the client know whether to show the admin controls, and how many
 * suggestions wait for review. Every write is checked again server-side.
 */
export async function GET() {
  const user = await requireAdmin();
  let pending = 0;
  if (user) {
    const { count } = await createAdminClient()
      .from("phrase_suggestions")
      .select("id", { count: "exact", head: true })
      .eq("status", "ny");
    pending = count ?? 0;
  }
  return NextResponse.json({ admin: Boolean(user), pending }, { headers: { "Cache-Control": "no-store" } });
}
