import { NextResponse, type NextRequest } from "next/server";
import { requireAdmin } from "@/lib/supabase/adminAuth";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST(request: NextRequest) {
  const user = await requireAdmin();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 403 });

  const { section, name, sort_order } = await request.json();
  if (!section || !name) return NextResponse.json({ error: "Mangler section/name" }, { status: 400 });

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("content_categories")
    .insert({ section, name, sort_order: sort_order ?? 0 })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ category: data });
}

export async function PATCH(request: NextRequest) {
  const user = await requireAdmin();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 403 });

  const { id, name, sort_order } = await request.json();
  if (!id) return NextResponse.json({ error: "Mangler id" }, { status: 400 });

  const updates: Record<string, unknown> = {};
  if (typeof name === "string") updates.name = name;
  if (typeof sort_order === "number") updates.sort_order = sort_order;

  const admin = createAdminClient();
  const { data, error } = await admin.from("content_categories").update(updates).eq("id", id).select().single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ category: data });
}

export async function DELETE(request: NextRequest) {
  const user = await requireAdmin();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 403 });

  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ error: "Mangler id" }, { status: 400 });

  const admin = createAdminClient();

  // Detach any items from this category before deleting it, rather than
  // blocking the delete.
  await admin.from("content_items").update({ category_id: null }).eq("category_id", id);
  const { error } = await admin.from("content_categories").delete().eq("id", id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
