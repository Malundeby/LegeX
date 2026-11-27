import { NextResponse, type NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { clientKey, sendAdminEmail, siteUrl, throttle } from "@/lib/email";
import { looksLikePersonalId } from "@/app/utils/fraser";

/**
 * Suggestion for a changed or new phrase. Open to everyone (no login), so it
 * is guarded by a honeypot, length limits and a burst throttle. Stored via the
 * service role and announced to the admin by e-mail.
 */
export async function POST(request: NextRequest) {
  let body: {
    phraseId?: string | null;
    categoryId?: string | null;
    title?: string;
    body?: string;
    comment?: string;
    website?: string;
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Ugyldig forespørsel" }, { status: 400 });
  }
  if (body.website) return NextResponse.json({ ok: true });

  const title = (body.title ?? "").trim();
  const text = (body.body ?? "").trim();
  const comment = (body.comment ?? "").trim();
  if (!title || !text) return NextResponse.json({ error: "Tittel og tekst må fylles ut" }, { status: 400 });
  if (title.length > 160 || text.length > 8000 || comment.length > 2000) {
    return NextResponse.json({ error: "Teksten er for lang" }, { status: 400 });
  }
  if (looksLikePersonalId(`${title} ${text} ${comment}`)) {
    return NextResponse.json(
      { error: "Forslaget ser ut til å inneholde et fødselsnummer. Fjern pasientopplysninger og prøv igjen." },
      { status: 400 }
    );
  }
  if (!body.phraseId && !body.categoryId) {
    return NextResponse.json({ error: "Mangler frase eller kategori" }, { status: 400 });
  }
  if (!throttle(`fs:${clientKey(request)}`, 10, 10 * 60 * 1000)) {
    return NextResponse.json({ error: "For mange forslag. Prøv igjen om litt." }, { status: 429 });
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const admin = createAdminClient();
  let original: { title: string; body: string } | null = null;
  let categoryId = body.categoryId ?? null;
  if (body.phraseId) {
    const { data } = await admin.from("phrases").select("title, body, category_id").eq("id", body.phraseId).maybeSingle();
    if (!data) return NextResponse.json({ error: "Frasen finnes ikke lenger" }, { status: 404 });
    original = { title: data.title, body: data.body };
    categoryId = data.category_id;
  } else if (categoryId) {
    const { data } = await admin.from("phrase_categories").select("id").eq("id", categoryId).maybeSingle();
    if (!data) return NextResponse.json({ error: "Kategorien finnes ikke lenger" }, { status: 404 });
  }

  const { error } = await admin.from("phrase_suggestions").insert({
    phrase_id: body.phraseId ?? null,
    category_id: categoryId,
    title,
    body: text,
    comment: comment || null,
    user_id: user?.id ?? null,
  });
  if (error) return NextResponse.json({ error: "Kunne ikke lagre forslaget" }, { status: 500 });

  // E-mail is a bonus; the suggestion is already saved in the admin panel.
  await sendAdminEmail({
    subject: original ? `Forslag til endring: ${original.title}` : `Forslag til ny frase: ${title}`,
    text: [
      original ? "Forslag til endring av en frase i frasekatalogen." : "Forslag til ny frase i frasekatalogen.",
      `Fra: ${user?.email ?? "anonym bruker"}`,
      "",
      ...(original ? ["Nåværende:", `${original.title}`, original.body, ""] : []),
      "Forslag:",
      title,
      text,
      ...(comment ? ["", "Kommentar:", comment] : []),
      "",
      `Behandle forslaget: ${siteUrl(request)}/admin/fraser`,
    ].join("\n"),
  });

  return NextResponse.json({ ok: true });
}
