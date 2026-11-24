"use client";

import { useEffect, useRef, useState } from "react";
import { LinkBoard } from "@/app/components/ModernWidgetDashboard";
import type { DashboardWidget } from "@/app/utils/widgetStorage";

export default function DefaultLinksEditor({ initialWidgets }: { initialWidgets: DashboardWidget[] }) {
  const [widgets, setWidgets] = useState(initialWidgets);
  const [saved, setSaved] = useState(initialWidgets);
  const [state, setState] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [error, setError] = useState("");
  const [preview, setPreview] = useState(false);
  const dirty = JSON.stringify(widgets) !== JSON.stringify(saved);
  const dirtyRef = useRef(dirty);
  dirtyRef.current = dirty;

  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => {
      if (!dirtyRef.current) return;
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, []);

  async function save() {
    setState("saving");
    setError("");
    // Collapsed state is personal; don't publish it as part of the standard menu.
    const clean = widgets.map(({ collapsed: _c, ...w }) => w as DashboardWidget);
    const res = await fetch("/api/admin/default-links", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ widgets: clean }),
    });
    if (!res.ok) {
      setState("error");
      setError((await res.json().catch(() => ({}))).error ?? `Feil ${res.status}`);
      return;
    }
    setSaved(widgets);
    setState("saved");
  }

  return (
    <div style={{ marginTop: 16, paddingBottom: 96 }}>
      <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
        <button type="button" className={`tool-action${preview ? "" : " active"}`} onClick={() => setPreview(false)}>
          Rediger
        </button>
        <button type="button" className={`tool-action${preview ? " active" : ""}`} onClick={() => setPreview(true)}>
          👁 Slik ser besøkende det
        </button>
      </div>

      <LinkBoard widgets={widgets} setWidgets={setWidgets} editable={!preview} />

      {(dirty || state === "saved" || state === "error") && (
        <div className="adm-savebar">
          <span>
            {state === "error"
              ? `Kunne ikke lagre: ${error}`
              : dirty
                ? "Standardmenyen har ulagrede endringer."
                : "Standardmenyen er lagret og vises nå for alle."}
          </span>
          {dirty && (
            <>
              <button type="button" className="button" onClick={() => setWidgets(saved)} disabled={state === "saving"}>
                Angre
              </button>
              <button type="button" className="button primary" onClick={save} disabled={state === "saving"}>
                {state === "saving" ? "Lagrer…" : "Publiser standardmeny"}
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}
