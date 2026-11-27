import Link from "next/link";
import { createAdminClient } from "@/lib/supabase/admin";
import SuggestionList, { type SuggestionRow } from "./SuggestionList";

export const dynamic = "force-dynamic";

export default async function AdminFraserPage() {
  const admin = createAdminClient();
  const [{ data: suggestions }, { data: categories }, { count: phraseCount }] = await Promise.all([
    admin
      .from("phrase_suggestions")
      .select("id, phrase_id, category_id, title, body, comment, status, created_at, user_id")
      .order("created_at", { ascending: false })
      .limit(200),
    admin.from("phrase_categories").select("id, parent_id, name"),
    admin.from("phrases").select("id", { count: "exact", head: true }),
  ]);

  const phraseIds = [...new Set((suggestions ?? []).map((s) => s.phrase_id).filter(Boolean))] as string[];
  const { data: originals } = phraseIds.length
    ? await admin.from("phrases").select("id, title, body, category_id").in("id", phraseIds)
    : { data: [] as { id: string; title: string; body: string; category_id: string }[] };

  const cats = new Map((categories ?? []).map((c) => [c.id, c]));
  const pathOf = (id: string | null | undefined) => {
    const names: string[] = [];
    const seen = new Set<string>();
    let cur = id ? cats.get(id) : undefined;
    while (cur && !seen.has(cur.id)) {
      seen.add(cur.id);
      names.unshift(cur.name);
      cur = cur.parent_id ? cats.get(cur.parent_id) : undefined;
    }
    return names.join(" › ");
  };
  const byId = new Map((originals ?? []).map((p) => [p.id, p]));

  const rows: SuggestionRow[] = (suggestions ?? []).map((s) => {
    const original = s.phrase_id ? byId.get(s.phrase_id) ?? null : null;
    return {
      id: s.id,
      kind: s.phrase_id ? "endring" : "ny",
      status: s.status,
      createdAt: s.created_at,
      fromUser: Boolean(s.user_id),
      title: s.title,
      body: s.body,
      comment: s.comment,
      path: pathOf(original?.category_id ?? s.category_id),
      original: original ? { title: original.title, body: original.body } : null,
      targetMissing: s.phrase_id ? !original : !s.category_id || !cats.has(s.category_id),
    };
  });

  return (
    <div>
      <h2>Fraser</h2>
      <p style={{ color: "var(--muted)" }}>
        {phraseCount ?? 0} fraser i {categories?.length ?? 0} kategorier. Innhold og rekkefølge redigerer du direkte i{" "}
        <Link href="/fraser">frasekatalogen</Link> når du er logget inn som admin.
      </p>
      <SuggestionList rows={rows} />
    </div>
  );
}
