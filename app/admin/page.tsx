import { createAdminClient } from "@/lib/supabase/admin";

async function countDistinctVisitors(since: string, hashColumn: "visitor_hash_daily" | "visitor_hash_monthly") {
  const admin = createAdminClient();
  const { data } = await admin
    .from("content_events")
    .select(hashColumn)
    .gte("created_at", since);
  if (!data) return 0;
  const set = new Set(data.map((row: Record<string, string>) => row[hashColumn]));
  return set.size;
}

async function countEvents(since: string) {
  const admin = createAdminClient();
  const { count } = await admin
    .from("content_events")
    .select("id", { count: "exact", head: true })
    .gte("created_at", since);
  return count ?? 0;
}

function daysAgoIso(days: number) {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.toISOString();
}

function startOfYearIso() {
  return `${new Date().getFullYear()}-01-01T00:00:00.000Z`;
}

export default async function AdminHome() {
  const [todayVisitors, weekVisitors, monthVisitors, yearVisitors, todayEvents, weekEvents, monthEvents] =
    await Promise.all([
      countDistinctVisitors(daysAgoIso(0), "visitor_hash_daily"),
      countDistinctVisitors(daysAgoIso(7), "visitor_hash_daily"),
      countDistinctVisitors(daysAgoIso(30), "visitor_hash_daily"),
      countDistinctVisitors(startOfYearIso(), "visitor_hash_monthly"),
      countEvents(daysAgoIso(0)),
      countEvents(daysAgoIso(7)),
      countEvents(daysAgoIso(30)),
    ]);

  const cards = [
    { label: "I dag", visitors: todayVisitors, events: todayEvents },
    { label: "Siste 7 dager", visitors: weekVisitors, events: weekEvents },
    { label: "Siste 30 dager", visitors: monthVisitors, events: monthEvents },
    { label: "Hittil i år", visitors: yearVisitors, events: null },
  ];

  return (
    <div>
      <h2>Nøkkeltall</h2>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
          gap: 16,
          marginTop: 16,
        }}
      >
        {cards.map((card) => (
          <div key={card.label} className="calc-card">
            <p style={{ fontSize: 13, color: "var(--muted)", margin: 0 }}>{card.label}</p>
            <p style={{ fontSize: 32, fontWeight: 700, color: "var(--heading)", margin: "8px 0 0" }}>
              {card.visitors}
            </p>
            <p style={{ fontSize: 13, color: "var(--muted)", margin: "4px 0 0" }}>unike besøkende</p>
            {card.events !== null && (
              <p style={{ fontSize: 13, color: "var(--muted)", margin: "8px 0 0" }}>{card.events} totalt besøk</p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
