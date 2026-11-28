/**
 * Helpers for the in-browser PDF form filler at /skjema. Everything the user
 * types stays in the browser; only the blank PDF is fetched.
 */

/** The pdf.js worker, copied into public/ at build time (scripts/copy-pdf-worker.mjs) and cached for a year. */
export const pdfWorkerSrc = (version: string) => `/pdfjs/pdf.worker-${version}.min.mjs`;

/** True for links that point at a PDF file. */
export function isPdfUrl(url: string | null | undefined): boolean {
  if (!url) return false;
  return /\.pdf($|[?#])/i.test(url.trim());
}

/** Link to the form filler for PDF links; other links are returned unchanged. */
export function skjemaHref(url: string, title?: string): string {
  if (!isPdfUrl(url)) return url;
  const params = new URLSearchParams({ url });
  if (title) params.set("tittel", title);
  return `/skjema?${params.toString()}`;
}

/**
 * Only same-site paths and public https links may be opened in the filler.
 * Returns where the browser should fetch the bytes from, or null if refused.
 */
export function pdfFetchUrl(url: string, origin: string): string | null {
  const raw = url.trim();
  if (raw.startsWith("/") && !raw.startsWith("//") && !raw.startsWith("/\\")) return encodePath(raw);
  let parsed: URL;
  try {
    parsed = new URL(raw);
  } catch {
    return null;
  }
  if (parsed.origin === origin) return encodePath(parsed.pathname) + parsed.search;
  if (parsed.protocol !== "https:") return null;
  return `/api/pdf?url=${encodeURIComponent(parsed.toString())}`;
}

/** Encodes each path segment, so names with commas or spaces work with the static file server. */
function encodePath(path: string): string {
  const [p, q] = path.split(/\?(.*)/s, 2);
  const safe = (seg: string) => {
    try {
      return encodeURIComponent(decodeURIComponent(seg));
    } catch {
      return encodeURIComponent(seg);
    }
  };
  return p.split("/").map(safe).join("/") + (q ? `?${q}` : "");
}

export function formatNorwegianDate(date: Date): string {
  const dd = String(date.getDate()).padStart(2, "0");
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  return `${dd}.${mm}.${date.getFullYear()}`;
}

const normalize = (s: string) =>
  s
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/ø/g, "o")
    .replace(/æ/g, "ae")
    .replace(/[_\-./]+/g, " ");

const BIRTH = /(fodsel|fodt|fodd|\bf ?dato\b|birth|dob\b|personnr|fnr)/;

/** Form field names that are the date the form is filled in (not a birth date). */
export function isDateFieldName(name: string): boolean {
  const n = normalize(name);
  if (BIRTH.test(n)) return false;
  // "Dato", "Sted og dato", "Utfyllingsdato", "Date"
  return /\bdate\b/.test(n) || /dato\b/.test(n);
}

/** Form field names meant for the doctor filling in the form. */
export function isSignerFieldName(name: string): boolean {
  const n = normalize(name).replace(/\s+/g, " ").trim();
  // Long names are usually a whole printed sentence used as the field name.
  if (n.length > 32) return false;
  if (/(tlf|telefon|adresse|hpr|nummer|\bnr\b|mail|epost|e post|kontor|sted|dato|pasient)/.test(n)) return false;
  return /^(lege|legens|underskrift|signatur|behandlende lege|behandler|rekvirent|utstedt av|attestert av)\b|legeunderskrift|legens (navn|underskrift)|navn pa (fastlege|lege)$|(navn|underskrift|signatur) (lege|legen)\b/.test(n);
}

export type LabelKind = "date" | "signer";

/**
 * Finds printed labels such as "Dato: ______" in flat (non-fillable) PDFs.
 * Returns the character index in `text` where the answer should start, or -1.
 */
export function findLabels(text: string): { kind: LabelKind; index: number }[] {
  const out: { kind: LabelKind; index: number }[] = [];
  const re = /(^|[^\p{L}.])(dato|date|legens navn|lege|behandler|underskrift lege|legens underskrift|underskrift|signatur)\s*:\s*/giu;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text))) {
    const label = m[2].toLowerCase();
    // "Fødselsår/dato:" is a birth date.
    if (BIRTH.test(normalize(text.slice(Math.max(0, m.index - 14), m.index + 1)))) continue;
    const start = m.index + m[0].length;
    const rest = text.slice(start);
    // Only labels followed by a blank line to write on, or by nothing in this text run.
    if (rest.length > 0 && !/^[_.…\s]{2,}/.test(rest) && !/^_/.test(rest)) continue;
    out.push({ kind: label === "dato" || label === "date" ? "date" : "signer", index: start });
  }
  return out;
}

/**
 * Labels printed under an empty space, e.g. "Dato" or "Legens underskrift og stempel"
 * at the bottom of a form. The answer then goes above the label.
 */
export function standaloneLabel(text: string): LabelKind | null {
  const t = text.replace(/\s+/g, " ").trim().toLowerCase();
  if (/^(dato|date|sted og dato|sted\/dato|sted, dato)$/.test(t)) return "date";
  if (/^(legens (underskrift|signatur|navn)( og stempel)?|(underskrift|signatur) lege|lege)$/.test(t)) return "signer";
  return null;
}

/**
 * Splits text into the lines drawn on the PDF: on line breaks, and, when a box
 * width is given, between words so each line fits. A single word wider than the
 * box is broken by character. `measure` gives the width of a string in points.
 */
export function wrapLines(text: string, maxWidth: number | undefined, measure: (s: string) => number): string[] {
  const out: string[] = [];
  for (const para of text.replace(/\r\n?/g, "\n").split("\n")) {
    if (!maxWidth || maxWidth <= 0 || measure(para) <= maxWidth) {
      out.push(para);
      continue;
    }
    let line = "";
    for (const word of para.split(/(\s+)/)) {
      if (!word) continue;
      if (measure(line + word) <= maxWidth) {
        line += word;
        continue;
      }
      if (/^\s+$/.test(word)) {
        out.push(line.trimEnd());
        line = "";
        continue;
      }
      if (line.trim()) out.push(line.trimEnd());
      line = "";
      if (measure(word) <= maxWidth) {
        line = word;
        continue;
      }
      // The word alone is too wide: break it by character.
      for (const ch of Array.from(word)) {
        if (line && measure(line + ch) > maxWidth) {
          out.push(line);
          line = "";
        }
        line += ch;
      }
    }
    out.push(line.trimEnd());
  }
  return out;
}
