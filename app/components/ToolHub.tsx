
"use client";

import { useMemo, useState, useEffect } from "react";
import scoringTools from "@/data/scoring-tools.json";
import calculators from "@/data/calculators.json";
import calculatorsNew from "@/data/calculators-new.json";
import ComboBox from "./ComboBox";
import ChatGPTPrompt from "./ChatGPTPrompt";
import DatePickerField from "./DatePickerField";
import ModernWidgetDashboard from "./ModernWidgetDashboard";
import {
  addOffset,
  formatNorwegianDate,
  isoWeekNumber,
  parseOneLineOffset,
  weekdayName
} from "@/app/utils/dateCalculator";

interface ToolOption { label: string; score: number; }
interface ToolQuestion { id: string; text: string; options: ToolOption[]; part?: string; }
interface ToolThreshold { minScore: number; label: string; color?: string; }
interface ScoringTool { id: string; name: string; description: string; questions: ToolQuestion[]; thresholds: ToolThreshold[]; pdfUrl?: string; }
interface CalcField { id: string; label: string; type: "number" | "select"; min?: number; max?: number; step?: number; options?: string[]; part?: string; }
interface CalcThreshold { max: number; label: string; color: string; }
interface Calculator { id: string; name: string; description: string; fields: CalcField[]; thresholds: CalcThreshold[]; layout?: "horizontal" | "vertical-select"; pdfUrl?: string; }
interface LinkItem { id: string; label: string; url: string; }
interface LinkBox { id: string; title: string; items: LinkItem[]; description?: string; }

type TabKey = "tools" | "chatgpt" | "guides" | "patientinfo" | "medications" | "calendar";
const tabs: Record<TabKey, string> = { tools: "Verktøy", chatgpt: "KI-assistent", guides: "Lenker", patientinfo: "Pasientinformasjon", medications: "Legemidler", calendar: "Fastlegekalkulator" };
const tabOrder: TabKey[] = ["guides", "chatgpt", "calendar", "tools", "patientinfo", "medications"];

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
  const getTodayIso = () => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, "0");
    const day = String(now.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  };

  const parseIsoDate = (value: string) => {
    if (!value) return null;
    const [year, month, day] = value.split("-").map(Number);
    if (!year || !month || !day) return null;
    return new Date(Date.UTC(year, month - 1, day));
  };

  const parseLocaleNumber = (value: string) => {
    const trimmed = value.trim();
    if (!trimmed) return null;
    const normalized = trimmed.replace(",", ".");
    const parsed = Number(normalized);
    return Number.isNaN(parsed) ? null : parsed;
  };

  const daysBetweenUtc = (start: Date, end: Date) => (
    Math.round((end.getTime() - start.getTime()) / (24 * 60 * 60 * 1000))
  );

  const [activeTab, setActiveTab] = useState<TabKey>(initialTab ?? "guides");
  const [activeToolId, setActiveToolId] = useState(initialTool ?? "");
  const [activeCalcId, setActiveCalcId] = useState(initialTool ? "" : (initialCalc ?? ""));
  const [answers, setAnswers] = useState<Record<string, { score: number; optionIndex: number }>>({});
  const [calcInputs, setCalcInputs] = useState<Record<string, string | number>>({});
  const [copyState, setCopyState] = useState("");
  const [psykiatriExpanded, setPsykiatriExpanded] = useState(false);
  const [somatikkExpanded, setSomatikkExpanded] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [showSearch, setShowSearch] = useState(false);
  const [viewMode, setViewMode] = useState<"category" | "postit">("postit");
  const [collapsedBoxes, setCollapsedBoxes] = useState<Record<string, boolean>>({});
  const [editingLink, setEditingLink] = useState<{ boxId: string; itemId: string } | null>(null);
  const [editLabelValue, setEditLabelValue] = useState("");
  const [linkBoxOrder, setLinkBoxOrder] = useState<string[]>([]);
  const [draggedBox, setDraggedBox] = useState<string | null>(null);
  const [postitBoxOrder, setPostitBoxOrder] = useState<string[]>(['generelle', 'psykiatri', 'kardiologi', 'lungemedisin', 'hematologi', 'gastromedisin', 'endokrinologi', 'urologi', 'svangerskap', 'pediatri', 'revmatologi']);
  const [draggedItem, setDraggedItem] = useState<{ boxId: string; itemId: string } | null>(null);
  const [draggedPostitBox, setDraggedPostitBox] = useState<string | null>(null);
  const [showIndication, setShowIndication] = useState(false);
  const [showClinicalTip, setShowClinicalTip] = useState(false);
  const [dateCalcStart, setDateCalcStart] = useState(() => getTodayIso());
  const [dateCalcDirection, setDateCalcDirection] = useState<"forward" | "backward">("forward");
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
  const [calcTab, setCalcTab] = useState<"date" | "med" | "pregnancy" | "tapering">("date");
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

  const sortedTools = useMemo(() => 
    [...(scoringTools as ScoringTool[])],
    []
  );
  
  const sortedCalcs = useMemo(() => {
    const merged = [...(calculators as Calculator[]), ...(calculatorsNew as Calculator[])];
    const byId = new Map<string, Calculator>();
    merged.forEach((calc) => {
      if (!byId.has(calc.id)) {
        byId.set(calc.id, calc);
      }
    });
    return [...byId.values()];
  }, []);

  const cleanName = (name: string) => name.replace(/\s*\([^)]*\)\s*/g, '').trim();

  const postitTitles: Record<string, string> = {
    generelle: "Generelle",
    psykiatri: "Psykiatri",
    kardiologi: "Kardiologi",
    lungemedisin: "Lungemedisin",
    hematologi: "Hematologi",
    gastromedisin: "Gastromedisin",
    endokrinologi: "Endokrinologi",
    urologi: "Urologi",
    svangerskap: "Svangerskap",
    pediatri: "Pediatri",
    revmatologi: "Revmatologi"
  };

  const calcPostitMap: Record<string, { boxId: string; label?: string }> = {
    bmi: { boxId: "generelle", label: "BMI" },
    nyha: { boxId: "kardiologi", label: "NYHA" },
    ccs: { boxId: "kardiologi", label: "CCS" },
    "ccs-angina": { boxId: "kardiologi", label: "CCS" },
    chadsvasc: { boxId: "kardiologi", label: "CHA₂DS₂-VA" },
    hasbled: { boxId: "kardiologi", label: "HAS-BLED" },
    act: { boxId: "lungemedisin", label: "ACT voksne" },
    "act-asthma": { boxId: "lungemedisin", label: "ACT voksne" },
    "act-child": { boxId: "lungemedisin", label: "ACT barn" },
    mmrc: { boxId: "lungemedisin", label: "mMRC" },
    cat: { boxId: "lungemedisin", label: "CAT" },
    "cat-copd": { boxId: "lungemedisin", label: "CAT" },
    crb65: { boxId: "lungemedisin", label: "CRB-65" },
    "doak-dosing": { boxId: "hematologi", label: "DOAK-dosering" },
    "anemia-assessment": { boxId: "hematologi", label: "Anemivurdering" },
    "wells-dvt": { boxId: "hematologi", label: "Wells DVT" },
    "wells-pe": { boxId: "hematologi", label: "Wells Lungeemboli" },
    fib4: { boxId: "gastromedisin", label: "FIB-4" },
    "psa-age-adjusted": { boxId: "urologi", label: "Aldersjustert PSA" },
    ipss: { boxId: "urologi", label: "IPSS-8" }
  };

  const toolPostitMap: Record<string, { boxId: string; label?: string }> = {
    madrs: { boxId: "psykiatri", label: "MADRS" },
    "gad-7": { boxId: "psykiatri", label: "GAD-7" },
    asrs: { boxId: "psykiatri", label: "ASRS v1.1" },
    audit: { boxId: "psykiatri", label: "AUDIT" },
    "eular-ra-2010": { boxId: "revmatologi", label: "EULAR 2010 Revmatoid Artritt" },
    "eular-pmr-2012": { boxId: "revmatologi", label: "EULAR 2012 Polymyalgia Rheumatica" }
  };

  type PostitItem = { id: string; label: string; itemType: "calc" | "tool" | "link"; url?: string };

  const externalPostitItemsByBox: Record<string, Array<{ id: string; label: string; url: string }>> = {
    psykiatri: [
      { id: "psy-ciwa-alcohol", label: "CIWA-alkohol", url: "https://www.mdcalc.com/search?query=CIWA-Ar" },
      { id: "psy-ciwa-benzo", label: "CIWA-benzodiazepiner", url: "https://www.mdcalc.com/search?query=CIWA-B" }
    ],
    gastromedisin: [
      { id: "gastro-alvarado", label: "Alvarado-score", url: "https://www.mdcalc.com/calc/617/alvarado-score-acute-appendicitis" }
    ],
    endokrinologi: [
      { id: "endo-homa", label: "HOMA-IR", url: "https://dosepilot.com/calc/homa-ir-calculator/" },
      { id: "endo-cpep", label: "C-peptid til glukose", url: "https://www.mdcalc.com/calc/10529/c-peptide-glucose-ratio" }
    ],
    svangerskap: [
      { id: "obs-sukk-s", label: "SUKK-S skår", url: "https://www.google.com/search?q=SUKK-S+sk%C3%A5r" }
    ],
    pediatri: [
      { id: "ped-anafylaksi", label: "6.1 Anafylaksi - Helsebiblioteket", url: "https://www.helsebiblioteket.no/innhold/retningslinjer/pediatri/akuttveileder-i-pediatri/6.allergi-og-anafylaksi/6.1-anafylaksi" }
    ]
  };

  const postitSections = useMemo(() => {
    const buckets = new Map<string, PostitItem[]>();
    postitBoxOrder.forEach((boxId) => buckets.set(boxId, []));

    sortedCalcs.forEach((calc) => {
      const mapped = calcPostitMap[calc.id];
      const boxId = mapped?.boxId ?? "generelle";
      const label = mapped?.label ?? cleanName(calc.name);
      if (!buckets.has(boxId)) {
        buckets.set(boxId, []);
      }
      buckets.get(boxId)!.push({ id: calc.id, label, itemType: "calc" });
    });

    sortedTools.forEach((tool) => {
      const mapped = toolPostitMap[tool.id];
      const boxId = mapped?.boxId ?? "psykiatri";
      const label = mapped?.label ?? cleanName(tool.name);
      if (!buckets.has(boxId)) {
        buckets.set(boxId, []);
      }
      buckets.get(boxId)!.push({ id: tool.id, label, itemType: "tool" });
    });

    Object.entries(externalPostitItemsByBox).forEach(([boxId, items]) => {
      if (!buckets.has(boxId)) {
        buckets.set(boxId, []);
      }
      items.forEach((item) => {
        buckets.get(boxId)!.push({ id: item.id, label: item.label, itemType: "link", url: item.url });
      });
    });

    return postitBoxOrder.map((boxId) => {
      const items = buckets.get(boxId) ?? [];
      const seenCalcLabels = new Set<string>();
      const dedupedItems = items.filter((item) => {
        if (item.itemType !== "calc") return true;
        const key = item.label.trim().toLowerCase();
        if (seenCalcLabels.has(key)) return false;
        seenCalcLabels.add(key);
        return true;
      });

      return {
        boxId,
        title: postitTitles[boxId] ?? boxId,
        items: dedupedItems
      };
    });
  }, [postitBoxOrder, sortedCalcs, sortedTools]);

  const filteredTools = useMemo(() => {
    if (!searchQuery.trim()) return sortedTools;
    const q = searchQuery.toLowerCase();
    return sortedTools.filter(t => 
      t.name.toLowerCase().includes(q) || 
      t.description.toLowerCase().includes(q)
    );
  }, [sortedTools, searchQuery]);

  const somatikkTools = useMemo(() => {
    const eulerToolIds = ['eular-ra-2010', 'eular-pmr-2012'];
    const toolsForSomatikk = sortedTools.filter(t => eulerToolIds.includes(t.id));
    if (!searchQuery.trim()) return toolsForSomatikk;
    const q = searchQuery.toLowerCase();
    return toolsForSomatikk.filter(t => 
      t.name.toLowerCase().includes(q) || 
      t.description.toLowerCase().includes(q)
    );
  }, [sortedTools, searchQuery]);

  const psykiatriTools = useMemo(() => {
    const eulerToolIds = ['eular-ra-2010', 'eular-pmr-2012'];
    const toolsForPsykiatri = sortedTools.filter(t => !eulerToolIds.includes(t.id));
    if (!searchQuery.trim()) return toolsForPsykiatri;
    const q = searchQuery.toLowerCase();
    return toolsForPsykiatri.filter(t => 
      t.name.toLowerCase().includes(q) || 
      t.description.toLowerCase().includes(q)
    );
  }, [sortedTools, searchQuery]);

  const filteredCalcs = useMemo(() => {
    if (!searchQuery.trim()) return sortedCalcs;
    const q = searchQuery.toLowerCase();
    return sortedCalcs.filter(c => 
      c.name.toLowerCase().includes(q) || 
      c.description.toLowerCase().includes(q)
    );
  }, [sortedCalcs, searchQuery]);

  const dateCalcInlineParsed = useMemo(() => parseOneLineOffset(dateCalcInline), [dateCalcInline]);
  const dateCalcOffset = useMemo(() => {
    if (dateCalcInline.trim()) {
      if (!dateCalcInlineParsed) return null;
      const hasExplicitSign = /^[+-]/.test(dateCalcInline.trim());
      const sign = hasExplicitSign ? dateCalcInlineParsed.sign : (dateCalcDirection === "forward" ? 1 : -1);
      return { ...dateCalcInlineParsed, sign };
    }

    return null;
  }, [dateCalcInline, dateCalcInlineParsed, dateCalcDirection]);

  const dateCalcResult = useMemo(() => {
    const baseDate = parseIsoDate(dateCalcStart);
    if (!baseDate || !dateCalcOffset) return null;

    const resultDate = addOffset(baseDate, dateCalcOffset);
    return {
      date: resultDate,
      dateText: formatNorwegianDate(resultDate),
      weekday: weekdayName(resultDate),
      weekNumber: isoWeekNumber(resultDate),
      dayDiff: daysBetweenUtc(baseDate, resultDate)
    };
  }, [dateCalcStart, dateCalcOffset]);

  const medDurationResult = useMemo(() => {
    const startDate = parseIsoDate(medStartDate);
    if (!startDate) return null;

    const unitValue = parseLocaleNumber(medUnits);
    const doseValue = parseLocaleNumber(medDosePerDay);
    if (unitValue === null || doseValue === null || doseValue <= 0) return null;

    const totalUnits = Math.round(unitValue);
    if (totalUnits <= 0) return null;

    const durationDays = Math.ceil(totalUnits / doseValue);
    const endDate = addOffset(startDate, { sign: 1, value: durationDays - 1, unit: "day" });

    return {
      durationDays,
      endDate,
      endDateText: formatNorwegianDate(endDate)
    };
  }, [medStartDate, medUnits, medDosePerDay]);

  const medPatientMessage = useMemo(() => {
    if (!medDurationResult) return "";

    const prescribedDate = parseIsoDate(medStartDate);
    const prescribedDateText = prescribedDate ? formatNorwegianDate(prescribedDate) : medStartDate;
    const tabletsText = String(Math.round(parseLocaleNumber(medUnits) ?? 0));
    const doseInput = medDosePerDay.trim() || "0";

    return `Det er ${prescribedDateText} skrevet resept på ${tabletsText} tabletter. Basert på et forbruk av ${doseInput} tabletter om dagen, skal dette vare til minst ${medDurationResult.endDateText}.`;
  }, [medDurationResult, medStartDate, medUnits, medDosePerDay]);

  const medJournalMessage = useMemo(() => {
    if (!medDurationResult) return "";
    const tabletsText = String(Math.round(parseLocaleNumber(medUnits) ?? 0));
    const doseText = medDosePerDay.trim() || "0";
    return `Resept på ${tabletsText} tabletter. Dosert ${doseText} om dagen. Skal minst vare til: ${medDurationResult.endDateText} (Uke ${isoWeekNumber(medDurationResult.endDate)} ${medDurationResult.endDate.getUTCFullYear()}). Varighet: ${medDurationResult.durationDays} dager.`;
  }, [medDurationResult, medUnits, medDosePerDay]);

  useEffect(() => {
    if (!showMedUnitsPicker && !showAvgUnitsPicker) return;

    const handlePointerDown = (event: MouseEvent) => {
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

  const avgUsageResult = useMemo(() => {
    const prevDate = parseIsoDate(avgPrevDate);
    const nextDate = parseIsoDate(avgNextDate);
    if (!prevDate || !nextDate) return null;

    const units = parseLocaleNumber(avgPrevUnits);
    if (units === null) return null;

    const daySpan = daysBetweenUtc(prevDate, nextDate);
    if (daySpan <= 0) {
      return { error: "Neste dato må være etter forrige dato." };
    }

    const daily = units / daySpan;
    return {
      daySpan,
      daily
    };
  }, [avgPrevDate, avgNextDate, avgPrevUnits]);

  const pregnancyResult = useMemo(() => {
    const lmpDate = parseIsoDate(pregnancyDate);
    if (!lmpDate) return null;

    const pregnancyLengthDays = 283;
    const conceptionOffsetDays = 14;

    const today = parseIsoDate(getTodayIso());
    if (!today) return null;

    const eddDate = addOffset(lmpDate, { sign: 1, value: pregnancyLengthDays, unit: "day" });

    const conceptionDate = addOffset(lmpDate, { sign: 1, value: conceptionOffsetDays, unit: "day" });

    const gestationalAgeDays = daysBetweenUtc(lmpDate, today);
    const gestationalWeeks = Math.floor(Math.abs(gestationalAgeDays) / 7);
    const gestationalDaysRemainder = Math.abs(gestationalAgeDays) % 7;

    const daysToDueDate = daysBetweenUtc(today, eddDate);
    const weeksToDueDate = Math.floor(Math.abs(daysToDueDate) / 7);
    const daysToDueDateRemainder = Math.abs(daysToDueDate) % 7;

    return {
      eddDate,
      lmpDate,
      conceptionDate,
      eddText: `${formatNorwegianDate(eddDate)} (${weekdayName(eddDate)})`,
      conceptionText: `${formatNorwegianDate(conceptionDate)} (${weekdayName(conceptionDate)})`,
      gestationalAgeText: `${gestationalWeeks} Uker, ${gestationalDaysRemainder} Dager (${gestationalAgeDays} Dager)`,
      timeToDueDateText: `${weeksToDueDate} Uker, ${daysToDueDateRemainder} Dager (${daysToDueDate} Dager)`
    };
  }, [pregnancyDate]);

  const pregnancyBmi = useMemo(() => {
    const weight = parseLocaleNumber(pregnancyWeightKg);
    const height = parseLocaleNumber(pregnancyHeightCm);
    if (weight === null || height === null || weight <= 0 || height <= 0) return null;

    const heightMeters = height / 100;
    const bmi = weight / (heightMeters * heightMeters);
    if (!Number.isFinite(bmi) || bmi <= 0) return null;
    return bmi;
  }, [pregnancyWeightKg, pregnancyHeightCm]);

  const pregnancyReferralText = useMemo(() => {
    const lines: string[] = [];

    const patientInfoLines: string[] = [];
    const trimmedPara = pregnancyPara.trim();
    if (trimmedPara) {
      patientInfoLines.push(`Para: ${trimmedPara}`);
    }
    if (pregnancyResult) {
      patientInfoLines.push(`LMP: ${formatNorwegianDate(pregnancyResult.lmpDate)}`);
      patientInfoLines.push(`Termin beregnet fra LMP: ${formatNorwegianDate(pregnancyResult.eddDate)}`);
    }
    if (patientInfoLines.length > 0) {
      if (lines.length > 0) {
        lines.push("");
      }
      lines.push("Informasjon om den gravide:", ...patientInfoLines);
    }

    const bodyMeasurementsLines: string[] = [];
    const trimmedWeight = pregnancyWeightKg.trim();
    const trimmedHeight = pregnancyHeightCm.trim();
    if (trimmedWeight) {
      bodyMeasurementsLines.push(`Vekt (kg): ${trimmedWeight}`);
    }
    if (trimmedHeight) {
      bodyMeasurementsLines.push(`Høyde (cm): ${trimmedHeight}`);
    }
    if (pregnancyBmi !== null) {
      bodyMeasurementsLines.push(`BMI: ${pregnancyBmi.toFixed(1)}`);
    }
    if (bodyMeasurementsLines.length > 0) {
      lines.push("", "Kroppsmål:", ...bodyMeasurementsLines);
    }

    const trimmedMedicalHistory = pregnancyMedicalHistory.trim();
    if (trimmedMedicalHistory) {
      lines.push("", "Sykehistorie:", trimmedMedicalHistory);
    }

    const trimmedMentalHealth = pregnancyMentalHealth.trim();
    if (trimmedMentalHealth) {
      lines.push("", `Psykisk: ${trimmedMentalHealth}`);
    }

    const trimmedMedications = pregnancyMedications.trim();
    if (trimmedMedications) {
      lines.push("", `Medisiner: ${trimmedMedications}`);
    }

    const trimmedOtherConditions = pregnancyOtherConditions.trim();
    if (trimmedOtherConditions) {
      lines.push("", "Andre forhold:", trimmedOtherConditions);
    }

    if (pregnancyRiskPregnancy) {
      lines.push("", "Risikosvangerskap: Ja");
    }

    lines.push("", "V/T", "Henvises for tidlig ultralyd (11+0-13+6) og rutine ultralyd (17-19).",);

    return lines.join("\n");
  }, [pregnancyPara, pregnancyResult, pregnancyWeightKg, pregnancyHeightCm, pregnancyBmi, pregnancyOtherConditions, pregnancyMedicalHistory, pregnancyMedications, pregnancyMentalHealth, pregnancyRiskPregnancy]);

  const baseLinkBoxes: LinkBox[] = [
    {
      id: "medicine",
      title: "Medisin",
      items: [
        { id: "med-1", label: "Felleskatalogen", url: "https://www.felleskatalogen.no/medisin/" },
        { id: "med-2", label: "Legemiddelhåndboka", url: "https://www.legemiddelhandboka.no/" },
        { id: "med-3", label: "Interaksjoner", url: "https://interaksjoner.no/" },
        { id: "med-4", label: "RELIS", url: "https://relis.no/" },
        { id: "med-5", label: "Koble", url: "https://koble.info/" },
        { id: "med-6", label: "Trygg Mammamedisin", url: "https://tryggmammamedisin.no/" },
        { id: "med-7", label: "Antibiotika i primærhelsetjenesten", url: "https://www.helsedirektoratet.no/retningslinjer/antibiotika-i-primaerhelsetjenesten" },
        { id: "med-8", label: "Knuse-dele-listen", url: "/pdfs/KnuseDeleListen v16.pdf" },
      ]
    },
    {
      id: "tt-hc",
      title: "Legeerklæringer (LE)",
      items: [
        { id: "tt-1", label: "TT-kort (legeerkl.)", url: "https://innlandstrafikk.no/_f/p4/ic40b9736-aeeb-49d8-966c-649e57eff410/legeerklaering.pdf" },
        { id: "tt-2", label: "TT-kort (pasient)", url: "https://innlandstrafikk.no/_f/p4/i0158ef5d-fe72-4a2a-8c34-9be0f856e66f/tt-kort_innlandet-fylke_innlandstrafikk2022-skrivbar.pdf" },
        { id: "hc-1", label: "HC-park. (legeerkl.)", url: "https://lillehammer.kommune.no/_f/p1/iebadc1ca-c667-4501-8507-88f040fb0b24/legeerklaring-vedlegg-til-soknad-om-parkeringstillatelse-for-forflytningshemmede.pdf" },
        { id: "hc-2", label: "HC-park. (pasient)", url: "https://lillehammer.kommune.no/_f/p1/i8aabafbb-a0c7-4da4-b579-d34425f6b02a/soknadsskjema-om-parkeringstillatelse-for-forflytningshemmede.pdf" },
        { id: "ff-1", label: "Ikrafttredelse fullmakt (legeerkl.)", url: "https://www.statsforvalteren.no/siteassets/fm-oslo-og-viken/vergemal/informasjonsskriv/legeerklaringsskjema-fremtidsfullmakt.pdf" },
        { id: "ts-1", label: "Tillegsstipend (legeerkl.)", url: "https://lanekassen.no/nb-NO/stipend-og-lan/nedsatt-funksjonsevne/soknad-om-tilleggsstipend-ved-nedsatt-funksjonsevne/#samtykke-banner" }
      ]
    },
    {
      id: "generelle",
      title: "Generelle",
      items: [
        { id: "gen-1", label: "Legehandboka", url: "https://legehandboka.no/" },
        { id: "gen-2", label: "Nevrologi Legehandboka", url: "https://nevrologi.legehandboka.no/" },
        { id: "gen-3", label: "Metodebok", url: "https://metodebok.no/index.php" }
      ]
    },
    {
      id: "henvisninger",
      title: "Henvisninger",
      items: [
        { id: "henv-1", label: "Avtalespesialistoversikt", url: "https://avtalespesialister.helse-sorost.no/spesialister1.asp" },
        { id: "henv-2", label: "Skjema for familiær hyperkolesterolemi", url: "https://nktforfh.no/images/uploads/files/Rekvisisjon_for_FH_utfyllbarPDF.pdf" },
        { id: "henv-3", label: "ADHD henvisningsmal", url: "https://www.diakonhjemmetsykehus.no/4961a8/siteassets/documents/mal--henvisning-adhd-2019.pdf" },
        { id: "henv-4", label: "Henvisningsskjema rehabilitering", url: "https://www.sunnaas.no/fag-og-forskning/kompetansesentre-og-tjenester/Regional-koordinerende-enhet/henvisning/henvisning-til-rehabilitering-i-spesialisthelsetjenesten/" }
      ]
    },
    {
      id: "forerkort",
      title: "Førerkort og diverse",
      items: [
        { id: "fk-1", label: "Førerkortveileder", url: "https://www.helsedirektoratet.no/veiledere/forerkortveileder" },
        { id: "fk-2", label: "Egenerklæring", url: "https://www.vegvesen.no/globalassets/forerkort/ta-forerkort/soknad-om-forerkort-og-kompetansebevis-egenerklaering-om-helse.pdf" },
        { id: "div-1", label: "Legemidler førerkort", url: "https://legehandboka.no/handboken/skjema-kalkulatorer/kalkulatorer/diverse/legemiddelkalkulator" }
      ]
    },
    {
      id: "helsedirektoratet-veiledere",
      title: "Helsedirektoratets veiledere",
      items: [
        { id: "hdir-1", label: "Diabetes", url: "https://www.helsedirektoratet.no/retningslinjer/diabetes" },
        { id: "hdir-2", label: "Hjerte og kar", url: "https://www.helsedirektoratet.no/retningslinjer/forebygging-av-hjerte-og-karsykdom" },
        { id: "hdir-3", label: "Hypertensjon", url: "https://www.helsedirektoratet.no/retningslinjer/forebygging-av-hjerte-og-karsykdom/kartlegging-av-hypertensjon-ved-forebygging-av-hjerte-og-karsykdom#utredning-av-hoyt-blodtrykk-ved-forebygging-av-hjerte-og-karsydom-praktisk-informasjon" },
        { id: "hdir-4", label: "Hyperkolesterolemi", url: "https://www.helsedirektoratet.no/retningslinjer/forebygging-av-hjerte-og-karsykdom/utredning-av-lipidverdiene-ved-primaer-og-sekundaerforebygging-av-hjerte-og-karsykdom#utredning-av-lipidverdiene-ved-primaer-og-sekundaerforebygging-av-hjerte-og-karsykdom" },
        { id: "hdir-5", label: "Svangerskap", url: "https://www.helsedirektoratet.no/retningslinjer/svangerskapsomsorgen" }
      ]
    },
  ];

  // Initialize linkBoxOrder if empty
  useEffect(() => {
    if (linkBoxOrder.length === 0 && baseLinkBoxes.length > 0) {
      setLinkBoxOrder(baseLinkBoxes.map(b => b.id));
    }
  }, []);

  // Get ordered linkBoxes with custom labels
  const linkBoxes = useMemo(() => {
    const order = linkBoxOrder.length > 0 ? linkBoxOrder : baseLinkBoxes.map(b => b.id);
    return order.map(id => {
      const box = baseLinkBoxes.find(b => b.id === id);
      if (!box) return null;
      let items = box.items.map(item => ({
        ...item,
        label: customLabels[`${box.id}-${item.id}`] || item.label
      }));
      
      // Apply custom item order if exists
      if (customItemOrder[box.id]) {
        const itemMap = new Map(items.map(item => [item.id, item]));
        items = customItemOrder[box.id]
          .map(itemId => itemMap.get(itemId))
          .filter(Boolean) as LinkItem[];
        // Add any items not in the custom order
        items.push(...items.filter(item => !customItemOrder[box.id].includes(item.id)));
      }
      
      return {
        ...box,
        items
      };
    }).filter(Boolean) as LinkBox[];
  }, [linkBoxOrder, customLabels, customItemOrder]);

  const activeTool = useMemo(() => sortedTools.find(t => t.id === activeToolId), [activeToolId, sortedTools]);
  const activeCalc = useMemo(() => sortedCalcs.find(c => c.id === activeCalcId), [activeCalcId, sortedCalcs]);

  const scoreSummary = useMemo(() => {
    if (!activeTool) return null;
    const totalScore = activeTool.questions.reduce((s, q) => s + (answers[q.id]?.score ?? 0), 0);
    const maxScore = activeTool.questions.reduce((s, q) => s + Math.max(...q.options.map(o => o.score)), 0);
    const threshold = [...activeTool.thresholds].sort((a, b) => b.minScore - a.minScore).find(t => totalScore >= t.minScore);
    const thresholdColor = threshold?.color ?? "#666";
    return { totalScore, maxScore, thresholdLabel: threshold?.label ?? "Uklassifisert", thresholdColor };
  }, [activeTool, answers]);

  const summaryText = activeTool && scoreSummary ? `${activeTool.name}: ${scoreSummary.totalScore}/${scoreSummary.maxScore} (${scoreSummary.thresholdLabel})` : "";
  const detailedSummaryText = activeTool && scoreSummary
    ? activeTool.questions.map((q, i) => `${i + 1}. ${q.text} — ${answers[q.id] ? q.options[answers[q.id].optionIndex]?.label : "Ikke besvart"}`).join("\n") + `\n\nTotal: ${scoreSummary.totalScore}/${scoreSummary.maxScore} (${scoreSummary.thresholdLabel})`
    : "";

  const calcResult = useMemo(() => {
    if (!activeCalc) return null;
    
    // BMI calculator
    if (activeCalc.id === "bmi") {
      const h = Number(calcInputs["height"]) / 100, w = Number(calcInputs["weight"]);
      if (!h || !w || h <= 0) return null;
      const bmi = w / (h * h);
      const t = activeCalc.thresholds.find(th => bmi <= th.max);
      const heightCm = Number(calcInputs["height"]);
      const detailedText = `BMI: ${bmi.toFixed(1)} (${t?.label ?? "Ukjent"})\nHøyde: ${heightCm} cm\nVekt: ${w} kg`;
      return { value: bmi.toFixed(1), label: t?.label ?? "Ukjent", color: t?.color ?? "#666", text: `BMI: ${bmi.toFixed(1)} (${t?.label ?? "Ukjent"})`, score: bmi, maxScore: 50, detailedText: detailedText, guideText: undefined };
    }
    
    // FIB-4 calculator
    if (activeCalc.id === "fib4") {
      const age = Number(calcInputs["age"]);
      const ast = Number(calcInputs["ast"]);
      const alt = Number(calcInputs["alt"]);
      const platelets = Number(calcInputs["platelets"]);
      
      if (!age || !ast || !alt || !platelets) return null;
      
      // FIB-4 = (Age × AST) / (Platelets × √ALT)
      const fib4 = (age * ast) / (platelets * Math.sqrt(alt));
      
      // Age-based interpretation
      let interpretation = "";
      let guideText = "";
      
      if (age < 35) {
        interpretation = fib4 < 2.0 ? "Lav risiko for avansert fibrose" : "Høy risiko for avansert fibrose";
        guideText = "Veiledning for alder <35 år:\n• <2.0: Lav risiko\n• ≥2.0: Høy risiko";
      } else if (age <= 65) {
        if (fib4 < 1.3) {
          interpretation = "Lav risiko for avansert fibrose";
        } else if (fib4 <= 2.67) {
          interpretation = "Ubestemt – vurder videre utredning";
        } else {
          interpretation = "Høy risiko for avansert fibrose";
        }
        guideText = "Veiledning for alder 35-65 år:\n• <1.3: Lav risiko\n• 1.3-2.67: Ubestemt\n• >2.67: Høy risiko";
      } else {
        interpretation = fib4 < 2.0 ? "Lav risiko for avansert fibrose" : "Høy risiko for avansert fibrose";
        guideText = "Veiledning for alder >65 år:\n• <2.0: Lav risiko\n• ≥2.0: Høy risiko";
      }
      
      const detailedText = `FIB-4: ${fib4.toFixed(2)}\nAlder: ${age} år\nAST: ${ast} U/L\nALT: ${alt} U/L\nTrombocytter: ${platelets} × 10⁹/L\n\n${interpretation}`;
      
      return { 
        value: fib4.toFixed(2), 
        label: interpretation, 
        color: "#666", 
        text: `FIB-4: ${fib4.toFixed(2)} (${interpretation})`,
        score: fib4,
        maxScore: 10,
        detailedText: detailedText,
        guideText: guideText
      };
    }
    
    // DOAK dosing calculator
    if (activeCalc.id === "doak-dosing") {
      const doakType = String(calcInputs["doak-type"]);
      const age80 = calcInputs["age"] === "Ja";
      const weight60 = calcInputs["weight"] === "Ja";
      const creat133 = calcInputs["creatinine"] === "Ja";
      const gfr = String(calcInputs["gfr"]);
      
      if (!doakType || !gfr) return null;
      
      let dosing = "";
      let guideText = "";
      
      // Apixaban (Eliquis)
      if (doakType.includes("Apixaban")) {
        // Standard: 5 mg x 2, redusert hvis 2 av 3: alder ≥80, vekt ≤60, kreatinin ≥133
        const reducedCriteria = [age80, weight60, creat133].filter(Boolean).length;
        if (gfr === "<15") {
          dosing = "Kontraindisert ved GFR <15";
        } else if (gfr === "15-30") {
          dosing = "Reduser dose: 2,5 mg x 2";
        } else if (reducedCriteria >= 2) {
          dosing = "Reduser dose: 2,5 mg x 2";
        } else {
          dosing = "5 mg x 2";
        }
        guideText = "Atrieflimmer:\n• Standard: 5 mg x 2\n• Reduser dose: 2,5 mg x 2 hvis minst 2 av:\n  - Alder ≥80 år\n  - Vekt ≤60 kg\n  - S-kreatinin ≥133 µmol/L\n• Reduser dose: 2,5 mg x 2 ved GFR 15-30\n• Kontraindisert ved GFR <15";
      }
      
      // Rivaroxaban (Xarelto)
      else if (doakType.includes("Rivaroxaban")) {
        if (gfr === "<15") {
          dosing = "Kontraindisert ved GFR <15";
        } else if (gfr === "15-30" || gfr === "30-50") {
          dosing = "Reduser dose: 15 mg x 1 (til mat)";
        } else {
          dosing = "20 mg x 1 (til mat)";
        }
        guideText = "Atrieflimmer:\n• Standard: 20 mg x 1 (til mat) ved GFR >50\n• Reduser dose: 15 mg x 1 (til mat) ved GFR 15-49\n• Kontraindisert ved GFR <15";
      }
      
      // Edoxaban (Lixiana)
      else if (doakType.includes("Edoxaban")) {
        if (gfr === "<15") {
          dosing = "Kontraindisert ved GFR <15";
        } else if (weight60 || gfr === "15-30" || gfr === "30-50") {
          dosing = "Reduser dose: 30 mg x 1";
        } else {
          dosing = "60 mg x 1";
        }
        guideText = "Atrieflimmer:\n• Standard: 60 mg x 1\n• Reduser dose: 30 mg x 1 hvis:\n  - Vekt ≤60 kg, eller\n  - GFR 15-50\n• Kontraindisert ved GFR <15";
      }
      
      // Dabigatran (Pradaxa)
      else if (doakType.includes("Dabigatran")) {
        if (gfr === "<15" || gfr === "15-30") {
          dosing = "Kontraindisert ved GFR <30";
        } else if (gfr === "30-50" || age80) {
          dosing = "Reduser dose: 110 mg x 2 (150 mg x 2 kan vurderes hvis lav blødningsrisiko)";
        } else {
          dosing = "150 mg x 2";
        }
        guideText = "Atrieflimmer:\n• Standard: 150 mg x 2\n• Reduser dose: 110 mg x 2 hvis:\n  - Alder ≥80 år, eller\n  - GFR 30-50, eller\n  - Økt blødningsrisiko\n• Kontraindisert ved GFR <30";
      }
      
      const detailedText = `DOAK-dosering\nPreparat: ${doakType}\nGFR: ${gfr} ml/min\n\nAnbefalt dosering:\n${dosing}`;
      
      return {
        value: dosing || "Velg alle parametere",
        label: "Atrieflimmer",
        color: "#0891b2",
        text: `${doakType} (atrieflimmer): ${dosing}`,
        score: 0,
        maxScore: 1,
        detailedText: detailedText,
        guideText: guideText
      };
    }
    
    // PSA Age-adjusted calculator
    if (activeCalc.id === "psa-age-adjusted") {
      const ageGroup = String(calcInputs["age"]);
      const psaValue = Number(calcInputs["psa-value"]);
      const using5ARI = calcInputs["five-alpha-reductase"] === "Ja";
      
      if (!ageGroup || !psaValue) return null;
      
      // Adjust PSA if using 5-alpha-reductase inhibitor
      const adjustedPSA = using5ARI ? psaValue * 2 : psaValue;
      
      // Age-adjusted reference ranges (upper limit)
      const referenceRanges: Record<string, number> = {
        "40-49": 2.5,
        "50-59": 3.5,
        "60-69": 4.5,
        "70-79": 6.5,
        "≥80": 6.5
      };
      
      const upperLimit = referenceRanges[ageGroup] || 4.0;
      const isElevated = adjustedPSA > upperLimit;
      
      let interpretation = "";
      let color = "#4caf50";
      
      if (isElevated) {
        interpretation = `Forhøyet PSA for alder (referanse: <${upperLimit} µg/L)`;
        color = "#ff9800";
        if (adjustedPSA > upperLimit * 2) {
          interpretation = `Betydelig forhøyet PSA for alder (referanse: <${upperLimit} µg/L)`;
          color = "#f44336";
        }
      } else {
        interpretation = `Innenfor referanse for alder (referanse: <${upperLimit} µg/L)`;
      }
      
      let detailedText = `Aldersjustert PSA\n`;
      detailedText += `Alder: ${ageGroup} år\n`;
      detailedText += `Målt PSA: ${psaValue.toFixed(1)} µg/L\n`;
      if (using5ARI) {
        detailedText += `⚠️ Bruker 5-alfa-reduktasehemmer\n`;
        detailedText += `Justert PSA: ${adjustedPSA.toFixed(1)} µg/L (målt × 2)\n`;
      }
      detailedText += `Referanseverdi: <${upperLimit} µg/L\n\n`;
      detailedText += interpretation;
      
      const guideText = `Aldersjusterte referanseverdier (µg/L):\n• 40-49 år: <2,5\n• 50-59 år: <3,5\n• 60-69 år: <4,5\n• 70-79 år: <6,5\n• ≥80 år: <6,5\n\n⚠️ OBS: Ved bruk av 5-alfa-reduktasehemmer\n(finasterid/dutasterid) skal målt PSA-verdi\ndobles for korrekt tolkning.`;
      
      return {
        value: using5ARI ? `${adjustedPSA.toFixed(1)} µg/L (justert)` : `${psaValue.toFixed(1)} µg/L`,
        label: interpretation,
        color: color,
        text: `PSA ${using5ARI ? `${adjustedPSA.toFixed(1)} (justert)` : psaValue.toFixed(1)} µg/L - ${interpretation}`,
        score: adjustedPSA,
        maxScore: upperLimit * 2,
        detailedText: detailedText,
        guideText: guideText
      };
    }
    
    // Anemia Assessment calculator
    if (activeCalc.id === "anemia-assessment") {
      const gender = String(calcInputs["gender"]);
      const hb = Number(calcInputs["hb"]);
      const mcv = Number(calcInputs["mcv"]);
      const ferritin = Number(calcInputs["ferritin"]);
      const crp = Number(calcInputs["crp"]);
      const b12 = Number(calcInputs["b12"]);
      const folate = Number(calcInputs["folate"]);
      
      if (!gender || !hb || !mcv) return null;
      
      // Define anemia thresholds
      const hbThreshold = gender === "Mann" ? 13.4 : 11.7;
      const hasAnemia = hb < hbThreshold;
      
      let anemiaType = "";
      let recommendations: string[] = [];
      let color = "#4caf50";
      
      if (!hasAnemia) {
        anemiaType = "Ingen anemi";
        color = "#4caf50";
      } else {
        color = "#ff9800";
        
        // Classify by MCV
        if (mcv < 80) {
          anemiaType = "Mikrocytær anemi";
          recommendations.push("Differensialdiagnoser: jernmangel, thalassemi, kronisk sykdom, sideroblastisk anemi");
          
          if (ferritin) {
            if (ferritin < 30) {
              recommendations.push(`✓ Ferritin ${ferritin} µg/L tyder på jernmangel`);
              recommendations.push("Anbefalt: Utred årsak til jernmangel (GI-blødning, malabsorpsjon, menstruasjon)");
            } else if (ferritin > 100 && crp && crp > 5) {
              recommendations.push(`Ferritin ${ferritin} µg/L med CRP ${crp} - kan være anemi ved kronisk sykdom`);
            } else {
              recommendations.push(`Ferritin ${ferritin} µg/L - vurder thalassemi eller andre årsaker`);
            }
          } else {
            recommendations.push("Anbefalt: Sjekk ferritin, CRP, jerntransferrinmetning");
          }
        } else if (mcv >= 80 && mcv <= 100) {
          anemiaType = "Normocytær anemi";
          recommendations.push("Differensialdiagnoser: akutt blødning, kronisk sykdom, nyresvikt, hemolytisk anemi, benmargssykdom");
          recommendations.push("Anbefalt: Retikulocytter, nyrefunksjon, hemolyseprøver (LDH, bilirubin, haptoglobin)");
          
          if (crp && crp > 5) {
            recommendations.push(`CRP ${crp} mg/L - vurder anemi ved kronisk sykdom/infeksjon`);
          }
        } else {
          anemiaType = "Makrocytær anemi";
          recommendations.push("Differensialdiagnoser: B12-mangel, folatmangel, alkohol, hypothyreose, leversykdom, medikamenter");
          
          if (b12 && b12 < 150) {
            recommendations.push(`✓ B12 ${b12} pmol/L tyder på B12-mangel`);
            recommendations.push("Vurder: Perniøs anemi (Anti-IF, anti-parietalcelle), malabsorpsjon, vegetar/vegansk kosthold");
          } else if (b12) {
            recommendations.push(`B12 ${b12} pmol/L - innenfor/over referanse`);
          } else {
            recommendations.push("Anbefalt: Sjekk B12");
          }
          
          if (folate && folate < 6) {
            recommendations.push(`✓ Folat ${folate} nmol/L tyder på folatmangel`);
            recommendations.push("Vurder: Malabsorpsjon, alkohol, kosthold, medikamenter (metotreksat, fenytoin)");
          } else if (folate) {
            recommendations.push(`Folat ${folate} nmol/L - innenfor/over referanse`);
          } else {
            recommendations.push("Anbefalt: Sjekk folat");
          }
          
          recommendations.push("Vurder også: TSH, leverprøver, alkoholanamnese");
        }
      }
      
      let detailedText = `Anemivurdering\n`;
      detailedText += `Kjønn: ${gender}\n`;
      detailedText += `Hb: ${hb.toFixed(1)} g/dL (ref: ${gender === "Mann" ? "≥13.4" : "≥11.7"})\n`;
      detailedText += `MCV: ${mcv.toFixed(1)} fL (ref: 80-100)\n`;
      if (ferritin) detailedText += `Ferritin: ${ferritin} µg/L\n`;
      if (crp) detailedText += `CRP: ${crp} mg/L\n`;
      if (b12) detailedText += `B12: ${b12} pmol/L\n`;
      if (folate) detailedText += `Folat: ${folate} nmol/L\n`;
      detailedText += `\n${anemiaType}\n`;
      if (recommendations.length > 0) {
        detailedText += `\n${recommendations.join("\n")}`;
      }
      
      const guideText = `Anemigrenser:\n• Mann: Hb <13.4 g/dL\n• Kvinne: Hb <11.7 g/dL\n\nMCV-klassifikasjon:\n• <80 fL: Mikrocytær\n• 80-100 fL: Normocytær\n• >100 fL: Makrocytær\n\nFerritin:\n• <30 µg/L: Jernmangel\n• >100 µg/L med CRP: Akuttfase/inflammasjon\n\nB12: <150 pmol/L = mangel\nFolat: <6 nmol/L = mangel`;
      
      return {
        value: anemiaType,
        label: hasAnemia ? `Hb ${hb.toFixed(1)} - ${anemiaType}` : "Ingen anemi",
        color: color,
        text: `Hb ${hb.toFixed(1)} g/dL, MCV ${mcv.toFixed(1)} fL - ${anemiaType}`,
        score: hb,
        maxScore: 18,
        detailedText: detailedText,
        guideText: guideText
      };
    }
    
    // Generic scoring calculators (ACT, CAT, IPSS, Wells, etc.)
    if (activeCalc.thresholds && activeCalc.thresholds.length > 0) {
      let totalScore = 0;
      let maxScore = 0;
      let hasAllValues = true;
      
      for (const field of activeCalc.fields) {
        const value = calcInputs[field.id];
        if (field.type === "select" && field.options) {
          if (!value) {
            hasAllValues = false;
            break;
          }
          
          // Find the index of the selected option
          const selectedIndex = field.options.indexOf(String(value));
          
          // Extract numeric score from option string (e.g., "0 – Text" or "5")
          const match = String(value).match(/^(\d+)/);
          let score = 0;
          
          if (match) {
            // Option starts with a number
            score = parseInt(match[1]);
          } else if (String(value) === "Ja") {
            // Special case for Yes/No questions - "Ja" counts as 1
            score = 1;
          } else if (String(value) === "Nei") {
            // "Nei" counts as 0
            score = 0;
          } else if (selectedIndex >= 0) {
            // Option doesn't start with a number (e.g., "Klasse I – ...")
            // Use index + 1 as the score (1-based indexing for classes)
            score = selectedIndex + 1;
          }
          
          totalScore += score;
          
          // Calculate max possible score for this field
          const maxOption = field.options.reduce((max, opt, idx) => {
            const m = opt.match(/^(\d+)/);
            if (m) {
              return Math.max(max, parseInt(m[1]));
            } else if (opt === "Ja") {
              // Max for Yes/No is 1
              return Math.max(max, 1);
            } else if (opt === "Nei") {
              return max; // "Nei" doesn't increase max
            } else {
              // Use index + 1 for non-numeric options
              return Math.max(max, idx + 1);
            }
          }, 0);
          maxScore += maxOption;
        }
      }
      
      if (!hasAllValues) return null;
      
      // Find matching threshold
      const t = activeCalc.thresholds.find(th => totalScore <= th.max);
      
      // Create detailed text for specific calculators
      let detailedText: string | undefined = undefined;
      
      if (activeCalc.id === 'ipss') {
        const questionLabels = [
          "Ufullstendig tømming",
          "Hyppig vannlating (<2t)",
          "Avbrutt vannlating",
          "Vannlatingstrang",
          "Svak stråle",
          "Må presse for å starte",
          "Nocturi (ganger per natt)"
        ];
        
        detailedText = activeCalc.fields.map((field, idx) => {
          const value = calcInputs[field.id];
          const match = String(value).match(/^(\d+)/);
          const score = match ? parseInt(match[1]) : 0;
          return `${idx + 1}. ${questionLabels[idx]}: ${score}`;
        }).join("\n") + `\n\nSymptomskår: ${totalScore}/${maxScore} (${t?.label ?? "Ukjent"})`;
      } else if (activeCalc.id === 'cat') {
        const questionLabels = [
          "Hoste",
          "Slim",
          "Trykk i brystet",
          "Tungpust ved trapper",
          "Aktivitetsbegrensning",
          "Trygghet ved å gå ut",
          "Søvnkvalitet",
          "Energinivå"
        ];
        
        detailedText = activeCalc.fields.map((field, idx) => {
          const value = calcInputs[field.id];
          const match = String(value).match(/^(\d+)/);
          const score = match ? parseInt(match[1]) : 0;
          return `${idx + 1}. ${questionLabels[idx]}: ${score}`;
        }).join("\n") + `\n\nSymptomskår: ${totalScore}/${maxScore} (${t?.label ?? "Ukjent"})`;
      } else if (activeCalc.id === 'nyha' || activeCalc.id === 'ccs' || activeCalc.id === 'mmrc') {
        // For NYHA, CCS, mMRC: include the full description
        const field = activeCalc.fields[0];
        const value = calcInputs[field.id];
        
        // Extract description after the "–" separator
        const description = String(value).split(' – ')[1] || String(value);
        
        // Create label with score/maxScore format
        let labelWithScore = '';
        if (activeCalc.id === 'nyha') {
          labelWithScore = `NYHA ${totalScore}/${maxScore}`;
        } else if (activeCalc.id === 'ccs') {
          labelWithScore = `CCS ${totalScore}/${maxScore}`;
        } else if (activeCalc.id === 'mmrc') {
          labelWithScore = `mMRC ${totalScore}/${maxScore}`;
        }
        
        detailedText = `${labelWithScore}: ${description}`;
      }
      
      // Remove emojis from the calculator name for copy text
      let cleanName = activeCalc.name.replace(/[\u{1F300}-\u{1F9FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]/gu, '').trim();
      
      // Customize names for specific calculators
      let copyText = '';
      if (activeCalc.id === 'nyha') {
        copyText = `NYHA (hjertesvikt): ${totalScore}/${maxScore}`;
      } else if (activeCalc.id === 'ccs') {
        copyText = `CCS (angina): ${totalScore}/${maxScore}`;
      } else if (activeCalc.id === 'mmrc') {
        copyText = `mMRC (dyspne): ${totalScore}/${maxScore}`;
      } else {
        copyText = `${cleanName}: ${totalScore}/${maxScore} (${t?.label ?? "Ukjent"})`;
      }
      
      return { 
        value: totalScore.toString(), 
        label: t?.label ?? "Ukjent", 
        color: t?.color ?? "#666", 
        text: copyText,
        score: totalScore,
        maxScore: maxScore,
        detailedText: detailedText,
        guideText: undefined
      };
    }
    
    return null;
  }, [activeCalc, calcInputs]);

  const handleAnswerChange = (qid: string, score: number, idx: number) => setAnswers(p => ({ ...p, [qid]: { score, optionIndex: idx } }));
  const handleToolChange = (id: string) => { setActiveToolId(id); setActiveCalcId(""); setAnswers({}); setShowClinicalTip(false); };
  const handleCalcChange = (id: string) => { 
    setActiveCalcId(id); 
    setActiveToolId(""); 
    setShowClinicalTip(false);
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
      setCalcInputs(initialInputs);
    } else {
      setCalcInputs({});
    }
  };
  const handleInputChange = (fid: string, v: string | number) => setCalcInputs(p => ({ ...p, [fid]: v }));
  const handleCopy = async (t: string) => { try { await navigator.clipboard.writeText(t); setCopyState("Kopiert!"); setTimeout(() => setCopyState(""), 2000); } catch { setCopyState("Feilet"); } };
  const handlePrint = (url: string) => { const w = window.open(url, "_blank"); if (w) w.onload = () => { w.focus(); w.print(); }; };
  
  const handleLinkDoubleClick = (boxId: string, itemId: string, currentLabel: string) => {
    setEditingLink({ boxId, itemId });
    setEditLabelValue(currentLabel);
  };

  const handleLabelSave = (boxId: string, itemId: string) => {
    if (editLabelValue.trim()) {
      setCustomLabels(p => ({ ...p, [`${boxId}-${itemId}`]: editLabelValue.trim() }));
    }
    setEditingLink(null);
    setEditLabelValue("");
  };

  const handleLabelCancel = () => {
    setEditingLink(null);
    setEditLabelValue("");
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

  const handlePostitDragStart = (boxId: string) => {
    setDraggedPostitBox(boxId);
  };

  const handlePostitDragOver = (e: React.DragEvent, boxId: string) => {
    e.preventDefault();
    if (!draggedPostitBox || draggedPostitBox === boxId) return;
    
    const currentOrder = [...postitBoxOrder];
    const draggedIdx = currentOrder.indexOf(draggedPostitBox);
    const targetIdx = currentOrder.indexOf(boxId);
    
    if (draggedIdx !== -1 && targetIdx !== -1) {
      currentOrder.splice(draggedIdx, 1);
      currentOrder.splice(targetIdx, 0, draggedPostitBox);
      setPostitBoxOrder(currentOrder);
    }
  };

  const handlePostitDragEnd = () => {
    setDraggedPostitBox(null);
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

  const handleRenameClick = (e: React.MouseEvent, boxId: string, itemId: string, currentLabel: string) => {
    e.preventDefault();
    e.stopPropagation();
    handleLinkDoubleClick(boxId, itemId, currentLabel);
  };

  const getFaviconUrl = (url: string) => {
    try {
      const host = new URL(url).hostname;
      return `https://www.google.com/s2/favicons?domain=${host}&sz=32`;
    } catch {
      return "";
    }
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
      // Reset verktøyvisning når fanen velges
      setActiveToolId("");
      setActiveCalcId("");
      setAnswers({});
      setCalcInputs({});
      setSearchQuery("");
      setShowSearch(false);
      setPsykiatriExpanded(false);
      setSomatikkExpanded(false);
      if (viewMode === "postit") {
        // Stay in postit mode when already there
      }
    }
    setActiveTab(tab);
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
        <span className="badge">MVP · Offline-støtte</span>
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

      {activeTab === "tools" && viewMode === "postit" && !activeToolId && !activeCalcId && (
        <div className="grid" style={{ marginTop: 20, gridTemplateColumns: '1fr' }}>
          <div style={{ marginTop: 20 }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 16 }}>
              {postitSections.map((section) => (
                <div
                  key={section.boxId}
                  draggable
                  onDragStart={() => handlePostitDragStart(section.boxId)}
                  onDragOver={(e) => handlePostitDragOver(e, section.boxId)}
                  onDragEnd={handlePostitDragEnd}
                  style={{ background: '#f8fafc', padding: 16, borderRadius: 8, boxShadow: '0 2px 4px rgba(0,0,0,0.1)', cursor: 'move', opacity: draggedPostitBox === section.boxId ? 0.5 : 1 }}
                >
                  <h3 className="postit-title">{section.title}</h3>
                  {section.items.map((item) => (
                    <button
                      key={item.id}
                      className="button"
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
                      style={{ marginBottom: 8, width: '100%', textAlign: 'left' }}
                    >
                      <div style={{ fontWeight: 600, fontSize: 14 }}>{item.label}</div>
                    </button>
                  ))}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {activeTab === "tools" && (viewMode === "category" || (viewMode === "postit" && (activeToolId || activeCalcId))) && (
        <div className="grid" style={{ marginTop: 20, gridTemplateColumns: (viewMode === "postit" && (activeToolId || activeCalcId)) ? '1fr' : '300px 1fr', gap: (viewMode === "postit" && (activeToolId || activeCalcId)) ? 0 : '20px' }}>
          {viewMode === "category" && (
          <div className="list" style={{ 
            maxHeight: 'calc(100vh - 200px)',
            overflowY: 'auto',
            position: 'sticky',
            top: '20px'
          }}>
            {viewMode === "category" && (<>
            <button 
              className="tool-category-toggle" 
              onClick={() => setSomatikkExpanded(!somatikkExpanded)}
              type="button"
            >
              <div style={{ fontWeight: 700 }}>Somatikk</div>
              <span style={{ fontSize: 18 }}>{somatikkExpanded ? "▼" : "▶"}</span>
            </button>
            {(somatikkExpanded || (searchQuery && filteredCalcs.length > 0)) && filteredCalcs.map(calc => (
              <button key={calc.id} className={`button ${calc.id === activeCalcId ? "primary" : ""}`} onClick={() => handleCalcChange(calc.id)}>
                <div style={{ fontWeight: 700 }}>{cleanName(calc.name)}</div>
                <div style={{ fontSize: 12, opacity: 0.8 }}>{calc.description}</div>
              </button>
            ))}
            <button 
              className="tool-category-toggle" 
              onClick={() => setPsykiatriExpanded(!psykiatriExpanded)}
              type="button"
            >
              <div style={{ fontWeight: 700 }}>Psykiatri</div>
              <span style={{ fontSize: 18 }}>{psykiatriExpanded ? "▼" : "▶"}</span>
            </button>
            {(psykiatriExpanded || (searchQuery && filteredTools.length > 0)) && filteredTools.map(tool => (
              <button key={tool.id} className={`button ${tool.id === activeToolId ? "primary" : ""}`} onClick={() => handleToolChange(tool.id)}>
                <div style={{ fontWeight: 700 }}>{cleanName(tool.name)}</div>
                <div style={{ fontSize: 12, opacity: 0.8 }}>{tool.description}</div>
              </button>
            ))}
            </>) }
          </div>
          )}

          <div className="form-section" style={(viewMode === "postit" && (activeToolId || activeCalcId)) ? { borderLeft: 'none', padding: 0 } : {}}>
            {activeTool ? (
              <div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <h2 style={{ margin: 0, fontSize: 20 }}>{activeTool.name}</h2>
                    <button
                      type="button"
                      onClick={() => setShowIndication(!showIndication)}
                      style={{
                        padding: '6px 12px',
                        background: showIndication ? '#8b5cf6' : '#a78bfa',
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
                      ℹ️ Indikasjon
                    </button>
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                  {activeTool.pdfUrl && (
                    <>
                      <a
                        href={activeTool.pdfUrl}
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
                        📄 PDF
                      </a>
                      <button
                        type="button"
                        onClick={() => handlePrint(activeTool.pdfUrl!)}
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
                    </>
                  )}
                </div>
                {showIndication && (
                  <div style={{
                    padding: 12,
                    background: '#f3f4f6',
                    borderRadius: 6,
                    marginBottom: 12,
                    fontSize: 13,
                    color: '#374151',
                    borderLeft: '3px solid #8b5cf6'
                  }}>
                    <strong>Indikasjon:</strong> {activeTool.description}
                  </div>
                )}
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
                          <label key={o.label} style={{ fontSize: 12 }}><input type="radio" name={q.id} checked={answers[q.id]?.optionIndex === oi} onChange={() => handleAnswerChange(q.id, o.score, oi)} /> {o.label}</label>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
                
                {/* Visual score indicator - always show for scoring tools */}
                {activeTool && (
                  <div style={{ margin: '20px 0' }}>
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
                        {scoreSummary ? `${scoreSummary.totalScore} / ${scoreSummary.maxScore}` : '0 / 0'}
                      </span>
                      <span>{scoreSummary?.maxScore ?? 0}</span>
                    </div>
                  </div>
                )}
                
                {scoreSummary && activeTool && (
                  <div style={{ marginTop: 12, display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: 12 }}>
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
                      </div>
                      <span className="badge" style={{ marginTop: 8 }}>{copyState || "Klar til kopiering"}</span>
                    </div>

                    <div
                      className="summary"
                      style={{
                        marginTop: 0,
                        borderColor: "#dc2626",
                        background: "#fef2f2"
                      }}
                    >
                      <div style={{ fontWeight: 700, color: "#b91c1c" }}>Videre råd</div>
                      <p style={{ marginTop: 10, color: "#b91c1c", fontWeight: 600 }}>
                        🔴 Medisinsk assistent (foreløpig)
                      </p>
                    </div>
                  </div>
                )}
              </div>
            ) : activeCalc ? (
              <div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <h2 style={{ margin: 0, fontSize: 20 }}>{activeCalc.name}</h2>
                    <button
                      type="button"
                      onClick={() => setShowIndication(!showIndication)}
                      style={{
                        padding: '6px 12px',
                        background: showIndication ? '#8b5cf6' : '#a78bfa',
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
                      ℹ️ Indikasjon
                    </button>
                    {activeCalc.id === "doak-dosing" && (
                      <button
                        type="button"
                        onClick={() => setShowClinicalTip(!showClinicalTip)}
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
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                  {activeCalc.pdfUrl && (
                    <>
                      <a
                        href={activeCalc.pdfUrl}
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
                        📄 PDF
                      </a>
                      <button
                        type="button"
                        onClick={() => handlePrint(activeCalc.pdfUrl!)}
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
                    </>
                  )}
                </div>
                {showIndication && (
                  <div style={{
                    padding: 12,
                    background: '#f3f4f6',
                    borderRadius: 6,
                    marginBottom: 12,
                    fontSize: 13,
                    color: '#374151',
                    borderLeft: '3px solid #8b5cf6'
                  }}>
                    <strong>Indikasjon:</strong> {activeCalc.description}
                  </div>
                )}
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
                <div style={{ maxWidth: activeCalc.layout === "horizontal" ? 1200 : 700, margin: '20px 0' }}>
                {activeCalc.fields.map((f, idx) => {
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
                        <input type="number" min={f.min} max={f.max} step={f.step ?? 1} value={calcInputs[f.id] ?? ""} onChange={e => handleInputChange(f.id, e.target.value)} />
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
                      onClick={() => setCalcInputs({})}
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
                
                {/* Visual score indicator for calculators - always show when thresholds exist (except BMI and FIB-4) */}
                {activeCalc && activeCalc.thresholds && activeCalc.thresholds.length > 0 && activeCalc.id !== 'bmi' && activeCalc.id !== 'fib4' && (
                  <div style={{ margin: '20px 0', maxWidth: 700 }}>
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
                        left: `${calcResult && calcResult.maxScore ? (calcResult.score / calcResult.maxScore) * 100 : 0}%`,
                        top: '50%',
                        transform: 'translate(-50%, -50%)',
                        width: '24px',
                        height: '24px',
                        borderRadius: '50%',
                        background: '#ffffff',
                        border: `4px solid ${calcResult?.color ?? '#9ca3af'}`,
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
                        {calcResult && calcResult.maxScore ? `${calcResult.score} / ${calcResult.maxScore}` : '0 / 0'}
                      </span>
                      <span>{calcResult?.maxScore ?? 0}</span>
                    </div>
                  </div>
                )}
                
                {calcResult && activeCalc && (
                  <div className="summary" style={{ borderColor: calcResult.color, marginTop: 20, maxWidth: 700 }}>
                    <div style={{ fontWeight: 700, color: calcResult.color }}>Resultat</div>
                    
                    {/* Visual score indicator for calculators */}
                    {calcResult.maxScore && (
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
                    
                    <p style={{ fontSize: 20, fontWeight: 700 }}>{calcResult.value} <span style={{ fontWeight: 400, fontSize: 16 }}>({calcResult.label})</span></p>
                    
                    {/* Guide text for FIB-4 */}
                    {calcResult.guideText && (
                      <div style={{
                        marginTop: 16,
                        padding: 16,
                        background: '#f3f4f6',
                        borderRadius: 8,
                        fontSize: 14,
                        whiteSpace: 'pre-line',
                        color: '#374151',
                        lineHeight: 1.6
                      }}>
                        {calcResult.guideText}
                      </div>
                    )}
                    
                    <div className="row" style={{ marginTop: 12, flexWrap: 'wrap' }}>
                      {activeCalc.id === 'bmi' ? (
                        <>
                          <button type="button" className="button primary" onClick={() => handleCopy(calcResult.text)}>Kopier BMI</button>
                          {calcResult.detailedText && (
                            <button type="button" className="button primary" onClick={() => handleCopy(calcResult.detailedText!)}>Kopier BMI, høyde og vekt</button>
                          )}
                        </>
                      ) : activeCalc.id === 'fib4' ? (
                        <>
                          <button type="button" className="button primary" onClick={() => handleCopy(calcResult.text)}>Kopier FIB-4</button>
                          {calcResult.detailedText && (
                            <button type="button" className="button primary" onClick={() => handleCopy(calcResult.detailedText!)}>Kopier FIB-4 med verdier</button>
                          )}
                        </>
                      ) : (activeCalc.id === 'ipss' || activeCalc.id === 'cat') ? (
                        <>
                          <button type="button" className="button primary" onClick={() => handleCopy(calcResult.text)}>Kopier totalskår</button>
                          {calcResult.detailedText && (
                            <button type="button" className="button primary" onClick={() => handleCopy(calcResult.detailedText!)}>Kopier totalskår med symptomskåring</button>
                          )}
                        </>
                      ) : (activeCalc.id === 'nyha' || activeCalc.id === 'ccs' || activeCalc.id === 'mmrc') ? (
                        <>
                          <button type="button" className="button primary" onClick={() => handleCopy(calcResult.text)}>Kopier skår</button>
                          {calcResult.detailedText && (
                            <button type="button" className="button primary" onClick={() => handleCopy(calcResult.detailedText!)}>Kopier skår og funksjonsbeskrivelse</button>
                          )}
                        </>
                      ) : (
                        <button type="button" className="button primary" onClick={() => handleCopy(calcResult.text)}>Kopier til journal</button>
                      )}
                      <span className="badge">{copyState || "Klar til kopiering"}</span>
                    </div>
                  </div>
                )}
              </div>
            ) : <div style={{ padding: 16 }}>Velg et verktøy fra venstre kolonne.</div>}
          </div>
        </div>
      )}

      {activeTab === "guides" && <ModernWidgetDashboard />}

      {activeTab === "medications" && (
        <div style={{ marginTop: 20, padding: 24 }}>
          <h2 style={{ marginBottom: 24, fontSize: 24, fontWeight: 700, color: '#1f2937' }}>Legemidler</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: 20 }}>
            <div style={{
              padding: 20,
              border: '1px solid #e5e7eb',
              borderRadius: 12,
              background: '#f9fafb',
              textAlign: 'center'
            }}>
              <h3 style={{ marginBottom: 12, fontSize: 18, fontWeight: 600, color: '#1f2937' }}>💊 Nyresvikt</h3>
              <p style={{ marginBottom: 16, fontSize: 14, color: '#6b7280' }}>Dosejustering ved redusert nyrefunksjon</p>
              <a
                href="#"
                style={{
                  padding: '8px 16px',
                  background: '#0891b2',
                  color: 'white',
                  borderRadius: 6,
                  fontSize: 12,
                  fontWeight: 600,
                  textDecoration: 'none',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 4,
                  transition: 'all 0.2s ease'
                }}
                onMouseOver={(e) => e.currentTarget.style.background = '#06b6d4'}
                onMouseOut={(e) => e.currentTarget.style.background = '#0891b2'}
              >
                📄 PDF
              </a>
            </div>
            <div style={{
              padding: 20,
              border: '1px solid #e5e7eb',
              borderRadius: 12,
              background: '#f9fafb',
              textAlign: 'center'
            }}>
              <h3 style={{ marginBottom: 12, fontSize: 18, fontWeight: 600, color: '#1f2937' }}>👴 Eldre (over 70 år)</h3>
              <p style={{ marginBottom: 16, fontSize: 14, color: '#6b7280' }}>Spesielle hensyn ved dosering til eldre pasienter</p>
              <a
                href="#"
                style={{
                  padding: '8px 16px',
                  background: '#0891b2',
                  color: 'white',
                  borderRadius: 6,
                  fontSize: 12,
                  fontWeight: 600,
                  textDecoration: 'none',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 4,
                  transition: 'all 0.2s ease'
                }}
                onMouseOver={(e) => e.currentTarget.style.background = '#06b6d4'}
                onMouseOut={(e) => e.currentTarget.style.background = '#0891b2'}
              >
                📄 PDF
              </a>
            </div>
            <div style={{
              padding: 20,
              border: '1px solid #e5e7eb',
              borderRadius: 12,
              background: '#f9fafb',
              textAlign: 'center'
            }}>
              <h3 style={{ marginBottom: 12, fontSize: 18, fontWeight: 600, color: '#1f2937' }}>🔗 Vanlige interaksjoner</h3>
              <p style={{ marginBottom: 16, fontSize: 14, color: '#6b7280' }}>Viktige legemiddelinteraksjoner å vurdere</p>
              <a
                href="#"
                style={{
                  padding: '8px 16px',
                  background: '#0891b2',
                  color: 'white',
                  borderRadius: 6,
                  fontSize: 12,
                  fontWeight: 600,
                  textDecoration: 'none',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 4,
                  transition: 'all 0.2s ease'
                }}
                onMouseOver={(e) => e.currentTarget.style.background = '#06b6d4'}
                onMouseOut={(e) => e.currentTarget.style.background = '#0891b2'}
              >
                📄 PDF
              </a>
            </div>
          </div>
        </div>
      )}

      {activeTab === "calendar" && (
        <div className="calc-hub">
          <div className="calc-toggle" style={{ marginTop: 16 }}>
            <button
              type="button"
              className={`calc-toggle-button ${calcTab === "date" ? "active" : ""}`}
              onClick={() => setCalcTab("date")}
            >
              Datokalkulator
            </button>
            <button
              type="button"
              className={`calc-toggle-button ${calcTab === "med" ? "active" : ""}`}
              onClick={() => setCalcTab("med")}
            >
              Legemiddelberegner
            </button>
            <button
              type="button"
              className={`calc-toggle-button ${calcTab === "tapering" ? "active" : ""}`}
              onClick={() => setCalcTab("tapering")}
            >
              Nedtrappingsplan
            </button>
            <button
              type="button"
              className={`calc-toggle-button ${calcTab === "pregnancy" ? "active" : ""}`}
              onClick={() => setCalcTab("pregnancy")}
            >
              Svangerskap
            </button>
          </div>

          <div className={`calc-grid ${calcTab === "pregnancy" ? "" : "calc-grid-single"}`}>
            {calcTab === "date" && (
            <section className="calc-card">
              <div className="calc-card-header">
                <h3>Datokalkulator</h3>
                <p>Regn ut datoer frem eller tilbake i tid.</p>
              </div>

              <div className="calc-form">
                <div className="calc-field">
                  <label>Startdato</label>
                  <div className="calc-field-stack">
                    <DatePickerField
                      value={dateCalcStart}
                      onChange={setDateCalcStart}
                      ariaLabel="Velg startdato"
                    />
                  </div>
                </div>

                <div className="calc-field">
                  <label>Retning</label>
                  <div className="calc-toggle">
                    <button
                      type="button"
                      className={`calc-toggle-button ${dateCalcDirection === "forward" ? "active" : ""}`}
                      onClick={() => setDateCalcDirection("forward")}
                    >
                      Frem
                    </button>
                    <button
                      type="button"
                      className={`calc-toggle-button ${dateCalcDirection === "backward" ? "active" : ""}`}
                      onClick={() => setDateCalcDirection("backward")}
                    >
                      Tilbake
                    </button>
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
                    onChange={(event) => setDateCalcInline(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter") {
                        setDateCalcInline(event.currentTarget.value);
                      }
                    }}
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
                  <button
                    type="button"
                    className="button primary"
                    disabled={!dateCalcResult}
                    onClick={() => {
                      if (!dateCalcResult) return;
                      const diffText = `${dateCalcResult.dayDiff >= 0 ? "+" : ""}${dateCalcResult.dayDiff} dager`;
                      handleCopy(
                        `Resultat: ${dateCalcResult.dateText} (${dateCalcResult.weekday}, uke ${dateCalcResult.weekNumber}) (${diffText})`
                      );
                    }}
                  >
                    Kopier
                  </button>
                  <span className="badge">{copyState || "Klar til kopiering"}</span>
                </div>
              </div>
            </section>
            )}

            {calcTab === "med" && (
            <section className="calc-card">
              <div className="calc-card-header">
                <h3>Legemiddelberegner</h3>
                <p>Nyttige utregninger i forbindelse med legemiddelutskrivelse.</p>
              </div>

              <div className="calc-subgrid">
                <div className="calc-subcard">
                  <div className="calc-subtitle">Reseptvarighet</div>
                  <div className="calc-subdescription" style={{ marginTop: -2, marginBottom: 4 }}>
                    Regn ut hvor lenge resepten varer med anbefalt bruk
                  </div>
                  <div className="calc-form">
                    <div className="calc-field">
                      <label>Utleveringsdato</label>
                      <div className="calc-field-stack">
                        <DatePickerField
                          value={medStartDate}
                          onChange={setMedStartDate}
                          ariaLabel="Velg dato utlevert"
                        />
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
                          onChange={(event) => setMedUnits(event.target.value)}
                          onFocus={(event) => event.currentTarget.select()}
                          onClick={(event) => event.currentTarget.select()}
                          style={{ paddingRight: 40 }}
                        />
                        <button
                          type="button"
                          aria-label="Vis forslag til antall tabletter"
                          onClick={() => setShowMedUnitsPicker((prev) => !prev)}
                          style={{
                            position: "absolute",
                            right: 8,
                            top: "50%",
                            transform: "translateY(-50%)",
                            border: "none",
                            background: "transparent",
                            color: "#6b7280",
                            fontSize: 14,
                            cursor: "pointer",
                            padding: "4px 6px",
                            lineHeight: 1
                          }}
                        >
                          ▾
                        </button>
                        {showMedUnitsPicker && (
                          <div
                            style={{
                              position: "absolute",
                              top: "calc(100% + 6px)",
                              left: 0,
                              right: 0,
                              border: "1px solid rgba(221, 227, 238, 0.9)",
                              borderRadius: 10,
                              background: "#ffffff",
                              boxShadow: "0 10px 20px rgba(15, 23, 42, 0.12)",
                              padding: 6,
                              display: "grid",
                              gap: 4,
                              zIndex: 15
                            }}
                          >
                            {["5", "10", "15", "20", "25", "50", "100"].map((option) => (
                              <button
                                key={option}
                                type="button"
                                onMouseDown={(event) => event.preventDefault()}
                                onClick={() => {
                                  setMedUnits(option);
                                  setShowMedUnitsPicker(false);
                                }}
                                style={{
                                  border: "none",
                                  background: medUnits === option ? "#f3f4f6" : "transparent",
                                  borderRadius: 8,
                                  padding: "8px 10px",
                                  textAlign: "left",
                                  cursor: "pointer",
                                  fontSize: 14,
                                  color: "#111827"
                                }}
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
                      <input
                        type="text"
                        inputMode="decimal"
                        className="calc-input"
                        value={medDosePerDay}
                        onChange={(event) => setMedDosePerDay(event.target.value)}
                        onFocus={(event) => event.currentTarget.select()}
                        onClick={(event) => event.currentTarget.select()}
                      />
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
                          onChange={(event) => {
                            const checked = event.target.checked;
                            setCopyToJournal(checked);
                            if (checked) setGeneratePatientMessage(false);
                          }}
                        />
                        Kopier til journal.
                      </label>
                    </div>
                    <div className="calc-field">
                      <label className="pregnancy-checkbox-label">
                        <input
                          type="checkbox"
                          checked={generatePatientMessage}
                          onChange={(event) => {
                            const checked = event.target.checked;
                            setGeneratePatientMessage(checked);
                            if (checked) setCopyToJournal(false);
                          }}
                        />
                        Generer melding til pasient.
                      </label>
                    </div>
                    {copyToJournal && medDurationResult && (
                      <div className="calc-output-meta" style={{ display: "grid", gap: 6 }}>
                        <span>{medJournalMessage}</span>
                      </div>
                    )}
                    {generatePatientMessage && medDurationResult && (
                      <div className="calc-output-meta" style={{ display: "grid", gap: 6 }}>
                        <span>{medPatientMessage}</span>
                      </div>
                    )}
                    <div className="calc-output-actions">
                      <button
                        type="button"
                        className="button primary"
                        disabled={!medDurationResult}
                        onClick={() => {
                          if (!medDurationResult) return;
                          if (generatePatientMessage) {
                            handleCopy(medPatientMessage);
                            return;
                          }
                          handleCopy(medJournalMessage);
                        }}
                      >
                        Kopier
                      </button>
                      <span className="badge">{copyState || "Klar til kopiering"}</span>
                    </div>
                  </div>
                </div>

                <div className="calc-subcard">
                  <div className="calc-subtitle">Gjennomsnittsforbruk</div>
                  <div className="calc-subdescription" style={{ marginTop: -18, marginBottom: 2 }}>
                    Regn ut gjennomsnittforbruk av legemiddel mellom to datoer
                  </div>
                  <div className="calc-form">
                    <div className="calc-field">
                      <label>Dato</label>
                      <div className="calc-field-stack">
                        <DatePickerField
                          value={avgPrevDate}
                          onChange={setAvgPrevDate}
                          ariaLabel="Velg forrige uthentingsdato"
                        />
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
                          onChange={(event) => setAvgPrevUnits(event.target.value)}
                          onFocus={(event) => event.currentTarget.select()}
                          onClick={(event) => event.currentTarget.select()}
                          placeholder="Antall tabletter"
                          style={{ paddingRight: 40 }}
                        />
                        <button
                          type="button"
                          aria-label="Vis forslag til antall tabletter"
                          onClick={() => setShowAvgUnitsPicker((prev) => !prev)}
                          style={{
                            position: "absolute",
                            right: 8,
                            top: "50%",
                            transform: "translateY(-50%)",
                            border: "none",
                            background: "transparent",
                            color: "#6b7280",
                            fontSize: 14,
                            cursor: "pointer",
                            padding: "4px 6px",
                            lineHeight: 1
                          }}
                        >
                          ▾
                        </button>
                        {showAvgUnitsPicker && (
                          <div
                            style={{
                              position: "absolute",
                              top: "calc(100% + 6px)",
                              left: 0,
                              right: 0,
                              border: "1px solid rgba(221, 227, 238, 0.9)",
                              borderRadius: 10,
                              background: "#ffffff",
                              boxShadow: "0 10px 20px rgba(15, 23, 42, 0.12)",
                              padding: 6,
                              display: "grid",
                              gap: 4,
                              zIndex: 15
                            }}
                          >
                            {["5", "10", "15", "20", "25", "50", "100"].map((option) => (
                              <button
                                key={option}
                                type="button"
                                onMouseDown={(event) => event.preventDefault()}
                                onClick={() => {
                                  setAvgPrevUnits(option);
                                  setShowAvgUnitsPicker(false);
                                }}
                                style={{
                                  border: "none",
                                  background: avgPrevUnits === option ? "#f3f4f6" : "transparent",
                                  borderRadius: 8,
                                  padding: "8px 10px",
                                  textAlign: "left",
                                  cursor: "pointer",
                                  fontSize: 14,
                                  color: "#111827"
                                }}
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
                      <DatePickerField
                        value={avgNextDate}
                        onChange={setAvgNextDate}
                        ariaLabel="Velg neste uthentingsdato"
                      />
                    </div>
                  </div>

                  <div className="calc-output">
                    <div className="calc-output-title">Resultat</div>
                    {avgUsageResult && "error" in avgUsageResult ? (
                      <div className="calc-error">{avgUsageResult.error}</div>
                    ) : (
                      <>
                        <div className="calc-output-main">
                          {avgUsageResult ? `Snittforbruk: ${avgUsageResult.daily.toFixed(1)} enheter/dag` : "Angi verdier for å se resultat."}
                        </div>
                      </>
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
            )}

            {calcTab === "pregnancy" && (
            <>
            <section className="calc-card">
              <div className="calc-card-header">
                <h3>Svangerskapskalkulator</h3>
                <p>Enkel beregning av termin, svangerskapsalder og sannsynlig befruktning.</p>
              </div>

              <div className="calc-form">
                <div className="calc-field">
                  <label>Første dag i siste menstruasjon</label>
                  <div className="calc-field-stack">
                    <DatePickerField
                      value={pregnancyDate}
                      onChange={setPregnancyDate}
                      ariaLabel="Velg første dag i siste menstruasjon"
                    />
                    <button type="button" className="button calc-inline-button" onClick={() => setPregnancyDate(getTodayIso())}>
                      I dag
                    </button>
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
                  <select
                    className="calc-select"
                    value={pregnancyPara}
                    onChange={(event) => setPregnancyPara(event.target.value)}
                  >
                    <option value="">Velg para</option>
                    {[0, 1, 2, 3, 4, 5, 6].map((value) => (
                      <option key={value} value={String(value)}>
                        {value}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="calc-field">
                  <label>LMP</label>
                  <input
                    type="text"
                    className="calc-input"
                    value={pregnancyResult ? formatNorwegianDate(pregnancyResult.lmpDate) : ""}
                    readOnly
                    placeholder="Autofylles fra kalkulator"
                  />
                </div>

                <div className="calc-field">
                  <label>Termin beregnet fra LMP</label>
                  <input
                    type="text"
                    className="calc-input"
                    value={pregnancyResult ? formatNorwegianDate(pregnancyResult.eddDate) : ""}
                    readOnly
                    placeholder="Autofylles fra kalkulator"
                  />
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: 10 }}>
                  <div className="calc-field" style={{ margin: 0 }}>
                    <label>Vekt (kg)</label>
                    <input
                      type="text"
                      inputMode="decimal"
                      className="calc-input"
                      value={pregnancyWeightKg}
                      onChange={(event) => setPregnancyWeightKg(event.target.value)}
                      placeholder="Velg eller skriv vekt"
                    />
                  </div>

                  <div className="calc-field" style={{ margin: 0 }}>
                    <label>Høyde (cm)</label>
                    <input
                      type="text"
                      inputMode="decimal"
                      className="calc-input"
                      value={pregnancyHeightCm}
                      onChange={(event) => setPregnancyHeightCm(event.target.value)}
                      placeholder="Velg eller skriv høyde"
                    />
                  </div>

                  <div className="calc-field" style={{ margin: 0 }}>
                    <label>BMI</label>
                    <input
                      type="text"
                      className="calc-input"
                      value={pregnancyBmi !== null ? pregnancyBmi.toFixed(1) : ""}
                      readOnly
                      placeholder="BMI"
                    />
                  </div>
                </div>

                <div className="calc-field">
                  <label>Sykehistorie</label>
                  <textarea
                    className="calc-input pregnancy-textarea"
                    rows={1}
                    value={pregnancyMedicalHistory}
                    onChange={(event) => setPregnancyMedicalHistory(event.target.value)}
                    placeholder="Beskriv relevant sykehistorie"
                  />
                </div>

                <div className="calc-field">
                  <label>Psykisk</label>
                  <textarea
                    className="calc-input pregnancy-textarea"
                    rows={1}
                    value={pregnancyMentalHealth}
                    onChange={(event) => setPregnancyMentalHealth(event.target.value)}
                    placeholder="Risiko for psykisk uhelse"
                  />
                </div>

                <div className="calc-field">
                  <label>Medisiner</label>
                  <textarea
                    className="calc-input pregnancy-textarea"
                    rows={1}
                    value={pregnancyMedications}
                    onChange={(event) => setPregnancyMedications(event.target.value)}
                    placeholder="Spesielt relevante medisiner? Medisinliste følger også med EPJ-henvisningen"
                  />
                </div>

                <div className="calc-field">
                  <label>Andre spesielle forhold som bør bemerkes?</label>
                  <textarea
                    className="calc-input pregnancy-textarea"
                    rows={1}
                    value={pregnancyOtherConditions}
                    onChange={(event) => setPregnancyOtherConditions(event.target.value)}
                    placeholder="F.eks tidligere vanskelige fødsler."
                  />
                </div>

                <div className="calc-field pregnancy-risk-row">
                  <label className="pregnancy-checkbox-label">
                    <input
                      type="checkbox"
                      checked={pregnancyRiskPregnancy}
                      onChange={(event) => setPregnancyRiskPregnancy(event.target.checked)}
                    />
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
                  <button
                    type="button"
                    className="button primary"
                    onClick={() => handleCopy(pregnancyReferralText)}
                  >
                    Kopier
                  </button>
                  <span className="badge">{copyState || "Klar til kopiering"}</span>
                </div>
              </div>
            </section>
            </>
            )}

            {calcTab === "tapering" && (
            <section className="calc-card">
              <div className="calc-card-header">
                <h3>Nedtrappingsplan</h3>
              </div>
            </section>
            )}
          </div>

          <p className="calc-footer-note">Beslutningsstøtte – kontroller ved behov</p>
        </div>
      )}

      {activeTab === "patientinfo" && <div style={{ marginTop: 20, padding: 24, textAlign: "center" }}><p>Pasientinformasjon kommer snart.</p></div>}
      
      {activeTab === "chatgpt" && <ChatGPTPrompt />}
    </section>
  );
}
