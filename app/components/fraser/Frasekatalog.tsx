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

const COLLAPSED_SIZE = { width: 170, height: 90 };
const DEFAULT_SIZE = { width: 420, height: 580 };

export default function Frasekatalog() {
  const store = useFraser();
  const [supported, setSupported] = useState<boolean | null>(null);
  const [pip, setPip] = useState<{ win: Window; root: HTMLElement } | null>(null);
  const [collapsed, setCollapsed] = useState(false);
  const [openError, setOpenError] = useState<string | null>(null);
  const savedSize = useRef(DEFAULT_SIZE);

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
      style.textContent = `html,body{margin:0;height:100%;background:#faf5ec}#fk-root{height:100%}${FRASER_CSS}`;
      doc.head.append(font, style);
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

  // Close the floating window when leaving the page/tab.
  useEffect(() => () => pip?.win.close(), [pip]);

  const collapse = useCallback(() => {
    if (!pip) return;
    savedSize.current = { width: pip.win.outerWidth, height: pip.win.outerHeight };
    setCollapsed(true);
    try {
      pip.win.resizeTo(COLLAPSED_SIZE.width, COLLAPSED_SIZE.height);
    } catch {
      /* resizing needs a user gesture; the mini view still works */
    }
  }, [pip]);

  const expand = useCallback(() => {
    if (!pip) return;
    setCollapsed(false);
    try {
      pip.win.resizeTo(savedSize.current.width, savedSize.current.height);
    } catch {
      /* ignore */
    }
  }, [pip]);

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
