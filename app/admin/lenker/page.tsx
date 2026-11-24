import { createAdminClient } from "@/lib/supabase/admin";
import { createDefaultBookmarkWidgets } from "@/app/utils/toolHubLinks";
import type { DashboardWidget } from "@/app/utils/widgetStorage";
import DefaultLinksEditor from "./DefaultLinksEditor";

export default async function AdminLinksPage() {
  const admin = createAdminClient();
  const { data } = await admin.from("link_defaults").select("widgets, updated_at").eq("id", "default").maybeSingle();

  const saved = data && Array.isArray(data.widgets) && data.widgets.length > 0;
  const widgets = (saved ? data!.widgets : createDefaultBookmarkWidgets(0)) as DashboardWidget[];

  return (
    <div>
      <h2>Lenker – standardmeny</h2>
      <p style={{ color: "var(--muted)", marginTop: 4 }}>
        Dette er menyen alle ser i Lenker-fanen. Innloggede brukere får en kopi de kan endre selv; endringer her påvirker
        ikke menyer brukere allerede har tilpasset.
        {saved && data?.updated_at && ` Sist lagret ${new Date(data.updated_at).toLocaleString("nb-NO")}.`}
      </p>
      <DefaultLinksEditor initialWidgets={widgets} />
    </div>
  );
}
