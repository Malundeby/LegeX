import { NextResponse, type NextRequest } from "next/server";
import { requireAdmin } from "@/lib/supabase/adminAuth";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Saves the full order of a section in one request.
 * Body: {
 *   items: [{ id, category_id, sort_order }],
 *   categories?: [{ id, sort_order }]
 * }
 * Only rows whose values actually changed need to be sent, but sending all is fine.
 */
export async function POST(request: NextRequest) {
  const user = await requireAdmin();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 403 });

  const body = await request.json();
  const items: { id: string; category_id: string | null; sort_order: number }[] = Array.isArray(body.items)
    ? body.items
    : [];
  const categories: { id: string; sort_order: number }[] = Array.isArray(body.categories) ? body.categories : [];

  const admin = createAdminClient();

  const results = await Promise.all([
    ...items.map((it) =>
      admin
        .from("content_items")
        .update({ category_id: it.category_id ?? null, sort_order: Number(it.sort_order) })
        .eq("id", it.id)
    ),
    ...categories.map((c) =>
      admin.from("content_categories").update({ sort_order: Number(c.sort_order) }).eq("id", c.id)
    ),
  ]);

  const failed = results.find((r) => r.error);
  if (failed?.error) return NextResponse.json({ error: failed.error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
