"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import "pdfjs-dist/web/pdf_viewer.css";
import { createClient } from "@/lib/supabase/client";
import { profileName, profileSignature } from "@/lib/profile";
import {
  findLabels,
  formatNorwegianDate,
  isDateFieldName,
  isSignerFieldName,
  pdfFetchUrl,
  standaloneLabel,
  wrapLines,
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
  /** Box width as a fraction of the page, once the user has resized it. Text then wraps inside. */
  w?: number;
  /** Minimum box height as a fraction of the page. */
  h?: number;
}

type Tool = "none" | "text" | "kryss" | "navn" | "signatur";

const LINE_HEIGHT = 1.15;
const MARK_FONT = "Helvetica, Arial, sans-serif";
let measureCtx: CanvasRenderingContext2D | null = null;
/** Width in CSS pixels of one line of mark text at the given font size. */
function textWidthPx(text: string, fontPx: number): number {
  if (typeof document === "undefined") return text.length * fontPx * 0.55;
  measureCtx ??= document.createElement("canvas").getContext("2d");
  if (!measureCtx) return text.length * fontPx * 0.55;
  measureCtx.font = `${fontPx}px ${MARK_FONT}`;
  return measureCtx.measureText(text).width;
}

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
  const [userSignature, setUserSignature] = useState("");
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
      const name = profileName(user);
      setUserName(name);
      setUserSignature(profileSignature(user));
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
    const text = tool === "kryss" ? "X" : tool === "navn" ? userName : tool === "signatur" ? userSignature : "";
    const mark: Mark = { id: newId(), page, x, y, size, text };
    dirtyRef.current = true;
    setMarks((ms) => [...ms, mark]);
    if (tool === "text") setFocusId(mark.id);
    // Name and signature are placed once per click on the button.
    if (tool === "navn" || tool === "signatur") setTool("none");
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

  /** Drag the corner to make a text box wider (text wraps) or taller. */
  const startResize = (mark: Mark, e: React.PointerEvent<HTMLElement>) => {
    const layer = layersRef.current.get(mark.page);
    const box = (e.currentTarget as HTMLElement).parentElement;
    if (!layer || !box) return;
    e.preventDefault();
    e.stopPropagation();
    const rect = layer.getBoundingClientRect();
    const start = box.getBoundingClientRect();
    const startX = e.clientX;
    const startY = e.clientY;
    const move = (ev: PointerEvent) => {
      updateMark(mark.id, {
        w: Math.max(24, start.width + ev.clientX - startX) / rect.width,
        h: Math.max(8, start.height + ev.clientY - startY) / rect.height
      });
    };
    const up = () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
  };

  const resizeText = (mark: Mark, step: number) => {
    updateMark(mark.id, { size: Math.min(28, Math.max(6, mark.size + step)) });
  };

  /**
   * Name or signature button: typed into the field that has focus (a form field
   * in the PDF or one of our text boxes), otherwise placed where the user clicks next.
   */
  const quickInsert = (kind: "navn" | "signatur") => {
    const value = kind === "navn" ? userName : userSignature;
    if (!value) return;
    const el = document.activeElement;
    const inViewer = el instanceof HTMLElement && containerRef.current?.contains(el);
    const markId = el instanceof HTMLTextAreaElement ? el.dataset.mark : undefined;
    if (inViewer && (el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement) && !el.readOnly && el.type !== "checkbox" && el.type !== "radio") {
      const text = el instanceof HTMLInputElement ? value.replace(/\n+/g, ", ") : value;
      const startPos = el.selectionStart ?? el.value.length;
      const endPos = el.selectionEnd ?? el.value.length;
      const next = el.value.slice(0, startPos) + text + el.value.slice(endPos);
      if (markId) {
        updateMark(markId, { text: next });
      } else {
        // A pdf.js form field: setting the value and firing "input" stores it in the form.
        el.value = next;
        el.dispatchEvent(new Event("input", { bubbles: true }));
        el.dispatchEvent(new Event("change", { bubbles: true }));
        dirtyRef.current = true;
      }
      const caret = startPos + text.length;
      requestAnimationFrame(() => el.setSelectionRange?.(caret, caret));
      return;
    }
    setTool(tool === kind ? "none" : kind);
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
      // Same inner width as the box on screen (border and padding are 2 px on each side).
      const maxWidth = m.w ? m.w * vp.width - 4 / PT_TO_PX : undefined;
      const lines = wrapLines(m.text, maxWidth, (t) => font.widthOfTextAtSize(safe(t), m.size)).map(safe);
      lines.forEach((line, i) => {
        if (!line) return;
        const [px, py] = vp.convertToPdfPoint(m.x * vp.width, m.y * vp.height + m.size * 0.85 + i * m.size * LINE_HEIGHT);
        out.getPage(m.page - 1).drawText(line, { x: px, y: py, size: m.size, font, color: rgb(0, 0, 0) });
      });
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
          <button
            type="button"
            className={`pu-btn${tool === "navn" ? " on" : ""}`}
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => quickInsert("navn")}
            disabled={!userName}
            aria-pressed={tool === "navn"}
            title={userName ? `Sett inn «${userName}» i feltet du står i, eller klikk der det skal stå` : "Legg inn navnet ditt først"}
          >
            Navn
          </button>
          <button
            type="button"
            className={`pu-btn${tool === "signatur" ? " on" : ""}`}
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => quickInsert("signatur")}
            disabled={!userSignature}
            aria-pressed={tool === "signatur"}
            title={userSignature ? "Sett inn signaturen i feltet du står i, eller klikk der den skal stå" : "Legg inn signatur på profilsiden"}
          >
            Signatur
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
            {tool === "navn"
              ? "Klikk der navnet skal stå."
              : tool === "signatur"
                ? "Klikk der signaturen skal stå."
                : hasForm && tool === "none"
                  ? "Klikk i feltene for å fylle ut. Navn og Signatur settes inn i feltet du står i."
                  : tool === "none"
                    ? "Velg Tekst eller Kryss og klikk der du vil skrive. Dra i ⠿ for å flytte og i ◢ for å gjøre boksen større."
                    : tool === "text"
                      ? "Klikk der du vil skrive. Shift+Enter gir ny linje."
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
        {userId && !userSignature && (
          <span className="pu-muted">
            <a href="/profil">Legg inn signatur</a> for hurtigvalg.
          </span>
        )}
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
                <MarkBox
                  key={m.id}
                  mark={m}
                  pxPerPt={pxPerPt}
                  autoFocus={m.id === focusId}
                  onText={(text) => updateMark(m.id, { text })}
                  onRemove={() => removeMark(m.id)}
                  onDrag={(e) => startDrag(m, e)}
                  onResize={(e) => startResize(m, e)}
                  onSize={(step) => resizeText(m, step)}
                />
              ))}
          </div>,
          layer,
          `layer-${p}`
        );
      })}
    </div>
  );
}

/** One text box on the page. Without a set width it grows with the text; once resized, text wraps. */
function MarkBox({
  mark: m,
  pxPerPt,
  autoFocus,
  onText,
  onRemove,
  onDrag,
  onResize,
  onSize
}: {
  mark: Mark;
  pxPerPt: number;
  autoFocus: boolean;
  onText: (text: string) => void;
  onRemove: () => void;
  onDrag: (e: React.PointerEvent<HTMLElement>) => void;
  onResize: (e: React.PointerEvent<HTMLElement>) => void;
  onSize: (step: number) => void;
}) {
  const ref = useRef<HTMLTextAreaElement | null>(null);
  const fontPx = m.size * pxPerPt;
  const linePx = fontPx * LINE_HEIGHT;
  const fixed = m.w !== undefined;
  const lines = m.text.split("\n");
  const autoWidth = Math.max(fontPx * 0.8, ...lines.map((l) => textWidthPx(l, fontPx))) + 6;

  // Grow the box to fit all lines, never smaller than the height the user dragged to.
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const pageHeight = el.closest(".pu-layer")?.clientHeight ?? 0;
    const minPx = m.h !== undefined ? m.h * pageHeight : 0;
    el.style.height = "0px";
    el.style.height = `${Math.max(linePx + 2, el.scrollHeight, minPx)}px`;
  });

  const label = m.auto === "date" ? "Dato" : m.auto === "signer" ? "Navn" : "Tekst";
  return (
    <div
      className={`pu-mark${fixed ? " fixed" : ""}`}
      style={{
        left: `${m.x * 100}%`,
        top: `${m.y * 100}%`,
        width: fixed ? `${m.w! * 100}%` : undefined
      }}
    >
      <span className="pu-handle" onPointerDown={onDrag} title="Dra for å flytte" aria-hidden="true">⠿</span>
      <textarea
        ref={ref}
        data-mark={m.id}
        autoFocus={autoFocus}
        value={m.text}
        rows={1}
        wrap={fixed ? "soft" : "off"}
        spellCheck={false}
        onChange={(e) => onText(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Escape" || (e.key === "Enter" && !e.shiftKey)) {
            e.preventDefault();
            (e.target as HTMLTextAreaElement).blur();
          }
        }}
        onBlur={() => {
          if (!m.text.trim()) onRemove();
        }}
        style={{
          fontSize: `${fontPx}px`,
          lineHeight: `${linePx}px`,
          width: fixed ? "100%" : `${autoWidth}px`
        }}
        aria-label={label}
      />
      <span className="pu-ctrl">
        <button type="button" onMouseDown={(e) => e.preventDefault()} onClick={() => onSize(-1)} aria-label="Mindre skrift" title="Mindre skrift">A−</button>
        <button type="button" onMouseDown={(e) => e.preventDefault()} onClick={() => onSize(1)} aria-label="Større skrift" title="Større skrift">A+</button>
        <button type="button" onClick={onRemove} aria-label="Fjern" title="Fjern">×</button>
      </span>
      <span className="pu-grip" onPointerDown={onResize} title="Dra for å endre størrelse" aria-hidden="true" />
    </div>
  );
}

const CSS = `
.pu{display:flex;flex-direction:column;background:var(--bg);color:#2b2b2b;font-family:inherit}
.pu-bar{display:flex;flex-wrap:wrap;gap:8px 16px;align-items:center;justify-content:space-between;padding:10px 14px;background:#fff;border-bottom:1px solid var(--border-soft)}
.pu-title{display:flex;flex-direction:column;min-width:0}
.pu-title strong{font-size:16px}
.pu-title span{font-size:12px;color:var(--muted)}
.pu-tools{display:flex;flex-wrap:wrap;align-items:center;gap:6px}
.pu-btn{height:32px;min-width:32px;padding:0 10px;border:1px solid var(--border);border-radius:8px;background:#fff;cursor:pointer;font:inherit;font-size:13px;color:inherit}
.pu-btn:hover:not(:disabled){background:var(--surface-3)}
.pu-btn:disabled{opacity:.5;cursor:default}
.pu-btn.on{background:var(--primary-bg);border-color:var(--primary);color:var(--primary-dark)}
.pu-primary{background:var(--primary);border-color:var(--primary);color:#fff}
.pu-primary:hover:not(:disabled){background:var(--primary-dark)}
.pu-sep{width:1px;height:22px;background:var(--border-soft);margin:0 2px}
.pu-zoom{font-size:12px;min-width:44px;text-align:center;color:var(--muted)}
.pu-sub{display:flex;flex-wrap:wrap;gap:6px 16px;align-items:center;justify-content:space-between;padding:6px 14px;font-size:12.5px;color:var(--text);background:var(--surface-3);border-bottom:1px solid var(--border-soft)}
.pu-name{display:flex;align-items:center;gap:6px}
.pu-name input{height:28px;border:1px solid var(--border);border-radius:6px;padding:0 8px;font:inherit;width:190px}
.pu-ok{color:#2f7d32}
.pu-muted a,.pu-info a{color:var(--primary-dark)}
.pu-error{margin:8px 14px 0;color:#b42318}
.pu-info{margin:8px 14px 0}
.pu-stage{position:relative;flex:1;min-height:0}
.pu-container{position:absolute;inset:0;overflow:auto}
.pu-container .pdfViewer .page{margin:12px auto;box-shadow:0 6px 18px rgba(0,0,0,.12);border:0}
.pu-layer{position:absolute;inset:0;z-index:30;pointer-events:none}
.pu-marks{position:absolute;inset:0}
.pu-tool-text .pu-marks{pointer-events:auto;cursor:text}
.pu-tool-kryss .pu-marks{pointer-events:auto;cursor:crosshair}
.pu-tool-navn .pu-marks,.pu-tool-signatur .pu-marks{pointer-events:auto;cursor:copy}
.pu-mark{position:absolute;pointer-events:auto;display:flex}
.pu-mark textarea{display:block;box-sizing:border-box;border:1px dashed transparent;background:rgba(255,255,255,.01);padding:0 1px;margin:0;font-family:Helvetica,Arial,sans-serif;color:#000;outline:none;border-radius:2px;resize:none;overflow:hidden;white-space:pre;min-width:1ch}
.pu-mark.fixed textarea{white-space:pre-wrap;overflow-wrap:anywhere}
.pu-mark:hover textarea,.pu-mark textarea:focus{border-color:var(--primary);background:rgba(255,255,255,.85)}
.pu-handle{position:absolute;left:-15px;top:0;width:14px;font-size:11px;line-height:1.2;color:var(--primary-dark);opacity:0;cursor:grab;user-select:none;text-align:center;touch-action:none}
.pu-ctrl{position:absolute;right:0;bottom:100%;display:flex;gap:2px;padding-bottom:2px;opacity:0;pointer-events:none}
.pu-ctrl button{height:18px;min-width:20px;padding:0 4px;border:1px solid var(--border);border-radius:4px;background:#fff;color:var(--primary-dark);font:600 11px/1 system-ui,sans-serif;cursor:pointer}
.pu-ctrl button:hover{background:var(--primary-bg)}
.pu-grip{position:absolute;right:-5px;bottom:-5px;width:11px;height:11px;border-right:2px solid var(--primary);border-bottom:2px solid var(--primary);cursor:nwse-resize;opacity:0;touch-action:none}
.pu-mark:hover .pu-handle,.pu-mark:hover .pu-ctrl,.pu-mark:hover .pu-grip,.pu-mark:focus-within .pu-handle,.pu-mark:focus-within .pu-ctrl,.pu-mark:focus-within .pu-grip{opacity:1;pointer-events:auto}
@media (hover:none){.pu-handle,.pu-grip{opacity:.7}}
`;
