import { createAdminClient } from "@/lib/supabase/admin";

const SECTIONS = ["Kalkulatorer", "Verktøy", "Pasientinformasjon", "Oversikter", "Takster"];

function daysAgoIso(days: number) {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.toISOString();
}

export default async function StatistikkPage({
  searchParams,
}: {
  searchParams: Promise<{ section?: string; days?: string; unusedMonths?: string }>;
}) {
  const params = await searchParams;
  const section = params.section ?? "";
  const days = Number(params.days ?? "30");
  const unusedMonths = Number(params.unusedMonths ?? "3");

  const admin = createAdminClient();
  const since = daysAgoIso(days);

  let itemsQuery = admin.from("content_items").select("id, title, section, slug").is("archived_at", null);
  if (section) itemsQuery = itemsQuery.eq("section", section);
  const { data: allItems } = await itemsQuery;

  const { data: events } = await admin
    .from("content_events")
    .select("content_id, created_at")
    .eq("event_type", "open")
    .gte("created_at", since);

  const countsById = new Map<string, number>();
  (events ?? []).forEach((e) => {
    if (!e.content_id) return;
    countsById.set(e.content_id, (countsById.get(e.content_id) ?? 0) + 1);
  });

  const itemsById = new Map((allItems ?? []).map((i) => [i.id, i]));
  const topItems = [...countsById.entries()]
    .map(([id, count]) => ({ item: itemsById.get(id), count }))
    .filter((row) => row.item)
    .sort((a, b) => b.count - a.count)
    .slice(0, 20);

  // Trend: events per day for the selected period.
  const dailyCounts = new Map<string, number>();
  (events ?? []).forEach((e) => {
    const day = e.created_at.slice(0, 10);
    dailyCounts.set(day, (dailyCounts.get(day) ?? 0) + 1);
  });
  const trend = [...dailyCounts.entries()].sort(([a], [b]) => a.localeCompare(b));
  const maxTrend = Math.max(1, ...trend.map(([, c]) => c));

  // Unused content: no 'open' event since X months ago.
  const unusedSince = daysAgoIso(unusedMonths * 30);
  const { data: recentEvents } = await admin
    .from("content_events")
    .select("content_id")
    .eq("event_type", "open")
    .gte("created_at", unusedSince);
  const usedIds = new Set((recentEvents ?? []).map((e) => e.content_id).filter(Boolean));
  const unused = (allItems ?? []).filter((i) => !usedIds.has(i.id));

  const exportUrl = `/api/admin/export?${section ? `section=${encodeURIComponent(section)}&` : ""}from=${encodeURIComponent(since)}`;

  return (
    <div>
      <h2>Statistikk</h2>

      <form style={{ display: "flex", gap: 12, alignItems: "center", margin: "16px 0" }}>
        <select name="section" defaultValue={section} className="calc-select">
          <option value="">Alle faner</option>
          {SECTIONS.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
        <select name="days" defaultValue={String(days)} className="calc-select">
          <option value="7">Siste 7 dager</option>
          <option value="30">Siste 30 dager</option>
          <option value="90">Siste 90 dager</option>
        </select>
        <button type="submit" className="button">
          Filtrer
        </button>
        <a href={exportUrl} className="button primary" style={{ textDecoration: "none", marginLeft: "auto" }}>
          Eksporter CSV
        </a>
      </form>

      <div className="calc-card">
        <h3>Trend (åpninger per dag)</h3>
        <div style={{ display: "flex", alignItems: "flex-end", gap: 3, height: 100, marginTop: 12 }}>
          {trend.map(([day, count]) => (
            <div
              key={day}
              title={`${day}: ${count}`}
              style={{
                flex: 1,
                minWidth: 3,
                height: `${(count / maxTrend) * 100}%`,
                background: "var(--primary)",
                borderRadius: 2,
              }}
            />
          ))}
          {trend.length === 0 && <p style={{ color: "var(--muted)" }}>Ingen data i perioden.</p>}
        </div>
      </div>

      <div className="calc-card" style={{ marginTop: 16 }}>
        <h3>Topp 20 mest åpnet</h3>
        <table style={{ width: "100%", borderCollapse: "collapse", marginTop: 8 }}>
          <thead>
            <tr style={{ textAlign: "left", borderBottom: "2px solid var(--border)" }}>
              <th style={{ padding: 8 }}>Tittel</th>
              <th style={{ padding: 8 }}>Fane</th>
              <th style={{ padding: 8 }}>Åpninger</th>
            </tr>
          </thead>
          <tbody>
            {topItems.map(({ item, count }) => (
              <tr key={item!.id} style={{ borderBottom: "1px solid var(--border-soft)" }}>
                <td style={{ padding: 8 }}>{item!.title}</td>
                <td style={{ padding: 8 }}>{item!.section}</td>
                <td style={{ padding: 8 }}>{count}</td>
              </tr>
            ))}
            {topItems.length === 0 && (
              <tr>
                <td colSpan={3} style={{ padding: 8, color: "var(--muted)" }}>
                  Ingen åpninger i perioden.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="calc-card" style={{ marginTop: 16 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <h3>Ubrukt innhold</h3>
          <form style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <input type="hidden" name="section" value={section} />
            <input type="hidden" name="days" value={days} />
            <select name="unusedMonths" defaultValue={String(unusedMonths)} className="calc-select">
              <option value="3">Siste 3 mnd</option>
              <option value="6">Siste 6 mnd</option>
              <option value="12">Siste 12 mnd</option>
            </select>
            <button type="submit" className="button">
              Oppdater
            </button>
          </form>
        </div>
        <ul style={{ marginTop: 12 }}>
          {unused.map((item) => (
            <li key={item.id}>
              {item.title} <span style={{ color: "var(--muted)" }}>({item.section})</span>
            </li>
          ))}
          {unused.length === 0 && <p style={{ color: "var(--muted)" }}>Alt innhold har vært åpnet i perioden.</p>}
        </ul>
      </div>
    </div>
  );
}
