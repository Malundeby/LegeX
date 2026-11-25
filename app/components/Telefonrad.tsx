"use client";

import { useMemo, useState } from "react";
import { TELEFONRAD, TELEFONRAD_CATEGORIES, type Telefonrad as Rad } from "@/app/utils/telefonrad";
import TakstChip, { takstSummary } from "./TakstChip";

function normalize(text: string) {
  return text.toLowerCase().normalize("NFKD");
}

function matches(rad: Rad, query: string) {
  const haystack = normalize([rad.title, rad.category, ...rad.keywords].join(" "));
  return normalize(query)
    .split(/\s+/)
    .filter(Boolean)
    .every((word) => haystack.includes(word));
}

function List({ items, className }: { items: string[]; className?: string }) {
  if (items.length === 0) return null;
  return (
    <ul className={className}>
      {items.map((item) => (
        <li key={item}>{item}</li>
      ))}
    </ul>
  );
}

function RadCard({ rad, open, onToggle }: { rad: Rad; open: boolean; onToggle: () => void }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(rad.taksttekst);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    } catch {
      // Clipboard not available (e.g. insecure context): user can select the text.
    }
  }

  const summary = rad.takst ? takstSummary(rad.takst) : null;

  return (
    <article className={`case-card ${open ? "open" : ""}`} id={`telefonrad-${rad.id}`}>
      <button type="button" className="case-card-head" onClick={onToggle} aria-expanded={open}>
        <span className="case-card-title">{rad.title}</span>
        <span className="case-card-meta">
          {rad.takst ? <TakstChip code={rad.takst} /> : <span className="takst-chip muted">Ingen takst</span>}
          <span aria-hidden="true" className="case-card-chevron">{open ? "−" : "+"}</span>
        </span>
      </button>

      {open && (
        <div className="case-card-body">
          {rad.akutt.length > 0 && (
            <section className="triage triage-red">
              <h4>Ring 113 eller send akutt</h4>
              <List items={rad.akutt} />
            </section>
          )}
          {rad.sammeDag.length > 0 && (
            <section className="triage triage-amber">
              <h4>Snakk med lege eller time samme dag</h4>
              <List items={rad.sammeDag} />
            </section>
          )}
          <section>
            <h4>Råd</h4>
            <List items={rad.rad} />
          </section>
          {rad.nyKontakt.length > 0 && (
            <section>
              <h4>Ny kontakt hvis</h4>
              <List items={rad.nyKontakt} />
            </section>
          )}
          <section className="takst-box">
            <h4>Takst</h4>
            <p>
              {rad.takst ? <TakstChip code={rad.takst} /> : <strong>Ingen takst for helsesekretær</strong>}
              {summary && <span className="takst-summary">{summary}</span>}
            </p>
            <p className="takst-note">{rad.takstMerknad}</p>
            <div className="taksttekst">
              <div className="taksttekst-head">
                <span>Taksttekst (journalnotat)</span>
                <button type="button" className="tool-action" onClick={copy}>
                  {copied ? "Kopiert" : "Kopier"}
                </button>
              </div>
              <p>{rad.taksttekst}</p>
            </div>
          </section>
        </div>
      )}
    </article>
  );
}

export default function Telefonrad({ initialOpenId = null }: { initialOpenId?: string | null }) {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<string | null>(null);
  const [openId, setOpenId] = useState<string | null>(initialOpenId);

  const visible = useMemo(
    () =>
      TELEFONRAD.filter((rad) => (!category || rad.category === category) && (!query.trim() || matches(rad, query))),
    [query, category]
  );

  return (
    <div className="resource-index case-page">
      <h2>Helsesekretær</h2>
      <p className="case-page-lead">Telefonråd for vanlige problemstillinger, med forslag til takst og taksttekst.</p>

      <div className="case-notice">
        Helsesekretær kan bare gi medisinske råd etter legens delegasjon (skriftlig prosedyre) eller etter å ha
        konferert med lege. Spør alltid etter faresignalene først. Ved tvil: konferer lege. Rådene må godkjennes av
        ansvarlig lege og tilpasses kontorets prosedyrer. På legevakt brukes 1bk i stedet for 1bd.
      </div>

      <input
        className="tool-search-input case-search"
        type="search"
        placeholder="Søk, for eksempel feber, øye eller resept"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
      />

      <div className="case-pills" role="group" aria-label="Kategori">
        <button type="button" className={`tool-action ${category === null ? "active" : ""}`} onClick={() => setCategory(null)}>
          Alle
        </button>
        {TELEFONRAD_CATEGORIES.map((c) => (
          <button
            key={c}
            type="button"
            className={`tool-action ${category === c ? "active" : ""}`}
            onClick={() => setCategory(category === c ? null : c)}
          >
            {c}
          </button>
        ))}
      </div>

      <div className="case-list">
        {visible.map((rad) => (
          <RadCard key={rad.id} rad={rad} open={openId === rad.id} onToggle={() => setOpenId(openId === rad.id ? null : rad.id)} />
        ))}
        {visible.length === 0 && <p className="case-empty">Ingen treff.</p>}
      </div>

      <p className="case-source">
        Takstregler: Legeforeningens kommentarutgave til normaltariffen 2025–2026, takst 1ad og 1bd. Beløp fra
        takstkartoteket.
      </p>
    </div>
  );
}
