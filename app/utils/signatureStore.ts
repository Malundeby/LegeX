import { createClient } from "@/lib/supabase/client";
import { cleanDrawing, type Drawing } from "@/lib/drawing";

/**
 * The signed-in user's hand-drawn signature, in public.user_signatures
 * (sql/0012). Row level security limits every query to the user's own row.
 */

export async function loadDrawnSignature(userId: string): Promise<Drawing | null> {
  const { data, error } = await createClient().from("user_signatures").select("drawing").eq("user_id", userId).maybeSingle();
  if (error || !data) return null;
  return cleanDrawing(data.drawing);
}

export async function saveDrawnSignature(userId: string, drawing: Drawing): Promise<string | null> {
  const { error } = await createClient()
    .from("user_signatures")
    .upsert({ user_id: userId, drawing, updated_at: new Date().toISOString() }, { onConflict: "user_id" });
  return error ? error.message : null;
}

export async function deleteDrawnSignature(userId: string): Promise<string | null> {
  const { error } = await createClient().from("user_signatures").delete().eq("user_id", userId);
  return error ? error.message : null;
}
