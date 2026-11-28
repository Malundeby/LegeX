/**
 * Hand-drawn signatures, kept as pen strokes rather than an image so they stay
 * sharp at any size, on screen and in the PDF. Coordinates are whole numbers in
 * a DRAW_W × DRAW_H drawing area; each stroke is a flat list x0, y0, x1, y1, …
 */

export const DRAW_W = 600;
export const DRAW_H = 200;
/** Pen width in drawing units. Scales with the drawing when it is placed. */
export const PEN_WIDTH = 3.2;

const MAX_STROKES = 300;
const MAX_POINTS = 6000;

export type Ink = "sort" | "blaa" | "rod";

export const INKS: { value: Ink; label: string; hex: string; rgb: [number, number, number] }[] = [
  { value: "sort", label: "Sort", hex: "#111111", rgb: [0.067, 0.067, 0.067] },
  { value: "blaa", label: "Blå", hex: "#1a3fb0", rgb: [0.102, 0.247, 0.69] },
  { value: "rod", label: "Rød", hex: "#c0262d", rgb: [0.753, 0.149, 0.176] }
];

export const inkHex = (ink: Ink | undefined) => (INKS.find((i) => i.value === ink) ?? INKS[0]).hex;
export const inkRgb = (ink: Ink | undefined) => (INKS.find((i) => i.value === ink) ?? INKS[0]).rgb;
export const isInk = (v: unknown): v is Ink => v === "sort" || v === "blaa" || v === "rod";

export interface Drawing {
  v: 1;
  ink: Ink;
  strokes: number[][];
}

/** Checks and trims a drawing from storage or from the drawing pad. Returns null if nothing is drawn. */
export function cleanDrawing(raw: unknown): Drawing | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as { ink?: unknown; strokes?: unknown };
  if (!Array.isArray(r.strokes)) return null;
  let points = 0;
  const strokes: number[][] = [];
  for (const s of r.strokes.slice(0, MAX_STROKES)) {
    if (!Array.isArray(s)) continue;
    const out: number[] = [];
    for (let i = 0; i + 1 < s.length; i += 2) {
      const x = Number(s[i]);
      const y = Number(s[i + 1]);
      if (!Number.isFinite(x) || !Number.isFinite(y)) continue;
      out.push(clamp(Math.round(x), 0, DRAW_W), clamp(Math.round(y), 0, DRAW_H));
      if (++points >= MAX_POINTS) break;
    }
    if (out.length >= 2) strokes.push(out);
    if (points >= MAX_POINTS) break;
  }
  if (strokes.length === 0) return null;
  return { v: 1, ink: isInk(r.ink) ? r.ink : "sort", strokes };
}

const clamp = (n: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, n));

/** The area actually drawn on, with room for the pen width, so placing it leaves no empty margin. */
export function drawingBounds(d: Drawing): { x: number; y: number; w: number; h: number } {
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const s of d.strokes) {
    for (let i = 0; i + 1 < s.length; i += 2) {
      minX = Math.min(minX, s[i]);
      maxX = Math.max(maxX, s[i]);
      minY = Math.min(minY, s[i + 1]);
      maxY = Math.max(maxY, s[i + 1]);
    }
  }
  const pad = PEN_WIDTH;
  const x = minX - pad;
  const y = minY - pad;
  return { x, y, w: Math.max(maxX - minX + pad * 2, 10), h: Math.max(maxY - minY + pad * 2, 10) };
}

const n = (v: number) => (Math.round(v * 10) / 10).toString();

/**
 * SVG path for the strokes, smoothed with curves through the midpoints, moved so
 * (ox, oy) becomes the origin. A stroke with a single point becomes a dot.
 */
export function drawingPath(d: Drawing, ox = 0, oy = 0): string {
  const parts: string[] = [];
  for (const s of d.strokes) {
    const pts: [number, number][] = [];
    for (let i = 0; i + 1 < s.length; i += 2) pts.push([s[i] - ox, s[i + 1] - oy]);
    if (pts.length === 1 || (pts.length === 2 && pts[0][0] === pts[1][0] && pts[0][1] === pts[1][1])) {
      const [x, y] = pts[0];
      parts.push(`M${n(x)} ${n(y)}L${n(x + 0.1)} ${n(y)}`);
      continue;
    }
    let path = `M${n(pts[0][0])} ${n(pts[0][1])}`;
    for (let i = 1; i < pts.length - 1; i++) {
      const [x, y] = pts[i];
      const [nx, ny] = pts[i + 1];
      path += `Q${n(x)} ${n(y)} ${n((x + nx) / 2)} ${n((y + ny) / 2)}`;
    }
    const last = pts[pts.length - 1];
    path += `L${n(last[0])} ${n(last[1])}`;
    parts.push(path);
  }
  return parts.join("");
}

/**
 * A signature from a photo: an ink mask as a PNG (black with transparency),
 * coloured with the chosen ink when shown or printed.
 */
export interface SignatureImage {
  v: 1;
  kind: "image";
  ink: Ink;
  /** data:image/png;base64,… */
  src: string;
  w: number;
  h: number;
}

/** What can be saved as the user's handwritten signature: drawn strokes or a cleaned photo. */
export type SavedSignature = Drawing | SignatureImage;

export const MAX_IMAGE_SRC = 380_000;

export const isImageSignature = (s: SavedSignature | null | undefined): s is SignatureImage =>
  Boolean(s && (s as SignatureImage).kind === "image");

export function cleanSignatureImage(raw: unknown): SignatureImage | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;
  if (r.kind !== "image" || typeof r.src !== "string") return null;
  if (!r.src.startsWith("data:image/png;base64,") || r.src.length > MAX_IMAGE_SRC) return null;
  if (!/^data:image\/png;base64,[A-Za-z0-9+/]+=*$/.test(r.src)) return null;
  const w = Math.round(Number(r.w));
  const h = Math.round(Number(r.h));
  if (!(w >= 1 && w <= 2000 && h >= 1 && h <= 2000)) return null;
  return { v: 1, kind: "image", ink: isInk(r.ink) ? r.ink : "sort", src: r.src, w, h };
}

export function cleanSaved(raw: unknown): SavedSignature | null {
  return cleanSignatureImage(raw) ?? cleanDrawing(raw);
}

/** Width / height of a saved signature, for placing it on the page. */
export function signatureAspect(s: SavedSignature): number {
  if (isImageSignature(s)) return s.w / s.h;
  const b = drawingBounds(s);
  return b.w / b.h;
}
