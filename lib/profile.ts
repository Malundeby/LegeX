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

/** Replaces signature placeholders such as {signatur} or [navn] in a ready-made text. */
export function fillSignature(text: string, name: string): string {
  if (!name) return text;
  return text.replace(/\{\s*(signatur|navn|lege)\s*\}|\[\s*(signatur|legens navn|lege)\s*\]/gi, name);
}
