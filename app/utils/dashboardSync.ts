import type { SupabaseClient } from "@supabase/supabase-js";
import type { DashboardWidget } from "@/app/utils/widgetStorage";

/**
 * The personal link page of a logged-in user, stored in
 * public.user_dashboards (see sql/0005_user_dashboards.sql). RLS makes sure
 * a user can only read and write their own row.
 */

/** Returns the saved widgets, or null if the user has no page yet. */
export async function loadUserDashboard(
  supabase: SupabaseClient,
  userId: string
): Promise<DashboardWidget[] | null> {
  const { data, error } = await supabase
    .from("user_dashboards")
    .select("widgets")
    .eq("user_id", userId)
    .maybeSingle();

  if (error) throw error;
  return Array.isArray(data?.widgets) ? (data.widgets as DashboardWidget[]) : null;
}

export async function saveUserDashboard(
  supabase: SupabaseClient,
  userId: string,
  widgets: DashboardWidget[]
) {
  const { error } = await supabase
    .from("user_dashboards")
    .upsert({ user_id: userId, widgets, updated_at: new Date().toISOString() });
  if (error) throw error;
}
