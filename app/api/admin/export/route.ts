import { NextResponse, type NextRequest } from "next/server";
import { requireAdmin } from "@/lib/supabase/adminAuth";
import { createAdminClient } from "@/lib/supabase/admin";

function csvEscape(value: unknown): string {
  const s = value === null || value === undefined ? "" : String(value);
  if (/[",\n]/.test(s)) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

export async function GET(request: NextRequest) {
  const user = await requireAdmin();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 403 });

  const { searchParams } = new URL(request.url);
  const section = searchParams.get("section");
  const from = searchParams.get("from");
  const to = searchParams.get("to");

  const admin = createAdminClient();

  let query = admin
    .from("content_events")
    .select("event_type, created_at, path, content_items(title, section, slug)")
    .order("created_at", { ascending: false });

  if (from) query = query.gte("created_at", from);
  if (to) query = query.lte("created_at", to);

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  let rows = data ?? [];
  if (section) {
    rows = rows.filter((r: any) => r.content_items?.section === section);
  }

  const header = ["created_at", "event_type", "section", "title", "slug", "path"];
  const lines = [header.join(",")];
  for (const row of rows as any[]) {
    lines.push(
      [
        csvEscape(row.created_at),
        csvEscape(row.event_type),
        csvEscape(row.content_items?.section ?? ""),
        csvEscape(row.content_items?.title ?? ""),
        csvEscape(row.content_items?.slug ?? ""),
        csvEscape(row.path ?? ""),
      ].join(",")
    );
  }

  return new NextResponse(lines.join("\n"), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="statistikk-eksport.csv"`,
    },
  });
}
