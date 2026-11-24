import { NextResponse, type NextRequest } from "next/server";
import { requireAdmin } from "@/lib/supabase/adminAuth";
import { createAdminClient } from "@/lib/supabase/admin";
import { slugify } from "@/app/utils/slugify";

/**
 * Returns a one-time signed upload URL for the public "files" storage bucket.
 * The browser then uploads the file straight to Supabase Storage, so large
 * PDFs never pass through the Vercel function (which has a ~4.5 MB body cap).
 */
const BUCKET = "files";

export async function POST(request: NextRequest) {
  const user = await requireAdmin();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 403 });

  const { section, filename } = await request.json();
  if (!section || !filename) {
    return NextResponse.json({ error: "Mangler section/filename" }, { status: 400 });
  }

  const dot = String(filename).lastIndexOf(".");
  const ext = dot > 0 ? String(filename).slice(dot + 1).toLowerCase().replace(/[^a-z0-9]/g, "") : "";
  const base = slugify(dot > 0 ? String(filename).slice(0, dot) : String(filename)) || "fil";
  const stamp = Date.now().toString(36);
  const path = `${slugify(section)}/${base}-${stamp}${ext ? `.${ext}` : ""}`;

  const admin = createAdminClient();
  const { data, error } = await admin.storage.from(BUCKET).createSignedUploadUrl(path);
  if (error || !data) {
    return NextResponse.json({ error: error?.message ?? "Kunne ikke lage opplastingslenke" }, { status: 500 });
  }

  const { data: pub } = admin.storage.from(BUCKET).getPublicUrl(path);
  return NextResponse.json({ bucket: BUCKET, path, token: data.token, publicUrl: pub.publicUrl });
}
