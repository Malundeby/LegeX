"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  ANDRE_HONORARER,
  GROUPS,
  MODE_CODES,
  SETTING_GROUPS,
  TAKSTER,
  type Takst,
  type TakstGroup
} from "@/app/utils/takstkartotek";

type SettingMode = "alle" | "fastlege" | "legevakt" | "nav" | "spk" | "npe" | "vaksine" | "andre-honorarer";
type TimeMode = "dag" | "kveld" | "alle";
type ModalTab = "ugyldig" | "kommentar" | "detaljer";

function kr(n: number | null | undefined) {
  if (n === null || n === undefined) return "–";
  return "kr " + n.toLocaleString("nb-NO");
}

function norm(s: string) {
  return (s || "").toLowerCase().normalize("NFKD");
}

function groupLabel(g: TakstGroup) {
  return (g.num ? g.num + " – " : "") + (g.short || g.name);
}

function groupTitle(g: TakstGroup) {
  return (g.num ? g.num + " – " : "") + g.name;
}

const BY_CODE: Record<string, Takst> = {};
TAKSTER.forEach((t) => {
  BY_CODE[t.code] = t;
});
const GROUP_BY_ID: Record<string, TakstGroup> = {};
GROUPS.forEach((g) => {
  GROUP_BY_ID[g.id] = g;
});

const SETTING_TABS: { id: SettingMode; label: string; icon: JSX.Element }[] = [
  {
    id: "alle",
    label: "Alle",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="3" width="7" height="7" rx="1.5" />
        <rect x="14" y="3" width="7" height="7" rx="1.5" />
        <rect x="3" y="14" width="7" height="7" rx="1.5" />
        <rect x="14" y="14" width="7" height="7" rx="1.5" />
      </svg>
    )
  },
  {
    id: "fastlege",
    label: "Fastlege",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
        <path d="M5 3v5a4 4 0 0 0 8 0V3" />
        <path d="M9 12v2a5 5 0 0 0 10 0v-2.5" />
        <circle cx="19" cy="9.5" r="2" />
      </svg>
    )
  },
  {
    id: "legevakt",
    label: "Legevakt",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
        <path d="M4 21V7l8-4 8 4v14" />
        <path d="M4 21h16" />
        <path d="M12 9v6M9 12h6" />
      </svg>
    )
  },
  {
    id: "nav",
    label: "NAV",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
        <path d="M7 2h7l5 5v15H7z" />
        <path d="M14 2v5h5" />
        <path d="M9.5 12h5M9.5 16h5" />
      </svg>
    )
  },
  {
    id: "spk",
    label: "SPK",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
        <path d="M2 10l10-6 10 6" />
        <path d="M3 21h18" />
        <path d="M4 21V10M8 21V10M12 21V10M16 21V10M20 21V10" />
      </svg>
    )
  },
  {
    id: "npe",
    label: "NPE",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 3l7 3v6c0 5-3.5 8-7 9-3.5-1-7-4-7-9V6z" />
      </svg>
    )
  },
  {
    id: "vaksine",
    label: "Programvaksiner",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 2s6 7 6 12a6 6 0 0 1-12 0c0-5 6-12 6-12z" />
      </svg>
    )
  },
  {
    id: "andre-honorarer",
    label: "Andre honorarer",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
        <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
        <path d="M15 3h6v6" />
        <path d="M10 14L21 3" />
      </svg>
    )
  }
];

export default function Takstkartotek() {
  const [settingMode, setSettingMode] = useState<SettingMode>("fastlege");
  const [timeMode, setTimeMode] = useState<TimeMode>("dag");
  const [searchQuery, setSearchQuery] = useState("");
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});
  const [activePillId, setActivePillId] = useState<string | null>(null);
  const [modalCode, setModalCode] = useState<string | null>(null);
  const [modalTab, setModalTab] = useState<ModalTab>("ugyldig");

  const sectionRefs = useRef<Record<string, HTMLDivElement | null>>({});

  const activeCodeSet = useMemo(() => {
    if (settingMode === "alle") return new Set(TAKSTER.map((t) => t.code));
    const groupId = SETTING_GROUPS[settingMode];
    if (groupId) {
      return new Set(TAKSTER.filter((t) => t.group === groupId).map((t) => t.code));
    }
    const dag = MODE_CODES[settingMode + "_dag"] || [];
    const kveld = MODE_CODES[settingMode + "_kveld"] || [];
    const list = timeMode === "dag" ? dag : timeMode === "kveld" ? kveld : dag.concat(kveld);
    return new Set(list);
  }, [settingMode, timeMode]);

  const isAndreHonorarer = settingMode === "andre-honorarer";
  const showTimeSwitch = !(settingMode === "alle" || SETTING_GROUPS[settingMode] || isAndreHonorarer);
  const showFastlegeKveldNote = settingMode === "legevakt" && timeMode === "kveld";

  const q = norm(searchQuery);

  const groupData = useMemo(() => {
    return GROUPS.map((g) => {
      const modeItems = TAKSTER.filter((t) => t.group === g.id && activeCodeSet.has(t.code));
      const matched = q
        ? modeItems.filter((t) => norm(t.code).indexOf(q) !== -1 || norm(t.name).indexOf(q) !== -1)
        : modeItems;
      return { group: g, modeItems, matched };
    });
  }, [activeCodeSet, q]);

  useEffect(() => {
    if (isAndreHonorarer) return undefined;
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          const id = entry.target.getAttribute("data-section-id");
          if (id) setActivePillId(id);
        });
      },
      { rootMargin: "-15% 0px -75% 0px", threshold: 0 }
    );
    Object.values(sectionRefs.current).forEach((el) => {
      if (el) observer.observe(el);
    });
    return () => observer.disconnect();
  }, [isAndreHonorarer, groupData]);

  const toggleCollapsed = (id: string) => {
    setCollapsed((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const scrollToSection = (id: string) => {
    setCollapsed((prev) => ({ ...prev, [id]: false }));
    const el = sectionRefs.current[id];
    if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const openModal = (code: string) => {
    setModalCode(code);
    setModalTab("ugyldig");
  };

  const closeModal = () => setModalCode(null);

  useEffect(() => {
    if (!modalCode) return undefined;
    document.body.style.overflow = "hidden";
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeModal();
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.body.style.overflow = "";
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [modalCode]);

  const modalTakst = modalCode ? BY_CODE[modalCode] : null;
  const modalGroup = modalTakst ? GROUP_BY_ID[modalTakst.group] : null;

  return (
    <div className="tk-root">
      <div className="hero">
        <div className="hero-inner">
          <div className="update-badge">
            <svg viewBox="0 0 24 24" fill="none" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 12a9 9 0 1 1-2.64-6.36" />
              <path d="M21 3v6h-6" />
            </svg>
            Oppdatert etter normaltariffen 2026-2027
          </div>
          <div className="brand">
            <div className="brand-mark" aria-hidden="true">
              <svg viewBox="0 0 24 24" fill="none" strokeWidth={2} strokeLinecap="round">
                <path d="M4 6h16M4 12h10M4 18h13" />
              </svg>
            </div>
            <div>
              <div className="brand-title">
                Takstkartoteket<span className="brand-badge">Konseptforslag</span>
              </div>
              <div className="brand-sub">Informasjon hentet fra normaltariffen</div>
            </div>
          </div>

          <div className="mode-switches">
            <div className="switch-group setting-switch" role="group" aria-label="Alle, fastlege eller legevakt">
              {SETTING_TABS.map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  className={settingMode === tab.id ? "active" : ""}
                  aria-pressed={settingMode === tab.id}
                  onClick={() => {
                    setSettingMode(tab.id);
                    if (tab.id === "fastlege") setTimeMode("dag");
                    if (tab.id === "legevakt") setTimeMode("kveld");
                  }}
                >
                  {tab.icon}
                  {tab.label}
                </button>
              ))}
            </div>
            {showTimeSwitch && (
              <div className="switch-group time-switch" role="group" aria-label="Tidspunkt på døgnet">
                <button type="button" className={timeMode === "dag" ? "active" : ""} aria-pressed={timeMode === "dag"} title="Dagtid" onClick={() => setTimeMode("dag")}>
                  <svg viewBox="0 0 24 24" fill="none" strokeWidth={2} strokeLinecap="round">
                    <circle cx="12" cy="12" r="4" />
                    <path d="M12 2v2M12 20v2M4 12H2M22 12h-2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M19.1 4.9l-1.4 1.4M6.3 17.7l-1.4 1.4" />
                  </svg>
                  Dag
                </button>
                <button type="button" className={timeMode === "kveld" ? "active" : ""} aria-pressed={timeMode === "kveld"} title="Kveld" onClick={() => setTimeMode("kveld")}>
                  <svg viewBox="0 0 24 24" fill="none" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 12.8A9 9 0 1 1 11.2 3 7 7 0 0 0 21 12.8z" />
                  </svg>
                  Kveld
                </button>
                <button type="button" className={timeMode === "alle" ? "active" : ""} aria-pressed={timeMode === "alle"} title="Hele døgnet" onClick={() => setTimeMode("alle")}>
                  <svg viewBox="0 0 24 24" fill="none" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="9" />
                    <path d="M12 7v5l3.5 2" />
                  </svg>
                  Alle
                </button>
              </div>
            )}
          </div>

          {!isAndreHonorarer && (
            <div className="search-field">
              <svg viewBox="0 0 24 24" fill="none" strokeWidth={2}>
                <circle cx="11" cy="11" r="7" />
                <path d="M21 21l-4.3-4.3" />
              </svg>
              <input
                type="text"
                placeholder="Søk etter takstkode eller beskrivelse …"
                autoComplete="off"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          )}
        </div>
      </div>

      {!isAndreHonorarer && (
        <div className="pill-nav-wrap">
          <div className="shell" style={{ paddingBottom: 0 }}>
            <div className="pill-rail">
              {groupData.map(({ group, modeItems, matched }) => {
                if (matched.length === 0) return null;
                return (
                  <button
                    key={group.id}
                    type="button"
                    className={activePillId === group.id ? "active" : ""}
                    onClick={() => scrollToSection(group.id)}
                  >
                    {groupLabel(group)} ({modeItems.length})
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      <div className="shell">
        {showFastlegeKveldNote && (
          <div className="footnotes">
            <p>
              <span className="fn-mark">*</span> Kveldtakster gjelder hele dag før skjærtorsdag og Kristi himmelfartsdag.
            </p>
            <p>
              <span className="fn-mark">**</span> Ved vanlig kontorpraksis skal takster for dagtid brukes etter kl. 16, med mindre:
            </p>
            <ul>
              <li>ved digital konsultasjon i kontorpraksis etter kl. 16 (2aft, 2afv og 2as)</li>
              <li>
                ved uforutsette konsultasjoner/sykebesøk som gjelder øyeblikkelig hjelp og i tilfeller som av medisinske grunner ikke kan
                utsettes til neste dag, og som legen/sykepleier ikke kan ta i sin ordinære arbeidstid, kan kveldstakster (2as og 11ak)
                benyttes
              </li>
            </ul>
          </div>
        )}

        {!isAndreHonorarer && (
          <div className="sections">
            {groupData.map(({ group, modeItems, matched }) => {
              const isCollapsed = !!collapsed[group.id];
              return (
                <div
                  key={group.id}
                  className={`section-card${isCollapsed ? " collapsed" : ""}`}
                  ref={(el) => {
                    sectionRefs.current[group.id] = el;
                  }}
                  data-section-id={group.id}
                  style={matched.length === 0 ? { display: "none" } : undefined}
                >
                  <div className="section-head" onClick={() => toggleCollapsed(group.id)}>
                    <h2>
                      {groupTitle(group)}
                      <span className="count">
                        {modeItems.length} takst{modeItems.length === 1 ? "" : "er"}
                      </span>
                    </h2>
                    <div className="section-toggle">
                      <span className="glyph" />
                    </div>
                  </div>
                  <div className="section-body">
                    <table className="takst">
                      <thead>
                        <tr>
                          <th>Kode</th>
                          <th>Beskrivelse</th>
                          <th className="num">Honorar</th>
                          <th className="num">Refusjon</th>
                          <th className="num">Egenandel</th>
                          <th>Rep</th>
                        </tr>
                      </thead>
                      <tbody>
                        {matched.length === 0 ? (
                          <tr>
                            <td colSpan={6}>
                              <div className="empty-state">Ingen takster i denne kategorien matcher søket.</div>
                            </td>
                          </tr>
                        ) : (
                          matched.map((t) => (
                            <tr
                              key={t.code}
                              className="takst-row"
                              tabIndex={0}
                              role="button"
                              aria-haspopup="dialog"
                              onClick={() => openModal(t.code)}
                              onKeyDown={(e) => {
                                if (e.key === "Enter" || e.key === " ") {
                                  e.preventDefault();
                                  openModal(t.code);
                                }
                              }}
                            >
                              <td className="code">{t.code}</td>
                              <td>{t.name}</td>
                              <td className={t.h === null ? "dash" : "num"}>{kr(t.h)}</td>
                              <td className={t.r === null ? "dash" : "num"}>{kr(t.r)}</td>
                              <td className={t.e === null ? "dash" : "num"}>{kr(t.e)}</td>
                              <td className="rep">{t.rep === null || t.rep === undefined ? "–" : t.rep}</td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {isAndreHonorarer && (
          <div className="external-links">
            <div className="external-links-intro">
              <h2>Andre honorarer</h2>
              <p>
                Avtaler og honorarordninger utenfor selve takstsystemet, samlet under «Andre honorarer» på{" "}
                <a href="https://normaltariffen.no" target="_blank" rel="noopener noreferrer">
                  normaltariffen.no
                </a>
                . Alle punktene under lenker videre til Legeforeningens samleside om annen næringsinntekt.
              </p>
            </div>
            <div className="external-links-grid">
              {ANDRE_HONORARER.map((item) => (
                <a key={item.title} className="external-link-card" href={item.url} target="_blank" rel="noopener noreferrer">
                  <span>{item.title}</span>
                  <svg className="ext-icon" viewBox="0 0 24 24" fill="none" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                    <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                    <path d="M15 3h6v6" />
                    <path d="M10 14L21 3" />
                  </svg>
                </a>
              ))}
            </div>
          </div>
        )}

        <footer className="note">
          Takstkartoteket er et internt konseptforslag for fastlegetakster (allmennmedisin). Kategoriene og kodene er hentet direkte fra
          fastlegefanen på{" "}
          <a href="https://normaltariffen.no" target="_blank" rel="noopener noreferrer">
            normaltariffen.no
          </a>{" "}
          (Den norske legeforening) på publiseringstidspunktet, inkludert honorar, refusjon, egenandel, repetisjonsregel og ugyldige
          kombinasjoner slik de sto der. Ordlyden i detaljvisningen er gjengitt ordrett fra normaltariffen. Merknadsfeltet er derimot lang,
          forfattet regelverkstekst som gjentas uendret på tvers av dusinvis av takster – det gjengis ikke her; Detaljer- og
          Kommentar-fanene viser i stedet til normaltariffen.no for fullstendig informasjon.{" "}
          <a href="https://legetakster.no" target="_blank" rel="noopener noreferrer">
            legetakster.no
          </a>{" "}
          ble brukt som referanse for hvilket innhold en slik side dekker. Design, tekst og kode er selvstendig utviklet – dette er ikke
          en offisiell side. Satsene endres jevnlig; bruk normaltariffen.no som gjeldende kilde ved fakturering.
        </footer>
      </div>

      <div className={`modal-backdrop${modalTakst ? " open" : ""}`} role="dialog" aria-modal="true" onClick={(e) => {
        if (e.target === e.currentTarget) closeModal();
      }}>
        {modalTakst && (
          <div className="modal-box">
            <button type="button" className="modal-close" aria-label="Lukk" onClick={closeModal}>
              <svg viewBox="0 0 24 24" fill="none" strokeWidth={2.2} strokeLinecap="round">
                <path d="M6 6l12 12M18 6L6 18" />
              </svg>
            </button>
            <div className="modal-crumb">
              {(modalGroup ? modalGroup.short || modalGroup.name : "") + " · " + modalTakst.code}
            </div>
            <div className="modal-title">
              <span className="modal-code">{modalTakst.code}</span> – {modalTakst.name}
            </div>
            <div className="modal-ord-label">Ordlyd i normaltariffen</div>
            <div className="modal-name">{modalTakst.ord}</div>
            <div className="modal-stats">
              <div className="modal-stat">
                <div className="lbl">Honorar</div>
                <div className="val">{kr(modalTakst.h)}</div>
              </div>
              <div className="modal-stat">
                <div className="lbl">Refusjon</div>
                <div className="val">{kr(modalTakst.r)}</div>
              </div>
              <div className="modal-stat">
                <div className="lbl">Egenandel</div>
                <div className="val">{kr(modalTakst.e)}</div>
              </div>
              <div className="modal-stat">
                <div className="lbl">Rep.</div>
                <div className="val">{modalTakst.rep === null || modalTakst.rep === undefined ? "–" : modalTakst.rep}</div>
              </div>
            </div>
            <div className="modal-tabs">
              <button type="button" className={modalTab === "ugyldig" ? "modal-tab active" : "modal-tab"} onClick={() => setModalTab("ugyldig")}>
                Ugyldige kombinasjoner
              </button>
              <button type="button" className={modalTab === "kommentar" ? "modal-tab active" : "modal-tab"} onClick={() => setModalTab("kommentar")}>
                Kommentar
              </button>
              <button type="button" className={modalTab === "detaljer" ? "modal-tab active" : "modal-tab"} onClick={() => setModalTab("detaljer")}>
                Detaljer
              </button>
            </div>
            {modalTab === "ugyldig" && (
              <div className="modal-panel active">
                <h4>Ugyldige kombinasjoner</h4>
                <div className="inv-list">{modalTakst.inv || "Ingen."}</div>
                <span className="src">
                  Hentet ordrett fra normaltariffen.no sin fastlege-fane.{" "}
                  <a href="https://normaltariffen.no" target="_blank" rel="noopener noreferrer">
                    Se normaltariffen.no →
                  </a>
                </span>
              </div>
            )}
            {modalTab === "kommentar" && (
              <div className="modal-panel active">
                <p className="panel-refer">
                  Merknader til takst {modalTakst.code} finnes på normaltariffen.no.
                  <br />
                  <a href="https://normaltariffen.no" target="_blank" rel="noopener noreferrer">
                    Se normaltariffen.no →
                  </a>
                </p>
              </div>
            )}
            {modalTab === "detaljer" && (
              <div className="modal-panel active">
                <p className="panel-refer">
                  Fullstendige detaljer for takst {modalTakst.code} finnes på normaltariffen.no.
                  <br />
                  <a href="https://normaltariffen.no" target="_blank" rel="noopener noreferrer">
                    Se normaltariffen.no →
                  </a>
                </p>
              </div>
            )}
          </div>
        )}
      </div>

      <style jsx>{`
        .tk-root {
          --tk-bg: var(--bg);
          --tk-surface: var(--card);
          --tk-surface-2: var(--panel-2);
          --tk-ink: var(--heading);
          --tk-ink-soft: var(--muted);
          --tk-line: var(--border-soft);
          --tk-line-strong: var(--border);
          --tk-accent: var(--primary);
          --tk-accent-strong: var(--primary-dark);
          --tk-accent-soft: var(--primary-bg);
          --tk-accent-ink: var(--primary-text);
          --tk-radius: 16px;
          background: var(--tk-bg);
          color: var(--tk-ink);
          border-radius: 20px;
          overflow: hidden;
          box-shadow: var(--shadow-soft);
        }

        .tk-root :global(*) {
          box-sizing: border-box;
        }

        .mono {
          font-variant-numeric: tabular-nums;
        }

        .tk-root a {
          color: inherit;
        }

        .shell {
          max-width: 1180px;
          margin: 0 auto;
          padding: 0 24px 60px;
        }

        .hero {
          background: linear-gradient(180deg, var(--tk-surface-2), var(--tk-bg) 88%);
          border-bottom: 1px solid var(--tk-line);
          padding: 28px 0 24px;
          position: relative;
          overflow: hidden;
        }
        .hero-inner {
          max-width: 1180px;
          margin: 0 auto;
          padding: 0 24px;
          position: relative;
        }

        .mode-switches {
          display: flex;
          flex-direction: column;
          align-items: flex-start;
          gap: 8px;
          margin-bottom: 22px;
        }
        .switch-group {
          display: inline-flex;
          gap: 3px;
          padding: 3px;
          background: var(--tk-surface);
          border: 1px solid var(--tk-line-strong);
          border-radius: 999px;
          box-shadow: 0 1px 2px rgba(var(--shade-rgb), 0.08);
        }
        .switch-group.setting-switch {
          flex-wrap: wrap;
          justify-content: flex-start;
          max-width: 100%;
          border-radius: 16px;
        }
        .switch-group button {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          font: inherit;
          font-size: 12.5px;
          font-weight: 600;
          padding: 7px 13px 7px 10px;
          border-radius: 999px;
          border: none;
          background: transparent;
          color: var(--tk-ink-soft);
          cursor: pointer;
          transition: background 0.15s ease, color 0.15s ease;
        }
        .switch-group button :global(svg) {
          width: 15px;
          height: 15px;
          stroke: currentColor;
          flex: none;
        }
        .switch-group.time-switch button {
          padding: 7px 10px;
        }
        .switch-group.time-switch button :global(svg) {
          width: 14px;
          height: 14px;
        }
        .switch-group button:hover {
          color: var(--tk-ink);
        }
        .switch-group button.active {
          background: var(--tk-accent);
          color: var(--tk-accent-ink);
        }
        .switch-group button:focus-visible {
          outline: 2px solid var(--tk-accent);
          outline-offset: 2px;
        }

        @media (max-width: 760px) {
          .mode-switches {
            align-items: flex-start;
          }
          .switch-group.setting-switch,
          .switch-group.time-switch {
            justify-content: flex-start;
          }
        }

        .brand {
          display: flex;
          align-items: center;
          gap: 14px;
          margin-bottom: 18px;
        }
        .brand-mark {
          width: 42px;
          height: 42px;
          flex: none;
          border-radius: 50%;
          background: linear-gradient(155deg, var(--tk-accent), var(--tk-accent-strong));
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 2px 6px rgba(var(--shade-rgb), 0.3);
        }
        .brand-mark :global(svg) {
          width: 20px;
          height: 20px;
          stroke: var(--tk-accent-ink);
        }
        .brand-title {
          font-size: 22px;
          font-weight: 700;
          letter-spacing: -0.01em;
          line-height: 1.15;
        }
        .brand-badge {
          display: inline-block;
          font-size: 11px;
          font-weight: 600;
          letter-spacing: 0.02em;
          padding: 3px 10px;
          border-radius: 20px;
          background: var(--tk-accent-soft);
          color: var(--tk-accent-strong);
          margin-left: 10px;
          vertical-align: middle;
          transform: translateY(-1px);
        }
        .brand-sub {
          font-size: 13px;
          color: var(--tk-ink-soft);
          margin-top: 2px;
        }

        .search-field {
          position: relative;
          max-width: 560px;
        }
        .search-field input {
          width: 100%;
          font: inherit;
          font-size: 14.5px;
          padding: 14px 18px 14px 44px;
          background: var(--tk-surface);
          border: 1px solid var(--tk-line-strong);
          border-radius: 999px;
          color: var(--tk-ink);
          box-shadow: 0 1px 2px rgba(var(--shade-rgb), 0.08);
        }
        .search-field input::placeholder {
          color: var(--tk-ink-soft);
        }
        .search-field input:focus-visible {
          outline: 2px solid var(--tk-accent);
          outline-offset: 2px;
        }
        .search-field :global(svg) {
          position: absolute;
          left: 17px;
          top: 50%;
          transform: translateY(-50%);
          width: 17px;
          height: 17px;
          stroke: var(--tk-ink-soft);
          pointer-events: none;
        }

        .pill-nav-wrap {
          padding: 16px 0 4px;
          border-bottom: 1px solid var(--tk-line);
        }
        .pill-rail {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
          padding: 2px 0 10px;
        }
        .pill-rail button {
          flex: none;
          font: inherit;
          font-size: 12.5px;
          font-weight: 500;
          padding: 9px 16px;
          border-radius: 999px;
          border: 1px solid var(--tk-line-strong);
          background: var(--tk-surface);
          color: var(--tk-ink-soft);
          cursor: pointer;
          white-space: nowrap;
          transition: background 0.15s ease, color 0.15s ease, border-color 0.15s ease;
        }
        .pill-rail button:hover {
          border-color: var(--tk-accent);
          color: var(--tk-ink);
        }
        .pill-rail button.active {
          background: var(--tk-accent);
          border-color: var(--tk-accent);
          color: var(--tk-accent-ink);
        }

        .sections {
          padding-top: 26px;
          display: flex;
          flex-direction: column;
          gap: 16px;
        }

        .section-card {
          background: var(--tk-surface);
          border: 1px solid var(--tk-line);
          border-radius: var(--tk-radius);
          overflow: hidden;
          scroll-margin-top: 24px;
        }
        .section-head {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 14px;
          padding: 16px 20px;
          cursor: pointer;
          user-select: none;
        }
        .section-head:hover {
          background: var(--tk-surface-2);
        }
        .section-head h2 {
          margin: 0;
          font-size: 15.5px;
          font-weight: 700;
          letter-spacing: -0.005em;
        }
        .section-head .count {
          font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
          font-size: 11.5px;
          color: var(--tk-ink-soft);
          font-weight: 400;
          margin-left: 10px;
        }
        .section-toggle {
          flex: none;
          width: 26px;
          height: 26px;
          border-radius: 50%;
          border: 1px solid var(--tk-line-strong);
          background: var(--tk-surface-2);
          color: var(--tk-ink-soft);
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 15px;
          line-height: 1;
        }
        .section-card.collapsed .section-body {
          display: none;
        }
        .section-card.collapsed .section-toggle .glyph::before {
          content: "+";
        }
        .section-toggle .glyph::before {
          content: "−";
        }

        .section-body {
          border-top: 1px solid var(--tk-line);
          overflow-x: auto;
        }

        table.takst {
          width: 100%;
          border-collapse: collapse;
          min-width: 640px;
        }
        table.takst thead th {
          text-align: left;
          font-size: 10.5px;
          letter-spacing: 0.05em;
          text-transform: uppercase;
          color: var(--tk-ink-soft);
          font-weight: 600;
          padding: 10px 20px;
          background: var(--tk-surface-2);
          border-bottom: 1px solid var(--tk-line-strong);
          white-space: nowrap;
        }
        table.takst thead th.num {
          text-align: right;
        }
        table.takst tbody td {
          padding: 10px 20px;
          font-size: 13.5px;
          border-bottom: 1px solid var(--tk-line);
          vertical-align: top;
        }
        table.takst tbody tr:last-child td {
          border-bottom: none;
        }
        table.takst tbody tr.takst-row {
          cursor: pointer;
        }
        table.takst tbody tr:hover {
          background: var(--tk-accent-soft);
        }
        table.takst tbody tr.takst-row:focus-visible {
          outline: 2px solid var(--tk-accent);
          outline-offset: -2px;
          background: var(--tk-accent-soft);
        }
        table.takst td.code {
          font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
          font-weight: 600;
          color: var(--tk-accent-strong);
          white-space: nowrap;
        }
        .fn-mark {
          font-weight: 700;
          margin-left: 1px;
          color: var(--tk-ink-soft);
        }
        table.takst td.num {
          text-align: right;
          font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
          white-space: nowrap;
        }
        table.takst td.dash {
          color: var(--tk-line-strong);
          text-align: right;
          font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
        }
        table.takst td.rep {
          font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
          color: var(--tk-ink-soft);
          font-size: 12px;
          white-space: nowrap;
        }

        .empty-state {
          text-align: center;
          padding: 60px 20px;
          color: var(--tk-ink-soft);
          font-size: 13.5px;
        }

        .update-badge {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          font-size: 11px;
          font-weight: 600;
          letter-spacing: 0.04em;
          text-transform: uppercase;
          color: var(--tk-accent-strong);
          background: var(--tk-accent-soft);
          border: 1px solid var(--tk-line-strong);
          padding: 5px 12px 5px 10px;
          border-radius: 999px;
          margin-bottom: 16px;
        }
        .update-badge :global(svg) {
          width: 12px;
          height: 12px;
          stroke: currentColor;
          flex: none;
        }

        .modal-backdrop {
          position: fixed;
          inset: 0;
          background: rgba(43, 36, 28, 0.55);
          backdrop-filter: blur(3px);
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 24px;
          z-index: 200;
          opacity: 0;
          pointer-events: none;
          transition: opacity 0.18s ease;
        }
        .modal-backdrop.open {
          opacity: 1;
          pointer-events: auto;
        }
        .modal-box {
          background: var(--tk-surface);
          border: 1px solid var(--tk-line);
          border-radius: var(--tk-radius);
          max-width: 580px;
          width: 100%;
          padding: 28px 30px 26px;
          position: relative;
          box-shadow: var(--shadow-strong);
          max-height: 86vh;
          overflow-y: auto;
        }
        .modal-close {
          position: absolute;
          top: 14px;
          right: 14px;
          width: 30px;
          height: 30px;
          border-radius: 50%;
          border: 1px solid var(--tk-line-strong);
          background: var(--tk-surface-2);
          color: var(--tk-ink-soft);
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          font: inherit;
        }
        .modal-close:hover {
          background: var(--tk-accent-soft);
          color: var(--tk-accent-strong);
          border-color: var(--tk-accent);
        }
        .modal-close :global(svg) {
          width: 15px;
          height: 15px;
          stroke: currentColor;
        }

        .modal-crumb {
          font-size: 11.5px;
          color: var(--tk-ink-soft);
          text-transform: uppercase;
          letter-spacing: 0.04em;
          font-weight: 600;
          margin-bottom: 8px;
          padding-right: 30px;
        }
        .modal-title {
          font-size: 18px;
          font-weight: 700;
          letter-spacing: -0.005em;
          margin-bottom: 2px;
          padding-right: 30px;
        }
        .modal-code {
          font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
          color: var(--tk-accent-strong);
          font-weight: 600;
        }
        .modal-ord-label {
          font-size: 10px;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          font-weight: 700;
          color: var(--tk-accent-strong);
          margin-bottom: 4px;
        }
        .modal-name {
          font-size: 14px;
          color: var(--tk-ink-soft);
          margin-bottom: 18px;
          line-height: 1.5;
          white-space: pre-line;
        }

        .modal-stats {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 1px;
          background: var(--tk-line);
          border: 1px solid var(--tk-line);
          border-radius: 10px;
          overflow: hidden;
          margin-bottom: 20px;
        }
        .modal-stat {
          background: var(--tk-surface-2);
          padding: 10px 12px;
        }
        .modal-stat .lbl {
          font-size: 9.5px;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          color: var(--tk-ink-soft);
          font-weight: 600;
          margin-bottom: 4px;
        }
        .modal-stat .val {
          font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
          font-weight: 600;
          font-size: 13.5px;
        }

        .modal-tabs {
          display: flex;
          gap: 4px;
          border-bottom: 1px solid var(--tk-line);
          margin-bottom: 14px;
        }
        .modal-tabs :global(.modal-tab) {
          font: inherit;
          font-size: 12.5px;
          font-weight: 600;
          color: var(--tk-ink-soft);
          background: none;
          border: none;
          border-bottom: 2px solid transparent;
          padding: 8px 4px 10px;
          margin-right: 18px;
          cursor: pointer;
        }
        .modal-tabs :global(.modal-tab:hover) {
          color: var(--tk-ink);
        }
        .modal-tabs :global(.modal-tab.active) {
          color: var(--tk-accent-strong);
          border-bottom-color: var(--tk-accent);
        }

        .modal-panel {
          font-size: 13.5px;
          line-height: 1.65;
          color: var(--tk-ink);
        }
        .panel-refer {
          margin: 6px 0 4px;
          padding: 18px 16px;
          text-align: center;
          color: var(--tk-ink-soft);
          background: var(--tk-surface-2);
          border: 1px dashed var(--tk-line);
          border-radius: 8px;
        }
        .panel-refer a {
          color: var(--tk-accent-strong);
          text-decoration: none;
          font-weight: 600;
        }
        .panel-refer a:hover {
          text-decoration: underline;
        }
        .modal-panel .src {
          display: block;
          margin-top: 12px;
          font-size: 11px;
          color: var(--tk-ink-soft);
        }
        .modal-panel .src a {
          color: var(--tk-accent-strong);
          text-decoration: none;
        }
        .modal-panel .src a:hover {
          text-decoration: underline;
        }
        .modal-panel h4 {
          font-size: 10px;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          font-weight: 700;
          color: var(--tk-ink-soft);
          margin: 0 0 8px;
        }
        .inv-list {
          white-space: pre-line;
          font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
          font-size: 12px;
          color: var(--tk-ink);
        }

        .footnotes {
          margin: 20px 0 20px;
          padding: 16px 20px;
          background: var(--tk-surface-2);
          border: 1px solid var(--tk-line);
          border-radius: 12px;
          font-size: 12.5px;
          color: var(--tk-ink-soft);
          line-height: 1.6;
        }
        .footnotes p {
          margin: 0 0 4px;
        }
        .footnotes p:last-of-type {
          margin-bottom: 6px;
        }
        .footnotes ul {
          margin: 0;
          padding-left: 20px;
        }
        .footnotes li {
          margin: 2px 0;
        }
        .footnotes .fn-mark {
          color: var(--tk-accent-strong);
        }

        .external-links {
          padding-top: 26px;
        }
        .external-links-intro h2 {
          font-size: 19px;
          margin: 0 0 8px;
        }
        .external-links-intro p {
          margin: 0 0 22px;
          font-size: 13.5px;
          color: var(--tk-ink-soft);
          line-height: 1.6;
          max-width: 68ch;
        }
        .external-links-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
          gap: 12px;
        }
        .external-link-card {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          background: var(--tk-surface);
          border: 1px solid var(--tk-line);
          border-radius: var(--tk-radius);
          padding: 15px 18px;
          text-decoration: none;
          color: var(--tk-ink);
          font-size: 13.5px;
          font-weight: 500;
          line-height: 1.4;
          transition: border-color 0.15s ease, background 0.15s ease;
        }
        .external-link-card:hover {
          border-color: var(--tk-accent);
          background: var(--tk-surface-2);
        }
        .external-link-card :global(.ext-icon) {
          flex: none;
          width: 16px;
          height: 16px;
          stroke: var(--tk-ink-soft);
        }
        .external-link-card:hover :global(.ext-icon) {
          stroke: var(--tk-accent);
        }

        footer.note {
          margin: 40px 0 0;
          padding: 20px 0 0;
          border-top: 1px solid var(--tk-line);
          font-size: 11.5px;
          color: var(--tk-ink-soft);
          line-height: 1.65;
        }
      `}</style>
    </div>
  );
}
