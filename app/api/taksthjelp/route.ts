import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  LIMITS,
  findTakst,
  fjernFodselsnummer,
  parseKoder,
  takstgrunnlagTekst,
  type TaksthjelpRequest,
  type TaksthjelpResponse
} from "@/app/utils/taksthjelp";

/**
 * Taksthjelp: sender journaltekst, diagnosekoder, registrerte takster og evt.
 * skjermbilder til Claude (Anthropic API) og returnerer takstforslag.
 *
 * Personvern: ingenting lagres. Fødselsnummer fjernes før sending. Brukeren
 * får beskjed i grensesnittet om ikke å sende identifiserende opplysninger.
 * Krever innlogging for å hindre misbruk av API-nøkkelen.
 */

export const runtime = "nodejs";
export const maxDuration = 60;

const MODEL = process.env.ANTHROPIC_MODEL || "claude-sonnet-5-5";

const SYSTEM_INTRO = `Du er takstrådgiver for norske allmennleger (fastlege og legevakt). Du kjenner normaltariffen (Legeforeningens normaltariff for allmennleger, se normaltariffen.no) og kommentarutgaven til normaltariffen.

Oppgave: Ut fra journaltekst, diagnosekoder (ICPC-2/ICD-10) og takstene som allerede er registrert på regningskortet, foreslå ANDRE relevante takster som legen sannsynligvis har krav på, men ikke har tatt. Du kan også få skjermbilder av journal, diagnosekoder eller regningskort; les i så fall av innholdet først.

Regler:
- Foreslå KUN takstkoder som står i takstgrunnlaget under. Bruk koden nøyaktig slik den er skrevet der.
- Ikke foreslå takster som allerede er registrert.
- Hver takst må ha støtte i journalteksten (utført prosedyre, tidsbruk, kontakt med instans, erklæring osv.). Ikke gjett på ting som ikke står der. Hvis noe sannsynligvis er gjort, men ikke dokumentert, legg det i merknader i stedet, med hva som må stå i journalen.
- Respekter vilkårene og uforenlighetene i takstgrunnlaget. Ikke foreslå en takst som er uforenlig med en registrert takst eller et annet forslag.
- Ta hensyn til arbeidssted (fastlege/legevakt) og tidspunkt (dag/kveld), f.eks. 2ad vs 2ak, 2cd vs 2ck.
- Tidstakster: oppgi antall bare hvis varigheten står i teksten.
- Merknader: pek også på registrerte takster som ser feil ut (uforenlige, mangler dokumentasjon, feil tidspunkt), og på dokumentasjonskrav.
- Sikkerhet: «høy» når teksten tydelig dokumenterer vilkårene, «middels» når det er sannsynlig, «lav» når det avhenger av noe som må sjekkes.
- Skriv kort og konkret på norsk bokmål. Ikke gjenta personopplysninger fra teksten.
- Svar alltid ved å kalle verktøyet takstforslag.

Takstgrunnlag (kode | navn | kapittel | honorar kr | maks antall per regning | vilkår | uforenlig med):
`;

const TOOL = {
  name: "takstforslag",
  description: "Returner det som ble lest og takstforslagene.",
  input_schema: {
    type: "object",
    properties: {
      lest: {
        type: "object",
        properties: {
          journalsammendrag: { type: "string", description: "1–2 setninger om hva som ble gjort, uten personopplysninger." },
          diagnosekoder: { type: "array", items: { type: "string" } },
          registrerteTakster: { type: "array", items: { type: "string" }, description: "Takster som allerede står på regningskortet." }
        },
        required: ["journalsammendrag", "diagnosekoder", "registrerteTakster"]
      },
      forslag: {
        type: "array",
        items: {
          type: "object",
          properties: {
            kode: { type: "string" },
            begrunnelse: { type: "string", description: "Hvorfor taksten passer, med henvisning til journalteksten." },
            sikkerhet: { type: "string", enum: ["høy", "middels", "lav"] },
            antall: { type: "integer", minimum: 1 },
            dokumentasjonskrav: { type: "string", description: "Hva som må stå i journalen, hvis relevant." }
          },
          required: ["kode", "begrunnelse", "sikkerhet"]
        }
      },
      merknader: {
        type: "array",
        items: {
          type: "object",
          properties: {
            kode: { type: "string" },
            tekst: { type: "string" }
          },
          required: ["tekst"]
        }
      }
    },
    required: ["lest", "forslag", "merknader"]
  }
};

let cachedSystem: string | null = null;
function systemPrompt() {
  if (!cachedSystem) cachedSystem = SYSTEM_INTRO + takstgrunnlagTekst();
  return cachedSystem;
}

function bad(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

export async function POST(request: NextRequest) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return bad("Taksthjelp er ikke satt opp ennå (mangler ANTHROPIC_API_KEY).", 503);

  try {
    const supabase = await createClient();
    const { data } = await supabase.auth.getUser();
    if (!data.user) return bad("Logg inn for å bruke taksthjelp.", 401);
  } catch {
    return bad("Logg inn for å bruke taksthjelp.", 401);
  }

  let body: TaksthjelpRequest;
  try {
    body = await request.json();
  } catch {
    return bad("Ugyldig forespørsel.");
  }

  const journaltekst = fjernFodselsnummer(String(body.journaltekst ?? "")).slice(0, LIMITS.tekst);
  const diagnosekoder = fjernFodselsnummer(String(body.diagnosekoder ?? "")).slice(0, 500);
  const registrerte = fjernFodselsnummer(String(body.registrerteTakster ?? "")).slice(0, 500);
  const setting = body.setting === "legevakt" ? "legevakt" : "fastlege";
  const tid = body.tid === "kveld" ? "kveld" : "dag";
  const bilder = Array.isArray(body.bilder) ? body.bilder.slice(0, LIMITS.bilder) : [];

  if (!journaltekst.trim() && !diagnosekoder.trim() && !registrerte.trim() && bilder.length === 0) {
    return bad("Legg inn journaltekst, diagnosekode, takster eller et skjermbilde.");
  }

  const content: unknown[] = [];
  for (const bilde of bilder) {
    const m = /^data:(image\/(?:jpeg|png|webp));base64,([A-Za-z0-9+/=]+)$/.exec(String(bilde));
    if (!m || bilde.length > LIMITS.bildeTegn) return bad("Et av bildene kunne ikke leses. Prøv et mindre skjermbilde.");
    content.push({ type: "image", source: { type: "base64", media_type: m[1], data: m[2] } });
  }
  content.push({
    type: "text",
    text: [
      `Arbeidssted: ${setting}. Tidspunkt: ${tid}.`,
      `Registrerte takster på regningskortet: ${registrerte.trim() || "(ingen oppgitt)"}`,
      `Diagnosekoder: ${diagnosekoder.trim() || "(ingen oppgitt)"}`,
      `Journaltekst:\n${journaltekst.trim() || "(ingen tekst, se evt. bilder)"}`,
      bilder.length ? `Det er ${bilder.length} skjermbilde(r) vedlagt. Les av journaltekst, diagnosekoder og takster fra dem.` : ""
    ]
      .filter(Boolean)
      .join("\n\n")
  });

  let res: Response;
  try {
    res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01"
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: 2000,
        system: [{ type: "text", text: systemPrompt(), cache_control: { type: "ephemeral" } }],
        tools: [TOOL],
        tool_choice: { type: "tool", name: TOOL.name },
        messages: [{ role: "user", content }]
      })
    });
  } catch {
    return bad("Fikk ikke kontakt med Claude. Prøv igjen.", 502);
  }

  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    console.error("taksthjelp: Anthropic API", res.status, detail.slice(0, 500));
    return bad(res.status === 429 ? "Mange forespørsler akkurat nå. Prøv igjen om litt." : "Claude svarte ikke som forventet. Prøv igjen.", 502);
  }

  const json = await res.json();
  const toolUse = (json.content ?? []).find((c: { type: string }) => c.type === "tool_use");
  const raw = toolUse?.input as TaksthjelpResponse | undefined;
  if (!raw) return bad("Fikk ikke noe forslag tilbake. Prøv igjen.", 502);

  // Behold bare koder som finnes i kartoteket, og bruk kartotekets skrivemåte.
  const registrertSet = new Set([
    ...parseKoder(registrerte),
    ...((raw.lest?.registrerteTakster ?? []).map((c) => findTakst(String(c))?.code).filter(Boolean) as string[])
  ]);
  const seen = new Set<string>();
  const forslag = (raw.forslag ?? []).flatMap((f) => {
    const t = findTakst(String(f.kode ?? ""));
    if (!t || registrertSet.has(t.code) || seen.has(t.code)) return [];
    seen.add(t.code);
    return [{ ...f, kode: t.code }];
  });

  const result: TaksthjelpResponse = {
    lest: {
      journalsammendrag: raw.lest?.journalsammendrag ?? "",
      diagnosekoder: raw.lest?.diagnosekoder ?? [],
      registrerteTakster: [...registrertSet]
    },
    forslag,
    merknader: (raw.merknader ?? []).map((m) => ({ ...m, kode: m.kode ? findTakst(m.kode)?.code ?? m.kode : undefined }))
  };

  return NextResponse.json(result);
}
