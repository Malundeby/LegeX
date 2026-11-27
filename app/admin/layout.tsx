import { redirect } from "next/navigation";
import Link from "next/link";
import { requireAdmin } from "@/lib/supabase/adminAuth";

const SECTIONS = ["Lenker", "Kalkulatorer", "Verktøy", "Pasientinformasjon", "Oversikter", "Takster"];

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await requireAdmin();
  if (!user) {
    redirect("/");
  }

  return (
    <main style={{ maxWidth: 1200 }}>
      <header style={{ marginBottom: 24 }}>
        <div className="header-title-row">
          <h1>Admin</h1>
        </div>
        <p>Innlogget som {user.email}</p>
      </header>

      <nav
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: 8,
          marginBottom: 24,
          padding: 12,
          background: "var(--panel-2)",
          borderRadius: 14,
        }}
      >
        <Link href="/admin" className="tool-action">
          Nøkkeltall
        </Link>
        {SECTIONS.map((section) => (
          <Link key={section} href={`/admin/innhold/${encodeURIComponent(section)}`} className="tool-action">
            {section}
          </Link>
        ))}
        <Link href="/admin/fraser" className="tool-action">
          Fraser
        </Link>
        <Link href="/admin/statistikk" className="tool-action">
          Statistikk
        </Link>
        <Link href="/admin/brukere" className="tool-action">
          Brukere
        </Link>
        <Link href="/" className="tool-action" style={{ marginLeft: "auto" }}>
          ← Til forsiden
        </Link>
      </nav>

      {children}
    </main>
  );
}
