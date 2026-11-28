/**
 * Display preferences and profile helpers. Preferences are kept in
 * localStorage (applied before first paint by PREFS_INIT_SCRIPT) and, for
 * signed-in users, in Supabase user_metadata so they follow the user.
 */

export type MenuLayout = "horisontal" | "vertikal";
export type FontChoice = "standard" | "lesevennlig" | "klassisk";
export type ColorChoice = "terrakotta" | "blaa" | "gronn";

export interface Prefs {
  menu: MenuLayout;
  font: FontChoice;
  farge: ColorChoice;
}

export const DEFAULT_PREFS: Prefs = { menu: "horisontal", font: "standard", farge: "terrakotta" };

export const MENU_OPTIONS: { value: MenuLayout; label: string; hint: string }[] = [
  { value: "horisontal", label: "Horisontal", hint: "Fanene ligger i en rad over innholdet" },
  { value: "vertikal", label: "Vertikal", hint: "Fanene ligger i en kolonne til venstre" }
];

export const FONT_OPTIONS: { value: FontChoice; label: string; hint: string; sample: string }[] = [
  { value: "standard", label: "Standard", hint: "Nunito Sans og Zilla Slab", sample: '"Nunito Sans", sans-serif' },
  { value: "lesevennlig", label: "Lesevennlig", hint: "Atkinson Hyperlegible, laget for god lesbarhet", sample: '"Atkinson Hyperlegible", sans-serif' },
  { value: "klassisk", label: "Klassisk", hint: "Source Serif med seriffer", sample: '"Source Serif 4", Georgia, serif' }
];

export const COLOR_OPTIONS: { value: ColorChoice; label: string; swatch: [string, string] }[] = [
  { value: "terrakotta", label: "Terrakotta", swatch: ["#b5573f", "#efe6da"] },
  { value: "blaa", label: "Klinisk blå", swatch: ["#2f6db3", "#e8eef5"] },
  { value: "gronn", label: "Salviegrønn", swatch: ["#3f7a5c", "#e7efe8"] }
];

export const PREFS_KEY = "la-prefs";
export const PROFILE_EVENT = "la-profile";

export function cleanPrefs(raw: unknown): Prefs {
  const r = (raw && typeof raw === "object" ? raw : {}) as Partial<Record<keyof Prefs, unknown>>;
  const pick = <T extends string>(v: unknown, allowed: readonly T[], fallback: T): T =>
    allowed.includes(v as T) ? (v as T) : fallback;
  return {
    menu: pick(r.menu, ["horisontal", "vertikal"] as const, DEFAULT_PREFS.menu),
    font: pick(r.font, ["standard", "lesevennlig", "klassisk"] as const, DEFAULT_PREFS.font),
    farge: pick(r.farge, ["terrakotta", "blaa", "gronn"] as const, DEFAULT_PREFS.farge)
  };
}

export function readLocalPrefs(): Prefs {
  try {
    return cleanPrefs(JSON.parse(localStorage.getItem(PREFS_KEY) ?? "null"));
  } catch {
    return DEFAULT_PREFS;
  }
}

export function applyPrefs(prefs: Prefs) {
  const el = document.documentElement;
  el.dataset.menu = prefs.menu;
  el.dataset.font = prefs.font;
  el.dataset.farge = prefs.farge;
}

export function storePrefs(prefs: Prefs) {
  applyPrefs(prefs);
  try {
    localStorage.setItem(PREFS_KEY, JSON.stringify(prefs));
  } catch {
    /* storage unavailable */
  }
}

/** Runs in <head> before the page paints, so there is no flash of the default look. */
export const PREFS_INIT_SCRIPT = `(function(){try{var p=JSON.parse(localStorage.getItem(${JSON.stringify(
  PREFS_KEY
)})||"{}");var d=document.documentElement;var ok={menu:["horisontal","vertikal"],font:["standard","lesevennlig","klassisk"],farge:["terrakotta","blaa","gronn"]};for(var k in ok){if(ok[k].indexOf(p[k])>=0)d.dataset[k]=p[k];}}catch(e){}})();`;

/** The name used on filled-in forms and as signature on ready-made texts. */
export function profileName(user: { user_metadata?: Record<string, unknown> } | null | undefined): string {
  const m = user?.user_metadata ?? {};
  return String(m.full_name ?? m.name ?? "").trim();
}

/** The phone number from the profile, as the user typed it. */
export function profilePhone(user: { user_metadata?: Record<string, unknown> } | null | undefined): string {
  const raw = user?.user_metadata?.phone;
  return typeof raw === "string" ? cleanPhone(raw) : "";
}

/** Trims and collapses spaces; keeps only characters that belong in a phone number. At most 30. */
export function cleanPhone(text: string): string {
  return text
    .replace(/[^0-9+()\-\s]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 30);
}

/** The stamp text from the profile: name, title, HPR number, clinic and so on, one per line. */
export function profileStamp(user: { user_metadata?: Record<string, unknown> } | null | undefined): string {
  const raw = user?.user_metadata?.stamp;
  return typeof raw === "string" ? cleanStamp(raw) : "";
}

/** Like the signature, at most 6 lines, and each line short enough to fit in a stamp. */
export function cleanStamp(text: string): string {
  return cleanSignature(text)
    .split("\n")
    .map((l) => l.slice(0, 60))
    .join("\n");
}

/** A first draft of the stamp from what the profile already has. */
export function suggestStamp(name: string, signature: string, phone: string): string {
  const lines = (signature || name).split("\n").map((l) => l.trim()).filter(Boolean);
  if (lines.length === 0 && name) lines.push(name);
  if (!lines.some((l) => /hpr/i.test(l))) lines.splice(Math.min(2, lines.length), 0, "HPR-nr. ");
  if (phone && !lines.some((l) => l.includes(phone))) lines.push(`Tlf. ${phone}`);
  return cleanStamp(lines.join("\n"));
}

/** The signature block from the profile, e.g. name, title and clinic on separate lines. */
export function profileSignature(user: { user_metadata?: Record<string, unknown> } | null | undefined): string {
  const raw = user?.user_metadata?.signature;
  return typeof raw === "string" ? cleanSignature(raw) : "";
}

/** Trims each line and drops empty lines at the start and end. At most 6 lines. */
export function cleanSignature(text: string): string {
  return text
    .replace(/\r\n?/g, "\n")
    .split("\n")
    .map((l) => l.trim())
    .join("\n")
    .replace(/^\n+|\n+$/g, "")
    .split("\n")
    .slice(0, 6)
    .join("\n");
}

/**
 * Replaces placeholders in a ready-made text. {signatur} gets the signature block
 * (or the name if there is none); {navn}, [Legens navn] and similar get the name.
 */
export function fillSignature(text: string, name: string, signature = ""): string {
  const block = signature || name;
  return text.replace(
    /\{\s*(signatur|navn|lege)\s*\}|\[\s*(signatur|legens navn|lege)\s*\]/gi,
    (match, a?: string, b?: string) => {
      const key = (a || b || "").toLowerCase();
      const value = key === "signatur" ? block : name;
      return value || match;
    }
  );
}
