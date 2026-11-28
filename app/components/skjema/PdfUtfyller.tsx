"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import "pdfjs-dist/web/pdf_viewer.css";
import { createClient } from "@/lib/supabase/client";
import {
  findLabels,
  formatNorwegianDate,
  isDateFieldName,
  isSignerFieldName,
  pdfFetchUrl,
  standaloneLabel,
  type LabelKind
} from "@/app/utils/pdfSkjema";

/* eslint-disable @typescript-eslint/no-explicit-any */
type PdfJs = any;
type PdfDoc = any;
type Viewer = any;

/** Text the user (or the prefill) placed on a page. Position is a fraction of the page, top left. */
interface Mark {
  id: string;
  page: number;
  x: number;
  y: number;
  size: number;
  text: string;
  auto?: LabelKind;
}

type Tool = "none" | "text" | "kryss";

const WORKER_SRC = "https://unpkg.com/pdfjs-dist@6.2.108/legacy/build/pdf.worker.min.mjs";
const PT_TO_PX = 96 / 72;
let nextId = 1;
const newId = () => `m${nextId++}`;

function fileName(url: string, title?: string) {
  const base = (title || decodeURIComponent(url.split(/[?#]/)[0].split("/").pop() || "skjema").replace(/\.pdf$/i, ""))
    .replace(/[\\/:*?"<>|]+/g, " ")
    .trim();
  return `${base || "skjema"} utfylt.pdf`;
}

export default function PdfUtfyller({ url, title }: { url: string; title?: string }) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const viewerDivRef = useRef<HTMLDivElement | null>(null);
  const pdfjsRef = useRef<PdfJs>(null);
  const docRef = useRef<PdfDoc>(null);
  const viewerRef = useRef<Viewer>(null);
  const layersRef = useRef<Map<number, HTMLDivElement>>(new Map());
  const hasFormRef = useRef(false);
  const dirtyRef = useRef(false);

  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [error, setError] = useState("");
  const [marks, setMarks] = useState<Mark[]>([]);
  const [pages, setPages] = useState<number[]>([]);
  const [tool, setTool] = useState<Tool>("none");
  const [scale, setScale] = useState(1);
  const [busy, setBusy] = useState<"" | "print" | "download">("");
  const [hasForm, setHasForm] = useState(false);
  const [userId, setUserId] = useState<string | null | undefined>(undefined);
  const [userName, setUserName] = useState("");
  const [nameDraft, setNameDraft] = useState("");
  const [nameSaved, setNameSaved] = useState(false);
  const [loadKey, setLoadKey] = useState(0);
  const [focusId, setFocusId] = useState<string | null>(null);
  const rootRef = useRef<HTMLDivElement | null>(null);
  const [top, setTop] = useState(0);

  // Fill the window below the account bar.
  useEffect(() => {
    const measure = () => setTop(Math.max(0, rootRef.current?.getBoundingClientRect().top ?? 0) + window.scrollY);
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, []);

  // Signed-in user's name (stored in the Supabase user profile, never in the PDF).
  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data }) => {
      const user = data.user;
      setUserId(user?.id ?? null);
      const name = String(user?.user_metadata?.full_name ?? user?.user_metadata?.name ?? "").trim();
      setUserName(name);
      setNameDraft(name);
    });
  }, []);

  // Warn before closing the tab when something has been filled in, since nothing is saved.
  useEffect(() => {
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      if (!dirtyRef.current) return;
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, []);

  const attachLayer = useCallback((pageNumber: number, pageDiv: HTMLElement | undefined) => {
    if (!pageDiv) return;
    let layer = layersRef.current.get(pageNumber);
    if (!layer) {
      layer = document.createElement("div");
      layer.className = "pu-layer";
      layer.dataset.page = String(pageNumber);
      layersRef.current.set(pageNumber, layer);
    }
    if (layer.parentElement !== pageDiv) pageDiv.appendChild(layer);
  }, []);

  // Load the PDF and set up the viewer. Waits for the user lookup so the name can be prefilled.
  useEffect(() => {
    if (userId === undefined) return;
    let cancelled = false;
    let loadingTask: any = null;

    (async () => {
      setStatus("loading");
      setError("");
      setMarks([]);
      setPages([]);
      dirtyRef.current = false;
      layersRef.current = new Map();

      const source = pdfFetchUrl(url, window.location.origin);
      if (!source) {
        setStatus("error");
        setError("Denne lenken kan ikke åpnes her.");
        return;
      }

      try {
        const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
        pdfjs.GlobalWorkerOptions.workerSrc = WORKER_SRC;
        (globalThis as any).pdfjsLib = pdfjs;
        const viewerLib: any = await import("pdfjs-dist/legacy/web/pdf_viewer.mjs");
        pdfjsRef.current = pdfjs;

        const res = await fetch(source);
        if (!res.ok) {
          let msg = `Kunne ikke hente PDF-en (${res.status}).`;
          try {
            const j = await res.json();
            if (j?.error) msg = `Kunne ikke hente PDF-en: ${j.error}.`;
          } catch {
            /* not json */
          }
          throw new Error(msg);
        }
        const data = new Uint8Array(await res.arrayBuffer());
        loadingTask = pdfjs.getDocument({ data, enableXfa: false });
        const doc = await loadingTask.promise;
        if (cancelled) return;
        docRef.current = doc;

        const today = formatNorwegianDate(new Date());
        const name = userName;
        const storage = doc.annotationStorage;

        // 1) Fillable PDFs: put the date and the doctor's name in matching fields.
        const fields: Record<string, any[]> = (await doc.getFieldObjects()) ?? {};
        const fieldNames = Object.keys(fields);
        const formPdf = fieldNames.some((n) => fields[n].some((f) => f.editable !== false && f.type && f.type !== "button"));
        hasFormRef.current = formPdf;
        setHasForm(formPdf);
        for (const n of fieldNames) {
          for (const f of fields[n]) {
            if (f.type !== "text" || f.editable === false || (f.value && String(f.value).trim())) continue;
            if (isDateFieldName(n)) storage.setValue(f.id, { value: today });
            else if (name && isSignerFieldName(n)) storage.setValue(f.id, { value: name });
          }
        }

        // 2) Flat PDFs: find printed "Dato: ____" labels and place text after them.
        const auto: Mark[] = [];
        if (!formPdf) {
          for (let p = 1; p <= doc.numPages; p++) {
            const page = await doc.getPage(p);
            const vp = page.getViewport({ scale: 1 });
            const content = await page.getTextContent();
            const boxes = (content.items as any[])
              .filter((it) => it.str && it.str.trim())
              .map((it) => {
                const tx = pdfjs.Util.transform(vp.transform, it.transform);
                const h = Math.hypot(tx[2], tx[3]) || 10;
                return { item: it, left: tx[4], right: tx[4] + it.width, base: tx[5], h };
              });
            const found: Mark[] = [];
            for (const box of boxes) {
              const { item, base, h } = box;
              const str: string = item.str;
              const size = Math.min(12, Math.max(9, h));
              const text = (kind: LabelKind) => (kind === "date" ? today : name);

              // "Dato: ______"
              for (const hit of findLabels(str)) {
                if (hit.kind === "signer" && !name) continue;
                const atEnd = hit.index >= str.trimEnd().length;
                if (atEnd) {
                  // "Dato:" at the end of a text run: only if what follows on the line is a blank to write on.
                  const next = boxes
                    .filter((o) => o !== box && Math.abs(o.base - base) < h * 0.5 && o.left >= box.right - 1)
                    .sort((a, b) => a.left - b.left)[0];
                  if (next && /^\//.test(next.item.str.trim())) continue;
                  if (next && next.left - box.right < 55 && !/^[_.…]/.test(next.item.str.trim())) continue;
                }
                const x = box.left + (item.width * Math.min(hit.index, str.length)) / str.length + (atEnd ? 4 : 1);
                found.push({ id: newId(), page: p, x: x / vp.width, y: (base - size * 1.05) / vp.height, size, text: text(hit.kind), auto: hit.kind });
              }

              // "Dato" printed under an empty space near the bottom of the page: write above it.
              const kind = standaloneLabel(str);
              if (!kind || (kind === "signer" && !name) || base < vp.height * 0.55) continue;
              const top = base - h - size * 1.6;
              const blocked = boxes.some(
                (o) => o !== box && o.base < base - h * 0.5 && o.base > top - 2 && o.right > box.left && o.left < box.left + Math.max(item.width, 80)
              );
              if (blocked) continue;
              found.push({ id: newId(), page: p, x: (box.left + 1) / vp.width, y: top / vp.height, size, text: text(kind), auto: kind });
            }
            // Many date blanks on one page is a diary; leave those for the patient.
            const dates = found.filter((m) => m.auto === "date").length;
            auto.push(...(dates >= 3 ? found.filter((m) => m.auto !== "date") : found));
          }
          // Later "Dato" blanks are usually for something else (e.g. an earlier test); fill only the first.
          const firstDate = auto.find((m) => m.auto === "date");
          for (let i = auto.length - 1; i >= 0; i--) if (auto[i].auto === "date" && auto[i] !== firstDate) auto.splice(i, 1);
        }
        if (cancelled) return;

        // Viewer with pdf.js' own form layer, so fillable fields can be typed in directly.
        const container = containerRef.current!;
        const viewerDiv = viewerDivRef.current!;
        viewerDiv.innerHTML = "";
        const eventBus = new viewerLib.EventBus();
        const linkService = new viewerLib.PDFLinkService({ eventBus, externalLinkTarget: 2 });
        const viewer = new viewerLib.PDFViewer({
          container,
          viewer: viewerDiv,
          eventBus,
          linkService,
          annotationMode: pdfjs.AnnotationMode.ENABLE_FORMS,
          annotationEditorMode: pdfjs.AnnotationEditorType.DISABLE,
          textLayerMode: 0,
          removePageBorders: false
        });
        linkService.setViewer(viewer);
        viewerRef.current = viewer;

        eventBus.on("pagesinit", () => {
          viewer.currentScaleValue = window.innerWidth < 700 ? "page-width" : "auto";
          const numbers: number[] = [];
          for (let i = 1; i <= doc.numPages; i++) {
            numbers.push(i);
            attachLayer(i, viewer.getPageView(i - 1)?.div);
          }
          setPages(numbers);
          setScale(viewer.currentScale);
        });
        eventBus.on("scalechanging", (e: any) => setScale(e.scale));
        eventBus.on("pagerendered", (e: any) => attachLayer(e.pageNumber, e.source?.div));
        eventBus.on("annotationlayerrendered", (e: any) => attachLayer(e.pageNumber, e.source?.div));

        storage.onSetModified = () => {
          dirtyRef.current = true;
        };

        viewer.setDocument(doc);
        linkService.setDocument(doc, null);
        setMarks(auto);
        setStatus("ready");
      } catch (e) {
        if (cancelled) return;
        setStatus("error");
        setError(e instanceof Error ? e.message : "Kunne ikke åpne PDF-en.");
      }
    })();

    return () => {
      cancelled = true;
      try {
        viewerRef.current?.setDocument(null);
      } catch {
        /* ignore */
      }
      viewerRef.current = null;
      docRef.current?.destroy?.();
      docRef.current = null;
      loadingTask?.destroy?.();
    };
    // userName is read once per load on purpose; saving a new name triggers a reload via loadKey.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [url, userId, loadKey, attachLayer]);

  // Keep the viewer sized to the window.
  useEffect(() => {
    const onResize = () => {
      const v = viewerRef.current;
      if (v && (v.currentScaleValue === "auto" || v.currentScaleValue === "page-width")) {
        v.currentScaleValue = window.innerWidth < 700 ? "page-width" : "auto";
      }
    };
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  const updateMark = (id: string, patch: Partial<Mark>) => {
    dirtyRef.current = true;
    setMarks((ms) => ms.map((m) => (m.id === id ? { ...m, ...patch } : m)));
  };
  const removeMark = (id: string) => {
    dirtyRef.current = true;
    setMarks((ms) => ms.filter((m) => m.id !== id));
  };

  const onLayerClick = (page: number, e: React.MouseEvent<HTMLDivElement>) => {
    if (tool === "none" || e.target !== e.currentTarget) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const pxPerPt = scale * PT_TO_PX;
    const size = tool === "kryss" ? 12 : 11;
    const x = (e.clientX - rect.left - (tool === "kryss" ? size * 0.33 * pxPerPt : 0)) / rect.width;
    const y = (e.clientY - rect.top - size * 0.55 * pxPerPt) / rect.height;
    const mark: Mark = { id: newId(), page, x, y, size, text: tool === "kryss" ? "X" : "" };
    dirtyRef.current = true;
    setMarks((ms) => [...ms, mark]);
    if (tool === "text") setFocusId(mark.id);
  };

  const startDrag = (mark: Mark, e: React.PointerEvent<HTMLElement>) => {
    const layer = layersRef.current.get(mark.page);
    if (!layer) return;
    e.preventDefault();
    const rect = layer.getBoundingClientRect();
    const startX = e.clientX;
    const startY = e.clientY;
    const move = (ev: PointerEvent) => {
      updateMark(mark.id, {
        x: mark.x + (ev.clientX - startX) / rect.width,
        y: mark.y + (ev.clientY - startY) / rect.height
      });
    };
    const up = () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
  };

  /** Builds the filled-in PDF in memory. */
  const buildPdf = async (): Promise<Uint8Array> => {
    const doc = docRef.current;
    const bytes: Uint8Array = hasFormRef.current ? await doc.saveDocument() : await doc.getData();
    const live = marks.filter((m) => m.text.trim());
    if (live.length === 0) return bytes;
    const { PDFDocument, StandardFonts, rgb } = await import("pdf-lib");
    const out = await PDFDocument.load(bytes, { ignoreEncryption: true });
    const font = await out.embedFont(StandardFonts.Helvetica);
    const safe = (s: string) =>
      Array.from(s)
        .map((ch) => {
          try {
            font.encodeText(ch);
            return ch;
          } catch {
            return "?";
          }
        })
        .join("");
    for (const m of live) {
      const page = await doc.getPage(m.page);
      const vp = page.getViewport({ scale: 1 });
      const [px, py] = vp.convertToPdfPoint(m.x * vp.width, m.y * vp.height + m.size * 0.85);
      out.getPage(m.page - 1).drawText(safe(m.text), { x: px, y: py, size: m.size, font, color: rgb(0, 0, 0) });
    }
    return out.save();
  };

  const toBlobUrl = (bytes: Uint8Array) =>
    URL.createObjectURL(new Blob([bytes as BlobPart], { type: "application/pdf" }));

  const handlePrint = async () => {
    setBusy("print");
    try {
      const blobUrl = toBlobUrl(await buildPdf());
      const iframe = document.createElement("iframe");
      iframe.style.cssText = "position:fixed;right:0;bottom:0;width:1px;height:1px;border:0;opacity:0";
      iframe.src = blobUrl;
      iframe.onload = () => {
        setTimeout(() => {
          try {
            iframe.contentWindow?.focus();
            iframe.contentWindow?.print();
          } catch {
            window.open(blobUrl, "_blank");
          }
        }, 300);
      };
      document.body.appendChild(iframe);
      // Remove the copy from memory after a while.
      setTimeout(() => {
        iframe.remove();
        URL.revokeObjectURL(blobUrl);
      }, 10 * 60 * 1000);
    } catch (e) {
      alertError(e);
    } finally {
      setBusy("");
    }
  };

  const handleDownload = async () => {
    setBusy("download");
    try {
      const blobUrl = toBlobUrl(await buildPdf());
      const a = document.createElement("a");
      a.href = blobUrl;
      a.download = fileName(url, title);
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(blobUrl), 60 * 1000);
      dirtyRef.current = false;
    } catch (e) {
      alertError(e);
    } finally {
      setBusy("");
    }
  };

  const alertError = (e: unknown) => {
    setError(e instanceof Error ? `Noe gikk galt: ${e.message}` : "Noe gikk galt.");
  };

  const handleReset = () => {
    if (dirtyRef.current && !window.confirm("Tømme alt du har fylt inn?")) return;
    setTool("none");
    setLoadKey((k) => k + 1);
  };

  const saveName = async () => {
    const name = nameDraft.trim();
    const supabase = createClient();
    const { error: err } = await supabase.auth.updateUser({ data: { full_name: name } });
    if (err) {
      setError(`Kunne ikke lagre navnet: ${err.message}`);
      return;
    }
    setUserName(name);
    setNameSaved(true);
    setTimeout(() => setNameSaved(false), 2500);
    if (!dirtyRef.current) setLoadKey((k) => k + 1);
  };

  const pxPerPt = scale * PT_TO_PX;
  const zoom = (factor: number) => {
    const v = viewerRef.current;
    if (v) v.currentScale = Math.min(4, Math.max(0.4, v.currentScale * factor));
  };

  return (
    <div className="pu" ref={rootRef} style={{ height: `calc(100dvh - ${top}px)` }}>
      <style dangerouslySetInnerHTML={{ __html: CSS }} />
      <div className="pu-bar">
        <div className="pu-title">
          <strong>{title || "Skjema"}</strong>
          <span>Fylles ut her i nettleseren. Ingenting lagres. Skriv ut eller last ned før du lukker.</span>
        </div>
        <div className="pu-tools" role="toolbar" aria-label="Verktøy">
          <button type="button" className={`pu-btn${tool === "text" ? " on" : ""}`} onClick={() => setTool(tool === "text" ? "none" : "text")} aria-pressed={tool === "text"} title="Klikk på skjemaet for å skrive">
            T Tekst
          </button>
          <button type="button" className={`pu-btn${tool === "kryss" ? " on" : ""}`} onClick={() => setTool(tool === "kryss" ? "none" : "kryss")} aria-pressed={tool === "kryss"} title="Klikk i en boks for å sette kryss">
            ✕ Kryss
          </button>
          <span className="pu-sep" />
          <button type="button" className="pu-btn" onClick={() => zoom(1 / 1.15)} aria-label="Zoom ut">−</button>
          <span className="pu-zoom">{Math.round(scale * 100)} %</span>
          <button type="button" className="pu-btn" onClick={() => zoom(1.15)} aria-label="Zoom inn">+</button>
          <span className="pu-sep" />
          <button type="button" className="pu-btn" onClick={handleReset} disabled={status !== "ready"}>Nullstill</button>
          <button type="button" className="pu-btn" onClick={handleDownload} disabled={status !== "ready" || busy !== ""}>
            {busy === "download" ? "Lager …" : "Last ned"}
          </button>
          <button type="button" className="pu-btn pu-primary" onClick={handlePrint} disabled={status !== "ready" || busy !== ""}>
            {busy === "print" ? "Lager …" : "Skriv ut"}
          </button>
        </div>
      </div>

      <div className="pu-sub">
        {status === "ready" && (
          <span>
            {hasForm
              ? "Klikk i feltene for å fylle ut. Bruk Tekst eller Kryss for steder uten felt."
              : tool === "none"
                ? "Velg Tekst eller Kryss og klikk der du vil skrive. Dra i ⠿ for å flytte."
                : tool === "text"
                  ? "Klikk der du vil skrive."
                  : "Klikk i boksen du vil krysse av."}
          </span>
        )}
        {userId ? (
          <span className="pu-name">
            <label>
              Ditt navn{" "}
              <input value={nameDraft} onChange={(e) => setNameDraft(e.target.value)} placeholder="Fylles inn som lege" />
            </label>
            {nameDraft.trim() !== userName && (
              <button type="button" className="pu-btn" onClick={saveName}>Lagre</button>
            )}
            {nameSaved && <span className="pu-ok">Lagret</span>}
          </span>
        ) : userId === null ? (
          <span className="pu-muted">
            <a href={`/login?next=${encodeURIComponent(typeof window !== "undefined" ? window.location.pathname + window.location.search : "/skjema")}`}>Logg inn</a> for å få navnet ditt fylt inn.
          </span>
        ) : null}
      </div>

      {error && <p className="pu-error" role="alert">{error}</p>}
      {status === "loading" && <p className="pu-info">Åpner PDF …</p>}
      {status === "error" && (
        <p className="pu-info">
          <a href={url} target="_blank" rel="noreferrer">Åpne PDF-en direkte</a> i stedet.
        </p>
      )}

      <div className={`pu-stage${tool !== "none" ? ` pu-tool-${tool}` : ""}`}>
        <div ref={containerRef} className="pu-container">
          <div ref={viewerDivRef} className="pdfViewer" />
        </div>
      </div>

      {pages.map((p) => {
        const layer = layersRef.current.get(p);
        if (!layer) return null;
        return createPortal(
          <div className="pu-marks" onClick={(e) => onLayerClick(p, e)}>
            {marks
              .filter((m) => m.page === p)
              .map((m) => (
                <div key={m.id} className="pu-mark" style={{ left: `${m.x * 100}%`, top: `${m.y * 100}%` }}>
                  <span className="pu-handle" onPointerDown={(e) => startDrag(m, e)} title="Dra for å flytte" aria-hidden="true">⠿</span>
                  <input
                    data-mark={m.id}
                    autoFocus={m.id === focusId}
                    value={m.text}
                    size={Math.max(2, m.text.length + 1)}
                    onChange={(e) => updateMark(m.id, { text: e.target.value })}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === "Escape") (e.target as HTMLInputElement).blur();
                    }}
                    onBlur={() => {
                      if (!m.text.trim()) removeMark(m.id);
                    }}
                    style={{ fontSize: `${m.size * pxPerPt}px`, height: `${m.size * 1.15 * pxPerPt}px` }}
                    aria-label={m.auto === "date" ? "Dato" : m.auto === "signer" ? "Navn" : "Tekst"}
                  />
                  <button type="button" className="pu-x" onClick={() => removeMark(m.id)} aria-label="Fjern">×</button>
                </div>
              ))}
          </div>,
          layer,
          `layer-${p}`
        );
      })}
    </div>
  );
}

const CSS = `
.pu{display:flex;flex-direction:column;background:#ece7df;color:#2b2b2b;font-family:inherit}
.pu-bar{display:flex;flex-wrap:wrap;gap:8px 16px;align-items:center;justify-content:space-between;padding:10px 14px;background:#fff;border-bottom:1px solid #e2d8c8}
.pu-title{display:flex;flex-direction:column;min-width:0}
.pu-title strong{font-size:16px}
.pu-title span{font-size:12px;color:#6b5b4b}
.pu-tools{display:flex;flex-wrap:wrap;align-items:center;gap:6px}
.pu-btn{height:32px;min-width:32px;padding:0 10px;border:1px solid #d8c9b3;border-radius:8px;background:#fff;cursor:pointer;font:inherit;font-size:13px;color:inherit}
.pu-btn:hover:not(:disabled){background:#f6efe4}
.pu-btn:disabled{opacity:.5;cursor:default}
.pu-btn.on{background:#f2e2da;border-color:#b5573f;color:#9a4630}
.pu-primary{background:#b5573f;border-color:#b5573f;color:#fff}
.pu-primary:hover:not(:disabled){background:#9a4630}
.pu-sep{width:1px;height:22px;background:#e2d8c8;margin:0 2px}
.pu-zoom{font-size:12px;min-width:44px;text-align:center;color:#6b5b4b}
.pu-sub{display:flex;flex-wrap:wrap;gap:6px 16px;align-items:center;justify-content:space-between;padding:6px 14px;font-size:12.5px;color:#5c4d3f;background:#faf6f0;border-bottom:1px solid #e2d8c8}
.pu-name{display:flex;align-items:center;gap:6px}
.pu-name input{height:28px;border:1px solid #d8c9b3;border-radius:6px;padding:0 8px;font:inherit;width:190px}
.pu-ok{color:#2f7d32}
.pu-muted a,.pu-info a{color:#9a4630}
.pu-error{margin:8px 14px 0;color:#b42318}
.pu-info{margin:8px 14px 0}
.pu-stage{position:relative;flex:1;min-height:0}
.pu-container{position:absolute;inset:0;overflow:auto}
.pu-container .pdfViewer .page{margin:12px auto;box-shadow:0 6px 18px rgba(0,0,0,.12);border:0}
.pu-layer{position:absolute;inset:0;z-index:30;pointer-events:none}
.pu-marks{position:absolute;inset:0}
.pu-tool-text .pu-marks{pointer-events:auto;cursor:text}
.pu-tool-kryss .pu-marks{pointer-events:auto;cursor:crosshair}
.pu-mark{position:absolute;display:flex;align-items:center;pointer-events:auto;transform:translateX(-14px)}
.pu-mark input{border:1px dashed transparent;background:rgba(255,255,255,.01);padding:0 1px;margin:0;line-height:1;font-family:Helvetica,Arial,sans-serif;color:#000;outline:none;min-width:1ch;border-radius:2px}
.pu-mark:hover input,.pu-mark input:focus{border-color:#b5573f;background:rgba(255,248,230,.9)}
.pu-handle,.pu-x{width:14px;font-size:11px;line-height:1;color:#9a4630;opacity:0;cursor:grab;user-select:none;text-align:center;touch-action:none}
.pu-x{border:0;background:none;padding:0;cursor:pointer;font-size:14px}
.pu-mark:hover .pu-handle,.pu-mark:hover .pu-x,.pu-mark:focus-within .pu-handle,.pu-mark:focus-within .pu-x{opacity:1}
@media (hover:none){.pu-handle,.pu-x{opacity:.7}}
`;
