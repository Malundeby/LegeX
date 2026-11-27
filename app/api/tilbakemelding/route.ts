import { NextResponse, type NextRequest } from "next/server";
import { clientKey, sendAdminEmail, siteUrl, throttle } from "@/lib/email";

const LABELS: Record<string, string> = {
  feil: "Noe fungerer ikke",
  forslag: "Forslag til ny funksjon",
  annet: "Annet",
};

/** Tilbakemeldingsknappen: sendes kun som e-post til admin, lagres ikke. */
export async function POST(request: NextRequest) {
  let body: { category?: string; message?: string; email?: string; page?: string; website?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Ugyldig forespørsel" }, { status: 400 });
  }

  // Honeypot: hidden field that only bots fill in. Pretend success.
  if (body.website) return NextResponse.json({ ok: true });

  const message = (body.message ?? "").trim();
  if (!message) return NextResponse.json({ error: "Skriv en melding" }, { status: 400 });
  if (message.length > 5000) return NextResponse.json({ error: "Meldingen er for lang" }, { status: 400 });

  if (!throttle(`fb:${clientKey(request)}`, 5, 10 * 60 * 1000)) {
    return NextResponse.json({ error: "For mange meldinger. Prøv igjen om litt." }, { status: 429 });
  }

  const category = LABELS[body.category ?? ""] ?? "Annet";
  const email = (body.email ?? "").trim().slice(0, 200);
  const validEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? email : undefined;

  const result = await sendAdminEmail({
    subject: `Tilbakemelding: ${category}`,
    replyTo: validEmail,
    text: [
      `Kategori: ${category}`,
      `Fra: ${email || "(ikke oppgitt)"}`,
      `Side: ${siteUrl(request)}${(body.page ?? "").slice(0, 300)}`,
      "",
      message,
    ].join("\n"),
  });

  if (!result.ok) {
    return NextResponse.json(
      { error: "Tilbakemeldingen kunne ikke sendes akkurat nå. Prøv igjen senere." },
      { status: result.reason === "not_configured" ? 503 : 502 }
    );
  }
  return NextResponse.json({ ok: true });
}
