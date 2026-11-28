"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import FrasePanel from "./FrasePanel";
import { FRASER_CSS } from "./fraserCss";
import { useFraser } from "./useFraser";

/** Minimal typing for the Document Picture-in-Picture API (Chromium only). */
interface DocumentPiP {
  window: Window | null;
  requestWindow(options?: { width?: number; height?: number }): Promise<Window>;
}
const getPiP = (): DocumentPiP | undefined =>
  typeof window !== "undefined" ? (window as unknown as { documentPictureInPicture?: DocumentPiP }).documentPictureInPicture : undefined;

/** Theme variables copied into the floating window, which has no access to the page CSS. */
const THEME_VARS = ["--card", "--result-bg", "--panel-2", "--text", "--heading", "--muted", "--result-border", "--primary", "--primary-dark", "--primary-bg", "--primary-text"];
function syncTheme(target: Document) {
  const cs = getComputedStyle(document.documentElement);
  for (const name of THEME_VARS) {
    const v = cs.getPropertyValue(name).trim();
    if (v) target.documentElement.style.setProperty(name, v);
  }
}

/** Chrome keeps floating windows above a minimum size; it shrinks as far as it allows. */
const COLLAPSED_SIZE = { width: 110, height: 110 };
/** The floating window turns into a small circle after this long without use. */
const IDLE_MS = 10_000;
const DEFAULT_SIZE = { width: 420, height: 580 };

export default function Frasekatalog() {
  const store = useFraser();
  const [supported, setSupported] = useState<boolean | null>(null);
  const [pip, setPip] = useState<{ win: Window; root: HTMLElement } | null>(null);
  const [collapsed, setCollapsed] = useState(false);
  const [openError, setOpenError] = useState<string | null>(null);
  const savedSize = useRef(DEFAULT_SIZE);
  const collapsedRef = useRef(false);

  useEffect(() => setSupported(Boolean(getPiP())), []);

  const openPip = useCallback(async () => {
    const api = getPiP();
    if (!api) return;
    if (api.window) {
      api.window.focus();
      return;
    }
    setOpenError(null);
    try {
      const win = await api.requestWindow(savedSize.current);
      const doc = win.document;
      doc.title = "Fraser";
      const font = doc.createElement("link");
      font.rel = "stylesheet";
      font.href = "https://fonts.googleapis.com/css2?family=Nunito+Sans:wght@400;600;700&display=swap";
      const style = doc.createElement("style");
      style.textContent = `html,body{margin:0;height:100%;background:var(--card,#faf5ec)}#fk-root{height:100%}${FRASER_CSS}`;
      doc.head.append(font, style);
      syncTheme(doc);
      const root = doc.createElement("div");
      root.id = "fk-root";
      doc.body.append(root);
      win.addEventListener("pagehide", () => {
        setPip(null);
        setCollapsed(false);
      });
      setCollapsed(false);
      setPip({ win, root });
    } catch (e) {
      setOpenError(e instanceof Error ? e.message : "Ukjent feil");
    }
  }, []);

  // Alt+F opens the floating window while this page has focus.
  useEffect(() => {
    if (!supported) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.altKey && e.code === "KeyF") {
        e.preventDefault();
        openPip();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [supported, openPip]);

  // Keep the floating window in step when the colour theme changes.
  useEffect(() => {
    if (!pip) return;
    const obs = new MutationObserver(() => syncTheme(pip.win.document));
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ["data-farge"] });
    return () => obs.disconnect();
  }, [pip]);

  // Close the floating window when leaving the page/tab.
  useEffect(() => () => pip?.win.close(), [pip]);

  const collapse = useCallback(() => {
    if (!pip) return;
    if (!collapsedRef.current) savedSize.current = { width: pip.win.outerWidth, height: pip.win.outerHeight };
    collapsedRef.current = true;
    setCollapsed(true);
    try {
      pip.win.resizeTo(COLLAPSED_SIZE.width, COLLAPSED_SIZE.height);
    } catch {
      /* resizing needs a user gesture; the mini view still works */
    }
  }, [pip]);

  const expand = useCallback(() => {
    if (!pip) return;
    collapsedRef.current = false;
    setCollapsed(false);
    try {
      pip.win.resizeTo(savedSize.current.width, savedSize.current.height);
    } catch {
      /* ignore */
    }
  }, [pip]);

  // Shrink to the circle after IDLE_MS without use. Not while the pointer is over the
  // window (someone reading) or while a suggestion form is open (nothing gets lost
  // either way, the panel keeps its state when collapsed).
  useEffect(() => {
    if (!pip || collapsed) return;
    const doc = pip.win.document;
    let inside = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const schedule = () => {
      clearTimeout(timer);
      timer = setTimeout(() => {
        if (inside || doc.querySelector(".fk-form")) return schedule();
        collapse();
      }, IDLE_MS);
    };
    const onActivity = () => schedule();
    const onEnter = () => {
      inside = true;
      clearTimeout(timer);
    };
    const onLeave = () => {
      inside = false;
      schedule();
    };
    const activity = ["pointerdown", "keydown", "wheel", "input", "focusin"] as const;
    activity.forEach((t) => doc.addEventListener(t, onActivity, true));
    doc.documentElement.addEventListener("mouseenter", onEnter);
    doc.documentElement.addEventListener("mouseleave", onLeave);
    inside = doc.documentElement.matches(":hover");
    if (!inside) schedule();
    return () => {
      clearTimeout(timer);
      activity.forEach((t) => doc.removeEventListener(t, onActivity, true));
      doc.documentElement.removeEventListener("mouseenter", onEnter);
      doc.documentElement.removeEventListener("mouseleave", onLeave);
    };
  }, [pip, collapsed, collapse]);

  return (
    <section className="fk-page">
      <style dangerouslySetInnerHTML={{ __html: FRASER_CSS + PAGE_CSS }} />
      <div className="fk-page-head">
        <div>
          <h2>Frasekatalog</h2>
          <p>Klikk på en frase for å kopiere den, og lim inn i journalen.</p>
        </div>
        {supported && (
          <div className="fk-page-actions">
            <button type="button" className="tool-action" onClick={openPip}>
              {pip ? "Vis flytende vindu" : "Åpne flytende vindu"}
            </button>
            <span className="fk-page-hint">Alt+F</span>
          </div>
        )}
      </div>

      {supported === false && (
        <p className="fk-page-info">
          Frasekatalogen kan åpnes som et flytende vindu over journalsystemet i Chrome, Edge, Brave og Vivaldi.
          I denne nettleseren kan du bruke katalogen her på siden.
        </p>
      )}
      {openError && <p className="fk-page-info">Kunne ikke åpne flytende vindu ({openError}).</p>}

      {pip && (
        <p className="fk-page-info">
          Frasekatalogen er også åpen i et flytende vindu. Vinduet lukkes hvis du lukker denne fanen.
        </p>
      )}
      <div className="fk-page-frame">
        <FrasePanel store={store} mode="page" />
      </div>

      {pip &&
        createPortal(
          <FrasePanel store={store} mode="pip" collapsed={collapsed} onCollapse={collapse} onExpand={expand} />,
          pip.root
        )}
    </section>
  );
}

const PAGE_CSS = `
.fk-page-head{display:flex;justify-content:space-between;align-items:flex-end;gap:12px;flex-wrap:wrap;margin-bottom:12px}
.fk-page-head h2{margin:0;color:var(--heading)}
.fk-page-head p{margin:4px 0 0;color:var(--muted)}
.fk-page-actions{display:flex;align-items:center;gap:8px}
.fk-page-hint{font-size:12px;color:var(--muted);border:1px solid var(--border);border-radius:6px;padding:2px 6px}
.fk-page-info{background:var(--panel-2);border-radius:12px;padding:10px 14px;color:var(--text);margin:0 0 12px}
.fk-page-frame{height:min(640px,75vh);border:1px solid var(--border);border-radius:14px;overflow:hidden;box-shadow:var(--shadow-soft)}
`;
