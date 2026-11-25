import { GROUPS, TAKSTER, type Takst } from "./takstkartotek";

/**
 * Taksthjelp: felles logikk for klient og API-rute.
 *
 * Takstgrunnlaget er takstkartoteket (normaltariffen, samme data som Takster-fanen).
 * Claude får hele kartoteket som kontekst og kan bare foreslå koder som finnes der.
 * Uforenlighet (inv) sjekkes deterministisk her, ikke av modellen.
 */

export const BY_CODE = new Map(TAKSTER.map((t) => [t.code.toLowerCase(), t]));

export function findTakst(code: string): Takst | undefined {
  return BY_CODE.get(code.trim().toLowerCase());
}

export type Setting = "fastlege" | "legevakt";
export type Tid = "dag" | "kveld";

export interface TaksthjelpRequest {
  journaltekst: string;
  diagnosekoder: string;
  registrerteTakster: string;
  setting: Setting;
  tid: Tid;
  /** data:-URL-er (image/jpeg eller image/png), allerede nedskalert i nettleseren. */
  bilder: string[];
}

export interface Forslag {
  kode: string;
  begrunnelse: string;
  sikkerhet: "høy" | "middels" | "lav";
  antall?: number;
  dokumentasjonskrav?: string;
}

export interface Merknad {
  kode?: string;
  tekst: string;
}

export interface TaksthjelpResponse {
  lest: {
    journalsammendrag: string;
    diagnosekoder: string[];
    registrerteTakster: string[];
  };
  forslag: Forslag[];
  merknader: Merknad[];
}

export const LIMITS = {
  tekst: 15000,
  bilder: 4,
  /** Lengde på én data-URL (base64), ca. 1,1 MB bilde. */
  bildeTegn: 1_500_000
};

/** Fjerner fødselsnummer/D-nummer (11 sammenhengende sifre, evt. med mellomrom etter 6). */
export function fjernFodselsnummer(text: string): string {
  return text.replace(/\b\d{6}\s?\d{5}\b/g, "[fnr fjernet]");
}

/** Leser takstkoder fra fritekst som «2ad, 2cd x2 701a». */
export function parseKoder(text: string): string[] {
  const out: string[] = [];
  for (const raw of text.split(/[\s,;+]+/)) {
    const t = findTakst(raw.replace(/[()]/g, ""));
    if (t && !out.includes(t.code)) out.push(t.code);
  }
  return out;
}

function invSet(t: Takst): { mode: "none" | "list" | "allExcept"; codes: Set<string> } {
  const inv = (t.inv ?? "").trim();
  if (!inv || /^ingen\.?$/i.test(inv)) return { mode: "none", codes: new Set() };
  const allExcept = /^alle unntatt:/i.test(inv);
  const list = inv.replace(/^alle unntatt:/i, "");
  const codes = new Set(
    list
      .split(",")
      .map((c) => c.trim().toLowerCase())
      .filter(Boolean)
  );
  return { mode: allExcept ? "allExcept" : "list", codes };
}

/** Sant hvis a sin uforenlighetsliste utelukker b. */
function excludes(a: Takst, b: Takst): boolean {
  const { mode, codes } = invSet(a);
  const key = b.code.toLowerCase();
  if (mode === "none") return false;
  if (mode === "list") return codes.has(key);
  return !codes.has(key);
}

export function uforenlige(a: string, b: string): boolean {
  const ta = findTakst(a);
  const tb = findTakst(b);
  if (!ta || !tb || ta.code === tb.code) return false;
  return excludes(ta, tb) || excludes(tb, ta);
}

/** Alle par av uforenlige koder i en liste. */
export function konflikter(codes: string[]): [string, string][] {
  const out: [string, string][] = [];
  for (let i = 0; i < codes.length; i++) {
    for (let j = i + 1; j < codes.length; j++) {
      if (uforenlige(codes[i], codes[j])) out.push([codes[i], codes[j]]);
    }
  }
  return out;
}

export function kr(n: number | null | undefined): string {
  if (n === null || n === undefined) return "–";
  return `kr ${n.toLocaleString("nb-NO")}`;
}

/** Kompakt tekstversjon av hele takstkartoteket til systemprompten. */
export function takstgrunnlagTekst(): string {
  const groupName = new Map(GROUPS.map((g) => [g.id, g.num ? `${g.num} ${g.name}` : g.name]));
  const lines = TAKSTER.map((t) =>
    [
      t.code,
      t.name,
      groupName.get(t.group) ?? t.group,
      `honorar ${t.h ?? "-"}`,
      `rep ${t.rep ?? "-"}`,
      `vilkår: ${t.ord.replace(/\s*\n\s*/g, "; ")}`,
      `uforenlig: ${t.inv || "Ingen."}`
    ].join(" | ")
  );
  return lines.join("\n");
}
