import { createAdminClient } from "@/lib/supabase/admin";
import CategoryTable from "./CategoryTable";

export default async function AdminCategoriesPage({ params }: { params: Promise<{ section: string }> }) {
  const { section: rawSection } = await params;
  const section = decodeURIComponent(rawSection);

  const admin = createAdminClient();
  const { data: categories } = await admin
    .from("content_categories")
    .select("id, name, sort_order")
    .eq("section", section)
    .order("sort_order");

  return (
    <div>
      <h2>Kategorier – {section}</h2>
      <CategoryTable section={section} initialCategories={categories ?? []} />
    </div>
  );
}
