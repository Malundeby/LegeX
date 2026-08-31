import { createAdminClient } from "@/lib/supabase/admin";
import ContentTable from "./ContentTable";

const KNOWN_SECTIONS = ["Lenker", "Kalkulatorer", "Verktøy", "Pasientinformasjon", "Oversikter", "Takster"];

export default async function AdminSectionPage({ params }: { params: Promise<{ section: string }> }) {
  const { section: rawSection } = await params;
  const section = decodeURIComponent(rawSection);

  if (!KNOWN_SECTIONS.includes(section)) {
    return <p>Ukjent fane: {section}</p>;
  }

  if (section === "Lenker") {
    return (
      <div className="calc-card">
        <h2>Lenker</h2>
        <p>
          "Lenker"-fanen er et brukerredigerbart widget-dashbord (bokmerker som brukeren selv drar/omorganiserer),
          ikke database-drevet innhold. Den administreres derfor ikke herfra.
        </p>
      </div>
    );
  }

  const admin = createAdminClient();

  const [{ data: items }, { data: categories }] = await Promise.all([
    admin
      .from("content_items")
      .select("*, content_categories(name)")
      .eq("section", section)
      .order("sort_order"),
    admin.from("content_categories").select("id, name, sort_order").eq("section", section).order("sort_order"),
  ]);

  // Count opens per content item.
  const ids = (items ?? []).map((i) => i.id);
  let openCounts: Record<string, number> = {};
  if (ids.length > 0) {
    const { data: events } = await admin
      .from("content_events")
      .select("content_id")
      .in("content_id", ids)
      .eq("event_type", "open");
    openCounts = (events ?? []).reduce((acc: Record<string, number>, row) => {
      if (row.content_id) acc[row.content_id] = (acc[row.content_id] ?? 0) + 1;
      return acc;
    }, {});
  }

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <h2>{section}</h2>
        <a href={`/admin/innhold/${encodeURIComponent(section)}/kategorier`} className="tool-action">
          Administrer kategorier →
        </a>
      </div>
      <ContentTable
        section={section}
        initialItems={(items ?? []).map((item) => ({
          ...item,
          category_name: (item as any).content_categories?.name ?? null,
          open_count: openCounts[item.id] ?? 0,
        }))}
        categories={categories ?? []}
      />
    </div>
  );
}
