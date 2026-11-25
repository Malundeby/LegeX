"use client";

import { useState } from "react";
import {
  KASUISTIKKER,
  KASUISTIKK_SECTIONS,
  type Kasuistikk,
  type KasuistikkSection,
} from "@/app/utils/kasuistikker";
import TakstChip from "./TakstChip";

function CaseCard({ kasus, open, onToggle }: { kasus: Kasuistikk; open: boolean; onToggle: () => void }) {
  const [showAnswer, setShowAnswer] = useState(false);

  return (
    <article className={`case-card ${open ? "open" : ""}`} id={`kasus-${kasus.id}`}>
      <button type="button" className="case-card-head" onClick={onToggle} aria-expanded={open}>
        <span className="case-card-title">{kasus.title}</span>
        <span className="case-card-meta">
          <span className="case-tags">{kasus.tags.slice(0, 2).join(" · ")}</span>
          <span aria-hidden="true" className="case-card-chevron">{open ? "−" : "+"}</span>
        </span>
      </button>

      {open && (
        <div className="case-card-body">
          <p className="case-presentation">{kasus.presentasjon}</p>
          <section>
            <h4>Spørsmål</h4>
            <ol>
              {kasus.sporsmal.map((q) => (
                <li key={q}>{q}</li>
              ))}
            </ol>
          </section>

          {showAnswer ? (
            <>
              <section>
                <h4>Drøfting</h4>
                <p>{kasus.drofting}</p>
              </section>
              <section className="triage triage-green">
                <h4>Læringspunkter</h4>
                <ul>
                  {kasus.laeringspunkter.map((p) => (
                    <li key={p}>{p}</li>
                  ))}
                </ul>
              </section>
              {kasus.takster && kasus.takster.length > 0 && (
                <section>
                  <h4>Aktuelle takster</h4>
                  <p className="case-takster">
                    {kasus.takster.map((code) => (
                      <TakstChip key={code} code={code} />
                    ))}
                  </p>
                </section>
              )}
            </>
          ) : (
            <button type="button" className="tool-action" onClick={() => setShowAnswer(true)}>
              Vis drøfting
            </button>
          )}
        </div>
      )}
    </article>
  );
}

export default function Kasuistikker({ initialOpenId = null }: { initialOpenId?: string | null }) {
  const initial = KASUISTIKKER.find((k) => k.id === initialOpenId);
  const [section, setSection] = useState<KasuistikkSection>(initial?.section ?? "fastlege");
  const [openId, setOpenId] = useState<string | null>(initial?.id ?? null);
  const current = KASUISTIKK_SECTIONS.find((s) => s.id === section)!;

  return (
    <div className="resource-index case-page">
      <h2>Kasuistikker</h2>
      <p className="case-page-lead">Oppdiktede pasienthistorier til læring og diskusjon.</p>

      <div className="case-pills" role="tablist" aria-label="Seksjon">
        {KASUISTIKK_SECTIONS.map((s) => (
          <button
            key={s.id}
            type="button"
            role="tab"
            aria-selected={section === s.id}
            className={`tool-action ${section === s.id ? "active" : ""}`}
            onClick={() => {
              setSection(s.id);
              setOpenId(null);
            }}
          >
            {s.label}
          </button>
        ))}
      </div>

      <p className="case-section-intro">{current.intro}</p>

      <div className="case-list">
        {KASUISTIKKER.filter((k) => k.section === section).map((kasus) => (
          <CaseCard
            key={kasus.id}
            kasus={kasus}
            open={openId === kasus.id}
            onToggle={() => setOpenId(openId === kasus.id ? null : kasus.id)}
          />
        ))}
      </div>
    </div>
  );
}
