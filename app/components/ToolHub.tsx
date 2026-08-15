
"use client";

import { useMemo, useState, useEffect, useRef, type MouseEvent as ReactMouseEvent, type PointerEvent as ReactPointerEvent } from "react";
import ComboBox from "./ComboBox";
import DatePickerField from "./DatePickerField";
import ModernWidgetDashboard from "./ModernWidgetDashboard";
import PdfHoverPreview from "./PdfHoverPreview";
import {
  formatNorwegianDate,
  isoWeekNumber
} from "@/app/utils/dateCalculator";
import {
  type CalcThreshold,
  calculatorRegistry,
  type PdfOption,
  scoringToolRegistry,
  type ToolThreshold
} from "@/app/utils/toolRegistry";
import {
  buildPostitSections,
  defaultPostitBoxOrder
} from "@/app/utils/toolHubPostit";
import {
  buildDateCalcOffset,
  buildMedJournalMessage,
  buildMedPatientMessage,
  buildPregnancyReferralText,
  calculateAvgUsageResult,
  calculateDateCalcResult,
  calculateMedDurationResult,
  calculatePregnancyBmi,
  calculatePregnancyResult,
  getTodayIso,
  parseCalendarInlineOffset,
  type DateCalcDirection
} from "@/app/utils/toolHubCalendar";
import {
  getSpecialCalcTab,
  specialCalcTabTitle,
  type SpecialCalcTab
} from "@/app/utils/specialCalculators";
import { calculateToolHubCalcResult, getFieldOptionScore } from "@/app/utils/toolHubCalcEngine";
import { defaultLinkBoxes, type LinkBox } from "@/app/utils/toolHubLinks";

type TabKey = "tools" | "guides" | "resources" | "patientinfo" | "overviews";

const tabs: Record<TabKey, string> = {
  tools: "Kalkulatorer",
  guides: "Lenker",
  resources: "Verktøy",
  patientinfo: "Pasientinformasjon",
  overviews: "Oversikter"
};
const tabOrder: TabKey[] = ["guides", "tools", "resources", "patientinfo", "overviews"];

interface ResourceCardVariant {
  label: string;
  url: string;
}

interface ResourceCard {
  title: string;
  description: string;
  url: string;
  variants?: ResourceCardVariant[];
}

interface ResourceCategory {
  title: string;
  items: ResourceCard[];
}

interface ResourceSubcategory {
  title: string;
  items: ResourceCard[];
}

interface PreviewPosition {
  left: number;
  top: number;
}

const fib4TierStyles: Record<"low" | "indeterminate" | "high", { border: string; bg: string }> = {
  low: { border: "#4caf50", bg: "#eafaf0" },
  indeterminate: { border: "#ff9800", bg: "#fff4e5" },
  high: { border: "#f44336", bg: "#fdecea" }
};

const fib4BranchAccent = { border: "#0f766e", bg: "#e7f7f4" };
const fib4Neutral = { border: "#e5e7eb", bg: "#f9fafb" };

function Fib4FlowchartBox({
  active,
  accent,
  children
}: {
  active: boolean;
  accent: { border: string; bg: string };
  children: React.ReactNode;
}) {
  const style = active ? accent : fib4Neutral;
  return (
    <div
      style={{
        padding: "8px 10px",
        borderRadius: 10,
        border: `${active ? 2 : 1}px solid ${style.border}`,
        background: style.bg,
        color: "#374151",
        fontSize: 12.5,
        lineHeight: 1.4,
        textAlign: "center",
        fontWeight: active ? 700 : 500
      }}
    >
      {children}
    </div>
  );
}

function Fib4Flowchart({
  activeBranch,
  activeTier
}: {
  activeBranch?: "young" | "middle" | "old";
  activeTier?: "low" | "indeterminate" | "high";
}) {
  const arrow = (
    <div style={{ textAlign: "center", fontSize: 16, color: "#9ca3af", margin: "4px 0" }}>↓</div>
  );

  return (
    <div>
      <div style={{ maxWidth: 280, margin: "0 auto" }}>
        <Fib4FlowchartBox active={false} accent={fib4Neutral}>Mistenkt NAFLD / leversykdom</Fib4FlowchartBox>
      </div>
      {arrow}
      <div style={{ display: "flex", gap: 10, overflowX: "auto", paddingBottom: 4 }}>
        <div style={{ flex: "1 1 0", minWidth: 140 }}>
          <Fib4FlowchartBox active={activeBranch === "young"} accent={fib4BranchAccent}>≤35 år</Fib4FlowchartBox>
          {arrow}
          <Fib4FlowchartBox active={activeBranch === "young"} accent={fib4Neutral}>
            Alternativ fibrosevurdering anbefales
          </Fib4FlowchartBox>
        </div>
        <div style={{ flex: "1 1 0", minWidth: 160 }}>
          <Fib4FlowchartBox active={activeBranch === "middle"} accent={fib4BranchAccent}>
            36–64 år<br /><span style={{ fontWeight: 400, fontSize: 11 }}>Eksisterende grenser</span>
          </Fib4FlowchartBox>
          {arrow}
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <Fib4FlowchartBox active={activeBranch === "middle" && activeTier === "low"} accent={fib4TierStyles.low}>
              &lt;1.3 – Avansert fibrose utelukket
            </Fib4FlowchartBox>
            <Fib4FlowchartBox active={activeBranch === "middle" && activeTier === "indeterminate"} accent={fib4TierStyles.indeterminate}>
              1.3–2.67 – Videre utredning
            </Fib4FlowchartBox>
            <Fib4FlowchartBox active={activeBranch === "middle" && activeTier === "high"} accent={fib4TierStyles.high}>
              &gt;2.67 – Avansert fibrose sannsynlig
            </Fib4FlowchartBox>
          </div>
        </div>
        <div style={{ flex: "1 1 0", minWidth: 160 }}>
          <Fib4FlowchartBox active={activeBranch === "old"} accent={fib4BranchAccent}>
            ≥65 år<br /><span style={{ fontWeight: 400, fontSize: 11 }}>Nye aldersjusterte grenser</span>
          </Fib4FlowchartBox>
          {arrow}
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <Fib4FlowchartBox active={activeBranch === "old" && activeTier === "low"} accent={fib4TierStyles.low}>
              &lt;2.0 – Avansert fibrose utelukket
            </Fib4FlowchartBox>
            <Fib4FlowchartBox active={activeBranch === "old" && activeTier === "indeterminate"} accent={fib4TierStyles.indeterminate}>
              2.0–2.67 – Videre utredning
            </Fib4FlowchartBox>
            <Fib4FlowchartBox active={activeBranch === "old" && activeTier === "high"} accent={fib4TierStyles.high}>
              &gt;2.67 – Avansert fibrose sannsynlig
            </Fib4FlowchartBox>
          </div>
        </div>
      </div>
      <div style={{ marginTop: 14, paddingTop: 10, borderTop: "1px solid #e5e7eb", fontSize: 11.5, color: "#6b7280", lineHeight: 1.5 }}>
        <div>* Basert på Ishak fibrosestadium (Sterling et al. 2006).</div>
        <div>* «Avansert fibrose» definert som METAVIR stadium F3–F4 (McPherson et al. 2017).</div>
      </div>
    </div>
  );
}

const HOMA_IR_INPUT_WIDTH = 160;

function HomaIrFields({
  calcInputs,
  onChange
}: {
  calcInputs: Record<string, string | number>;
  onChange: (id: string, value: string | number) => void;
}) {
  const [showInfo, setShowInfo] = useState(false);
  const infoRef = useRef<HTMLDivElement>(null);
  const insulinUnit = calcInputs["insulinUnit"] === "miu" ? "miu" : "pmol";

  useEffect(() => {
    if (!showInfo) return;
    const handleOutsideClick = (e: MouseEvent) => {
      if (infoRef.current && !infoRef.current.contains(e.target as Node)) {
        setShowInfo(false);
      }
    };
    document.addEventListener("mousedown", handleOutsideClick);
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, [showInfo]);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
      <div className="calc-field-row">
        <label style={{ fontWeight: 500, fontSize: 13 }}>
          Fastende glukose (mmol/L)
        </label>
        <input
          className="calc-number-input"
          type="number"
          min={0}
          max={30}
          step={0.1}
          style={{ width: HOMA_IR_INPUT_WIDTH }}
          value={calcInputs["glucose"] ?? ""}
          onChange={e => onChange("glucose", e.target.value)}
        />
      </div>
      <div className="calc-field-row">
        <label style={{ fontWeight: 500, fontSize: 13 }}>
          Fastende insulin ({insulinUnit === "miu" ? "mIU/L" : "pmol/L"})
        </label>
        <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
          <div style={{ display: "inline-flex", backgroundColor: "#e8e8ed", borderRadius: 9, padding: 2 }}>
            {(["pmol", "miu"] as const).map(unit => {
              const isActive = insulinUnit === unit;
              return (
                <button
                  key={unit}
                  type="button"
                  onClick={() => onChange("insulinUnit", unit)}
                  style={{
                    padding: "6px 10px",
                    border: "none",
                    background: isActive ? "#0f766e" : "transparent",
                    color: isActive ? "#ffffff" : "#3c3c43",
                    fontWeight: isActive ? 600 : 400,
                    borderRadius: 7,
                    cursor: "pointer",
                    fontSize: 12.5,
                    transition: "all 0.2s ease",
                    boxShadow: isActive ? "0 2px 4px rgba(0,0,0,0.18)" : "none"
                  }}
                >
                  {unit === "pmol" ? "pmol/L" : "mIU/L"}
                </button>
              );
            })}
          </div>
          <div ref={infoRef} style={{ position: "relative" }}>
            <button
              type="button"
              aria-label="Om mIU/L"
              onClick={() => setShowInfo(v => !v)}
              style={{
                width: 20,
                height: 20,
                borderRadius: "50%",
                border: "1px solid #cbd5e1",
                background: "#ffffff",
                color: "#64748b",
                fontSize: 12,
                fontWeight: 700,
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                lineHeight: 1,
                padding: 0
              }}
            >
              ?
            </button>
            {showInfo && (
              <div style={{
                position: "absolute",
                top: 26,
                left: 0,
                zIndex: 10,
                width: 260,
                padding: 12,
                background: "#ffffff",
                border: "1px solid #d1d5db",
                borderRadius: 8,
                boxShadow: "0 8px 20px rgba(0,0,0,0.12)",
                fontSize: 12.5,
                lineHeight: 1.5,
                color: "#374151"
              }}>
                <div style={{ fontWeight: 600, marginBottom: 4 }}>Om mIU/L</div>
                <div>mIU/L står for «milli-International Units per liter» (milli-internasjonale enheter per liter).</div>
                <div style={{ marginTop: 6 }}>
                  Det er en eldre, biologisk basert måleenhet som brukes for hormoner og andre biologisk aktive stoffer, fastsatt ut fra en internasjonal WHO-referansestandard.
                </div>
              </div>
            )}
          </div>
          <input
            className="calc-number-input"
            type="number"
            min={0}
            max={2000}
            step={0.1}
            style={{ width: HOMA_IR_INPUT_WIDTH }}
            value={calcInputs["insulin"] ?? ""}
            onChange={e => onChange("insulin", e.target.value)}
          />
        </div>
      </div>
    </div>
  );
}

function InfoPopoverButton({
  ariaLabel,
  popoverWidth = 320,
  children
}: {
  ariaLabel: string;
  popoverWidth?: number;
  children: React.ReactNode;
}) {
  const [show, setShow] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!show) return;
    const handleOutsideClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setShow(false);
      }
    };
    document.addEventListener("mousedown", handleOutsideClick);
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, [show]);

  return (
    <div ref={ref} style={{ position: "relative" }}>
      <button
        type="button"
        aria-label={ariaLabel}
        onClick={() => setShow(v => !v)}
        style={{
          width: 20,
          height: 20,
          borderRadius: "50%",
          border: "1px solid #cbd5e1",
          background: "#ffffff",
          color: "#64748b",
          fontSize: 12,
          fontWeight: 700,
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          lineHeight: 1,
          padding: 0
        }}
      >
        ?
      </button>
      {show && (
        <div style={{
          position: "absolute",
          top: 26,
          left: 0,
          zIndex: 10,
          width: popoverWidth,
          padding: 12,
          background: "#ffffff",
          border: "1px solid #d1d5db",
          borderRadius: 8,
          boxShadow: "0 8px 20px rgba(0,0,0,0.12)",
          fontSize: 12.5,
          lineHeight: 1.5,
          color: "#374151"
        }}>
          {children}
        </div>
      )}
    </div>
  );
}

function HeadingToggleButton({
  active,
  onClick,
  label
}: {
  active: boolean;
  onClick: () => void;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        padding: '6px 12px',
        background: active ? '#0f766e' : '#14b8a6',
        color: 'white',
        borderRadius: 6,
        fontSize: 12,
        fontWeight: 600,
        border: 'none',
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        gap: 4,
        boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
        transition: 'all 0.2s ease'
      }}
    >
      {label}
    </button>
  );
}

function HeadingInfoBox({ children }: { children: React.ReactNode }) {
  return (
    <div style={{
      padding: 12,
      background: '#e7f7f4',
      borderRadius: 6,
      marginBottom: 12,
      fontSize: 13,
      lineHeight: 1.5,
      color: '#0f172a',
      borderLeft: '3px solid #0f766e',
      whiteSpace: 'pre-line'
    }}>
      {children}
    </div>
  );
}

function CPeptideGlucoseFields({
  calcInputs,
  onChange
}: {
  calcInputs: Record<string, string | number>;
  onChange: (id: string, value: string | number) => void;
}) {
  const state = calcInputs["state"] === "Postprandial" ? "Postprandial" : "Fastende";

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
      <div className="calc-field-row">
        <label style={{ fontWeight: 500, fontSize: 13 }}>Målingstilstand</label>
        <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
          <div style={{ display: "inline-flex", backgroundColor: "#e8e8ed", borderRadius: 9, padding: 2 }}>
            {(["Fastende", "Postprandial"] as const).map(opt => {
              const isActive = state === opt;
              return (
                <button
                  key={opt}
                  type="button"
                  onClick={() => onChange("state", opt)}
                  style={{
                    padding: "6px 14px",
                    border: "none",
                    background: isActive ? "#0f766e" : "transparent",
                    color: isActive ? "#ffffff" : "#3c3c43",
                    fontWeight: isActive ? 600 : 400,
                    borderRadius: 7,
                    cursor: "pointer",
                    fontSize: 13,
                    transition: "all 0.2s ease",
                    boxShadow: isActive ? "0 2px 4px rgba(0,0,0,0.18)" : "none"
                  }}
                >
                  {opt}
                </button>
              );
            })}
          </div>
          <InfoPopoverButton ariaLabel="Om fastende vs. postprandial CGR" popoverWidth={340}>
            <div style={{ fontWeight: 600, marginBottom: 6 }}>
              Fastende vs. postprandial CGR (C-peptid/glukose-ratio)
            </div>
            <div style={{ fontWeight: 600, marginTop: 6 }}>Fastende</div>
            <div>
              Måles etter 8–12 timers faste. Gir et stabilt, standardisert utgangspunkt for betacellenes basale insulinsekresjon, minst påvirket av måltidstiming. Brukes ofte som førstevalg i klinisk praksis fordi det er enklest å standardisere.
            </div>
            <div style={{ fontWeight: 600, marginTop: 8 }}>Postprandial/ikke-fastende</div>
            <div>
              Måles ca. 1–2 timer etter et karbohydratholdig måltid. Reflekterer betacellenes maksimale sekresjonskapasitet bedre, fordi både glukoseøkningen og inkretineffekten (GLP-1/GIP fra tarmen) stimulerer insulinfrisetting ekstra. Regnes derfor som mer sensitiv for å avdekke gjenværende betacellefunksjon enn fastende verdi, spesielt hos pasienter med diabetes hvor fastende respons kan være uttalt lav selv om det finnes noe reservekapasitet.
            </div>
            <div style={{ fontWeight: 600, marginTop: 8 }}>Praktisk konsekvens</div>
            <div>
              En lav fastende CGR utelukker ikke nødvendigvis god postprandial reserve, mens en god postprandial CGR gir sterkere holdepunkt for bevart insulinsekresjon. Målemetode må alltid oppgis sammen med resultatet, siden referanseområder/grenseverdier ikke er direkte sammenlignbare mellom fastende og postprandial måling.
            </div>
          </InfoPopoverButton>
        </div>
      </div>
      <div className="calc-field-row">
        <label style={{ fontWeight: 500, fontSize: 13 }}>C-peptid (pmol/L)</label>
        <input
          className="calc-number-input"
          type="number"
          min={0}
          max={5000}
          step={1}
          style={{ width: HOMA_IR_INPUT_WIDTH }}
          value={calcInputs["cpeptide"] ?? ""}
          onChange={e => onChange("cpeptide", e.target.value)}
        />
      </div>
      <div className="calc-field-row">
        <label style={{ fontWeight: 500, fontSize: 13 }}>Glukose (mmol/L)</label>
        <input
          className="calc-number-input"
          type="number"
          min={0}
          max={30}
          step={0.1}
          style={{ width: HOMA_IR_INPUT_WIDTH }}
          value={calcInputs["glucose"] ?? ""}
          onChange={e => onChange("glucose", e.target.value)}
        />
      </div>
    </div>
  );
}

function CgrInterpretationTable({
  title,
  rows,
  activeTier
}: {
  title: string;
  rows: Array<{ tier: "low" | "mid" | "high"; range: string; label: string }>;
  activeTier?: "low" | "mid" | "high";
}) {
  return (
    <div style={{ marginBottom: 14 }}>
      <div style={{ fontWeight: 600, fontSize: 12.5, color: "#374151", marginBottom: 6 }}>{title}</div>
      <table style={{ borderCollapse: "collapse", fontSize: 12.5, width: "100%" }}>
        <tbody>
          {rows.map(row => {
            const isActive = row.tier === activeTier;
            return (
              <tr key={row.tier} style={{ background: isActive ? "#e7f7f4" : "transparent" }}>
                <td style={{
                  padding: "5px 10px",
                  border: "1px solid #e5e7eb",
                  fontWeight: isActive ? 700 : 400,
                  color: isActive ? "#0f766e" : "#374151",
                  whiteSpace: "nowrap"
                }}>
                  {row.range}
                </td>
                <td style={{
                  padding: "5px 10px",
                  border: "1px solid #e5e7eb",
                  fontWeight: isActive ? 700 : 400,
                  color: isActive ? "#0f766e" : "#374151"
                }}>
                  {row.label}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function CgrInterpretationTables({
  activeMode,
  activeTier
}: {
  activeMode?: "fastende" | "postprandial";
  activeTier?: "low" | "mid" | "high";
}) {
  return (
    <div style={{ marginTop: 14 }}>
      <CgrInterpretationTable
        title="Postprandial CGR"
        rows={[
          { tier: "low", range: "<2", label: "Tap av betacellefunksjon" },
          { tier: "high", range: "≥2", label: "Bevart betacellefunksjon" }
        ]}
        activeTier={activeMode === "postprandial" ? activeTier : undefined}
      />
      <CgrInterpretationTable
        title="Fastende CGR"
        rows={[
          { tier: "low", range: "<2", label: "Insulinsekresjonssvikt" },
          { tier: "mid", range: "2–5", label: "Nedsatt endogen insulinsekresjon" },
          { tier: "high", range: ">5", label: "Bevart endogen insulinsekresjon" }
        ]}
        activeTier={activeMode === "fastende" ? activeTier : undefined}
      />
    </div>
  );
}

export default function ToolHub(
  {
    initialTool,
    initialCalc,
    initialTab,
    noSectionBackground
  }: {
    initialTool?: string;
    initialCalc?: string;
    initialTab?: TabKey;
    noSectionBackground?: boolean;
  } = {}
) {
  const [activeTab, setActiveTab] = useState<TabKey>(initialTab ?? "guides");
  const [activeToolId, setActiveToolId] = useState(initialTool ?? "");
  const [activeCalcId, setActiveCalcId] = useState(initialTool ? "" : (initialCalc ?? ""));
  const [answers, setAnswers] = useState<Record<string, { score: number; optionIndex: number }>>({});
  const [manualScore, setManualScore] = useState<number | null>(null);
  const [manualCalcScore, setManualCalcScore] = useState<number | null>(null);
  const calcScoreBarRef = useRef<HTMLDivElement>(null);
  const scoreBarRef = useRef<HTMLDivElement>(null);
  const [calcInputs, setCalcInputs] = useState<Record<string, string | number>>({});
  const [copyState, setCopyState] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [showSearch, setShowSearch] = useState(false);
  const [activeSpecialty, setActiveSpecialty] = useState<string | null>(null);
  const [activePatientInfoSpecialty, setActivePatientInfoSpecialty] = useState<string | null>(null);
  const [linkBoxOrder, setLinkBoxOrder] = useState<string[]>([]);
  const [draggedBox, setDraggedBox] = useState<string | null>(null);
  const [draggedItem, setDraggedItem] = useState<{ boxId: string; itemId: string } | null>(null);
  const [showClinicalTip, setShowClinicalTip] = useState(false);
  const [showCPeptideInfo, setShowCPeptideInfo] = useState(false);
  const [showCPeptideExamples, setShowCPeptideExamples] = useState(false);
  const [showAdvice, setShowAdvice] = useState(false);
  const [showIndication, setShowIndication] = useState(false);
  const [showAboutTest, setShowAboutTest] = useState(false);
  const [dateCalcStart, setDateCalcStart] = useState(() => getTodayIso());
  const [dateCalcDirection, setDateCalcDirection] = useState<DateCalcDirection>("forward");
  const [dateCalcInline, setDateCalcInline] = useState("");
  const [medStartDate, setMedStartDate] = useState(() => getTodayIso());
  const [medUnits, setMedUnits] = useState("0");
  const [showMedUnitsPicker, setShowMedUnitsPicker] = useState(false);
  const [medDosePerDay, setMedDosePerDay] = useState("1");
  const [copyToJournal, setCopyToJournal] = useState(true);
  const [generatePatientMessage, setGeneratePatientMessage] = useState(false);
  const [avgPrevDate, setAvgPrevDate] = useState(() => getTodayIso());
  const [avgPrevUnits, setAvgPrevUnits] = useState("0");
  const [showAvgUnitsPicker, setShowAvgUnitsPicker] = useState(false);
  const [avgNextDate, setAvgNextDate] = useState(() => getTodayIso());
  const [calcTab, setCalcTab] = useState<SpecialCalcTab>("date");
  const [pregnancyDate, setPregnancyDate] = useState("");
  const [pregnancyPara, setPregnancyPara] = useState("");
  const [pregnancyWeightKg, setPregnancyWeightKg] = useState("");
  const [pregnancyHeightCm, setPregnancyHeightCm] = useState("");
  const [pregnancyOtherConditions, setPregnancyOtherConditions] = useState("");
  const [pregnancyMedicalHistory, setPregnancyMedicalHistory] = useState("");
  const [pregnancyMedications, setPregnancyMedications] = useState("");
  const [pregnancyMentalHealth, setPregnancyMentalHealth] = useState("");
  const [pregnancyRiskPregnancy, setPregnancyRiskPregnancy] = useState(false);

  const [customLabels, setCustomLabels] = useState<Record<string, string>>({});
  const [customItemOrder, setCustomItemOrder] = useState<Record<string, string[]>>({});
  const [previewResource, setPreviewResource] = useState<ResourceCard | null>(null);
  const [previewPosition, setPreviewPosition] = useState<PreviewPosition>({ left: 24, top: 24 });
  const previewHoverTimeoutRef = useRef<number | null>(null);
  const previewCursorRef = useRef<{ x: number; y: number }>({ x: 24, y: 24 });

  const sortedTools = scoringToolRegistry;

  const sortedCalcs = calculatorRegistry;

  const scoringSections = useMemo(() => {
    return buildPostitSections(defaultPostitBoxOrder, sortedCalcs, sortedTools);
  }, [sortedCalcs, sortedTools]);

  const visibleScoringSections = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return scoringSections;

    return scoringSections
      .map((section) => ({
        ...section,
        items: section.items.filter((item) => item.label.toLowerCase().includes(q))
      }))
      .filter((section) => section.items.length > 0);
  }, [scoringSections, searchQuery]);


  const utredningsverktoySubcategories = useMemo<ResourceSubcategory[]>(() => [
      {
        title: "Lungemedisin",
        items: [
          {
            title: "ACT (Astmakontrolltest)",
            description: "Astmakontroll",
            url: "#",
            variants: [
              { label: "Barn", url: "/pdfs/Utredningsskjema-ACT-barn.pdf" },
              { label: "Voksne", url: "/pdfs/Utredningsskjema-ACT-voksne.pdf" }
            ]
          },
          {
            title: "KOLS (CAT)",
            description: "Vurdering av KOLS-symptomer",
            url: "/pdfs/Utredningsskjema-KOLS-(CAT).pdf"
          }
        ]
      },
      {
        title: "Psykiatri",
        items: [
          {
            title: "ASRS",
            description: "Utredningsskjema for ADHD",
            url: "/pdfs/Utredningsskjema-ASRS.pdf"
          },
          {
            title: "AUDIT",
            description: "Vurdering av alkoholbruk",
            url: "/pdfs/TBR-AUDIT.pdf"
          },
          {
            title: "GAD-7",
            description: "Vurdering av angstsymptomer",
            url: "/pdfs/TBR-GAD-7-pdf.pdf"
          },
          {
            title: "MADRS",
            description: "Vurdering av depresjon",
            url: "#",
            variants: [
              { label: "Pasientutfylling", url: "/pdfs/Utredningsskjema-MADRS-pasientutgave.pdf" },
              { label: "Klinikerutfylling", url: "/pdfs/Utredningsskjema-MADRS-klinikerutgave.pdf" }
            ]
          },
          {
            title: "PHQ-9",
            description: "Vurdering av depresjon",
            url: "/pdfs/TBR-PHQ-9.pdf"
          },
          {
            title: "Y-BOCS",
            description: "Vurdering av tvangssymptomer (OCD)",
            url: "/pdfs/TBR-Y-BOCS.pdf"
          },
          {
            title: "Adult ADHD Quality of Life",
            description: "Livskvalitetsvurdering ved voksen ADHD",
            url: "/pdfs/Skjema-ADHD-Adult-ADHD-Quality-of-Life.pdf"
          },
          {
            title: "CIWA - alkohol",
            description: "Vurdering av alkoholabstinens",
            url: "/pdfs/Utredningsverktøy-CIWA-alkohol.pdf"
          },
          {
            title: "CIWA - benzodiazepiner",
            description: "Vurdering av benzodiazepinabstinens",
            url: "/pdfs/Utredningsverk-CIWA-skjema benzodiazepiner.pdf"
          }
        ]
      },
      {
        title: "Urologi",
        items: [
          {
            title: "IPSS",
            description: "Vurdering av vannlatningsplager",
            url: "/pdfs/Utredningsskjema-IPSS.pdf"
          }
        ]
      },
      {
        title: "Demens",
        items: [
          {
            title: "I- og P-ADL",
            description: "Kartlegging av instrumentelle og personlige daglige aktiviteter",
            url: "/pdfs/Skjema-Demens-I-ADL%20og%20P-ADL.pdf"
          },
          {
            title: "Trail Making Test (TMT)",
            description: "Utredningsskjema for demens – TMT-3",
            url: "#",
            variants: [
              { label: "Testark", url: "/pdfs/Utredningsskjema-Demens-TMT-NR3-testark.pdf" },
              { label: "Instruksjoner", url: "/pdfs/Utredningsskjema-Demens-TMT-NR3-manual.pdf" }
            ]
          },
          {
            title: "Barthel ADL-index",
            description: "Kartlegging av funksjonsnivå ved demens",
            url: "/pdfs/Funksjonsnivå-Barthel-ADL-index.pdf"
          },
          {
            title: "MMSE",
            description: "Utredningsverktøy for demens",
            url: "#",
            variants: [
              { label: "Testark", url: "/pdfs/Utredningsverktøy-MMSE-testark.pdf" },
              { label: "Instruksjoner", url: "/pdfs/Utredningsverktøy-MMSE-veiledning.pdf" }
            ]
          }
        ]
      },
      {
        title: "Revmatologi",
        items: [
          {
            title: "Fibromyalgi",
            description: "Kartlegging av fibromyalgi",
            url: "/pdfs/Skjema-Revma-Fibromyalgikartlegging.pdf"
          }
        ]
      },
      {
        title: "Nevrologi",
        items: [
          {
            title: "3x3 Triptan",
            description: "Registrering av triptanbruk ved migrene",
            url: "/pdfs/Skjema-Migrene-3x3-Triptan-.pdf"
          },
          {
            title: "Hodepineutredning",
            description: "Utredningsskjema for hodepine",
            url: "/pdfs/Skjema-Nevro-Hodepineutredning.pdf"
          },
          {
            title: "PIN-test",
            description: "PIN-test ved migrene",
            url: "/pdfs/Skjema-Migrene-PIN-test.pdf"
          },
          {
            title: "HIT-6",
            description: "Vurdering av hodepinebelastning",
            url: "/pdfs/Skjema-Nevro-HIT-6.pdf"
          }
        ]
      },
      {
        title: "Øvrig",
        items: [
          {
            title: "Smertekartlegging",
            description: "Kartlegging av smerte og symptomer (ESAS)",
            url: "/pdfs/Skjema-ESAS-Smertekartlegging.pdf"
          },
          {
            title: "Kostprovokasjon",
            description: "Skjema for kostprovokasjon (Rikshospitalet)",
            url: "/pdfs/Øvrig-Kostprovokasjon-(RIkshosp).pdf"
          },
          {
            title: "Kostregistrering",
            description: "Registrering av kosthold",
            url: "/pdfs/Øvrig-TBR-Kostregistrering.pdf"
          },
          {
            title: "Søvndagbok",
            description: "Registrering av søvnmønster",
            url: "/pdfs/Skjema-Øvrig-Søvndagbok.pdf"
          },
          {
            title: "Canada-kriteriene for ME",
            description: "Diagnostiske kriterier for ME/CFS",
            url: "/pdfs/Skjema-ME-Canada-kriteriene.pdf"
          },
          {
            title: "CFS",
            description: "Utredningsverktøy for kronisk utmattelsessyndrom",
            url: "/pdfs/Utredningsskjema-CFS-skjema.pdf"
          }
        ]
      },
      {
        title: "Trygdemedisin",
        items: [
          {
            title: "Norsk funksjonsskjema",
            description: "Kartlegging av funksjonsnivå ved trygdemedisinske vurderinger",
            url: "/pdfs/Skjema-Trygdemedisin-Norsk%20funksjonsskjema.pdf"
          },
          {
            title: "Sykmeldingsoppfølgning",
            description: "Veiledning for oppfølgning av sykmeldte pasienter",
            url: "/pdfs/Trygdemedisin-Sykmeldingsoppf%C3%B8lgning.pdf"
          }
        ]
      }
    ]
      .map((subcategory) => ({
        ...subcategory,
        items: [...subcategory.items].sort((a, b) => a.title.localeCompare(b.title, "nb"))
      }))
      .sort((a, b) => a.title.localeCompare(b.title, "nb")), []);

  const resourceCategories = useMemo<ResourceCategory[]>(() => {
    const categories: ResourceCategory[] = [
      {
        title: "Utredningsverktøy",
        items: []
      }
    ];

    return [...categories]
      .sort((left, right) => left.title.localeCompare(right.title, "nb"))
      .map((category) => ({
        ...category,
        items: [...category.items].sort((left, right) => left.title.localeCompare(right.title, "nb"))
      }));
  }, [utredningsverktoySubcategories]);

  const overviewCategories = useMemo<ResourceCategory[]>(() => [
    {
      title: "Håndkort",
      items: [
        {
          title: "Apotekkort",
          description: "Håndkort for apotekrelatert oppfølging.",
          url: "/pdfs/Håndkort-Apotekkort-ToppenLS.pdf"
        },
        {
          title: "Henvisningskort",
          description: "Håndkort for rask henvisningsstøtte.",
          url: "/pdfs/Håndkort-Henvisningskort-ToppenLS.pdf"
        },
        {
          title: "Sykedagskort",
          description: "Håndkort for strukturert sykedagsvurdering.",
          url: "/pdfs/Håndkort-Sykedagskort.pdf"
        },
        {
          title: "Videre plan",
          description: "Håndkort for planlegging av videre forløp.",
          url: "/pdfs/Håndkort-Videre%20plan-ToppenLS.pdf"
        }
      ]
    },
    {
      title: "Annet",
      items: [
        {
          title: "Knuse-dele-listen",
          description: "Knuse-dele-listen",
          url: "/pdfs/KnuseDeleListen v16.pdf"
        },
        {
          title: "Eldre (over 70 år)",
          description: "Spesielle hensyn ved dosering til eldre pasienter",
          url: "#"
        },
        {
          title: "Nyresvikt",
          description: "Dosejustering ved redusert nyrefunksjon",
          url: "#"
        },
        {
          title: "Vanligste interaksjoner",
          description: "Viktige legemiddelinteraksjoner å vurdere",
          url: "#"
        },
        {
          title: "Osteoporose",
          description: "Pasientinformasjon om osteoporose",
          url: "/pdfs/Pasientinformasjon-Osteoporose.pdf"
        }
      ]
    }
  ], []);

  const patientInfoSubcategories = useMemo<ResourceSubcategory[]>(() => [
    {
      title: "Lungemedisin",
      items: [
        {
          title: "Egenbehandling KOLS",
          description: "Egenbehandlingsplan for KOLS",
          url: "/pdfs/Egenbehandlingsplan-KOLS.pdf"
        },
        {
          title: "Egenbehandling astma",
          description: "Egenbehandlingsplan for astma",
          url: "/pdfs/Egenbehandlingsplan-Astma.pdf"
        }
      ]
    },
    {
      title: "Kardiologi",
      items: [
        {
          title: "Hjemmemåling BT",
          description: "Hjemmemåling av blodtrykk",
          url: "#",
          variants: [
            { label: "Instruksjoner og måleark", url: "/pdfs/HjemmeBT.pdf" },
            { label: "Kun måleark", url: "/pdfs/HjemmeBT-kun-registrering.pdf" }
          ]
        }
      ]
    },
    {
      title: "Revmatologi",
      items: [
        {
          title: "Polymyalgia revmatika",
          description: "Behandlingsplan for polymyalgia revmatika",
          url: "/pdfs/Behandlingsplan-Polymyalgia-rheumtica.pdf"
        }
      ]
    },
    {
      title: "Gastroenterologi",
      items: [
        {
          title: "Sure oppstøt (GERD)",
          description: "Pasientinformasjon om sure oppstøt og gastroøsofageal reflukssykdom",
          url: "/pdfs/Pasinfo-GERD.pdf"
        },
        {
          title: "PPI-nedtrapping",
          description: "Behandlingsplan for nedtrapping av PPI",
          url: "/pdfs/Behandlingsplaner-PPI-nedtrapping.pdf"
        }
      ]
    },
    {
      title: "Dermatologi",
      items: [
        {
          title: "Eksembehandling",
          description: "Pasientinformasjon om behandling av eksem",
          url: "/pdfs/Pasinfo-Derma-Eksembehandling.pdf"
        },
        {
          title: "Føflekksjekk egenbehandling",
          description: "Pasientinformasjon om egensjekk av føflekker",
          url: "/pdfs/Pasinfo-Derma-Føflekker-Egensjekk.pdf"
        },
        {
          title: "Vortebehandling",
          description: "Behandlingsplan for vortebehandling",
          url: "/pdfs/Behandlingsplaner-Vortebehandling.pdf"
        },
        {
          title: "Psoriasis i hodebunn",
          description: "Behandlingsplan for psoriasis i hodebunn",
          url: "/pdfs/Behandlingsplaner-Psoriasis-i-hodebunn.pdf"
        }
      ]
    },
    {
      title: "Psyk",
      items: [
        {
          title: "Prioriteringsmatrise",
          description: "Prioriteringsmatrise for psykisk helsearbeid",
          url: "/pdfs/Psyk-Prioriteringsmatrise.pdf"
        },
        {
          title: "Trafikklysmodell – Psykisk helsearbeid",
          description: "Trafikklysmodell for vurdering i psykisk helsearbeid",
          url: "/pdfs/Trafikklysmodell%E2%80%93Psykisk-helsearbeid.pdf"
        }
      ]
    },
    {
      title: "Muskel og skjelett",
      items: [
        {
          title: "Start-øvelser",
          description: "Øvelsesprogram for ulike kroppsdeler (ExorLive)",
          url: "https://www.exorlive.com/no/start-ovelser"
        },
        {
          title: "Øvelser ved ryggsmerter",
          description: "Fysioterapiøvelser ved ryggsmerter",
          url: "/pdfs/Fysio-Øvelser-ryggsmerter.pdf"
        },
        {
          title: "Plantar fasciitt",
          description: "Pasientinformasjon om øvelser ved plantar fasciitt",
          url: "/pdfs/Pasinfo-Plantar%20fasciiti.pdf"
        },
        {
          title: "Senebetennelse",
          description: "Behandlingsplan for senebetennelse",
          url: "/pdfs/Behandlingsplan-Senebetennelse.pdf"
        }
      ]
    },
    {
      title: "Endokrinologi",
      items: [
        {
          title: "Diabetisk fotsår",
          description: "Pasientinformasjon om diabetisk fotsår, etter risikonivå",
          url: "#",
          variants: [
            { label: "Lav risiko", url: "/pdfs/Diabetisk-fotsår-lav-risiko.pdf" },
            { label: "Medium risiko", url: "/pdfs/Diabetisk-fotsår-medium-risiko.pdf" },
            { label: "Høy risiko", url: "/pdfs/Diabetisk-fotsår-høy-risiko.pdf" }
          ]
        }
      ]
    },
    {
      title: "Øvrig",
      items: [
        {
          title: "Sarotex",
          description: "Behandlingsplan for sarotex",
          url: "/pdfs/Behandlingsplaner-Sarotex.pdf"
        }
      ]
    }
  ]
    .map((subcategory) => ({
      ...subcategory,
      items: [...subcategory.items].sort((a, b) => a.title.localeCompare(b.title, "nb"))
    }))
    .sort((a, b) => a.title.localeCompare(b.title, "nb")), []);

  const clearPreviewHoverTimeout = () => {
    if (previewHoverTimeoutRef.current !== null) {
      window.clearTimeout(previewHoverTimeoutRef.current);
      previewHoverTimeoutRef.current = null;
    }
  };

  const calculatePreviewPosition = (cursorX: number, cursorY: number): PreviewPosition => {
    if (typeof window === "undefined") {
      return { left: 24, top: 24 };
    }

    const previewWidth = 520;
    const previewHeight = 680;
    const offset = 18;
    const padding = 16;

    let left = cursorX + offset;
    let top = cursorY + offset;

    if (left + previewWidth > window.innerWidth - padding) {
      left = cursorX - previewWidth - offset;
    }

    if (top + previewHeight > window.innerHeight - padding) {
      top = window.innerHeight - previewHeight - padding;
    }

    if (left < padding) {
      left = padding;
    }

    if (top < padding) {
      top = padding;
    }

    return { left, top };
  };

  const updatePreviewCursor = (cursorX: number, cursorY: number) => {
    previewCursorRef.current = { x: cursorX, y: cursorY };
    if (previewResource) {
      setPreviewPosition(calculatePreviewPosition(cursorX, cursorY));
    }
  };

  const schedulePdfPreview = (resource: ResourceCard, cursorX: number, cursorY: number) => {
    previewCursorRef.current = { x: cursorX, y: cursorY };
    clearPreviewHoverTimeout();
    previewHoverTimeoutRef.current = window.setTimeout(() => {
      setPreviewPosition(calculatePreviewPosition(previewCursorRef.current.x, previewCursorRef.current.y));
      setPreviewResource(resource);
      previewHoverTimeoutRef.current = null;
    }, 500);
  };

  const hidePdfPreview = () => {
    clearPreviewHoverTimeout();
    setPreviewResource(null);
  };

  const renderResourceRow = (resource: ResourceCard, key: string) => {
    if (resource.variants && resource.variants.length > 0) {
      return (
        <article key={key} className="resource-row resource-row-variants">
          <div className="resource-row-main resource-row-main-compact">
            <span className="resource-title resource-title-plain">{resource.title}</span>
            <p className="resource-description">{resource.description}</p>
          </div>
          <div className="resource-variant-buttons">
            {resource.variants.map((variant) => {
              const variantResource: ResourceCard = {
                title: `${resource.title} – ${variant.label}`,
                description: resource.description,
                url: variant.url
              };
              const variantCanOpen = variant.url !== "#";
              const variantPreviewHandlers = variantCanOpen
                ? {
                    onMouseEnter: (event: ReactMouseEvent<HTMLElement>) => {
                      schedulePdfPreview(variantResource, event.clientX, event.clientY);
                    },
                    onMouseMove: (event: ReactMouseEvent<HTMLElement>) => {
                      updatePreviewCursor(event.clientX, event.clientY);
                    },
                    onMouseLeave: hidePdfPreview
                  }
                : {};

              return variantCanOpen ? (
                <a
                  key={variant.label}
                  href={variant.url}
                  target="_blank"
                  rel="noreferrer"
                  className="resource-variant-button"
                  {...variantPreviewHandlers}
                >
                  {variant.label}
                </a>
              ) : (
                <span key={variant.label} className="resource-variant-button unavailable">
                  {variant.label}
                </span>
              );
            })}
          </div>
        </article>
      );
    }

    const canOpen = resource.url !== "#";
    const previewHandlers = canOpen
      ? {
          onMouseEnter: (event: ReactMouseEvent<HTMLElement>) => {
            schedulePdfPreview(resource, event.clientX, event.clientY);
          },
          onMouseMove: (event: ReactMouseEvent<HTMLElement>) => {
            updatePreviewCursor(event.clientX, event.clientY);
          },
          onMouseLeave: hidePdfPreview
        }
      : {};

    return (
      <article key={key} className="resource-row">
        <div className="resource-row-main">
          {canOpen ? (
            <a href={resource.url} target="_blank" rel="noreferrer" className="resource-title" {...previewHandlers}>
              {resource.title}
            </a>
          ) : (
            <span className="resource-title unavailable">{resource.title}</span>
          )}
          <p className="resource-description">{resource.description}</p>
        </div>
        <div className="resource-row-badge">
          {canOpen ? (
            <a href={resource.url} target="_blank" rel="noreferrer" className="resource-pdf-badge" {...previewHandlers}>
              {resource.url.startsWith("http") ? "Lenke" : "PDF"}
            </a>
          ) : (
            <span className="resource-pdf-badge unavailable">PDF</span>
          )}
        </div>
      </article>
    );
  };

  const dateCalcInlineParsed = useMemo(() => parseCalendarInlineOffset(dateCalcInline), [dateCalcInline]);
  const dateCalcOffset = useMemo(() => {
    return buildDateCalcOffset(dateCalcInline, dateCalcDirection, dateCalcInlineParsed);
  }, [dateCalcInline, dateCalcInlineParsed, dateCalcDirection]);

  const dateCalcResult = useMemo(() => {
    return calculateDateCalcResult(dateCalcStart, dateCalcOffset);
  }, [dateCalcStart, dateCalcOffset]);

  const medDurationResult = useMemo(() => {
    return calculateMedDurationResult(medStartDate, medUnits, medDosePerDay);
  }, [medStartDate, medUnits, medDosePerDay]);

  const medPatientMessage = useMemo(() => {
    return buildMedPatientMessage(medDurationResult, medStartDate, medUnits, medDosePerDay);
  }, [medDurationResult, medStartDate, medUnits, medDosePerDay]);

  const medJournalMessage = useMemo(() => {
    return buildMedJournalMessage(medDurationResult, medUnits, medDosePerDay);
  }, [medDurationResult, medUnits, medDosePerDay]);

  useEffect(() => {
    if (!showMedUnitsPicker && !showAvgUnitsPicker) return;

    const handlePointerDown = (event: globalThis.MouseEvent) => {
      const target = event.target as HTMLElement | null;

      if (showMedUnitsPicker && !target?.closest('[data-med-units-picker="true"]')) {
        setShowMedUnitsPicker(false);
      }

      if (showAvgUnitsPicker && !target?.closest('[data-avg-units-picker="true"]')) {
        setShowAvgUnitsPicker(false);
      }
    };

    document.addEventListener("mousedown", handlePointerDown);
    return () => document.removeEventListener("mousedown", handlePointerDown);
  }, [showMedUnitsPicker, showAvgUnitsPicker]);

  useEffect(() => {
    return () => clearPreviewHoverTimeout();
  }, []);

  const avgUsageResult = useMemo(() => {
    return calculateAvgUsageResult(avgPrevDate, avgNextDate, avgPrevUnits);
  }, [avgPrevDate, avgNextDate, avgPrevUnits]);

  const pregnancyResult = useMemo(() => {
    return calculatePregnancyResult(pregnancyDate);
  }, [pregnancyDate]);

  const pregnancyBmi = useMemo(() => {
    return calculatePregnancyBmi(pregnancyWeightKg, pregnancyHeightCm);
  }, [pregnancyWeightKg, pregnancyHeightCm]);

  const pregnancyReferralText = useMemo(() => {
    return buildPregnancyReferralText({
      pregnancyPara,
      pregnancyResult,
      pregnancyWeightKg,
      pregnancyHeightCm,
      pregnancyBmi,
      pregnancyOtherConditions,
      pregnancyMedicalHistory,
      pregnancyMedications,
      pregnancyMentalHealth,
      pregnancyRiskPregnancy
    });
  }, [pregnancyPara, pregnancyResult, pregnancyWeightKg, pregnancyHeightCm, pregnancyBmi, pregnancyOtherConditions, pregnancyMedicalHistory, pregnancyMedications, pregnancyMentalHealth, pregnancyRiskPregnancy]);

  // Initialize linkBoxOrder if empty
  useEffect(() => {
    if (linkBoxOrder.length === 0 && defaultLinkBoxes.length > 0) {
      setLinkBoxOrder(defaultLinkBoxes.map((box) => box.id));
    }
  }, [linkBoxOrder.length]);

  // Get ordered linkBoxes with custom labels
  const linkBoxes = useMemo(() => {
    const order = linkBoxOrder.length > 0 ? linkBoxOrder : defaultLinkBoxes.map((box) => box.id);

    return order.map((id) => {
      const box = defaultLinkBoxes.find((baseBox) => baseBox.id === id);
      if (!box) return null;

      const originalItems = box.items.map((item) => ({
        ...item,
        label: customLabels[`${box.id}-${item.id}`] || item.label
      }));
      let items = originalItems;
      
      // Apply custom item order if exists
      const orderedIds = customItemOrder[box.id];
      if (orderedIds) {
        const itemMap = new Map(originalItems.map((item) => [item.id, item]));
        const orderedItems = orderedIds
          .map((itemId) => itemMap.get(itemId))
          .filter(Boolean) as LinkBox["items"];
        const missingItems = originalItems.filter((item) => !orderedIds.includes(item.id));
        items = [...orderedItems, ...missingItems];
      }
      
      return {
        ...box,
        items
      };
    }).filter(Boolean) as LinkBox[];
  }, [linkBoxOrder, customLabels, customItemOrder]);

  const activeTool = useMemo(() => sortedTools.find(t => t.id === activeToolId), [activeToolId, sortedTools]);
  const activeCalc = useMemo(() => sortedCalcs.find(c => c.id === activeCalcId), [activeCalcId, sortedCalcs]);
  const activeSpecialCalcTab = getSpecialCalcTab(activeCalcId);
  const activePdfOptions = useMemo<PdfOption[]>(() => {
    if (activeTool) {
      if (activeTool.pdfOptions && activeTool.pdfOptions.length > 0) {
        return activeTool.pdfOptions;
      }
      if (activeTool.pdfUrl) {
        return [{ label: "PDF", url: activeTool.pdfUrl }];
      }
      return [];
    }

    if (activeCalc?.pdfUrl) {
      return [{ label: "PDF", url: activeCalc.pdfUrl }];
    }

    return [];
  }, [activeTool, activeCalc]);

  const activePatientPdfUrl = useMemo(() => {
    if (activeTool) {
      return activeTool.patientPdfUrl ?? activeTool.pdfOptions?.find((option) => option.patientFacing)?.url ?? activeTool.pdfUrl ?? "";
    }

    return activeCalc?.patientPdfUrl ?? activeCalc?.pdfUrl ?? "";
  }, [activeTool, activeCalc]);

  const activeDisplayName = useMemo(() => {
    const sourceName = activeTool?.name ?? activeCalc?.name ?? "skjema";
    return sourceName.replace(/[\u{1F300}-\u{1F9FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]/gu, "").trim();
  }, [activeTool, activeCalc]);

  const scoreSummary = useMemo(() => {
    if (!activeTool) return null;
    const maxScore = activeTool.questions.reduce((s, q) => s + Math.max(...q.options.map(o => o.score)), 0);
    const totalScore = manualScore ?? activeTool.questions.reduce((s, q) => s + (answers[q.id]?.score ?? 0), 0);
    const threshold = [...activeTool.thresholds].sort((a, b) => b.minScore - a.minScore).find(t => totalScore >= t.minScore);
    const thresholdColor = threshold?.color ?? "#666";
    return { totalScore, maxScore, thresholdLabel: threshold?.label ?? "Uklassifisert", thresholdColor };
  }, [activeTool, answers, manualScore]);

  const summaryText = activeTool && scoreSummary ? `${activeTool.name}: ${scoreSummary.totalScore}/${scoreSummary.maxScore} (${scoreSummary.thresholdLabel})` : "";
  const detailedSummaryText = activeTool && scoreSummary
    ? activeTool.questions.map((q, i) => `${i + 1}. ${q.text} — ${answers[q.id] ? q.options[answers[q.id].optionIndex]?.label : "Ikke besvart"}`).join("\n") + `\n\nTotal: ${scoreSummary.totalScore}/${scoreSummary.maxScore} (${scoreSummary.thresholdLabel})`
    : "";

  const calcResult = useMemo(() => calculateToolHubCalcResult(activeCalc, calcInputs, manualCalcScore), [activeCalc, calcInputs, manualCalcScore]);
  const calcScoreIsUnbounded = activeCalc?.id === 'fib4' || activeCalc?.id === 'homa-ir' || activeCalc?.id === 'cpeptide-glucose';
  const calcScoreSumCalcIds = ['ipss', 'cat', 'nyha', 'ccs', 'mmrc'];
  const calcScoreFormulaMaxScores: Record<string, number> = { fib4: 10, 'homa-ir': 6, 'cpeptide-glucose': 10 };
  const calcScoreBarIsDraggable = !!activeCalc && (calcScoreSumCalcIds.includes(activeCalc.id) || activeCalc.id in calcScoreFormulaMaxScores) && !!activeCalc.thresholds && activeCalc.thresholds.length > 0;
  const calcScorePercent = calcResult && calcResult.maxScore
    ? Math.min(100, Math.max(0, (calcResult.score / calcResult.maxScore) * 100))
    : 0;
  const calcScoreDisplay = calcResult
    ? (calcScoreIsUnbounded ? calcResult.score.toFixed(1) : calcResult.score)
    : 0;
  const calcMaxScore = useMemo(() => {
    if (calcResult) return calcResult.maxScore;
    if (!activeCalc || !calcScoreBarIsDraggable) return 0;
    if (activeCalc.id in calcScoreFormulaMaxScores) return calcScoreFormulaMaxScores[activeCalc.id];
    return activeCalc.fields.reduce((sum, field) => {
      if (field.type !== "select" || !field.options) return sum;
      const maxOption = field.options.reduce((max, opt, idx) => Math.max(max, getFieldOptionScore(field, opt, idx)), 0);
      return sum + maxOption;
    }, 0);
  }, [activeCalc, calcResult, calcScoreBarIsDraggable]);

  const handleAnswerChange = (qid: string, score: number, idx: number) => { setManualScore(null); setAnswers(p => ({ ...p, [qid]: { score, optionIndex: idx } })); };
  const handleToggleIndication = () => { setShowIndication(v => !v); setShowAboutTest(false); setShowClinicalTip(false); setShowCPeptideInfo(false); setShowCPeptideExamples(false); };
  const handleToggleAboutTest = () => { setShowAboutTest(v => !v); setShowIndication(false); setShowClinicalTip(false); setShowCPeptideInfo(false); setShowCPeptideExamples(false); };
  const handleToggleClinicalTip = () => { setShowClinicalTip(v => !v); setShowIndication(false); setShowAboutTest(false); setShowCPeptideInfo(false); setShowCPeptideExamples(false); };
  const handleToggleCPeptideInfo = () => { setShowCPeptideInfo(v => !v); setShowIndication(false); setShowAboutTest(false); setShowClinicalTip(false); setShowCPeptideExamples(false); };
  const handleToggleCPeptideExamples = () => { setShowCPeptideExamples(v => !v); setShowIndication(false); setShowAboutTest(false); setShowClinicalTip(false); setShowCPeptideInfo(false); };
  const handleToolChange = (id: string) => { setActiveToolId(id); setActiveCalcId(""); setAnswers({}); setManualScore(null); setShowClinicalTip(false); setShowAdvice(false); setShowIndication(false); setShowAboutTest(false); };

  const updateManualScoreFromClientX = (clientX: number) => {
    if (!scoreBarRef.current || !scoreSummary || scoreSummary.maxScore <= 0) return;
    const rect = scoreBarRef.current.getBoundingClientRect();
    const ratio = Math.min(1, Math.max(0, (clientX - rect.left) / rect.width));
    setAnswers({});
    setManualScore(Math.round(ratio * scoreSummary.maxScore));
  };

  const handleScoreBarPointerDown = (e: ReactPointerEvent<HTMLDivElement>) => {
    e.preventDefault();
    updateManualScoreFromClientX(e.clientX);
    const handleMove = (ev: PointerEvent) => updateManualScoreFromClientX(ev.clientX);
    const handleUp = () => {
      window.removeEventListener('pointermove', handleMove);
      window.removeEventListener('pointerup', handleUp);
    };
    window.addEventListener('pointermove', handleMove);
    window.addEventListener('pointerup', handleUp);
  };

  const updateManualCalcScoreFromClientX = (clientX: number) => {
    if (!calcScoreBarRef.current || calcMaxScore <= 0) return;
    const rect = calcScoreBarRef.current.getBoundingClientRect();
    const ratio = Math.min(1, Math.max(0, (clientX - rect.left) / rect.width));
    const raw = ratio * calcMaxScore;
    setManualCalcScore(calcScoreIsUnbounded ? Math.round(raw * 10) / 10 : Math.round(raw));
  };

  const handleCalcScoreBarPointerDown = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (!calcScoreBarIsDraggable) return;
    e.preventDefault();
    updateManualCalcScoreFromClientX(e.clientX);
    const handleMove = (ev: PointerEvent) => updateManualCalcScoreFromClientX(ev.clientX);
    const handleUp = () => {
      window.removeEventListener('pointermove', handleMove);
      window.removeEventListener('pointerup', handleUp);
    };
    window.addEventListener('pointermove', handleMove);
    window.addEventListener('pointerup', handleUp);
  };
  const handleCalcChange = (id: string) => {
    const specialTab = getSpecialCalcTab(id);
    if (specialTab) {
      setActiveCalcId(id);
      setActiveToolId("");
      setShowClinicalTip(false);
      setShowCPeptideInfo(false);
      setShowCPeptideExamples(false);
      setShowAdvice(false);
      setShowIndication(false);
      setShowAboutTest(false);
      setManualCalcScore(null);
      setCalcTab(specialTab);
      return;
    }

    setActiveCalcId(id);
    setActiveToolId("");
    setShowClinicalTip(false);
    setShowCPeptideInfo(false);
    setShowCPeptideExamples(false);
    setShowAdvice(false);
    setShowIndication(false);
    setShowAboutTest(false);
    setManualCalcScore(null);
    // Initialize inputs with default values for select fields
    const calc = sortedCalcs.find(c => c.id === id);
    if (calc) {
      const initialInputs: Record<string, string | number> = {};
      calc.fields.forEach(field => {
        if (field.type === "select" && field.options) {
          const isYesNo = field.options.length === 2 && 
                          field.options[0] === "Nei" && 
                          field.options[1] === "Ja";
          const isHorizontalOrVertical = calc.layout === "horizontal" || calc.layout === "vertical-select";
          
          if (isYesNo) {
            // Default Yes/No fields to "Nei" (0 points)
            initialInputs[field.id] = "Nei";
          } else if (isHorizontalOrVertical && field.options[0]) {
            // Default horizontal/vertical-select fields to first option (usually 0)
            initialInputs[field.id] = field.options[0];
          }
        }
      });
      if (calc.id === "homa-ir") {
        initialInputs["insulinUnit"] = "pmol";
      }
      if (calc.id === "cpeptide-glucose") {
        initialInputs["state"] = "Fastende";
      }
      setCalcInputs(initialInputs);
    } else {
      setCalcInputs({});
    }
  };
  const handleInputChange = (fid: string, v: string | number) => { setManualCalcScore(null); setCalcInputs(p => ({ ...p, [fid]: v })); };
  const handleCopy = async (t: string) => { try { await navigator.clipboard.writeText(t); setCopyState("Kopiert!"); setTimeout(() => setCopyState(""), 2000); } catch { setCopyState("Feilet"); } };
  const handlePrint = (url: string) => { const w = window.open(url, "_blank"); if (w) w.onload = () => { w.focus(); w.print(); }; };
  const handleCopyHelsenorgeMessage = () => {
    const absolutePdfUrl = activePatientPdfUrl
      ? (activePatientPdfUrl.startsWith("http") ? activePatientPdfUrl : `${window.location.origin}${activePatientPdfUrl}`)
      : "";

    const message = absolutePdfUrl
      ? `Hei,\n\nSom ledd i din utredning ønsker legen at du printer ut og fyller ut følgende skjema og har det med på neste legetime:\n\n${activeDisplayName}\n${absolutePdfUrl}\n\nDersom du ikke har tilgang til printer, går det an å komme litt før timen og henvende seg i skranken for å få det printet ut.\n\nHilsen,\n\nLegesenteret`
      : "Hei,\n\nSom ledd i din utredning ønsker legen at du printer ut og fyller ut følgende skjema og har det med på neste legetime. Dersom du ikke har tilgang til printer, går det an å komme litt før timen og henvende seg i skranken for å få det printet ut.\n\nHilsen,\n\nLegesenteret";

    handleCopy(message);
  };
  
  const handleDragStart = (boxId: string) => {
    setDraggedBox(boxId);
  };

  const handleDragOver = (e: React.DragEvent, boxId: string) => {
    e.preventDefault();
    if (!draggedBox || draggedBox === boxId) return;
    
    const currentOrder = [...linkBoxOrder];
    const draggedIdx = currentOrder.indexOf(draggedBox);
    const targetIdx = currentOrder.indexOf(boxId);
    
    if (draggedIdx !== -1 && targetIdx !== -1) {
      currentOrder.splice(draggedIdx, 1);
      currentOrder.splice(targetIdx, 0, draggedBox);
      setLinkBoxOrder(currentOrder);
    }
  };

  const handleDragEnd = () => {
    setDraggedBox(null);
  };

  const handleItemDragStart = (e: React.DragEvent, boxId: string, itemId: string) => {
    setDraggedItem({ boxId, itemId });
    e.dataTransfer.effectAllowed = "move";
  };

  const handleItemDragOver = (e: React.DragEvent, boxId: string, targetItemId: string) => {
    e.preventDefault();
    if (!draggedItem || draggedItem.boxId !== boxId || draggedItem.itemId === targetItemId) return;
    e.dataTransfer.dropEffect = "move";
  };

  const handleItemDrop = (e: React.DragEvent, boxId: string, targetItemId: string) => {
    e.preventDefault();
    if (!draggedItem || draggedItem.boxId !== boxId || draggedItem.itemId === targetItemId) return;
    
    const box = linkBoxes.find(b => b.id === boxId);
    if (!box) return;
    
    const items = [...box.items];
    const draggedIdx = items.findIndex(item => item.id === draggedItem.itemId);
    const targetIdx = items.findIndex(item => item.id === targetItemId);
    
    if (draggedIdx !== -1 && targetIdx !== -1) {
      const draggedItem_ = items[draggedIdx];
      items.splice(draggedIdx, 1);
      items.splice(targetIdx, 0, draggedItem_);
      
      // Store the reordered items
      setCustomItemOrder(prev => ({
        ...prev,
        [boxId]: items.map(item => item.id)
      }));
    }
    setDraggedItem(null);
  };

  const handleItemDragEnd = () => {
    setDraggedItem(null);
  };

  // Determine if higher score is better based on thresholds color pattern
  const isHigherScoreBetter = (thresholds: CalcThreshold[] | ToolThreshold[]) => {
    if (thresholds.length < 2) return false;
    // Check if first threshold has red color (indicating low score is bad)
    const firstColor = (thresholds[0] as CalcThreshold).color;
    if (!firstColor) return false;
    return firstColor === "#f44336" || firstColor === "#ef5350";
  };

  const handleTabChange = (tab: TabKey) => {
    if (tab === "tools") {
      // Reset skåringsverktøyvisning når fanen velges
      setActiveToolId("");
      setActiveCalcId("");
      setAnswers({});
      setManualScore(null);
      setCalcInputs({});
      setCalcTab("date");
      setSearchQuery("");
      setShowSearch(false);
    }
    if (tab !== "resources") {
      setActiveSpecialty(null);
    }
    if (tab !== "patientinfo") {
      setActivePatientInfoSpecialty(null);
    }
    setActiveTab(tab);
  };

  const handleCopySpecialCalculatorText = () => {
    if (calcTab === "date") {
      if (!dateCalcResult) return;
      handleCopy(`Resultatdato: ${dateCalcResult.dateText} (${dateCalcResult.weekday}), uke ${dateCalcResult.weekNumber}. Dager fra startdato: ${dateCalcResult.dayDiff}.`);
      return;
    }

    if (calcTab === "med") {
      const messages: string[] = [];
      if (copyToJournal && medJournalMessage) messages.push(medJournalMessage);
      if (generatePatientMessage && medPatientMessage) messages.push(medPatientMessage);
      if (messages.length === 0 && medJournalMessage) messages.push(medJournalMessage);
      if (messages.length > 0) {
        handleCopy(messages.join("\n\n"));
      }
      return;
    }

    if (calcTab === "tapering") {
      if (!avgUsageResult || "error" in avgUsageResult) return;
      handleCopy(`Gjennomsnittlig daglig forbruk: ${avgUsageResult.daily.toFixed(2)} enheter per dag over ${avgUsageResult.daySpan} dager.`);
      return;
    }

    if (calcTab === "pregnancy") {
      if (!pregnancyReferralText.trim()) return;
      handleCopy(pregnancyReferralText);
    }
  };

  return (
    <section className={`tool-section ${noSectionBackground ? "" : "section"}`}>
      <div className="row" style={{ justifyContent: "space-between" }}>
        <div className="row tool-actions">
          <button
            className={`tool-action ${showSearch ? "active" : ""}`}
            onClick={() => setShowSearch(!showSearch)}
            type="button"
            title="Søk"
          >
            <span>🔍</span>
            <span>Søk</span>
          </button>
          <div className="tabbar" role="tablist">
            {tabOrder.map((tabKey) => (
              <button key={tabKey} type="button" className={`tab ${activeTab === tabKey ? "active" : ""}`} onClick={() => handleTabChange(tabKey)} role="tab" aria-selected={activeTab === tabKey}>{tabs[tabKey]}</button>
            ))}
          </div>
        </div>
      </div>
      {showSearch && (
        <div className="tool-search">
          <input
            className="tool-search-input"
            type="text"
            placeholder="Søk etter verktøy..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            autoFocus
          />
        </div>
      )}

      {activeTab === "tools" && (
        <div style={{ marginTop: 20 }}>
          {!activeTool && !activeCalc && !activeSpecialCalcTab ? (
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
                gap: 14
              }}
            >
              {visibleScoringSections.map((section) => (
                <div
                  key={section.boxId}
                  style={{
                    border: '1px solid #e5e7eb',
                    borderRadius: 12,
                    padding: 12,
                    background: '#f8fafc',
                    minHeight: 180
                  }}
                >
                  <h3 style={{ margin: '0 0 10px 0', fontSize: 18, fontWeight: 700 }}>{section.title}</h3>
                  <div style={{ display: 'grid', gap: 8 }}>
                    {section.items.map((item, index) => {
                      const previousSubcategory = index > 0 ? section.items[index - 1].subcategory : undefined;
                      const showSubcategoryHeading = item.subcategory && item.subcategory !== previousSubcategory;
                      return (
                        <div key={item.id}>
                          {showSubcategoryHeading && (
                            <div style={{
                              fontSize: 11,
                              fontWeight: 700,
                              textTransform: 'uppercase',
                              letterSpacing: 0.5,
                              color: '#6b7280',
                              margin: index === 0 ? '0 0 6px 0' : '12px 0 6px 0'
                            }}>
                              {item.subcategory}
                            </div>
                          )}
                          <button
                            type="button"
                            onClick={() => {
                              if (item.itemType === "calc") {
                                handleCalcChange(item.id);
                                return;
                              }
                              if (item.itemType === "tool") {
                                handleToolChange(item.id);
                                return;
                              }
                              if (item.url) {
                                window.open(item.url, "_blank", "noopener,noreferrer");
                              }
                            }}
                            style={{
                              textAlign: 'left',
                              width: '100%',
                              border: '1px solid #dbe2ea',
                              borderRadius: 10,
                              background: '#ffffff',
                              padding: '10px 14px',
                              fontSize: 13,
                              fontWeight: 600,
                              color: '#111827',
                              cursor: 'pointer'
                            }}
                          >
                            {item.label}
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          ) : (
          <div className="form-section">
            {activeTool ? (
              <div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                    <h2 style={{ margin: 0, fontSize: 20 }}>{activeTool.name}</h2>
                    {activeTool.indication && (
                      <HeadingToggleButton active={showIndication} onClick={handleToggleIndication} label="🎯 Indikasjon" />
                    )}
                    {activeTool.aboutTest && (
                      <HeadingToggleButton active={showAboutTest} onClick={handleToggleAboutTest} label="ℹ️ Om testen" />
                    )}
                  </div>
                </div>
                {activeTool.indication && showIndication && (
                  <HeadingInfoBox>{activeTool.indication}</HeadingInfoBox>
                )}
                {activeTool.aboutTest && showAboutTest && (
                  <HeadingInfoBox>{activeTool.aboutTest}</HeadingInfoBox>
                )}
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                  {activePdfOptions.length > 0 && (
                    <>
                      {activePdfOptions.map((option) => (
                        <a
                          key={`${activeTool.id}-${option.url}`}
                          href={option.url}
                          target="_blank"
                          rel="noreferrer"
                          style={{
                            padding: '5px 10px',
                            background: '#0891b2',
                            color: 'white',
                            borderRadius: 6,
                            fontSize: 12,
                            fontWeight: 600,
                            textDecoration: 'none',
                            display: 'flex',
                            alignItems: 'center',
                            gap: 4,
                            boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                            transition: 'all 0.2s ease'
                          }}
                          onMouseOver={(e) => e.currentTarget.style.background = '#06b6d4'}
                          onMouseOut={(e) => e.currentTarget.style.background = '#0891b2'}
                        >
                          📄 {option.label}
                        </a>
                      ))}
                      <button
                        type="button"
                        onClick={() => handlePrint(activePdfOptions[0].url)}
                        style={{
                          padding: '5px 10px',
                          background: '#059669',
                          color: 'white',
                          borderRadius: 6,
                          fontSize: 12,
                          fontWeight: 600,
                          border: 'none',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: 4,
                          boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                          transition: 'all 0.2s ease'
                        }}
                        onMouseOver={(e) => e.currentTarget.style.background = '#10b981'}
                        onMouseOut={(e) => e.currentTarget.style.background = '#059669'}
                      >
                        🖶️ Skriv ut
                      </button>
                      <button
                        type="button"
                        onClick={handleCopyHelsenorgeMessage}
                        style={{
                          padding: '5px 10px',
                          background: '#ea580c',
                          color: 'white',
                          borderRadius: 6,
                          fontSize: 12,
                          fontWeight: 600,
                          border: 'none',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: 4,
                          boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                          transition: 'all 0.2s ease'
                        }}
                        onMouseOver={(e) => e.currentTarget.style.background = '#f97316'}
                        onMouseOut={(e) => e.currentTarget.style.background = '#ea580c'}
                      >
                        📋 Helsenorge melding
                      </button>
                    </>
                  )}
                </div>
                <div 
                  style={{ 
                    marginTop: 12,
                    display: 'grid',
                    gridTemplateColumns: 'repeat(4, 1fr)',
                    gap: 12
                  }}
                >
                  {activeTool.questions.map((q, i) => (
                    <div key={q.id} className="question" style={{ fontSize: 13 }}>
                      <strong style={{ fontSize: 13 }}>{i + 1}. {q.text}</strong>
                      <div className="options" style={{ fontSize: 12 }}>
                        {q.options.map((o, oi) => (
                          <label key={o.label} style={{ fontSize: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 6 }}>
                            <span><input type="radio" name={q.id} checked={answers[q.id]?.optionIndex === oi} onChange={() => handleAnswerChange(q.id, o.score, oi)} /> {o.label}</span>
                            <span style={{ fontWeight: 600, color: '#6b7280' }}>{o.score > 0 ? `+${o.score}` : o.score}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
                
                {/* Visual score indicator - always show for scoring tools */}
                {activeTool && (
                  <div style={{ margin: '20px 0' }}>
                    <div
                      ref={scoreBarRef}
                      onPointerDown={handleScoreBarPointerDown}
                      style={{
                        width: '100%',
                        height: '32px',
                        background: isHigherScoreBetter(activeTool.thresholds)
                          ? 'linear-gradient(to right, #f44336 0%, #ff9800 50%, #4caf50 100%)'
                          : 'linear-gradient(to right, #4caf50 0%, #ff9800 50%, #f44336 100%)',
                        borderRadius: '16px',
                        position: 'relative',
                        boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                        cursor: 'pointer',
                        touchAction: 'none'
                      }}>
                      <div style={{
                        position: 'absolute',
                        left: `${scoreSummary ? (scoreSummary.totalScore / scoreSummary.maxScore) * 100 : 0}%`,
                        top: '50%',
                        transform: 'translate(-50%, -50%)',
                        width: '24px',
                        height: '24px',
                        borderRadius: '50%',
                        background: '#ffffff',
                        border: `4px solid ${scoreSummary?.thresholdColor ?? '#9ca3af'}`,
                        boxShadow: '0 3px 8px rgba(0,0,0,0.25)',
                        zIndex: 2,
                        transition: 'all 0.3s ease',
                        cursor: 'grab',
                        pointerEvents: 'none'
                      }} />
                    </div>
                    <div style={{ 
                      display: 'flex', 
                      justifyContent: 'space-between', 
                      marginTop: '8px',
                      fontSize: '13px',
                      color: '#6b7280',
                      fontWeight: 500
                    }}>
                      <span>0</span>
                      <span style={{ fontWeight: 600, color: '#374151' }}>
                        {scoreSummary ? `${scoreSummary.totalScore} / ${scoreSummary.maxScore}` : '0 / 0'}
                      </span>
                      <span>{scoreSummary?.maxScore ?? 0}</span>
                    </div>
                  </div>
                )}
                
                {scoreSummary && activeTool && (
                  <div style={{ marginTop: 12 }}>
                    <div className="summary" style={{ marginTop: 0 }}>
                      <div style={{ fontWeight: 700 }}>Oppsummering</div>
                    
                    {/* Visual score indicator */}
                    <div style={{ margin: '16px 0', display: 'none' }}>
                      <div style={{
                        width: '100%',
                        height: '32px',
                        background: isHigherScoreBetter(activeTool.thresholds)
                          ? 'linear-gradient(to right, #f44336 0%, #ff9800 50%, #4caf50 100%)'
                          : 'linear-gradient(to right, #4caf50 0%, #ff9800 50%, #f44336 100%)',
                        borderRadius: '16px',
                        position: 'relative',
                        boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
                      }}>
                        <div style={{
                          position: 'absolute',
                          left: `${(scoreSummary.totalScore / scoreSummary.maxScore) * 100}%`,
                          top: '50%',
                          transform: 'translate(-50%, -50%)',
                          width: '24px',
                          height: '24px',
                          borderRadius: '50%',
                          background: '#ffffff',
                          border: `4px solid ${scoreSummary.thresholdColor}`,
                          boxShadow: '0 3px 8px rgba(0,0,0,0.25)',
                          zIndex: 2,
                          transition: 'all 0.3s ease'
                        }} />
                      </div>
                      <div style={{ 
                        display: 'flex', 
                        justifyContent: 'space-between', 
                        marginTop: '8px',
                        fontSize: '13px',
                        color: '#6b7280',
                        fontWeight: 500
                      }}>
                        <span>0</span>
                        <span style={{ fontWeight: 600, color: '#374151' }}>
                          {scoreSummary.totalScore} / {scoreSummary.maxScore}
                        </span>
                        <span>{scoreSummary.maxScore}</span>
                      </div>
                    </div>

                      <p>{summaryText}</p>
                      <div className="row" style={{ marginTop: 12 }}>
                        <button type="button" className="button primary" onClick={() => handleCopy(summaryText)}>Kopier totalskår</button>
                        <button type="button" className="button primary" onClick={() => handleCopy(detailedSummaryText)}>Kopier svar og totalskår</button>
                        {((activeTool.advice && activeTool.advice.length > 0) || activeTool.nextStepPlaceholder) && (
                          <button
                            type="button"
                            onClick={() => setShowAdvice(!showAdvice)}
                            style={{
                              padding: '5px 10px',
                              background: showAdvice ? '#0f766e' : '#14b8a6',
                              color: 'white',
                              borderRadius: 6,
                              fontSize: 12,
                              fontWeight: 600,
                              border: 'none',
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              gap: 4,
                              boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                              transition: 'all 0.2s ease'
                            }}
                          >
                            📋 Neste steg
                          </button>
                        )}
                      </div>
                      <span className="badge" style={{ marginTop: 8 }}>{copyState || "Klar til kopiering"}</span>
                      {(!activeTool.advice || activeTool.advice.length === 0) && activeTool.nextStepPlaceholder && showAdvice && (
                        <div style={{
                          marginTop: 16,
                          padding: 16,
                          background: '#ffffff',
                          border: '1px solid #d1d5db',
                          borderLeft: `4px solid ${scoreSummary.thresholdColor}`,
                          borderRadius: 8
                        }}>
                          <div style={{ fontWeight: 700, fontSize: 13, letterSpacing: 0.5, color: '#374151', marginBottom: 10 }}>NESTE STEG</div>
                          <div style={{ fontSize: 13.5, lineHeight: 1.6, color: '#374151' }}>{activeTool.nextStepPlaceholder}</div>
                        </div>
                      )}
                      {activeTool.advice && activeTool.advice.length > 0 && showAdvice && (
                        <div style={{
                          marginTop: 16,
                          padding: 16,
                          background: '#ffffff',
                          border: '1px solid #d1d5db',
                          borderLeft: `4px solid ${scoreSummary.thresholdColor}`,
                          borderRadius: 8
                        }}>
                          <div style={{ fontWeight: 700, fontSize: 13, letterSpacing: 0.5, color: '#374151', marginBottom: 10 }}>NESTE STEG</div>
                          {activeTool.advice.map((group, gi) => (
                            <div key={gi} style={{ marginBottom: gi < activeTool.advice!.length - 1 ? 10 : 0 }}>
                              {group.title && <div style={{ fontWeight: 600, fontSize: 13.5, marginBottom: 4 }}>{group.title}</div>}
                              {group.table && (
                                <div style={{ overflowX: 'auto', marginBottom: group.items.length > 0 ? 8 : 0 }}>
                                  <table style={{ borderCollapse: 'collapse', fontSize: 13.5, minWidth: 260 }}>
                                    <thead>
                                      <tr>
                                        {group.table.headers.map((h, hi) => (
                                          <th key={hi} style={{ textAlign: 'left', padding: '4px 16px 4px 0', borderBottom: '2px solid #e5e7eb', color: '#374151' }}>{h}</th>
                                        ))}
                                      </tr>
                                    </thead>
                                    <tbody>
                                      {group.table.rows.map((row, ri) => (
                                        <tr key={ri}>
                                          {row.map((cell, ci) => (
                                            <td key={ci} style={{ padding: '4px 16px 4px 0', borderBottom: '1px solid #f3f4f6', color: '#374151' }}>{cell}</td>
                                          ))}
                                        </tr>
                                      ))}
                                    </tbody>
                                  </table>
                                </div>
                              )}
                              {group.items.length > 0 && (
                                <ul style={{ margin: 0, paddingLeft: 20 }}>
                                  {group.items.map((item, ii) => (
                                    <li key={ii} style={{ fontSize: 13.5, lineHeight: 1.5, color: '#374151' }}>{item}</li>
                                  ))}
                                </ul>
                              )}
                              {group.links && group.links.length > 0 && (
                                <ul style={{ margin: 0, paddingLeft: 20 }}>
                                  {group.links.map((link, li) => (
                                    <li key={li} style={{ fontSize: 13.5, lineHeight: 1.5 }}>
                                      {link.url ? (
                                        <a href={link.url} target="_blank" rel="noopener noreferrer" style={{ color: '#0f766e', fontWeight: 600 }}>
                                          {link.label}
                                        </a>
                                      ) : link.calcId ? (
                                        <button
                                          type="button"
                                          onClick={() => handleCalcChange(link.calcId!)}
                                          style={{
                                            background: 'none',
                                            border: 'none',
                                            padding: 0,
                                            color: '#0f766e',
                                            fontWeight: 600,
                                            fontSize: 13.5,
                                            cursor: 'pointer',
                                            textDecoration: 'underline'
                                          }}
                                        >
                                          {link.label}
                                        </button>
                                      ) : (
                                        link.label
                                      )}
                                    </li>
                                  ))}
                                </ul>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            ) : activeSpecialCalcTab ? (
              <div>
                <div className="calc-toggle" style={{ marginBottom: 20 }}>
                  {(["date", "med", "tapering", "pregnancy"] as SpecialCalcTab[]).map((tab) => (
                    <button
                      key={tab}
                      type="button"
                      className={`calc-toggle-button ${calcTab === tab ? "active" : ""}`}
                      onClick={() => setCalcTab(tab)}
                    >
                      {specialCalcTabTitle[tab]}
                    </button>
                  ))}
                </div>

                {calcTab === "date" && (
                  <div className="calc-grid calc-grid-single">
                    <section className="calc-card">
                      <div className="calc-card-header">
                        <h3>Datokalkulator</h3>
                        <p>Regn ut datoer frem eller tilbake i tid.</p>
                      </div>
                      <div className="calc-form">
                        <div className="calc-field">
                          <label>Startdato</label>
                          <div className="calc-field-stack">
                            <DatePickerField value={dateCalcStart} onChange={setDateCalcStart} ariaLabel="Velg startdato" />
                          </div>
                        </div>
                        <div className="calc-field">
                          <label>Retning</label>
                          <div className="calc-toggle">
                            <button type="button" className={`calc-toggle-button ${dateCalcDirection === "forward" ? "active" : ""}`} onClick={() => setDateCalcDirection("forward")}>Frem</button>
                            <button type="button" className={`calc-toggle-button ${dateCalcDirection === "backward" ? "active" : ""}`} onClick={() => setDateCalcDirection("backward")}>Tilbake</button>
                          </div>
                        </div>
                        <div className="calc-field">
                          <label>Hurtigvalg</label>
                          <div className="calc-quick">
                            {[
                              { label: "1u", value: 1, unit: "week" },
                              { label: "2u", value: 2, unit: "week" },
                              { label: "3u", value: 3, unit: "week" },
                              { label: "4u", value: 4, unit: "week" },
                              { label: "6u", value: 6, unit: "week" },
                              { label: "8u", value: 8, unit: "week" },
                              { label: "3m", value: 3, unit: "month" }
                            ].map((quick) => (
                              <button
                                key={quick.label}
                                type="button"
                                className="calc-quick-button"
                                onClick={() => {
                                  const unitCode = quick.unit === "week" ? "u" : "m";
                                  setDateCalcInline(`${quick.value}${unitCode}`);
                                }}
                              >
                                {quick.label}
                              </button>
                            ))}
                          </div>
                        </div>
                        <div className="calc-field">
                          <label>En-linje</label>
                          <input
                            type="text"
                            className="calc-input"
                            placeholder="14d, 6u, 3m, 1år"
                            value={dateCalcInline}
                            onChange={(e) => setDateCalcInline(e.target.value)}
                          />
                          <div className="calc-help">Skriv: 14d, 6u, 3m, 1år – eller kombiner som 1m 5d. Bruk +/− for retning.</div>
                          {dateCalcInline.trim() && !dateCalcInlineParsed && (
                            <div className="calc-error">Ugyldig uttrykk. Bruk f.eks. 14d, +3m eller -1år.</div>
                          )}
                          <button
                            type="button"
                            className="button calc-inline-button"
                            onClick={() => {
                              setDateCalcInline("");
                              setDateCalcStart(getTodayIso());
                            }}
                          >
                            Nullstill
                          </button>
                        </div>
                      </div>
                      <div className="calc-output">
                        <div className="calc-output-title">Resultat</div>
                        <div className="calc-output-main">
                          {dateCalcResult ? dateCalcResult.dateText : "Angi verdier for å se resultat."}
                        </div>
                        {dateCalcResult && (
                          <div className="calc-output-meta">
                            <span>{dateCalcResult.weekday}</span>
                            <span>Uke {dateCalcResult.weekNumber}</span>
                            <span>{`${dateCalcResult.dayDiff >= 0 ? "+" : ""}${dateCalcResult.dayDiff} dager`}</span>
                          </div>
                        )}
                        <div className="calc-output-actions">
                          <button type="button" className="button primary" disabled={!dateCalcResult} onClick={handleCopySpecialCalculatorText}>Kopier</button>
                          <span className="badge">{copyState || "Klar til kopiering"}</span>
                        </div>
                      </div>
                    </section>
                  </div>
                )}

                {calcTab === "med" && (
                  <div className="calc-grid calc-grid-single">
                    <section className="calc-card">
                      <div className="calc-card-header">
                        <h3>Legemiddelberegner</h3>
                        <p>Nyttige utregninger i forbindelse med legemiddelutskrivelse.</p>
                      </div>
                      <div className="calc-subgrid">
                        <div className="calc-subcard">
                          <div className="calc-subtitle">Reseptvarighet</div>
                          <div className="calc-subdescription">Regn ut hvor lenge resepten varer med anbefalt bruk</div>
                          <div className="calc-form">
                            <div className="calc-field">
                              <label>Utleveringsdato</label>
                              <div className="calc-field-stack">
                                <DatePickerField value={medStartDate} onChange={setMedStartDate} ariaLabel="Velg dato utlevert" />
                              </div>
                            </div>
                            <div className="calc-field">
                              <label>Antall tabletter foreskrevet</label>
                              <div data-med-units-picker="true" style={{ position: "relative" }}>
                                <input
                                  type="text"
                                  inputMode="numeric"
                                  className="calc-input"
                                  value={medUnits}
                                  onChange={(e) => setMedUnits(e.target.value)}
                                  onFocus={(e) => e.currentTarget.select()}
                                  onClick={(e) => e.currentTarget.select()}
                                  style={{ paddingRight: 40 }}
                                />
                                <button
                                  type="button"
                                  aria-label="Vis forslag til antall tabletter"
                                  onClick={() => setShowMedUnitsPicker((prev) => !prev)}
                                  style={{ position: "absolute", right: 8, top: "50%", transform: "translateY(-50%)", border: "none", background: "transparent", color: "#6b7280", fontSize: 14, cursor: "pointer", padding: "4px 6px", lineHeight: 1 }}
                                >
                                  ▾
                                </button>
                                {showMedUnitsPicker && (
                                  <div style={{ position: "absolute", top: "calc(100% + 6px)", left: 0, right: 0, border: "1px solid rgba(221, 227, 238, 0.9)", borderRadius: 10, background: "#ffffff", boxShadow: "0 10px 20px rgba(15, 23, 42, 0.12)", padding: 6, display: "grid", gap: 4, zIndex: 15 }}>
                                    {["5", "10", "15", "20", "25", "50", "100"].map((option) => (
                                      <button
                                        key={option}
                                        type="button"
                                        onMouseDown={(e) => e.preventDefault()}
                                        onClick={() => { setMedUnits(option); setShowMedUnitsPicker(false); }}
                                        style={{ border: "none", background: medUnits === option ? "#f3f4f6" : "transparent", borderRadius: 8, padding: "8px 10px", textAlign: "left", cursor: "pointer", fontSize: 14, color: "#111827" }}
                                      >
                                        {option}
                                      </button>
                                    ))}
                                  </div>
                                )}
                              </div>
                            </div>
                            <div className="calc-field">
                              <label>Dosering (antall tabletter per dag)</label>
                              <input type="text" inputMode="decimal" className="calc-input" value={medDosePerDay} onChange={(e) => setMedDosePerDay(e.target.value)} onFocus={(e) => e.currentTarget.select()} onClick={(e) => e.currentTarget.select()} />
                            </div>
                          </div>
                          <div className="calc-output">
                            <div className="calc-output-title">Resultat</div>
                            <div className="calc-output-main">
                              {medDurationResult ? `Skal minst vare til: ${medDurationResult.endDateText} (Uke ${isoWeekNumber(medDurationResult.endDate)} ${medDurationResult.endDate.getUTCFullYear()})` : "Angi verdier for å se resultat."}
                            </div>
                            {medDurationResult && (
                              <div className="calc-output-meta">
                                <span>Varighet: {medDurationResult.durationDays} dager</span>
                              </div>
                            )}
                            <div className="calc-field">
                              <label className="pregnancy-checkbox-label">
                                <input
                                  type="checkbox"
                                  checked={copyToJournal}
                                  onChange={(e) => { const checked = e.target.checked; setCopyToJournal(checked); if (checked) setGeneratePatientMessage(false); }}
                                />
                                Kopier til journal.
                              </label>
                            </div>
                            <div className="calc-field">
                              <label className="pregnancy-checkbox-label">
                                <input
                                  type="checkbox"
                                  checked={generatePatientMessage}
                                  onChange={(e) => { const checked = e.target.checked; setGeneratePatientMessage(checked); if (checked) setCopyToJournal(false); }}
                                />
                                Generer melding til pasient.
                              </label>
                            </div>
                            <div className="calc-output-actions">
                              <button type="button" className="button primary" disabled={!medDurationResult} onClick={handleCopySpecialCalculatorText}>Kopier</button>
                              <span className="badge">{copyState || "Klar til kopiering"}</span>
                            </div>
                          </div>
                        </div>

                        <div className="calc-subcard">
                          <div className="calc-subtitle">Gjennomsnittsforbruk</div>
                          <div className="calc-subdescription">Regn ut gjennomsnittforbruk av legemiddel mellom to datoer</div>
                          <div className="calc-form">
                            <div className="calc-field">
                              <label>Dato</label>
                              <div className="calc-field-stack">
                                <DatePickerField value={avgPrevDate} onChange={setAvgPrevDate} ariaLabel="Velg forrige uthentingsdato" />
                              </div>
                            </div>
                            <div className="calc-field">
                              <label>Antall tabletter foreskrevet</label>
                              <div data-avg-units-picker="true" style={{ position: "relative" }}>
                                <input
                                  type="text"
                                  inputMode="numeric"
                                  className="calc-input"
                                  value={avgPrevUnits}
                                  onChange={(e) => setAvgPrevUnits(e.target.value)}
                                  onFocus={(e) => e.currentTarget.select()}
                                  onClick={(e) => e.currentTarget.select()}
                                  placeholder="Antall tabletter"
                                  style={{ paddingRight: 40 }}
                                />
                                <button
                                  type="button"
                                  aria-label="Vis forslag til antall tabletter"
                                  onClick={() => setShowAvgUnitsPicker((prev) => !prev)}
                                  style={{ position: "absolute", right: 8, top: "50%", transform: "translateY(-50%)", border: "none", background: "transparent", color: "#6b7280", fontSize: 14, cursor: "pointer", padding: "4px 6px", lineHeight: 1 }}
                                >
                                  ▾
                                </button>
                                {showAvgUnitsPicker && (
                                  <div style={{ position: "absolute", top: "calc(100% + 6px)", left: 0, right: 0, border: "1px solid rgba(221, 227, 238, 0.9)", borderRadius: 10, background: "#ffffff", boxShadow: "0 10px 20px rgba(15, 23, 42, 0.12)", padding: 6, display: "grid", gap: 4, zIndex: 15 }}>
                                    {["5", "10", "15", "20", "25", "50", "100"].map((option) => (
                                      <button
                                        key={option}
                                        type="button"
                                        onMouseDown={(e) => e.preventDefault()}
                                        onClick={() => { setAvgPrevUnits(option); setShowAvgUnitsPicker(false); }}
                                        style={{ border: "none", background: avgPrevUnits === option ? "#f3f4f6" : "transparent", borderRadius: 8, padding: "8px 10px", textAlign: "left", cursor: "pointer", fontSize: 14, color: "#111827" }}
                                      >
                                        {option}
                                      </button>
                                    ))}
                                  </div>
                                )}
                              </div>
                            </div>
                            <div className="calc-field">
                              <label>Neste uthenting</label>
                              <div className="calc-field-stack">
                                <DatePickerField value={avgNextDate} onChange={setAvgNextDate} ariaLabel="Velg neste uthentingsdato" />
                              </div>
                            </div>
                          </div>
                          <div className="calc-output">
                            <div className="calc-output-title">Resultat</div>
                            {avgUsageResult && "error" in avgUsageResult ? (
                              <div className="calc-error">{avgUsageResult.error}</div>
                            ) : (
                              <div className="calc-output-main">
                                {avgUsageResult ? `Snittforbruk: ${avgUsageResult.daily.toFixed(1)} enheter/dag` : "Angi verdier for å se resultat."}
                              </div>
                            )}
                            <div className="calc-output-actions">
                              <button
                                type="button"
                                className="button primary"
                                disabled={!avgUsageResult || "error" in avgUsageResult}
                                onClick={() => {
                                  if (!avgUsageResult || "error" in avgUsageResult) return;
                                  handleCopy(`Snittforbruk: ${avgUsageResult.daily.toFixed(1)} enheter/dag.`);
                                }}
                              >
                                Kopier
                              </button>
                              <span className="badge">{copyState || "Klar til kopiering"}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </section>
                  </div>
                )}

                {calcTab === "tapering" && (
                  <div className="calc-grid calc-grid-single">
                    <section className="calc-card">
                      <div className="calc-card-header">
                        <h3>Nedtrappingsplan</h3>
                        <p>Regn ut gjennomsnittforbruk av legemiddel mellom to uttak.</p>
                      </div>
                      <div className="calc-form">
                        <div className="calc-field">
                          <label>Forrige uttak</label>
                          <div className="calc-field-stack">
                            <DatePickerField value={avgPrevDate} onChange={setAvgPrevDate} ariaLabel="Velg dato for forrige uttak" />
                          </div>
                        </div>
                        <div className="calc-field">
                          <label>Neste uttak</label>
                          <div className="calc-field-stack">
                            <DatePickerField value={avgNextDate} onChange={setAvgNextDate} ariaLabel="Velg dato for neste uttak" />
                          </div>
                        </div>
                        <div className="calc-field">
                          <label>Forrige antall enheter</label>
                          <input type="text" inputMode="numeric" className="calc-input" value={avgPrevUnits} onChange={(e) => setAvgPrevUnits(e.target.value)} placeholder="f.eks. 100" />
                        </div>
                      </div>
                      <div className="calc-output">
                        <div className="calc-output-title">Resultat</div>
                        {avgUsageResult && "error" in avgUsageResult ? (
                          <div className="calc-error">{avgUsageResult.error}</div>
                        ) : (
                          <div className="calc-output-main">
                            {avgUsageResult ? `Gjennomsnittlig daglig forbruk: ${avgUsageResult.daily.toFixed(2)}` : "Angi verdier for å se resultat."}
                          </div>
                        )}
                        {avgUsageResult && !("error" in avgUsageResult) && (
                          <div className="calc-output-meta">
                            <span>Antall dager mellom uttak: {avgUsageResult.daySpan}</span>
                          </div>
                        )}
                        <div className="calc-output-actions">
                          <button type="button" className="button primary" disabled={!avgUsageResult || "error" in avgUsageResult} onClick={handleCopySpecialCalculatorText}>Kopier resultat</button>
                          <span className="badge">{copyState || "Klar til kopiering"}</span>
                        </div>
                      </div>
                    </section>
                  </div>
                )}

                {calcTab === "pregnancy" && (
                  <div className="calc-grid">
                    <section className="calc-card">
                      <div className="calc-card-header">
                        <h3>Svangerskapskalkulator</h3>
                        <p>Enkel beregning av termin, svangerskapsalder og sannsynlig befruktning.</p>
                      </div>
                      <div className="calc-form">
                        <div className="calc-field">
                          <label>Første dag i siste menstruasjon</label>
                          <div className="calc-field-stack">
                            <DatePickerField value={pregnancyDate} onChange={setPregnancyDate} ariaLabel="Velg første dag i siste menstruasjon" />
                            <button type="button" className="button calc-inline-button" onClick={() => setPregnancyDate(getTodayIso())}>I dag</button>
                          </div>
                        </div>
                      </div>
                      {pregnancyResult && (
                        <div className="calc-output">
                          <div className="calc-output-title">Resultat</div>
                          <div className="calc-output-main">Beregnet termindato: {pregnancyResult.eddText}</div>
                          <div className="calc-output-meta" style={{ display: "grid", gap: 6 }}>
                            <span>Svangerskapsuke i dag: {pregnancyResult.gestationalAgeText}</span>
                            <span>Tid igjen til termindato: {pregnancyResult.timeToDueDateText}</span>
                            <span>Sannsynlig befruktningsdato: {pregnancyResult.conceptionText}</span>
                          </div>
                        </div>
                      )}
                    </section>

                    <section className="calc-card">
                      <div className="calc-card-header">
                        <h3>Henvisning ved første svangerskapskonsultasjon</h3>
                      </div>
                      <p className="pregnancy-referral-help"><em>Nedenfor er tekstbokser som hjelper deg å skrive en henvisning du enkelt limer inn i journalsystemet. Bokser du ikke fyller ut, blir ikke med på henvisningen.</em></p>
                      <div className="calc-form">
                        <div className="calc-field">
                          <label>Para</label>
                          <select className="calc-select" value={pregnancyPara} onChange={(e) => setPregnancyPara(e.target.value)}>
                            <option value="">Velg para</option>
                            {[0, 1, 2, 3, 4, 5, 6].map((value) => (
                              <option key={value} value={String(value)}>{value}</option>
                            ))}
                          </select>
                        </div>
                        <div className="calc-field">
                          <label>LMP</label>
                          <input type="text" className="calc-input" value={pregnancyResult ? formatNorwegianDate(pregnancyResult.lmpDate) : ""} readOnly placeholder="Autofylles fra kalkulator" />
                        </div>
                        <div className="calc-field">
                          <label>Termin beregnet fra LMP</label>
                          <input type="text" className="calc-input" value={pregnancyResult ? formatNorwegianDate(pregnancyResult.eddDate) : ""} readOnly placeholder="Autofylles fra kalkulator" />
                        </div>
                        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: 10 }}>
                          <div className="calc-field" style={{ margin: 0 }}>
                            <label>Vekt (kg)</label>
                            <input type="text" inputMode="decimal" className="calc-input" value={pregnancyWeightKg} onChange={(e) => setPregnancyWeightKg(e.target.value)} placeholder="Velg eller skriv vekt" />
                          </div>
                          <div className="calc-field" style={{ margin: 0 }}>
                            <label>Høyde (cm)</label>
                            <input type="text" inputMode="decimal" className="calc-input" value={pregnancyHeightCm} onChange={(e) => setPregnancyHeightCm(e.target.value)} placeholder="Velg eller skriv høyde" />
                          </div>
                          <div className="calc-field" style={{ margin: 0 }}>
                            <label>BMI</label>
                            <input type="text" className="calc-input" value={pregnancyBmi !== null ? pregnancyBmi.toFixed(1) : ""} readOnly placeholder="BMI" />
                          </div>
                        </div>
                        <div className="calc-field">
                          <label>Sykehistorie</label>
                          <textarea className="calc-input pregnancy-textarea" rows={1} value={pregnancyMedicalHistory} onChange={(e) => setPregnancyMedicalHistory(e.target.value)} placeholder="Beskriv relevant sykehistorie" />
                        </div>
                        <div className="calc-field">
                          <label>Psykisk</label>
                          <textarea className="calc-input pregnancy-textarea" rows={1} value={pregnancyMentalHealth} onChange={(e) => setPregnancyMentalHealth(e.target.value)} placeholder="Risiko for psykisk uhelse" />
                        </div>
                        <div className="calc-field">
                          <label>Medisiner</label>
                          <textarea className="calc-input pregnancy-textarea" rows={1} value={pregnancyMedications} onChange={(e) => setPregnancyMedications(e.target.value)} placeholder="Spesielt relevante medisiner? Medisinliste følger også med EPJ-henvisningen" />
                        </div>
                        <div className="calc-field">
                          <label>Andre spesielle forhold som bør bemerkes?</label>
                          <textarea className="calc-input pregnancy-textarea" rows={1} value={pregnancyOtherConditions} onChange={(e) => setPregnancyOtherConditions(e.target.value)} placeholder="F.eks tidligere vanskelige fødsler." />
                        </div>
                        <div className="calc-field pregnancy-risk-row">
                          <label className="pregnancy-checkbox-label">
                            <input type="checkbox" checked={pregnancyRiskPregnancy} onChange={(e) => setPregnancyRiskPregnancy(e.target.checked)} />
                            Risikosvangerskap?
                          </label>
                          <details className="pregnancy-risk-details">
                            <summary>Risikofaktorer for preeklampsi (Helsedirektoratet)</summary>
                            <div className="pregnancy-risk-content">
                              <p>Gravide med disse risikofaktorene bør følges nøye for utvikling av preeklampsi</p>
                              <p>- alder over 40 år</p>
                              <p>- antifosfolipidsyndromer (positiv lupus antikoagulant og/eller cardiolipin antistoff og klinisk anamnese)</p>
                              <p>- bindevevssykdommer (spesielt systemisk lupus erythematosis, SLE)</p>
                              <p>- diabetes mellitus, også svangerskapsdiabetes</p>
                              <p>- flerlingsvangerskap</p>
                              <p>- kronisk hypertensjon</p>
                              <p>- kroppsmasseindeks (KMI) over 35</p>
                              <p>- nyresykdom</p>
                              <p>- tidligere gjennomgått preeklampsi (spesielt dersom oppstått mindre enn 34 uker), HELLP-syndrom (H = hemolyse, EL = elevated liver enzymes, LP = low platelets) eller eklampsi</p>
                              <p>- morkakesvikt (vekstretardert foster)</p>
                              <p style={{ marginTop: 12 }}>Mindre alvorlig risikofaktorer</p>
                              <p>- førstegangsfødende</p>
                              <p>- familiehistorie med mor eller søster som har hatt preeklampsi</p>
                              <p>- graviditetsintervall mer enn 10 år</p>
                              <a
                                href="https://www.helsedirektoratet.no/retningslinjer/svangerskapsomsorgen/preeklampsi#risikofaktorer-for-preeklampsi-hos-gravide-bor-vurderes-pa-forste-svangerskapskonsultasjon-praktisk-informasjon"
                                target="_blank"
                                rel="noreferrer"
                              >
                                Helsedirektoratet: preeklampsi – risikofaktorer
                              </a>
                            </div>
                          </details>
                        </div>
                      </div>
                      <div className="calc-output">
                        <div className="calc-output-title">Ferdig henvisningstekst</div>
                        <pre className="pregnancy-referral-preview">{pregnancyReferralText}</pre>
                        <div className="calc-output-actions">
                          <button type="button" className="button primary" onClick={handleCopySpecialCalculatorText}>Kopier</button>
                          <span className="badge">{copyState || "Klar til kopiering"}</span>
                        </div>
                      </div>
                    </section>
                  </div>
                )}
              </div>
            ) : activeCalc ? (
              <div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <h2 style={{ margin: 0, fontSize: 20 }}>{activeCalc.name}</h2>
                    {activeCalc.indication && (
                      <HeadingToggleButton active={showIndication} onClick={handleToggleIndication} label="🎯 Indikasjon" />
                    )}
                    {activeCalc.aboutTest && (
                      <HeadingToggleButton active={showAboutTest} onClick={handleToggleAboutTest} label="ℹ️ Om testen" />
                    )}
                    {activeCalc.id === "doak-dosing" && (
                      <button
                        type="button"
                        onClick={handleToggleClinicalTip}
                        style={{
                          padding: '6px 12px',
                          background: showClinicalTip ? '#0f766e' : '#14b8a6',
                          color: 'white',
                          borderRadius: 6,
                          fontSize: 12,
                          fontWeight: 600,
                          border: 'none',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: 4,
                          boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                          transition: 'all 0.2s ease'
                        }}
                      >
                        💡 Klinisk tips
                      </button>
                    )}
                    {activeCalc.id === "cpeptide-glucose" && (
                      <button
                        type="button"
                        onClick={handleToggleCPeptideInfo}
                        style={{
                          padding: '6px 12px',
                          background: showCPeptideInfo ? '#0f766e' : '#14b8a6',
                          color: 'white',
                          borderRadius: 6,
                          fontSize: 12,
                          fontWeight: 600,
                          border: 'none',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: 4,
                          boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                          transition: 'all 0.2s ease'
                        }}
                      >
                        ℹ️ Om C-peptid
                      </button>
                    )}
                    {activeCalc.id === "cpeptide-glucose" && (
                      <button
                        type="button"
                        onClick={handleToggleCPeptideExamples}
                        style={{
                          padding: '6px 12px',
                          background: showCPeptideExamples ? '#0f766e' : '#14b8a6',
                          color: 'white',
                          borderRadius: 6,
                          fontSize: 12,
                          fontWeight: 600,
                          border: 'none',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: 4,
                          boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                          transition: 'all 0.2s ease'
                        }}
                      >
                        📋 Eksempler
                      </button>
                    )}
                  </div>
                </div>
                {activeCalc.indication && showIndication && (
                  <HeadingInfoBox>{activeCalc.indication}</HeadingInfoBox>
                )}
                {activeCalc.aboutTest && showAboutTest && (
                  <HeadingInfoBox>{activeCalc.aboutTest}</HeadingInfoBox>
                )}
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                  {activePdfOptions.length > 0 && (
                    <>
                      {activePdfOptions.map((option) => (
                        <a
                          key={`${activeCalc.id}-${option.url}`}
                          href={option.url}
                          target="_blank"
                          rel="noreferrer"
                          style={{
                            padding: '5px 10px',
                            background: '#0891b2',
                            color: 'white',
                            borderRadius: 6,
                            fontSize: 12,
                            fontWeight: 600,
                            textDecoration: 'none',
                            display: 'flex',
                            alignItems: 'center',
                            gap: 4,
                            boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                            transition: 'all 0.2s ease'
                          }}
                          onMouseOver={(e) => e.currentTarget.style.background = '#06b6d4'}
                          onMouseOut={(e) => e.currentTarget.style.background = '#0891b2'}
                        >
                          📄 {option.label}
                        </a>
                      ))}
                      <button
                        type="button"
                        onClick={() => handlePrint(activePdfOptions[0].url)}
                        style={{
                          padding: '5px 10px',
                          background: '#059669',
                          color: 'white',
                          borderRadius: 6,
                          fontSize: 12,
                          fontWeight: 600,
                          border: 'none',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: 4,
                          boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                          transition: 'all 0.2s ease'
                        }}
                        onMouseOver={(e) => e.currentTarget.style.background = '#10b981'}
                        onMouseOut={(e) => e.currentTarget.style.background = '#059669'}
                      >
                        🖶️ Skriv ut
                      </button>
                      <button
                        type="button"
                        onClick={handleCopyHelsenorgeMessage}
                        style={{
                          padding: '5px 10px',
                          background: '#ea580c',
                          color: 'white',
                          borderRadius: 6,
                          fontSize: 12,
                          fontWeight: 600,
                          border: 'none',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: 4,
                          boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                          transition: 'all 0.2s ease'
                        }}
                        onMouseOver={(e) => e.currentTarget.style.background = '#f97316'}
                        onMouseOut={(e) => e.currentTarget.style.background = '#ea580c'}
                      >
                        📋 Helsenorge melding
                      </button>
                    </>
                  )}
                </div>
                {activeCalc.id === "doak-dosing" && showClinicalTip && (
                  <div style={{
                    padding: 12,
                    background: '#e7f7f4',
                    borderRadius: 6,
                    marginBottom: 12,
                    fontSize: 13,
                    color: '#0f172a',
                    borderLeft: '3px solid #0f766e'
                  }}>
                    <strong>Klinisk tips:</strong> Apixaban og Dabigatran doseres to ganger daglig og har lavere blødningsrisiko enn Edoxaban og Rivaroxaban som doseres en gang daglig.
                  </div>
                )}
                {activeCalc.id === "cpeptide-glucose" && showCPeptideInfo && (
                  <div style={{
                    padding: 12,
                    background: '#e7f7f4',
                    borderRadius: 6,
                    marginBottom: 12,
                    fontSize: 13,
                    lineHeight: 1.5,
                    color: '#0f172a',
                    borderLeft: '3px solid #0f766e'
                  }}>
                    C-peptid dannes når proinsulin spaltes til insulin, og skilles ut i blodet i like store mengder. Fordi C-peptid har lengre halveringstid (20–30 min) enn insulin (5–8 min) og ikke fjernes av leveren ved første passasje, gir det et mer stabilt mål på endogen insulinproduksjon enn insulin målt direkte. Brukes til å vurdere betacellefunksjon, skille type 1 fra type 2 diabetes, og avgjøre behov for insulinbehandling.
                    <br />
                    Obs! Nivået påvirkes av nyrefunksjon, da C-peptid elimineres renalt.
                  </div>
                )}
                {activeCalc.id === "cpeptide-glucose" && showCPeptideExamples && (
                  <div style={{
                    padding: 12,
                    background: '#e7f7f4',
                    borderRadius: 6,
                    marginBottom: 12,
                    fontSize: 13,
                    lineHeight: 1.5,
                    color: '#0f172a',
                    borderLeft: '3px solid #0f766e'
                  }}>
                    <strong>Type 1 diabetes:</strong> lav C-peptid (ofte tross normal/høy glukose), fordi autoimmun betacelledestruksjon gir manglende egenproduksjon.
                    <br />
                    <strong>Type 2 diabetes:</strong> normal eller høy C-peptid, spesielt tidlig i forløpet, fordi betacellene fortsatt produserer insulin (ofte med samtidig insulinresistens). Ved lang sykdomsvarighet kan C-peptid gradvis falle etter hvert som betacellefunksjonen svekkes.
                    <br />
                    <strong>Insulin-krevende diabetes:</strong> Lav C-peptid tross normal/høy glukose (sviktende egenproduksjon).
                    <br />
                    <strong>Insulinom:</strong> Høy C-peptid tross lav glukose (uhensiktsmessig, ikke-supprimert insulinsekresjon).
                  </div>
                )}
                <div style={{ maxWidth: activeCalc.layout === "horizontal" ? 1200 : 700, margin: '20px 0' }}>
                {activeCalc.id === 'homa-ir' ? (
                  <HomaIrFields calcInputs={calcInputs} onChange={handleInputChange} />
                ) : activeCalc.id === 'cpeptide-glucose' ? (
                  <CPeptideGlucoseFields calcInputs={calcInputs} onChange={handleInputChange} />
                ) : activeCalc.fields.map((f, idx) => {
                  const isYesNo = f.options?.length === 2 && f.options[0] === "Nei" && f.options[1] === "Ja";
                  const isVerticalSelect = activeCalc.layout === "vertical-select";
                  const isHorizontalLayout = activeCalc.layout === "horizontal";
                  const prevPart = idx > 0 ? activeCalc.fields[idx - 1].part : undefined;
                  const showPartHeader = f.part && f.part !== prevPart;
                  
                  return (
                    <div key={f.id}>
                      {showPartHeader && (
                        <div style={{ 
                          marginTop: idx > 0 ? 30 : 10,
                          marginBottom: 16,
                          paddingBottom: 8,
                          borderBottom: '2px solid #e5e7eb'
                        }}>
                          <h3 style={{ 
                            fontSize: 16, 
                            fontWeight: 600, 
                            color: '#0891b2',
                            margin: 0
                          }}>{f.part}</h3>
                        </div>
                      )}
                      <div className="calc-field-row" style={isVerticalSelect || isHorizontalLayout ? { flexDirection: 'column', alignItems: 'flex-start', gap: 10, paddingBottom: 16 } : {}}>
                      <label style={{ fontWeight: 500, fontSize: 13 }}>{f.label}</label>
                      {f.type === "number" ? (
                        <input className="calc-number-input" type="number" min={f.min} max={f.max} step={f.step ?? 1} value={calcInputs[f.id] ?? ""} onChange={e => handleInputChange(f.id, e.target.value)} />
                      ) : isVerticalSelect ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, width: '100%' }}>
                          {f.options?.map((option, idx) => {
                            const isActive = calcInputs[f.id] === option;
                            return (
                              <button
                                key={option}
                                type="button"
                                onClick={() => handleInputChange(f.id, option)}
                                style={{
                                  padding: '10px 14px',
                                  border: isActive ? '2px solid #0891b2' : '1px solid #e0e0e0',
                                  background: isActive ? '#ecfeff' : '#ffffff',
                                  color: '#000000',
                                  fontWeight: isActive ? 600 : 400,
                                  borderRadius: 8,
                                  cursor: 'pointer',
                                  fontSize: 13,
                                  textAlign: 'left',
                                  transition: 'all 0.2s ease',
                                  boxShadow: isActive ? '0 2px 8px rgba(8, 145, 178, 0.15)' : 'none'
                                }}
                              >
                                {option}
                              </button>
                            );
                          })}
                        </div>
                      ) : isHorizontalLayout ? (
                        <div style={{ 
                          display: 'flex', 
                          flexWrap: 'nowrap',
                          gap: 8, 
                          width: '100%',
                          overflowX: 'auto',
                          paddingBottom: 8
                        }}>
                          {f.options?.map((option, idx) => {
                            const isActive = calcInputs[f.id] === option;
                            return (
                              <button
                                key={option}
                                type="button"
                                onClick={() => handleInputChange(f.id, option)}
                                style={{
                                  padding: '8px 12px',
                                  border: isActive ? '2px solid #0891b2' : '1px solid #d0d0d0',
                                  background: isActive ? '#0891b2' : '#ffffff',
                                  color: isActive ? '#ffffff' : '#333333',
                                  fontWeight: isActive ? 600 : 400,
                                  borderRadius: 6,
                                  cursor: 'pointer',
                                  fontSize: 12,
                                  textAlign: 'center',
                                  transition: 'all 0.2s ease',
                                  boxShadow: isActive ? '0 2px 8px rgba(8, 145, 178, 0.25)' : 'none',
                                  flex: '1 1 auto',
                                  minWidth: 'fit-content',
                                  whiteSpace: 'nowrap'
                                }}
                              >
                                {option}
                              </button>
                            );
                          })}
                        </div>
                      ) : isYesNo ? (
                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                          <div style={{
                            display: 'inline-flex',
                            backgroundColor: '#e8e8ed',
                            borderRadius: 9,
                            padding: 2,
                            position: 'relative'
                          }}>
                            {f.options?.map(option => {
                              const currentValue = calcInputs[f.id] || "Nei";
                              const isActive = currentValue === option;
                              const isYes = option === "Ja";
                              const activeColor = isYes ? '#4caf50' : '#ef5350';
                              return (
                                <button
                                  key={option}
                                  type="button"
                                  onClick={() => handleInputChange(f.id, option)}
                                  style={{
                                    padding: '6px 16px',
                                    border: 'none',
                                    background: isActive ? activeColor : 'transparent',
                                    color: isActive ? '#ffffff' : '#3c3c43',
                                    fontWeight: isActive ? 600 : 400,
                                    borderRadius: 7,
                                    cursor: 'pointer',
                                    fontSize: 14,
                                    transition: 'all 0.2s ease',
                                    boxShadow: isActive ? '0 2px 4px rgba(0,0,0,0.18), 0 1px 2px rgba(0,0,0,0.12)' : 'none',
                                    minWidth: 60
                                  }}
                                >
                                  {option}
                                </button>
                              );
                            })}
                          </div>
                          {(() => {
                            const yesIndex = f.options?.indexOf("Ja") ?? -1;
                            if (yesIndex === -1) return null;
                            const points = getFieldOptionScore(f, "Ja", yesIndex);
                            if (!points) return null;
                            return (
                              <span style={{ fontSize: 12.5, fontWeight: 600, color: points > 0 ? '#16a34a' : '#dc2626' }}>
                                {points > 0 ? `+${points}p` : `${points}p`}
                              </span>
                            );
                          })()}
                        </div>
                      ) : (
                        <ComboBox 
                          value={calcInputs[f.id] ?? ""}
                          options={f.options || []}
                          onChange={(val) => handleInputChange(f.id, val)}
                          placeholder="Velg eller skriv..."
                        />
                      )}
                    </div>
                    </div>
                  );
                })}
                </div>
                
                {/* Reset button */}
                {activeCalc && (
                  <div style={{ margin: '20px 0', maxWidth: 700, display: 'flex', justifyContent: 'center' }}>
                    <button
                      type="button"
                      onClick={() => { setCalcInputs({}); setManualCalcScore(null); }}
                      style={{
                        padding: '10px 24px',
                        background: '#6b7280',
                        color: '#ffffff',
                        border: 'none',
                        borderRadius: 8,
                        cursor: 'pointer',
                        fontSize: 14,
                        fontWeight: 600,
                        transition: 'all 0.2s ease',
                        boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.background = '#4b5563'}
                      onMouseLeave={(e) => e.currentTarget.style.background = '#6b7280'}
                    >
                      Nullstill
                    </button>
                  </div>
                )}
                
                {/* Visual score indicator for calculators - always show when thresholds exist (except BMI) */}
                {activeCalc && activeCalc.thresholds && activeCalc.thresholds.length > 0 && activeCalc.id !== 'bmi' && (
                  <div style={{ margin: '20px 0', maxWidth: 700 }}>
                    <div
                      ref={calcScoreBarIsDraggable ? calcScoreBarRef : undefined}
                      onPointerDown={calcScoreBarIsDraggable ? handleCalcScoreBarPointerDown : undefined}
                      style={{
                        width: '100%',
                        height: '32px',
                        background: isHigherScoreBetter(activeCalc.thresholds)
                          ? 'linear-gradient(to right, #f44336 0%, #ff9800 50%, #4caf50 100%)'
                          : 'linear-gradient(to right, #4caf50 0%, #ff9800 50%, #f44336 100%)',
                        borderRadius: '16px',
                        position: 'relative',
                        boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                        cursor: calcScoreBarIsDraggable ? 'pointer' : 'default',
                        touchAction: calcScoreBarIsDraggable ? 'none' : 'auto'
                      }}>
                      <div style={{
                        position: 'absolute',
                        left: `${calcScorePercent}%`,
                        top: '50%',
                        transform: 'translate(-50%, -50%)',
                        width: '24px',
                        height: '24px',
                        borderRadius: '50%',
                        background: '#ffffff',
                        border: `4px solid ${calcResult?.color ?? '#9ca3af'}`,
                        boxShadow: '0 3px 8px rgba(0,0,0,0.25)',
                        zIndex: 2,
                        transition: 'all 0.3s ease',
                        cursor: calcScoreBarIsDraggable ? 'grab' : 'default',
                        pointerEvents: 'none'
                      }} />
                    </div>
                    <div style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      marginTop: '8px',
                      fontSize: '13px',
                      color: '#6b7280',
                      fontWeight: 500
                    }}>
                      <span>0</span>
                      <span style={{ fontWeight: 600, color: '#374151' }}>
                        {calcResult && calcResult.maxScore ? `${calcScoreDisplay} / ${calcResult.maxScore}` : `0 / ${calcMaxScore}`}
                      </span>
                      <span>{calcResult?.maxScore ?? calcMaxScore}</span>
                    </div>
                    {calcScoreBarIsDraggable && (
                      <div style={{ marginTop: 6, fontSize: 12, color: '#9ca3af' }}>
                        Dra markøren for å sette resultatet direkte, uten å fylle ut alle feltene.
                      </div>
                    )}
                  </div>
                )}
                
                {activeCalc && (
                  <div className="summary" style={{ borderColor: calcResult?.color ?? '#d1d5db', marginTop: 20, maxWidth: 700 }}>
                    <div style={{ fontWeight: 700, color: calcResult?.color ?? '#6b7280' }}>Resultat</div>

                    {/* Visual score indicator for calculators */}
                    {calcResult?.maxScore && (
                      <div style={{ margin: '16px 0', display: 'none' }}>
                        <div style={{
                          width: '100%',
                          height: '32px',
                          background: isHigherScoreBetter(activeCalc.thresholds)
                            ? 'linear-gradient(to right, #f44336 0%, #ff9800 50%, #4caf50 100%)'
                            : 'linear-gradient(to right, #4caf50 0%, #ff9800 50%, #f44336 100%)',
                          borderRadius: '16px',
                          position: 'relative',
                          boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
                        }}>
                          <div style={{
                            position: 'absolute',
                            left: `${(calcResult.score / calcResult.maxScore) * 100}%`,
                            top: '50%',
                            transform: 'translate(-50%, -50%)',
                            width: '24px',
                            height: '24px',
                            borderRadius: '50%',
                            background: '#ffffff',
                            border: `4px solid ${calcResult.color}`,
                            boxShadow: '0 3px 8px rgba(0,0,0,0.25)',
                            zIndex: 2,
                            transition: 'all 0.3s ease'
                          }} />
                        </div>
                        <div style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          marginTop: '8px',
                          fontSize: '13px',
                          color: '#6b7280',
                          fontWeight: 500
                        }}>
                          <span>0</span>
                          <span style={{ fontWeight: 600, color: '#374151' }}>
                            {calcResult.score} / {calcResult.maxScore}
                          </span>
                          <span>{calcResult.maxScore}</span>
                        </div>
                      </div>
                    )}

                    <p style={{ fontSize: 20, fontWeight: 700 }}>{calcResult ? calcResult.value : "–"} <span style={{ fontWeight: 400, fontSize: 16 }}>({calcResult ? calcResult.label : "Fyll ut feltene over"})</span></p>

                    <div className="row" style={{ marginTop: 12, flexWrap: 'wrap' }}>
                      {activeCalc.id === 'bmi' ? (
                        <>
                          <button type="button" className="button primary" disabled={!calcResult} onClick={() => calcResult && handleCopy(calcResult.text)}>Kopier BMI</button>
                          <button type="button" className="button primary" disabled={!calcResult?.detailedText} onClick={() => calcResult?.detailedText && handleCopy(calcResult.detailedText)}>Kopier BMI, høyde og vekt</button>
                        </>
                      ) : (activeCalc.id === 'fib4' || activeCalc.id === 'homa-ir' || activeCalc.id === 'cpeptide-glucose') ? (
                        <>
                          <button type="button" className="button primary" disabled={!calcResult} onClick={() => calcResult && handleCopy(calcResult.text)}>Kopier totalskår</button>
                          <button type="button" className="button primary" disabled={!calcResult?.detailedText} onClick={() => calcResult?.detailedText && handleCopy(calcResult.detailedText)}>Kopier svar og totalskår</button>
                          <button
                            type="button"
                            onClick={() => setShowAdvice(!showAdvice)}
                            style={{
                              padding: '5px 10px',
                              background: showAdvice ? '#0f766e' : '#14b8a6',
                              color: 'white',
                              borderRadius: 6,
                              fontSize: 12,
                              fontWeight: 600,
                              border: 'none',
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              gap: 4,
                              boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                              transition: 'all 0.2s ease'
                            }}
                          >
                            📋 Neste steg
                          </button>
                        </>
                      ) : (activeCalc.id === 'ipss' || activeCalc.id === 'cat') ? (
                        <>
                          <button type="button" className="button primary" disabled={!calcResult} onClick={() => calcResult && handleCopy(calcResult.text)}>Kopier totalskår</button>
                          <button type="button" className="button primary" disabled={!calcResult?.detailedText} onClick={() => calcResult?.detailedText && handleCopy(calcResult.detailedText)}>Kopier totalskår med symptomskåring</button>
                        </>
                      ) : (activeCalc.id === 'nyha' || activeCalc.id === 'ccs' || activeCalc.id === 'mmrc') ? (
                        <>
                          <button type="button" className="button primary" disabled={!calcResult} onClick={() => calcResult && handleCopy(calcResult.text)}>Kopier skår</button>
                          <button type="button" className="button primary" disabled={!calcResult?.detailedText} onClick={() => calcResult?.detailedText && handleCopy(calcResult.detailedText)}>Kopier skår og funksjonsbeskrivelse</button>
                        </>
                      ) : (
                        <button type="button" className="button primary" disabled={!calcResult} onClick={() => calcResult && handleCopy(calcResult.text)}>Kopier til journal</button>
                      )}
                      {activeCalc.id !== 'fib4' && activeCalc.id !== 'homa-ir' && activeCalc.id !== 'cpeptide-glucose' && activeCalc.nextStepPlaceholder && (
                        <button
                          type="button"
                          onClick={() => setShowAdvice(!showAdvice)}
                          style={{
                            padding: '5px 10px',
                            background: showAdvice ? '#0f766e' : '#14b8a6',
                            color: 'white',
                            borderRadius: 6,
                            fontSize: 12,
                            fontWeight: 600,
                            border: 'none',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: 4,
                            boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                            transition: 'all 0.2s ease'
                          }}
                        >
                          📋 Neste steg
                        </button>
                      )}
                      <span className="badge">{copyState || "Klar til kopiering"}</span>
                    </div>
                    {activeCalc.id !== 'fib4' && activeCalc.id !== 'cpeptide-glucose' && activeCalc.id !== 'wells-dvt' && activeCalc.nextStepPlaceholder && !calcResult?.guideText && showAdvice && (
                      <div style={{
                        marginTop: 16,
                        padding: 16,
                        background: '#ffffff',
                        border: '1px solid #d1d5db',
                        borderLeft: `4px solid ${calcResult?.color ?? '#9ca3af'}`,
                        borderRadius: 8
                      }}>
                        <div style={{ fontWeight: 700, fontSize: 13, letterSpacing: 0.5, color: '#374151', marginBottom: 10 }}>NESTE STEG</div>
                        <div style={{ fontSize: 13.5, lineHeight: 1.6, color: '#374151' }}>{activeCalc.nextStepPlaceholder}</div>
                      </div>
                    )}
                    {activeCalc.id === 'fib4' && showAdvice && (
                      <div style={{
                        marginTop: 16,
                        padding: 16,
                        background: '#ffffff',
                        border: '1px solid #d1d5db',
                        borderLeft: `4px solid ${calcResult?.color ?? '#9ca3af'}`,
                        borderRadius: 8,
                        maxWidth: 640
                      }}>
                        <div style={{ fontWeight: 700, fontSize: 13, letterSpacing: 0.5, color: '#374151', marginBottom: 4 }}>NESTE STEG</div>
                        <div style={{ fontSize: 13.5, lineHeight: 1.6, color: '#374151', marginBottom: 14 }}>
                          {calcResult?.guideText ?? "Fyll ut skjemaet over for å få en skåre-spesifikk anbefaling. Referanseskjemaet under viser tolkningen for alle aldersgrupper og skårenivåer."}
                        </div>
                        <Fib4Flowchart activeBranch={calcResult?.fib4AgeBranch} activeTier={calcResult?.fib4Tier} />
                      </div>
                    )}
                    {activeCalc.id === 'cpeptide-glucose' && showAdvice && (
                      <div style={{
                        marginTop: 16,
                        padding: 16,
                        background: '#ffffff',
                        border: '1px solid #d1d5db',
                        borderLeft: `4px solid ${calcResult?.color ?? '#9ca3af'}`,
                        borderRadius: 8,
                        maxWidth: 480
                      }}>
                        <div style={{ fontWeight: 700, fontSize: 13, letterSpacing: 0.5, color: '#374151', marginBottom: 4 }}>NESTE STEG</div>
                        <div style={{ fontSize: 13.5, lineHeight: 1.6, color: '#374151', whiteSpace: 'pre-line' }}>
                          {calcResult?.guideText ?? "Fyll ut skjemaet over for å få en skåre-spesifikk anbefaling. Referansetabellene under viser tolkningen for både fastende og postprandial ratio."}
                        </div>
                        <CgrInterpretationTables activeMode={calcResult?.cgrMode} activeTier={calcResult?.cgrTier} />
                      </div>
                    )}
                    {activeCalc.id === 'wells-dvt' && showAdvice && (
                      <div style={{
                        marginTop: 16,
                        padding: 16,
                        background: '#ffffff',
                        border: '1px solid #d1d5db',
                        borderLeft: `4px solid ${calcResult?.color ?? '#9ca3af'}`,
                        borderRadius: 8,
                        maxWidth: 480
                      }}>
                        <div style={{ fontWeight: 700, fontSize: 13, letterSpacing: 0.5, color: '#374151', marginBottom: 4 }}>NESTE STEG</div>
                        <div style={{ fontSize: 13.5, lineHeight: 1.6, color: '#374151', whiteSpace: 'pre-line', marginBottom: 14 }}>
                          {calcResult?.guideText ?? "Fyll ut skjemaet over for å få en skåre-spesifikk anbefaling."}
                        </div>
                        <CgrInterpretationTable
                          title="Wells DVT – skåretolkning"
                          rows={[
                            { tier: "low", range: "≤0 poeng", label: "Lav sannsynlighet" },
                            { tier: "mid", range: "1–2 poeng", label: "Moderat sannsynlighet" },
                            { tier: "high", range: "≥3 poeng", label: "Høy sannsynlighet" }
                          ]}
                          activeTier={calcResult?.wellsDvtTier}
                        />
                      </div>
                    )}
                    {activeCalc.id !== 'fib4' && activeCalc.id !== 'cpeptide-glucose' && activeCalc.id !== 'wells-dvt' && calcResult?.guideText && showAdvice && (
                      <div style={{
                        marginTop: 16,
                        padding: 16,
                        background: '#ffffff',
                        border: '1px solid #d1d5db',
                        borderLeft: `4px solid ${calcResult.color}`,
                        borderRadius: 8
                      }}>
                        <div style={{ fontWeight: 700, fontSize: 13, letterSpacing: 0.5, color: '#374151', marginBottom: 10 }}>NESTE STEG</div>
                        <div style={{ fontSize: 13.5, lineHeight: 1.6, color: '#374151', whiteSpace: 'pre-line' }}>
                          {calcResult.guideText}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ) : <div style={{ padding: 16 }}>Velg et verktøy fra venstre kolonne.</div>}
          </div>
          )}
        </div>
      )}

      {activeTab === "guides" && <ModernWidgetDashboard />}

      {activeTab === "resources" && (
        <div className="resource-index" style={{ marginTop: 20, padding: 24 }}>
          <h2 style={{ marginBottom: 6, fontSize: 24, fontWeight: 700, color: '#1f2937' }}>Verktøy</h2>
          <p style={{ marginBottom: 22, color: '#475569' }}>Utredningsverktøy og skjemaressurser.</p>

          {resourceCategories.map((category) => {
            return (
              <section key={category.title} className="resource-chapter">
                <h3 className="resource-chapter-title">{category.title}</h3>

                {category.title === "Utredningsverktøy" ? (
                  <div>
                    <div className="specialty-chipbar">
                      <button
                        type="button"
                        className={`specialty-chip ${activeSpecialty === null ? "active" : ""}`}
                        onClick={() => setActiveSpecialty(null)}
                      >
                        Alle
                      </button>
                      {utredningsverktoySubcategories.map((subcategory) => (
                        <button
                          key={subcategory.title}
                          type="button"
                          className={`specialty-chip ${activeSpecialty === subcategory.title ? "active" : ""}`}
                          onClick={() => setActiveSpecialty(subcategory.title)}
                        >
                          {subcategory.title}
                        </button>
                      ))}
                    </div>
                    {utredningsverktoySubcategories
                      .filter((subcategory) => activeSpecialty === null || subcategory.title === activeSpecialty)
                      .map((subcategory) => (
                        <div key={subcategory.title} className="resource-subcategory">
                          <h4 className="resource-subcategory-title">{subcategory.title}</h4>
                          <div className="resource-subcategory-list">
                            {subcategory.items.map((resource) =>
                              renderResourceRow(resource, `${category.title}-${subcategory.title}-${resource.title}`)
                            )}
                          </div>
                        </div>
                      ))}
                  </div>
                ) : category.items.length > 0 ? (
                  <div>
                    {category.items.map((resource) =>
                      renderResourceRow(resource, `${category.title}-${resource.title}`)
                    )}
                  </div>
                ) : (
                  <p className="resource-empty">Ingen {category.title.toLowerCase()} lagt til ennå.</p>
                )}
              </section>
            );
          })}
        </div>
      )}

      <style jsx global>{`
        .resource-chapter {
          margin-bottom: 40px;
        }

        .resource-chapter-title {
          margin: 0 0 9px 0;
          font-size: clamp(0.98rem, 1.5vw, 1.23rem);
          line-height: 1.08;
          font-weight: 800;
          color: #1e293b;
          letter-spacing: -0.025em;
          border-bottom: 4px solid #1e293b;
          padding-bottom: 8px;
        }

        .resource-row {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 16px;
          padding: 13px 2px 12px 0;
          border-bottom: 1px solid #e2e8f0;
        }

        .resource-row:last-child {
          border-bottom: none;
        }

        .resource-row-main {
          min-width: 0;
          flex: 1;
        }

        .resource-title {
          display: inline-block;
          color: #0f766e;
          font-size: clamp(0.98rem, 1.25vw, 1.16rem);
          font-weight: 400;
          line-height: 1.15;
          text-decoration: none;
        }

        .resource-title:hover {
          text-decoration: underline;
        }

        .resource-description {
          margin: 2px 0 0;
          color: #3f536c;
          font-size: clamp(0.58rem, 0.9vw, 0.76rem);
          line-height: 1.28;
        }

        .resource-row-badge {
          flex-shrink: 0;
          display: flex;
          align-items: center;
          justify-content: flex-end;
          padding-top: 3px;
        }

        .resource-pdf-badge {
          color: #94a3b8;
          font-size: clamp(0.82rem, 1.05vw, 0.98rem);
          font-weight: 800;
          letter-spacing: 0.07em;
          text-decoration: none;
          text-transform: uppercase;
        }

        .resource-pdf-badge:hover {
          color: #64748b;
        }

        .resource-row-variants {
          flex-direction: column;
          align-items: flex-start;
        }

        .resource-row-main-compact {
          flex: 0 1 auto;
          max-width: none;
        }

        .resource-variant-buttons {
          flex-shrink: 0;
          display: flex;
          flex-wrap: wrap;
          align-items: flex-start;
          gap: 8px;
          padding-top: 8px;
        }

        .resource-title-plain {
          cursor: default;
        }

        .resource-title-plain:hover {
          text-decoration: none;
        }

        .resource-variant-button {
          padding: 5px 12px;
          border: 1px solid rgba(15, 118, 110, 0.3);
          background: #f2f7f9;
          color: #0f766e;
          font-size: 0.78rem;
          font-weight: 700;
          border-radius: 999px;
          text-decoration: none;
          cursor: pointer;
          white-space: nowrap;
          transition: all 0.15s ease;
        }

        .resource-variant-button:hover {
          background: #0f766e;
          color: #fff;
          border-color: #0f766e;
        }

        .resource-variant-button.unavailable {
          color: #94a3b8;
          cursor: not-allowed;
          background: #f8fafc;
        }

        .specialty-chipbar {
          display: flex;
          flex-wrap: wrap;
          gap: 6px;
          margin: 4px 0 14px;
        }

        .specialty-chip {
          padding: 5px 12px;
          border: 1px solid rgba(15, 118, 110, 0.25);
          background: #f2f7f9;
          color: #0f766e;
          font-size: 0.78rem;
          font-weight: 600;
          border-radius: 999px;
          cursor: pointer;
          transition: all 0.15s ease;
        }

        .specialty-chip:hover {
          background: #fff;
          border-color: rgba(15, 118, 110, 0.5);
        }

        .specialty-chip.active {
          background: linear-gradient(135deg, var(--primary) 0%, var(--primary-light) 100%);
          color: #fff;
          border-color: transparent;
        }

        .resource-subcategory {
          margin-top: 18px;
        }

        .resource-subcategory:first-child {
          margin-top: 4px;
        }

        .resource-subcategory-title {
          margin: 0 0 6px;
          color: #0f766e;
          font-size: clamp(0.8rem, 1vw, 0.92rem);
          font-weight: 800;
          text-transform: uppercase;
          letter-spacing: 0.09em;
        }

        .resource-subcategory-list {
          margin-left: 14px;
          padding-left: 14px;
          border-left: 1px solid #cbd5e1;
        }

        .resource-title.unavailable,
        .resource-pdf-badge.unavailable {
          color: #94a3b8;
          cursor: not-allowed;
          text-decoration: none;
        }

        .resource-empty {
          margin: 12px 0 0;
          color: #64748b;
          font-size: 0.95rem;
        }

        @media (max-width: 900px) {
          .resource-index {
            padding: 18px !important;
          }

          .resource-chapter {
            margin-bottom: 26px;
          }

          .resource-chapter-title {
            font-size: 0.98rem;
            padding-bottom: 7px;
          }

          .resource-title {
            font-size: 1.03rem;
          }

          .resource-description {
            font-size: 0.64rem;
          }

          .resource-pdf-badge {
            font-size: 0.9rem;
          }

          .resource-subcategory-title {
            font-size: 0.82rem;
          }

          .resource-empty {
            font-size: 0.92rem;
          }
        }

        @media (max-width: 640px) {
          .resource-row {
            gap: 10px;
            padding-right: 0;
          }

          .resource-chapter-title {
            font-size: 0.8rem;
          }

          .resource-title {
            font-size: 0.93rem;
          }

          .resource-description {
            font-size: 0.54rem;
          }

          .resource-row-badge {
            padding-top: 1px;
          }

          .resource-pdf-badge {
            font-size: 0.78rem;
          }

          .resource-subcategory-title {
            font-size: 0.74rem;
          }

          .resource-subcategory-list {
            margin-left: 10px;
            padding-left: 10px;
          }

          .resource-empty {
            font-size: 0.85rem;
          }
        }

        @keyframes pdfPreviewFadeIn {
          from {
            opacity: 0;
            transform: translateY(8px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>

      {activeTab === "patientinfo" && (
        <div className="resource-index" style={{ marginTop: 20, padding: 24 }}>
          <h2 style={{ marginBottom: 6, fontSize: 24, fontWeight: 700, color: '#1f2937' }}>Pasientinformasjon</h2>
          <p style={{ marginBottom: 22, color: '#475569' }}>PDF-ark til utdeling og gjennomgang med pasienten.</p>

          <section className="resource-chapter">
            <h3 className="resource-chapter-title">Pasientinformasjon</h3>
            <div>
              <div className="specialty-chipbar">
                <button
                  type="button"
                  className={`specialty-chip ${activePatientInfoSpecialty === null ? "active" : ""}`}
                  onClick={() => setActivePatientInfoSpecialty(null)}
                >
                  Alle
                </button>
                {patientInfoSubcategories.map((subcategory) => (
                  <button
                    key={subcategory.title}
                    type="button"
                    className={`specialty-chip ${activePatientInfoSpecialty === subcategory.title ? "active" : ""}`}
                    onClick={() => setActivePatientInfoSpecialty(subcategory.title)}
                  >
                    {subcategory.title}
                  </button>
                ))}
              </div>
              {patientInfoSubcategories
                .filter((subcategory) => activePatientInfoSpecialty === null || subcategory.title === activePatientInfoSpecialty)
                .map((subcategory) => (
                  <div key={subcategory.title} className="resource-subcategory">
                    <h4 className="resource-subcategory-title">{subcategory.title}</h4>
                    <div className="resource-subcategory-list">
                      {subcategory.items.map((resource) =>
                        renderResourceRow(resource, `${subcategory.title}-${resource.title}`)
                      )}
                    </div>
                  </div>
                ))}
            </div>
          </section>
        </div>
      )}

      {activeTab === "overviews" && (
        <div className="resource-index" style={{ marginTop: 20, padding: 24 }}>
          <h2 style={{ marginBottom: 6, fontSize: 24, fontWeight: 700, color: '#1f2937' }}>Oversikter</h2>
          <p style={{ marginBottom: 22, color: '#475569' }}>Håndkort og andre oversikter.</p>

          {overviewCategories.map((category) => (
            <section key={category.title} className="resource-chapter">
              <h3 className="resource-chapter-title">{category.title}</h3>
              <div>
                {category.items.map((resource) =>
                  renderResourceRow(resource, `${category.title}-${resource.title}`)
                )}
              </div>
            </section>
          ))}
        </div>
      )}

      {previewResource && (
        <div
          style={{
            position: 'fixed',
            left: previewPosition.left,
            top: previewPosition.top,
            width: 520,
            height: 680,
            background: '#ffffff',
            border: '1px solid #cbd5e1',
            borderRadius: 14,
            boxShadow: '0 20px 40px rgba(15, 23, 42, 0.18)',
            overflow: 'hidden',
            zIndex: 50,
            opacity: 1,
            transform: 'translateY(0)',
            animation: 'pdfPreviewFadeIn 0.18s ease-out'
          }}
        >
          <div style={{
            padding: '12px 14px',
            borderBottom: '1px solid #e5e7eb',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 12,
            background: '#f8fafc'
          }}>
            <strong style={{ fontSize: 14, color: '#0f172a' }}>{previewResource.title}</strong>
            <button
              type="button"
              onClick={hidePdfPreview}
              style={{
                border: 'none',
                background: 'transparent',
                color: '#64748b',
                cursor: 'pointer',
                fontSize: 18,
                lineHeight: 1
              }}
            >
              ×
            </button>
          </div>
          <div style={{ width: '100%', height: 'calc(100% - 49px)' }}>
            <PdfHoverPreview url={previewResource.url} />
          </div>
        </div>
      )}
    </section>
  );
}
