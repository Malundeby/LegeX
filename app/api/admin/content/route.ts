import { NextResponse, type NextRequest } from "next/server";
import { requireAdmin } from "@/lib/supabase/adminAuth";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST(request: NextRequest) {
  const user = await requireAdmin();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 403 });

  const body = await request.json();
  const { section, category_id, type, slug, title, description, url, icon_url, sort_order, published } = body;

  if (!section || !type || !slug || !title) {
    return NextResponse.json({ error: "Mangler påkrevde felt" }, { status: 400 });
  }

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("content_items")
    .insert({
      section,
      category_id: category_id ?? null,
      type,
      slug,
      title,
      description: description ?? null,
      url: url ?? null,
      icon_url: icon_url ?? null,
      sort_order: sort_order ?? 0,
      published_at: published ? new Date().toISOString() : null,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ item: data });
}

export async function PATCH(request: NextRequest) {
  const user = await requireAdmin();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 403 });

  const body = await request.json();
  const { id, ...fields } = body;
  if (!id) return NextResponse.json({ error: "Mangler id" }, { status: 400 });

  const updates: Record<string, unknown> = {};
  if ("category_id" in fields) updates.category_id = fields.category_id;
  if ("title" in fields) updates.title = fields.title;
  if ("description" in fields) updates.description = fields.description;
  if ("url" in fields) updates.url = fields.url;
  if ("icon_url" in fields) updates.icon_url = fields.icon_url;
  if ("sort_order" in fields) updates.sort_order = fields.sort_order;
  if ("published" in fields) {
    updates.published_at = fields.published ? new Date().toISOString() : null;
  }
  if ("archived" in fields) {
    updates.archived_at = fields.archived ? new Date().toISOString() : null;
  }

  const admin = createAdminClient();
  const { data, error } = await admin.from("content_items").update(updates).eq("id", id).select().single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ item: data });
}

export async function DELETE(request: NextRequest) {
  const user = await requireAdmin();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 403 });

  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ error: "Mangler id" }, { status: 400 });

  const admin = createAdminClient();
  const { error } = await admin.from("content_items").delete().eq("id", id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
