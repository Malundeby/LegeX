"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export interface SuggestionRow {
  id: string;
  kind: "endring" | "ny";
  status: "ny" | "godkjent" | "avvist";
  createdAt: string;
  fromUser: boolean;
  title: string;
  body: string;
  comment: string | null;
  path: string;
  original: { title: string; body: string } | null;
  targetMissing: boolean;
}

const box: React.CSSProperties = { whiteSpace: "pre-wrap", margin: 0, fontSize: 14 };
const field: React.CSSProperties = {
  width: "100%",
  padding: 8,
  borderRadius: 8,
  border: "1px solid var(--border)",
  font: "inherit",
  background: "#fff",
};

function Card({ row }: { row: SuggestionRow }) {
  const router = useRouter();
  const [title, setTitle] = useState(row.title);
  const [body, setBody] = useState(row.body);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function resolve(status: "godkjent" | "avvist") {
    setBusy(true);
    setErr(null);
    const res = await fetch("/api/fraser/admin", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "resolveSuggestion", id: row.id, status, title, body }),
    });
    setBusy(false);
    if (!res.ok) {
      setErr((await res.json().catch(() => ({}))).error ?? "Kunne ikke lagre");
      return;
    }
    router.refresh();
  }

  const open = row.status === "ny";
  return (
    <div className="calc-card" style={{ display: "grid", gap: 10, opacity: open ? 1 : 0.75 }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 8, flexWrap: "wrap", fontSize: 13, color: "var(--muted)" }}>
        <span>
          {row.kind === "endring" ? "Endring" : "Ny frase"} · {row.path || "ukjent kategori"}
        </span>
        <span>
          {new Date(row.createdAt).toLocaleString("nb-NO", { dateStyle: "short", timeStyle: "short" })} ·{" "}
          {row.fromUser ? "innlogget bruker" : "anonym"}
          {!open && ` · ${row.status}`}
        </span>
      </div>

      {row.original && (
        <div>
          <p style={{ margin: "0 0 4px", fontSize: 12, fontWeight: 700, color: "var(--muted)" }}>Nåværende</p>
          <p style={{ ...box, fontWeight: 700 }}>{row.original.title}</p>
          <p style={box}>{row.original.body}</p>
        </div>
      )}

      <div>
        <p style={{ margin: "0 0 4px", fontSize: 12, fontWeight: 700, color: "var(--muted)" }}>
          Forslag{open ? " (kan redigeres før godkjenning)" : ""}
        </p>
        {open ? (
          <div style={{ display: "grid", gap: 6 }}>
            <input style={field} value={title} onChange={(e) => setTitle(e.target.value)} maxLength={160} />
            <textarea style={field} value={body} onChange={(e) => setBody(e.target.value)} rows={5} maxLength={8000} />
          </div>
        ) : (
          <>
            <p style={{ ...box, fontWeight: 700 }}>{row.title}</p>
            <p style={box}>{row.body}</p>
          </>
        )}
      </div>

      {row.comment && (
        <p style={{ ...box, fontSize: 13, color: "var(--muted)" }}>
          <b>Kommentar:</b> {row.comment}
        </p>
      )}
      {open && row.targetMissing && (
        <p style={{ margin: 0, fontSize: 13, color: "#b42318" }}>
          Frasen eller kategorien er slettet. Forslaget kan bare avvises.
        </p>
      )}
      {err && <p style={{ margin: 0, fontSize: 13, color: "#b42318" }}>{err}</p>}
      {open && (
        <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
          <button type="button" className="tool-action" disabled={busy} onClick={() => resolve("avvist")}>
            Avvis
          </button>
          {!row.targetMissing && (
            <button type="button" className="tool-action" disabled={busy} onClick={() => resolve("godkjent")}>
              {row.kind === "endring" ? "Godkjenn og oppdater frasen" : "Godkjenn og legg til"}
            </button>
          )}
        </div>
      )}
    </div>
  );
}

export default function SuggestionList({ rows }: { rows: SuggestionRow[] }) {
  const [showAll, setShowAll] = useState(false);
  const open = rows.filter((r) => r.status === "ny");
  const done = rows.filter((r) => r.status !== "ny");

  return (
    <div style={{ display: "grid", gap: 12, marginTop: 16 }}>
      <h3 style={{ margin: 0 }}>Nye forslag ({open.length})</h3>
      {open.length === 0 && <p style={{ color: "var(--muted)", margin: 0 }}>Ingen forslag venter.</p>}
      {open.map((r) => (
        <Card key={r.id} row={r} />
      ))}
      {done.length > 0 && (
        <>
          <button type="button" className="tool-action" style={{ justifySelf: "start" }} onClick={() => setShowAll((v) => !v)}>
            {showAll ? "Skjul behandlede" : `Vis behandlede (${done.length})`}
          </button>
          {showAll && done.map((r) => <Card key={r.id} row={r} />)}
        </>
      )}
    </div>
  );
}
