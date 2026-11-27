import { NextResponse, type NextRequest } from "next/server";
import { requireAdmin } from "@/lib/supabase/adminAuth";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * All writes to the shared phrase catalog. Admin only.
 * Body: { action, ...fields } — see the switch below.
 */
type Body = {
  action?: string;
  id?: string;
  parentId?: string | null;
  categoryId?: string;
  name?: string;
  title?: string;
  body?: string;
  table?: "categories" | "phrases";
  order?: { id: string; sort_order: number }[];
  status?: "godkjent" | "avvist";
  apply?: boolean;
};

const bad = (msg: string, status = 400) => NextResponse.json({ error: msg }, { status });
const clean = (s: unknown, max: number) => (typeof s === "string" ? s.trim().slice(0, max) : "");

export async function POST(request: NextRequest) {
  const user = await requireAdmin();
  if (!user) return bad("Unauthorized", 403);

  let b: Body;
  try {
    b = await request.json();
  } catch {
    return bad("Ugyldig forespørsel");
  }
  const db = createAdminClient();

  switch (b.action) {
    case "createCategory": {
      const name = clean(b.name, 120);
      if (!name) return bad("Navn mangler");
      const { data, error } = await db
        .from("phrase_categories")
        .insert({ name, parent_id: b.parentId ?? null })
        .select("id, parent_id, name, sort_order")
        .single();
      if (error) return bad(error.message, 500);
      return NextResponse.json({ category: data });
    }
    case "updateCategory": {
      const name = clean(b.name, 120);
      if (!b.id || !name) return bad("Navn mangler");
      const patch: Record<string, unknown> = { name };
      if (b.parentId !== undefined) {
        if (b.parentId === b.id) return bad("En kategori kan ikke ligge i seg selv");
        if (b.parentId) {
          // Refuse moves into the category's own subtree.
          let cur: string | null = b.parentId;
          const seen = new Set<string>();
          while (cur && !seen.has(cur)) {
            if (cur === b.id) return bad("En kategori kan ikke flyttes inn i sin egen underkategori");
            seen.add(cur);
            const { data: row }: { data: { parent_id: string | null } | null } = await db
              .from("phrase_categories")
              .select("parent_id")
              .eq("id", cur)
              .maybeSingle();
            cur = row?.parent_id ?? null;
          }
        }
        patch.parent_id = b.parentId;
        patch.sort_order = null;
      }
      const { error } = await db.from("phrase_categories").update(patch).eq("id", b.id);
      if (error) return bad(error.message, 500);
      return NextResponse.json({ ok: true });
    }
    case "deleteCategory": {
      if (!b.id) return bad("Mangler id");
      const { error } = await db.from("phrase_categories").delete().eq("id", b.id);
      if (error) return bad(error.message, 500);
      return NextResponse.json({ ok: true });
    }
    case "createPhrase": {
      const title = clean(b.title, 160);
      const body = clean(b.body, 8000);
      if (!b.categoryId || !title || !body) return bad("Tittel og tekst må fylles ut");
      const { data, error } = await db
        .from("phrases")
        .insert({ category_id: b.categoryId, title, body })
        .select("id, category_id, title, body, sort_order")
        .single();
      if (error) return bad(error.message, 500);
      return NextResponse.json({ phrase: data });
    }
    case "updatePhrase": {
      const title = clean(b.title, 160);
      const body = clean(b.body, 8000);
      if (!b.id || !title || !body) return bad("Tittel og tekst må fylles ut");
      const patch: Record<string, unknown> = { title, body, updated_at: new Date().toISOString() };
      if (b.categoryId) {
        patch.category_id = b.categoryId;
      }
      const { error } = await db.from("phrases").update(patch).eq("id", b.id);
      if (error) return bad(error.message, 500);
      return NextResponse.json({ ok: true });
    }
    case "deletePhrase": {
      if (!b.id) return bad("Mangler id");
      const { error } = await db.from("phrases").delete().eq("id", b.id);
      if (error) return bad(error.message, 500);
      return NextResponse.json({ ok: true });
    }
    case "reorder": {
      const table = b.table === "categories" ? "phrase_categories" : b.table === "phrases" ? "phrases" : null;
      if (!table || !Array.isArray(b.order)) return bad("Ugyldig rekkefølge");
      const results = await Promise.all(
        b.order.map((o) => db.from(table).update({ sort_order: Number(o.sort_order) }).eq("id", o.id))
      );
      const failed = results.find((r) => r.error);
      if (failed?.error) return bad(failed.error.message, 500);
      return NextResponse.json({ ok: true });
    }
    case "resolveSuggestion": {
      if (!b.id || (b.status !== "godkjent" && b.status !== "avvist")) return bad("Ugyldig forslag");
      const { data: s } = await db
        .from("phrase_suggestions")
        .select("id, phrase_id, category_id, title, body")
        .eq("id", b.id)
        .maybeSingle();
      if (!s) return bad("Forslaget finnes ikke", 404);

      if (b.status === "godkjent" && b.apply !== false) {
        // The admin may have edited the text before approving.
        const title = clean(b.title ?? s.title, 160);
        const body = clean(b.body ?? s.body, 8000);
        if (s.phrase_id) {
          const { error } = await db
            .from("phrases")
            .update({ title, body, updated_at: new Date().toISOString() })
            .eq("id", s.phrase_id);
          if (error) return bad(error.message, 500);
        } else if (s.category_id) {
          const { error } = await db.from("phrases").insert({ category_id: s.category_id, title, body });
          if (error) return bad(error.message, 500);
        } else {
          return bad("Frasen eller kategorien finnes ikke lenger. Avvis forslaget eller legg det inn manuelt.");
        }
      }
      const { error } = await db
        .from("phrase_suggestions")
        .update({ status: b.status, resolved_at: new Date().toISOString() })
        .eq("id", b.id);
      if (error) return bad(error.message, 500);
      return NextResponse.json({ ok: true });
    }
    default:
      return bad("Ukjent handling");
  }
}
