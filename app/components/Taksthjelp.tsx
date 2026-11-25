"use client";

import { useMemo, useRef, useState, type ClipboardEvent, type DragEvent } from "react";
import Link from "next/link";
import TakstChip from "./TakstChip";
import {
  LIMITS,
  findTakst,
  fjernFodselsnummer,
  konflikter,
  kr,
  parseKoder,
  uforenlige,
  type Setting,
  type TaksthjelpResponse,
  type Tid
} from "@/app/utils/taksthjelp";

const MAX_SIDE = 1600;

/** Skalerer ned og konverterer til JPEG så forespørselen holder seg under Vercels grense. */
async function tilDataUrl(file: File): Promise<string> {
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const el = new Image();
      el.onload = () => resolve(el);
      el.onerror = reject;
      el.src = url;
    });
    const scale = Math.min(1, MAX_SIDE / Math.max(img.width, img.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(img.width * scale);
    canvas.height = Math.round(img.height * scale);
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("canvas");
    ctx.fillStyle = "#fff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    return canvas.toDataURL("image/jpeg", 0.85);
  } finally {
    URL.revokeObjectURL(url);
  }
}

const SIKKERHET_KLASSE: Record<string, string> = { høy: "th-sik-hoy", middels: "th-sik-middels", lav: "th-sik-lav" };

export default function Taksthjelp() {
  const [setting, setSetting] = useState<Setting>("fastlege");
  const [tid, setTid] = useState<Tid>("dag");
  const [journal, setJournal] = useState("");
  const [diagnoser, setDiagnoser] = useState("");
  const [registrert, setRegistrert] = useState("");
  const [bilder, setBilder] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<{ text: string; login?: boolean } | null>(null);
  const [result, setResult] = useState<TaksthjelpResponse | null>(null);
  const [valgt, setValgt] = useState<Set<string>>(new Set());
  const [copied, setCopied] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const registrerteKoder = useMemo(() => parseKoder(registrert), [registrert]);
  const lokaleKonflikter = useMemo(() => konflikter(registrerteKoder), [registrerteKoder]);
  const fnrFunnet = /\b\d{6}\s?\d{5}\b/.test(journal + " " + diagnoser);

  async function leggTilFiler(files: FileList | File[]) {
    const bildeFiler = Array.from(files).filter((f) => f.type.startsWith("image/"));
    const plass = LIMITS.bilder - bilder.length;
    if (bildeFiler.length > plass) setError({ text: `Maks ${LIMITS.bilder} bilder.` });
    const nye: string[] = [];
    for (const f of bildeFiler.slice(0, Math.max(0, plass))) {
      try {
        nye.push(await tilDataUrl(f));
      } catch {
        setError({ text: `Kunne ikke lese ${f.name}.` });
      }
    }
    if (nye.length) setBilder((b) => [...b, ...nye]);
  }

  function onPaste(e: ClipboardEvent) {
    const files = Array.from(e.clipboardData.items)
      .filter((i) => i.kind === "file" && i.type.startsWith("image/"))
      .map((i) => i.getAsFile())
      .filter(Boolean) as File[];
    if (files.length) {
      e.preventDefault();
      leggTilFiler(files);
    }
  }

  function onDrop(e: DragEvent) {
    e.preventDefault();
    setDragOver(false);
    if (e.dataTransfer.files.length) leggTilFiler(e.dataTransfer.files);
  }

  async function foresla() {
    setError(null);
    setResult(null);
    setLoading(true);
    try {
      const res = await fetch("/api/taksthjelp", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          journaltekst: fjernFodselsnummer(journal),
          diagnosekoder: fjernFodselsnummer(diagnoser),
          registrerteTakster: registrert,
          setting,
          tid,
          bilder
        })
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError({ text: data.error ?? "Noe gikk galt.", login: res.status === 401 });
        return;
      }
      const r = data as TaksthjelpResponse;
      setResult(r);
      setValgt(new Set(r.forslag.filter((f) => f.sikkerhet !== "lav").map((f) => f.kode)));
    } catch {
      setError({ text: "Fikk ikke kontakt med serveren. Prøv igjen." });
    } finally {
      setLoading(false);
    }
  }

  function nullstill() {
    setJournal("");
    setDiagnoser("");
    setRegistrert("");
    setBilder([]);
    setResult(null);
    setError(null);
  }

  // Koder som allerede står på regningen: brukerens felt + det Claude leste av bildene.
  const regning = useMemo(() => {
    const set = new Set(registrerteKoder);
    result?.lest.registrerteTakster.forEach((c) => set.add(c));
    return [...set];
  }, [registrerteKoder, result]);

  function konfliktFor(kode: string): string[] {
    const andre = [...regning, ...[...valgt].filter((c) => c !== kode)];
    return [...new Set(andre.filter((c) => uforenlige(kode, c)))];
  }

  const valgteForslag = result?.forslag.filter((f) => valgt.has(f.kode)) ?? [];
  const tillegg = valgteForslag.reduce((sum, f) => sum + (findTakst(f.kode)?.h ?? 0) * (f.antall ?? 1), 0);
  const kodeliste = valgteForslag.map((f) => (f.antall && f.antall > 1 ? `${f.kode} x${f.antall}` : f.kode)).join(", ");

  async function kopier() {
    try {
      await navigator.clipboard.writeText(kodeliste);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    } catch {
      // Utrygg kontekst: brukeren kan markere teksten.
    }
  }

  const tomt = !journal.trim() && !diagnoser.trim() && !registrert.trim() && bilder.length === 0;

  return (
    <div className="resource-index case-page th-page" onPaste={onPaste}>
      <h2>Taksthjelp</h2>
      <p className="case-page-lead">
        Lim inn journaltekst, diagnosekode og takstene på regningskortet, eller last opp skjermbilder. Du får forslag
        til andre relevante takster etter normaltariffen.
      </p>

      <div className="case-notice">
        Ikke send navn, fødselsnummer eller andre opplysninger som identifiserer pasienten. Fødselsnummer fjernes
        automatisk fra teksten, men ikke fra bilder, så beskjær skjermbildet først. Teksten og bildene sendes til Claude
        (Anthropic) for analyse og lagres ikke her. Forslagene er veiledende: sjekk alltid vilkårene på normaltariffen.no.
      </div>

      <div className="th-toggles">
        <div className="case-pills" role="group" aria-label="Arbeidssted">
          {(["fastlege", "legevakt"] as Setting[]).map((s) => (
            <button key={s} type="button" className={`tool-action ${setting === s ? "active" : ""}`} onClick={() => setSetting(s)}>
              {s === "fastlege" ? "Fastlege" : "Legevakt"}
            </button>
          ))}
        </div>
        <div className="case-pills" role="group" aria-label="Tidspunkt">
          {(["dag", "kveld"] as Tid[]).map((t) => (
            <button key={t} type="button" className={`tool-action ${tid === t ? "active" : ""}`} onClick={() => setTid(t)}>
              {t === "dag" ? "Dagtid" : "Kveld/natt"}
            </button>
          ))}
        </div>
      </div>

      <label className="th-label" htmlFor="th-journal">Journaltekst</label>
      <textarea
        id="th-journal"
        className="th-textarea"
        rows={7}
        maxLength={LIMITS.tekst}
        placeholder="F.eks. «Kutt 3 cm volart venstre underarm. Lokalbedøvelse, sutur x4. Tetanusvaksine gitt. Konsultasjon 35 min.»"
        value={journal}
        onChange={(e) => setJournal(e.target.value)}
      />
      {fnrFunnet && <p className="th-hint">Fødselsnummer i teksten blir fjernet før sending.</p>}

      <div className="th-row">
        <div>
          <label className="th-label" htmlFor="th-diag">Diagnosekode(r)</label>
          <input id="th-diag" className="tool-search-input" placeholder="F.eks. S81, L03" value={diagnoser} onChange={(e) => setDiagnoser(e.target.value)} />
        </div>
        <div>
          <label className="th-label" htmlFor="th-reg">Takster på regningskortet</label>
          <input id="th-reg" className="tool-search-input" placeholder="F.eks. 2ad, 2cd" value={registrert} onChange={(e) => setRegistrert(e.target.value)} />
        </div>
      </div>

      {registrerteKoder.length > 0 && (
        <div className="case-takster th-reg-chips">
          {registrerteKoder.map((c) => (
            <TakstChip key={c} code={c} />
          ))}
        </div>
      )}
      {lokaleKonflikter.length > 0 && (
        <div className="triage triage-red th-conflict">
          <h4>Uforenlige takster på regningen</h4>
          <ul>
            {lokaleKonflikter.map(([a, b]) => (
              <li key={a + b}>{a} kan ikke kombineres med {b}</li>
            ))}
          </ul>
        </div>
      )}

      <div
        className={`th-drop ${dragOver ? "over" : ""}`}
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={onDrop}
      >
        <p>
          Skjermbilde av journal, diagnosekoder eller regningskort. Dra inn, lim inn (Ctrl/Cmd+V) eller{" "}
          <button type="button" className="th-link" onClick={() => fileRef.current?.click()}>
            velg fil
          </button>
          .
        </p>
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          multiple
          hidden
          onChange={(e) => {
            if (e.target.files) leggTilFiler(e.target.files);
            e.target.value = "";
          }}
        />
        {bilder.length > 0 && (
          <div className="th-thumbs">
            {bilder.map((b, i) => (
              <div key={i} className="th-thumb">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={b} alt={`Skjermbilde ${i + 1}`} />
                <button type="button" aria-label="Fjern bilde" onClick={() => setBilder((x) => x.filter((_, j) => j !== i))}>
                  ×
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="tool-actions th-actions">
        <button type="button" className="tool-action active" disabled={loading || tomt} onClick={foresla}>
          {loading ? "Analyserer …" : "Foreslå takster"}
        </button>
        {!tomt && (
          <button type="button" className="tool-action" onClick={nullstill} disabled={loading}>
            Tøm
          </button>
        )}
      </div>

      {error && (
        <div className="triage triage-amber">
          <p>
            {error.text}{" "}
            {error.login && (
              <>
                <Link href="/login">Logg inn</Link> eller <Link href="/signup">lag en gratis konto</Link>.
              </>
            )}
          </p>
        </div>
      )}

      {result && (
        <div className="th-result">
          {result.lest.journalsammendrag && (
            <p className="th-summary">
              <strong>Lest:</strong> {result.lest.journalsammendrag}
              {result.lest.diagnosekoder.length > 0 && <> Diagnose: {result.lest.diagnosekoder.join(", ")}.</>}
            </p>
          )}
          {result.lest.registrerteTakster.length > 0 && (
            <div className="case-takster th-reg-chips">
              <span className="th-muted">På regningen:</span>
              {result.lest.registrerteTakster.map((c) => (
                <TakstChip key={c} code={c} />
              ))}
            </div>
          )}

          <h3>Forslag til takster</h3>
          {result.forslag.length === 0 && <p className="case-empty">Ingen flere takster å foreslå ut fra det som er dokumentert.</p>}
          <div className="case-list">
            {result.forslag.map((f) => {
              const t = findTakst(f.kode);
              const k = konfliktFor(f.kode);
              const on = valgt.has(f.kode);
              return (
                <article key={f.kode} className={`case-card th-card ${on ? "open" : ""}`}>
                  <label className="case-card-head th-card-head">
                    <input
                      type="checkbox"
                      checked={on}
                      onChange={() =>
                        setValgt((s) => {
                          const n = new Set(s);
                          if (n.has(f.kode)) n.delete(f.kode);
                          else n.add(f.kode);
                          return n;
                        })
                      }
                    />
                    <span className="case-card-title">
                      <TakstChip code={f.kode} />
                      {f.antall && f.antall > 1 ? <span className="th-antall"> x{f.antall}</span> : null}
                    </span>
                    <span className="case-card-meta">
                      <span className={`th-sik ${SIKKERHET_KLASSE[f.sikkerhet] ?? ""}`}>{f.sikkerhet}</span>
                      <span className="th-kr">{kr(t?.h)}</span>
                    </span>
                  </label>
                  <div className="case-card-body">
                    <p>{f.begrunnelse}</p>
                    {f.dokumentasjonskrav && (
                      <p className="takst-note">
                        <strong>Journalen må vise:</strong> {f.dokumentasjonskrav}
                      </p>
                    )}
                    {k.length > 0 && <p className="th-warn">Uforenlig med {k.join(", ")}.</p>}
                  </div>
                </article>
              );
            })}
          </div>

          {result.merknader.length > 0 && (
            <section className="triage triage-amber">
              <h4>Merknader</h4>
              <ul>
                {result.merknader.map((m, i) => (
                  <li key={i}>
                    {m.kode && <strong>{m.kode}: </strong>}
                    {m.tekst}
                  </li>
                ))}
              </ul>
            </section>
          )}

          {valgteForslag.length > 0 && (
            <div className="taksttekst th-total">
              <div className="taksttekst-head">
                <span>
                  Valgte tillegg: <strong>{kodeliste}</strong> ({kr(tillegg)} i honorar)
                </span>
                <button type="button" className="tool-action" onClick={kopier}>
                  {copied ? "Kopiert" : "Kopier koder"}
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      <p className="case-source">
        Takstgrunnlag: normaltariffen (takstkartoteket i Takster-fanen) og kommentarutgaven til normaltariffen. Forslagene
        lages av Claude og kan være feil. Sjekk vilkår og beløp på{" "}
        <a href="https://normaltariffen.no" target="_blank" rel="noopener noreferrer">
          normaltariffen.no
        </a>
        .
      </p>
    </div>
  );
}
