import { NextResponse, type NextRequest } from "next/server";
import { requireAdmin } from "@/lib/supabase/adminAuth";
import { createAdminClient } from "@/lib/supabase/admin";

/** Saves the standard link menu everyone sees on the Lenker tab. */
export async function PUT(request: NextRequest) {
  const user = await requireAdmin();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 403 });

  const { widgets } = await request.json();
  if (!Array.isArray(widgets)) return NextResponse.json({ error: "Mangler widgets" }, { status: 400 });

  const admin = createAdminClient();
  const { error } = await admin
    .from("link_defaults")
    .upsert({ id: "default", widgets, updated_at: new Date().toISOString() });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
