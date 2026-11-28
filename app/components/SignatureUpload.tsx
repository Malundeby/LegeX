"use client";

import { useEffect, useRef, useState } from "react";
import { MAX_IMAGE_SRC, inkHex, type Ink, type SignatureImage } from "@/lib/drawing";
import { autoThreshold, inkMask, inkStrength } from "@/lib/signatureImage";

/** Longest side of the photo while working on it; enough detail, still quick. */
const WORK_PX = 1400;
/** Widest stored signature: plenty for print at normal signature size. */
const OUT_MAX_W = 900;

interface Crop {
  x: number;
  y: number;
  w: number;
  h: number;
}
const FULL: Crop = { x: 0, y: 0, w: 1, h: 1 };

/**
 * Photo of a signature on paper → clean digital signature. The photo is read
 * and processed only on this device; just the result is handed back.
 */
export default function SignatureUpload({
  ink,
  onUse,
  onCancel
}: {
  ink: Ink;
  onUse: (s: SignatureImage) => void;
  onCancel: () => void;
}) {
  const fileRef = useRef<HTMLInputElement | null>(null);
  const [photo, setPhoto] = useState<{ url: string; data: ImageData } | null>(null);
  const [crop, setCrop] = useState<Crop>(FULL);
  const [threshold, setThreshold] = useState(0.3);
  const [result, setResult] = useState<SignatureImage | null>(null);
  const [error, setError] = useState("");
  const [working, setWorking] = useState(false);
  const inkCache = useRef<{ key: string; ink: Float32Array; w: number; h: number } | null>(null);
  const autoSet = useRef(false);

  useEffect(() => {
    fileRef.current?.click();
  }, []);

  const pick = async (file: File | undefined) => {
    setError("");
    setResult(null);
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setError("Velg et bilde (JPG eller PNG).");
      return;
    }
    try {
      const bitmap = await loadBitmap(file);
      const k = Math.min(1, WORK_PX / Math.max(bitmap.width, bitmap.height));
      const w = Math.max(1, Math.round(bitmap.width * k));
      const h = Math.max(1, Math.round(bitmap.height * k));
      const canvas = document.createElement("canvas");
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext("2d", { willReadFrequently: true })!;
      ctx.drawImage(bitmap, 0, 0, w, h);
      if ("close" in bitmap) (bitmap as ImageBitmap).close();
      inkCache.current = null;
      autoSet.current = false;
      setCrop(FULL);
      setPhoto({ url: canvas.toDataURL("image/jpeg", 0.85), data: ctx.getImageData(0, 0, w, h) });
    } catch {
      setError("Kunne ikke lese bildet. Prøv et JPG- eller PNG-bilde.");
    }
  };

  // Process whenever the photo, the crop or the threshold changes (debounced).
  useEffect(() => {
    if (!photo) return;
    setWorking(true);
    const t = setTimeout(() => {
      try {
        const { data } = photo;
        const cx = Math.round(crop.x * data.width);
        const cy = Math.round(crop.y * data.height);
        const cw = Math.max(8, Math.round(crop.w * data.width));
        const ch = Math.max(8, Math.round(crop.h * data.height));
        const key = `${cx},${cy},${cw},${ch}`;
        if (inkCache.current?.key !== key) {
          const part = cropPixels(data, cx, cy, cw, ch);
          inkCache.current = { key, ink: inkStrength(part, cw, ch), w: cw, h: ch };
          if (!autoSet.current) {
            autoSet.current = true;
            const auto = autoThreshold(inkCache.current.ink);
            if (Math.abs(auto - threshold) > 0.001) {
              setThreshold(auto);
              return; // runs again with the new threshold
            }
          }
        }
        const c = inkCache.current;
        const mask = inkMask(c.ink, c.w, c.h, threshold);
        if (!mask) {
          setResult(null);
          setError("Fant ingen signatur i bildet. Prøv mer blekk eller et annet utsnitt.");
          return;
        }
        setError("");
        setResult({ v: 1, kind: "image", ink, ...maskToPng(mask) });
      } finally {
        setWorking(false);
      }
    }, 120);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [photo, crop, threshold]);

  // Selecting an area: drag on the photo.
  const dragRef = useRef<{ x: number; y: number } | null>(null);
  const [drawing, setDrawing] = useState<Crop | null>(null);
  const toFrac = (e: React.PointerEvent<HTMLElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    return { x: clamp01((e.clientX - r.left) / r.width), y: clamp01((e.clientY - r.top) / r.height) };
  };

  return (
    <div className="sigup">
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        hidden
        onChange={(e) => {
          pick(e.target.files?.[0]);
          e.target.value = "";
        }}
      />
      {!photo ? (
        <div className="sigup-empty">
          <p>Ta et bilde av signaturen din, skrevet med mørk penn på hvitt papir, i godt lys og rett ovenfra.</p>
          <button type="button" className="sigup-btn primary" onClick={() => fileRef.current?.click()}>
            Velg eller ta bilde
          </button>
        </div>
      ) : (
        <>
          <p className="sigup-help">Dra over bildet for å velge bare signaturen. Bildet forlater ikke enheten din.</p>
          <div
            className="sigup-photo"
            onPointerDown={(e) => {
              e.preventDefault();
              e.currentTarget.setPointerCapture(e.pointerId);
              dragRef.current = toFrac(e);
              setDrawing({ ...dragRef.current, w: 0, h: 0 });
            }}
            onPointerMove={(e) => {
              if (!dragRef.current) return;
              const p = toFrac(e);
              const s = dragRef.current;
              setDrawing({ x: Math.min(s.x, p.x), y: Math.min(s.y, p.y), w: Math.abs(p.x - s.x), h: Math.abs(p.y - s.y) });
            }}
            onPointerUp={() => {
              dragRef.current = null;
              if (drawing && drawing.w > 0.03 && drawing.h > 0.03) setCrop(drawing);
              setDrawing(null);
            }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={photo.url} alt="Bildet du valgte" draggable={false} />
            {(drawing ?? (crop !== FULL ? crop : null)) && (
              <span
                className="sigup-crop"
                style={{
                  left: `${(drawing ?? crop).x * 100}%`,
                  top: `${(drawing ?? crop).y * 100}%`,
                  width: `${(drawing ?? crop).w * 100}%`,
                  height: `${(drawing ?? crop).h * 100}%`
                }}
              />
            )}
          </div>
          <div className="sigup-row">
            <label className="sigup-slider">
              Mindre blekk
              <input
                type="range"
                min={-0.6}
                max={-0.06}
                step={0.01}
                value={-threshold}
                onChange={(e) => setThreshold(-Number(e.target.value))}
                aria-label="Hvor mye som regnes som blekk"
              />
              Mer blekk
            </label>
            {crop !== FULL && (
              <button type="button" className="sigup-btn" onClick={() => setCrop(FULL)}>
                Hele bildet
              </button>
            )}
            <button type="button" className="sigup-btn" onClick={() => fileRef.current?.click()}>
              Annet bilde
            </button>
          </div>
          <div className="sigup-result" aria-live="polite">
            {result ? (
              <span style={{ display: "block", width: `min(100%, ${Math.round((140 * result.w) / result.h)}px)` }}>
                <SignatureImageView sig={result} ink={ink} />
              </span>
            ) : (
              <span className="sigup-muted">{working ? "Behandler …" : error || " "}</span>
            )}
          </div>
        </>
      )}
      {error && !photo && <p className="sigup-error">{error}</p>}
      <div className="sigup-row end">
        <button type="button" className="sigup-btn" onClick={onCancel}>
          Avbryt
        </button>
        <button type="button" className="sigup-btn primary" disabled={!result || working} onClick={() => result && onUse({ ...result, ink })}>
          Bruk signaturen
        </button>
      </div>
    </div>
  );
}

/** A photo signature in the chosen ink colour, filling its box. */
export function SignatureImageView({ sig, ink, className }: { sig: SignatureImage; ink?: Ink; className?: string }) {
  const url = `url("${sig.src}")`;
  return (
    <span
      className={className ?? "sigimg"}
      role="img"
      aria-label="Signatur"
      style={{
        aspectRatio: `${sig.w} / ${sig.h}`,
        backgroundColor: inkHex(ink ?? sig.ink),
        WebkitMaskImage: url,
        maskImage: url,
        WebkitMaskSize: "100% 100%",
        maskSize: "100% 100%",
        WebkitMaskRepeat: "no-repeat",
        maskRepeat: "no-repeat"
      }}
    />
  );
}

/** The photo signature as PNG bytes in the given colour, for putting into a PDF. */
export async function coloredSignaturePng(sig: SignatureImage, ink: Ink | undefined): Promise<Uint8Array> {
  const img = new Image();
  img.src = sig.src;
  await img.decode();
  const canvas = document.createElement("canvas");
  canvas.width = img.naturalWidth;
  canvas.height = img.naturalHeight;
  const ctx = canvas.getContext("2d")!;
  ctx.drawImage(img, 0, 0);
  ctx.globalCompositeOperation = "source-in";
  ctx.fillStyle = inkHex(ink ?? sig.ink);
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  const blob = await new Promise<Blob>((resolve, reject) => canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("png"))), "image/png"));
  return new Uint8Array(await blob.arrayBuffer());
}

async function loadBitmap(file: File): Promise<CanvasImageSource & { width: number; height: number }> {
  if (typeof createImageBitmap === "function") {
    try {
      return await createImageBitmap(file, { imageOrientation: "from-image" });
    } catch {
      /* fall back below */
    }
  }
  const url = URL.createObjectURL(file);
  try {
    const img = new Image();
    img.src = url;
    await img.decode();
    return Object.assign(img, { width: img.naturalWidth, height: img.naturalHeight });
  } finally {
    URL.revokeObjectURL(url);
  }
}

function cropPixels(data: ImageData, x: number, y: number, w: number, h: number): Uint8ClampedArray {
  const out = new Uint8ClampedArray(w * h * 4);
  for (let row = 0; row < h; row++) {
    const sy = Math.min(data.height - 1, y + row);
    const start = (sy * data.width + Math.min(x, data.width - 1)) * 4;
    out.set(data.data.subarray(start, start + Math.min(w, data.width - x) * 4), row * w * 4);
  }
  return out;
}

/** Black ink with transparency as a PNG data URL, scaled down until it is small enough to store. */
function maskToPng(mask: { width: number; height: number; alpha: Uint8ClampedArray }): { src: string; w: number; h: number } {
  const full = document.createElement("canvas");
  full.width = mask.width;
  full.height = mask.height;
  const fctx = full.getContext("2d")!;
  const img = fctx.createImageData(mask.width, mask.height);
  for (let i = 0; i < mask.alpha.length; i++) {
    img.data[i * 4 + 3] = mask.alpha[i];
  }
  fctx.putImageData(img, 0, 0);

  let scale = Math.min(1, OUT_MAX_W / mask.width);
  for (;;) {
    const w = Math.max(1, Math.round(mask.width * scale));
    const h = Math.max(1, Math.round(mask.height * scale));
    const out = document.createElement("canvas");
    out.width = w;
    out.height = h;
    const ctx = out.getContext("2d")!;
    ctx.imageSmoothingQuality = "high";
    ctx.drawImage(full, 0, 0, w, h);
    const src = out.toDataURL("image/png");
    if (src.length <= MAX_IMAGE_SRC || w < 120) return { src, w, h };
    scale *= 0.8;
  }
}

const clamp01 = (v: number) => Math.min(1, Math.max(0, v));

export const SIGUP_CSS = `
.sigup{display:flex;flex-direction:column;gap:10px}
.sigup-empty{display:flex;flex-direction:column;align-items:flex-start;gap:10px;padding:14px;border:1px dashed var(--border);border-radius:10px;background:#fff}
.sigup-empty p,.sigup-help{margin:0;font-size:13px;color:var(--muted)}
.sigup-photo{position:relative;max-width:520px;border:1px solid var(--border);border-radius:10px;overflow:hidden;cursor:crosshair;touch-action:none;user-select:none;background:#fff}
.sigup-photo img{display:block;width:100%;height:auto;pointer-events:none}
.sigup-crop{position:absolute;border:2px solid var(--primary);box-shadow:0 0 0 9999px rgba(0,0,0,.35);pointer-events:none}
.sigup-row{display:flex;flex-wrap:wrap;align-items:center;gap:8px}
.sigup-row.end{justify-content:flex-end}
.sigup-slider{display:flex;align-items:center;gap:8px;font-size:12px;color:var(--muted)}
.sigup-slider input{width:160px;accent-color:var(--primary)}
.sigup-result{display:flex;align-items:center;justify-content:center;min-height:90px;max-width:520px;padding:10px;border:1px solid var(--border);border-radius:10px;background-color:#fff;background-image:linear-gradient(45deg,#f1f1f1 25%,transparent 25%,transparent 75%,#f1f1f1 75%),linear-gradient(45deg,#f1f1f1 25%,transparent 25%,transparent 75%,#f1f1f1 75%);background-size:16px 16px;background-position:0 0,8px 8px}
.sigup-result .sigimg{display:block;width:100%}
.sigup-muted{font-size:13px;color:var(--muted)}
.sigup-error{margin:0;color:var(--danger,#b42318);font-size:13px}
.sigup-btn{height:34px;padding:0 12px;border:1px solid var(--border);border-radius:8px;background:#fff;color:var(--text);font:inherit;font-size:13px;font-weight:600;cursor:pointer}
.sigup-btn:hover:not(:disabled){background:var(--surface-3)}
.sigup-btn.primary{background:var(--primary);border-color:var(--primary);color:#fff}
.sigup-btn.primary:hover:not(:disabled){background:var(--primary-dark)}
.sigup-btn:disabled{opacity:.5;cursor:not-allowed}
.sigimg{display:block}
`;
