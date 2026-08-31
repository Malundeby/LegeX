import { createClient } from "@/lib/supabase/client";

/**
 * Public, anon-key read of published content for one section. Uses the
 * regular Supabase client (NEXT_PUBLIC_SUPABASE_ANON_KEY) — RLS policies
 * (see sql/0001_grants_and_policies.sql) already restrict this to
 * published, non-archived rows. Never use the service-role client here.
 */

export interface ContentItemRow {
  id: string;
  type: string;
  slug: string;
  title: string;
  description: string | null;
  url: string | null;
  icon_url: string | null;
  category_name: string | null;
  sort_order: number;
  category_sort_order: number;
}

interface RawRow {
  id: string;
  type: string;
  slug: string;
  title: string;
  description: string | null;
  url: string | null;
  icon_url: string | null;
  sort_order: number;
  content_categories: { name: string; sort_order: number } | null;
}

export async function getSectionContent(section: string): Promise<ContentItemRow[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("content_items")
    .select("id, type, slug, title, description, url, icon_url, sort_order, content_categories(name, sort_order)")
    .eq("section", section)
    .not("published_at", "is", null)
    .is("archived_at", null)
    .order("sort_order");

  if (error || !data) return [];

  return (data as unknown as RawRow[])
    .map((row) => ({
      id: row.id,
      type: row.type,
      slug: row.slug,
      title: row.title,
      description: row.description,
      url: row.url,
      icon_url: row.icon_url,
      sort_order: row.sort_order,
      category_name: row.content_categories?.name ?? null,
      category_sort_order: row.content_categories?.sort_order ?? 0,
    }))
    .sort((a, b) => a.category_sort_order - b.category_sort_order || a.sort_order - b.sort_order);
}

export interface ContentCategoryGroup {
  categoryName: string | null;
  items: ContentItemRow[];
}

/** Groups already-sorted section content into category buckets, preserving order. */
export function groupByCategory(rows: ContentItemRow[]): ContentCategoryGroup[] {
  const groups: ContentCategoryGroup[] = [];
  for (const row of rows) {
    const last = groups[groups.length - 1];
    if (last && last.categoryName === row.category_name) {
      last.items.push(row);
    } else {
      groups.push({ categoryName: row.category_name, items: [row] });
    }
  }
  return groups;
}
