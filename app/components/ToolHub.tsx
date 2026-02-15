
"use client";

import { useMemo, useState, useEffect } from "react";
import scoringTools from "@/data/scoring-tools.json";
import calculators from "@/data/calculators.json";
import ComboBox from "./ComboBox";
import ChatGPTPrompt from "./ChatGPTPrompt";

interface ToolOption { label: string; score: number; }
interface ToolQuestion { id: string; text: string; options: ToolOption[]; part?: string; }
interface ToolThreshold { minScore: number; label: string; color?: string; }
interface ScoringTool { id: string; name: string; description: string; questions: ToolQuestion[]; thresholds: ToolThreshold[]; pdfUrl?: string; }
interface CalcField { id: string; label: string; type: "number" | "select"; min?: number; max?: number; step?: number; options?: string[]; part?: string; }
interface CalcThreshold { max: number; label: string; color: string; }
interface Calculator { id: string; name: string; description: string; fields: CalcField[]; thresholds: CalcThreshold[]; layout?: "horizontal" | "vertical-select"; pdfUrl?: string; }
interface LinkItem { id: string; label: string; url: string; }
interface LinkBox { id: string; title: string; items: LinkItem[]; }

type TabKey = "tools" | "chatgpt" | "guides" | "patientinfo" | "medications" | "calendar";
const tabs: Record<TabKey, string> = { tools: "Verktøy", chatgpt: "KI-assistent", guides: "Lenker og PDFer", patientinfo: "Pasientinformasjon", medications: "Legemidler", calendar: "Kalender" };

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
  const [activeTab, setActiveTab] = useState<TabKey>(initialTab ?? "tools");
  const [activeToolId, setActiveToolId] = useState(initialTool ?? "");
  const [activeCalcId, setActiveCalcId] = useState(initialTool ? "" : (initialCalc ?? ""));
  const [answers, setAnswers] = useState<Record<string, { score: number; optionIndex: number }>>({});
  const [calcInputs, setCalcInputs] = useState<Record<string, string | number>>({});
  const [copyState, setCopyState] = useState("");
  const [psykiatriExpanded, setPsykiatriExpanded] = useState(false);
  const [somatikkExpanded, setSomatikkExpanded] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [showSearch, setShowSearch] = useState(false);
  const [viewMode, setViewMode] = useState<"category" | "postit">("category");
  const [pdfVersion, setPdfVersion] = useState<"a" | "b">("a");
  const [collapsedBoxes, setCollapsedBoxes] = useState<Record<string, boolean>>({});
  const [editingLink, setEditingLink] = useState<{ boxId: string; itemId: string } | null>(null);
  const [editLabelValue, setEditLabelValue] = useState("");
  const [linkBoxOrder, setLinkBoxOrder] = useState<string[]>([]);
  const [draggedBox, setDraggedBox] = useState<string | null>(null);
  const [postitBoxOrder, setPostitBoxOrder] = useState<string[]>(['generelle', 'psykiatri', 'kardiologi', 'lungemedisin', 'hematologi', 'gastromedisin', 'urologi', 'revmatologi']);
  const [draggedItem, setDraggedItem] = useState<{ boxId: string; itemId: string } | null>(null);
  const [draggedPostitBox, setDraggedPostitBox] = useState<string | null>(null);
  const [showIndication, setShowIndication] = useState(false);
  const [calendarBaseYear, setCalendarBaseYear] = useState(() => String(new Date().getFullYear()));
  const [calendarBaseMonth, setCalendarBaseMonth] = useState(() => String(new Date().getMonth() + 1));
  const [calendarBaseDay, setCalendarBaseDay] = useState(() => String(new Date().getDate()));
  const [calendarYears, setCalendarYears] = useState<string>("0");
  const [calendarMonths, setCalendarMonths] = useState<string>("0");
  const [calendarWeeks, setCalendarWeeks] = useState<string>("0");
  const [calendarDays, setCalendarDays] = useState<string>("0");
  const [calendarResult, setCalendarResult] = useState<string>("");
  const [calendarAction, setCalendarAction] = useState<string>("");

  const [customLabels, setCustomLabels] = useState<Record<string, string>>({});
  const [customItemOrder, setCustomItemOrder] = useState<Record<string, string[]>>({});

  const sortedTools = useMemo(() => 
    [...(scoringTools as ScoringTool[])],
    []
  );
  
  const sortedCalcs = useMemo(() => 
    [...(calculators as Calculator[])],
    []
  );

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

  const cleanName = (name: string) => name.replace(/\s*\([^)]*\)\s*/g, '').trim();

  const parseBaseDate = () => {
    const year = Number(calendarBaseYear);
    const month = Number(calendarBaseMonth);
    const day = Number(calendarBaseDay);
    if (!year || !month || !day) return null;
    const lastDay = new Date(Date.UTC(year, month, 0)).getUTCDate();
    if (day > lastDay) return null;
    return { year, month, day };
  };

  const formatDateYmd = (year: number, month: number, day: number) => (
    `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`
  );

  const addDays = (year: number, month: number, day: number, days: number) => {
    const date = new Date(Date.UTC(year, month - 1, day));
    date.setUTCDate(date.getUTCDate() + days);
    return { year: date.getUTCFullYear(), month: date.getUTCMonth() + 1, day: date.getUTCDate() };
  };

  const addMonths = (year: number, month: number, day: number, months: number) => {
    const totalMonths = year * 12 + (month - 1) + months;
    const targetYear = Math.floor(totalMonths / 12);
    const targetMonth = totalMonths % 12;
    const lastDay = new Date(Date.UTC(targetYear, targetMonth + 1, 0)).getUTCDate();
    const clampedDay = Math.min(day, lastDay);
    return { year: targetYear, month: targetMonth + 1, day: clampedDay };
  };

  const yearOptions = useMemo(() => {
    const currentYear = new Date().getFullYear();
    return Array.from({ length: 21 }, (_, i) => String(currentYear - 10 + i));
  }, []);
  const monthOptions = useMemo(() => Array.from({ length: 12 }, (_, i) => String(i + 1)), []);
  const dayOptions = useMemo(() => Array.from({ length: 31 }, (_, i) => String(i + 1)), []);
  const deltaYearOptions = useMemo(() => Array.from({ length: 11 }, (_, i) => String(i)), []);
  const deltaMonthOptions = useMemo(() => Array.from({ length: 25 }, (_, i) => String(i)), []);
  const deltaWeekOptions = useMemo(() => Array.from({ length: 53 }, (_, i) => String(i)), []);
  const deltaDayOptions = useMemo(() => Array.from({ length: 32 }, (_, i) => String(i)), []);

  const applyCalendarShift = (direction: "add" | "subtract") => {
    const parsed = parseBaseDate();
    if (!parsed) {
      setCalendarResult("");
      setCalendarAction("");
      return;
    }

    const years = Number(calendarYears) || 0;
    const months = Number(calendarMonths) || 0;
    const weeks = Number(calendarWeeks) || 0;
    const days = Number(calendarDays) || 0;

    const sign = direction === "add" ? 1 : -1;
    const monthDelta = sign * (years * 12 + months);
    const dayDelta = sign * (weeks * 7 + days);

    const afterMonths = addMonths(parsed.year, parsed.month, parsed.day, monthDelta);
    const afterDays = addDays(afterMonths.year, afterMonths.month, afterMonths.day, dayDelta);

    setCalendarResult(formatDateYmd(afterDays.year, afterDays.month, afterDays.day));
    setCalendarAction(`${direction === "add" ? "Legg til" : "Trekk fra"} ${years} år, ${months} mnd, ${weeks} uker, ${days} dager`);
  };

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
    }
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
      const indication = String(calcInputs["indication"]);
      const age80 = calcInputs["age"] === "Ja";
      const weight60 = calcInputs["weight"] === "Ja";
      const creat133 = calcInputs["creatinine"] === "Ja";
      const gfr = String(calcInputs["gfr"]);
      
      if (!doakType || !indication || !gfr) return null;
      
      let dosing = "";
      let guideText = "";
      
      // Apixaban (Eliquis)
      if (doakType.includes("Apixaban")) {
        if (indication === "Atrieflimmer") {
          // Standard: 5 mg x 2, redusert hvis 2 av 3: alder ≥80, vekt ≤60, kreatinin ≥133
          const reducedCriteria = [age80, weight60, creat133].filter(Boolean).length;
          if (gfr === "<15") {
            dosing = "Kontraindisert ved GFR <15";
          } else if (reducedCriteria >= 2) {
            dosing = "2,5 mg x 2";
          } else {
            dosing = "5 mg x 2";
          }
          guideText = "Atrieflimmer:\n• Standard: 5 mg x 2\n• Redusert (2,5 mg x 2) hvis minst 2 av:\n  - Alder ≥80 år\n  - Vekt ≤60 kg\n  - S-kreatinin ≥133 µmol/L\n• Kontraindisert ved GFR <15";
        } else if (indication === "DVT/LE behandling") {
          if (gfr === "<15") {
            dosing = "Kontraindisert ved GFR <15";
          } else {
            dosing = "10 mg x 2 i 7 dager, deretter 5 mg x 2";
          }
          guideText = "DVT/LE behandling:\n• 10 mg x 2 i 7 dager\n• Deretter 5 mg x 2\n• Kontraindisert ved GFR <15";
        } else {
          if (gfr === "<15") {
            dosing = "Kontraindisert ved GFR <15";
          } else {
            dosing = "2,5 mg x 2";
          }
          guideText = "DVT/LE profylakse:\n• 2,5 mg x 2\n• Kontraindisert ved GFR <15";
        }
      }
      
      // Rivaroxaban (Xarelto)
      else if (doakType.includes("Rivaroxaban")) {
        if (indication === "Atrieflimmer") {
          if (gfr === "<15") {
            dosing = "Kontraindisert ved GFR <15";
          } else if (gfr === "15-30") {
            dosing = "15 mg x 1 (til mat)";
          } else {
            dosing = "20 mg x 1 (til mat)";
          }
          guideText = "Atrieflimmer:\n• GFR >50: 20 mg x 1 (til mat)\n• GFR 15-50: 15 mg x 1 (til mat)\n• Kontraindisert ved GFR <15";
        } else if (indication === "DVT/LE behandling") {
          if (gfr === "<15") {
            dosing = "Kontraindisert ved GFR <15";
          } else if (gfr === "15-30") {
            dosing = "15 mg x 2 i 21 dager (til mat), deretter 15 mg x 1";
          } else {
            dosing = "15 mg x 2 i 21 dager (til mat), deretter 20 mg x 1";
          }
          guideText = "DVT/LE behandling:\n• GFR >30: 15 mg x 2 i 21 dager (til mat), deretter 20 mg x 1\n• GFR 15-30: 15 mg x 2 i 21 dager, deretter 15 mg x 1\n• Kontraindisert ved GFR <15";
        } else {
          if (gfr === "<15") {
            dosing = "Kontraindisert ved GFR <15";
          } else {
            dosing = "10 mg x 1";
          }
          guideText = "DVT/LE profylakse:\n• 10 mg x 1\n• Kontraindisert ved GFR <15";
        }
      }
      
      // Edoxaban (Lixiana)
      else if (doakType.includes("Edoxaban")) {
        if (indication === "Atrieflimmer") {
          if (gfr === "<15") {
            dosing = "Kontraindisert ved GFR <15";
          } else if (weight60 || gfr === "15-30") {
            dosing = "30 mg x 1";
          } else {
            dosing = "60 mg x 1";
          }
          guideText = "Atrieflimmer:\n• Standard: 60 mg x 1\n• Redusert (30 mg x 1) hvis:\n  - Vekt ≤60 kg, eller\n  - GFR 15-50\n• Kontraindisert ved GFR <15";
        } else {
          if (gfr === "<15") {
            dosing = "Kontraindisert ved GFR <15";
          } else if (weight60 || gfr === "15-30") {
            dosing = "30 mg x 1 (etter 5-10 dager parenteral behandling)";
          } else {
            dosing = "60 mg x 1 (etter 5-10 dager parenteral behandling)";
          }
          guideText = "DVT/LE:\n• Start etter 5-10 dager parenteral behandling\n• Standard: 60 mg x 1\n• Redusert (30 mg x 1) hvis vekt ≤60 kg eller GFR 15-50\n• Kontraindisert ved GFR <15";
        }
      }
      
      // Dabigatran (Pradaxa)
      else if (doakType.includes("Dabigatran")) {
        if (indication === "Atrieflimmer") {
          if (gfr === "<30") {
            dosing = "Kontraindisert ved GFR <30";
          } else if (gfr === "30-50" || age80) {
            dosing = "110 mg x 2 (150 mg x 2 kan vurderes hvis lav blødningsrisiko)";
          } else {
            dosing = "150 mg x 2";
          }
          guideText = "Atrieflimmer:\n• Standard: 150 mg x 2\n• Redusert (110 mg x 2) hvis:\n  - Alder ≥80 år, eller\n  - GFR 30-50, eller\n  - Økt blødningsrisiko\n• Kontraindisert ved GFR <30";
        } else {
          if (gfr === "<30") {
            dosing = "Kontraindisert ved GFR <30";
          } else {
            dosing = "150 mg x 2 (etter 5-10 dager parenteral behandling)";
          }
          guideText = "DVT/LE:\n• Start etter 5-10 dager parenteral behandling\n• 150 mg x 2\n• Kontraindisert ved GFR <30";
        }
      }
      
      const detailedText = `DOAK-dosering\nPreparat: ${doakType}\nIndikasjon: ${indication}\nGFR: ${gfr} ml/min\n\nAnbefalt dosering:\n${dosing}`;
      
      return {
        value: dosing || "Velg alle parametere",
        label: indication,
        color: "#0891b2",
        text: `${doakType} for ${indication}: ${dosing}`,
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
  const handleToolChange = (id: string) => { setActiveToolId(id); setActiveCalcId(""); setAnswers({}); };
  const handleCalcChange = (id: string) => { 
    setActiveCalcId(id); 
    setActiveToolId(""); 
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
      // When clicking on "Verktøy" tab, reset like home button
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

  const handleHomeClick = () => {
    setActiveTab("tools");
    setActiveToolId("");
    setActiveCalcId("");
    setAnswers({});
    setCalcInputs({});
    setSearchQuery("");
    setShowSearch(false);
    setPsykiatriExpanded(false);
    setSomatikkExpanded(false);
    setViewMode("category");
  };

  return (
    <section className={noSectionBackground ? undefined : "section"}>
      <div className="row" style={{ gap: 8, marginBottom: 12 }}>
        <button
          style={{
            padding: '8px 16px',
            borderRadius: 6,
            border: '1px solid rgba(0,0,0,0.1)',
            background: 'white',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            fontSize: 14,
            fontWeight: 500,
            transition: 'all 0.2s ease'
          }}
          onClick={handleHomeClick}
          type="button"
          title="Tilbake til forsiden"
        >
          <span>🏠</span>
          <span>Hjem</span>
        </button>
        <button
          style={{
            padding: '8px 16px',
            borderRadius: 6,
            border: '1px solid rgba(0,0,0,0.1)',
            background: showSearch ? '#f0f0f0' : 'white',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            fontSize: 14,
            fontWeight: 500,
            transition: 'all 0.2s ease'
          }}
          onClick={() => setShowSearch(!showSearch)}
          type="button"
          title="Søk"
        >
          <span>🔍</span>
          <span>Søk</span>
        </button>
      </div>
      {showSearch && (
        <div style={{ marginBottom: 12 }}>
          <input
            type="text"
            placeholder="Søk etter verktøy..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              width: '100%',
              padding: '10px 12px',
              borderRadius: 6,
              border: '1px solid rgba(0,0,0,0.2)',
              fontSize: 14
            }}
            autoFocus
          />
        </div>
      )}
      <div className="row" style={{ justifyContent: "space-between" }}>
        <div className="tabbar" role="tablist">
          {Object.entries(tabs).map(([k, l]) => (
            <button key={k} type="button" className={`tab ${activeTab === k ? "active" : ""}`} onClick={() => handleTabChange(k as TabKey)} role="tab" aria-selected={activeTab === k}>{l}</button>
          ))}
        </div>
        <span className="badge">MVP · Offline-støtte</span>
      </div>
      {activeTab === "tools" && (
        <div style={{ marginTop: 12 }}>
          <button
            style={{
              padding: '6px 12px',
              borderRadius: 6,
              border: '1px solid rgba(0,0,0,0.2)',
              background: 'white',
              cursor: 'pointer',
              fontSize: 13,
              fontWeight: 500
            }}
            onClick={() => {
              setViewMode("category");
              setActiveToolId("");
              setActiveCalcId("");
              setAnswers({});
              setCalcInputs({});
              setPsykiatriExpanded(false);
              setSomatikkExpanded(false);
            }}
            type="button"
          >
            📂 Kategorivisning
          </button>
          <button
            style={{
              padding: '8px 16px',
              borderRadius: 6,
              border: '1px solid rgba(0,0,0,0.2)',
              background: viewMode === "postit" ? '#f0f0f0' : 'white',
              cursor: 'pointer',
              fontSize: 13,
              fontWeight: 500
            }}
            onClick={() => {
              setViewMode("postit");
              setActiveToolId("");
              setActiveCalcId("");
              setAnswers({});
              setCalcInputs({});
            }}
            type="button"
          >
            📋 Fagfeltvisning
          </button>
        </div>
      )}

      {activeTab === "tools" && viewMode === "postit" && !activeToolId && !activeCalcId && (
        <div className="grid" style={{ marginTop: 20, gridTemplateColumns: '1fr' }}>
          <div style={{ marginTop: 20 }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 16 }}>
              {postitBoxOrder.map((id) => {
                if (id === 'generelle') return (
                  <div
                    key={id}
                    draggable
                    onDragStart={() => handlePostitDragStart(id)}
                    onDragOver={(e) => handlePostitDragOver(e, id)}
                    onDragEnd={handlePostitDragEnd}
                    style={{ background: '#fffacd', padding: 16, borderRadius: 8, boxShadow: '0 2px 4px rgba(0,0,0,0.1)', cursor: 'move', opacity: draggedPostitBox === id ? 0.5 : 1 }}
                  >
                    <h3 style={{ margin: '0 0 12px 0', fontSize: 16, fontWeight: 700 }}>Generelle</h3>
                    <button className="button" onClick={() => handleCalcChange('bmi')} style={{ marginBottom: 8, width: '100%', textAlign: 'left' }}>
                      <div style={{ fontWeight: 600, fontSize: 14 }}>BMI</div>
                    </button>
                  </div>
                );
                if (id === 'psykiatri') return (
                  <div
                    key={id}
                    draggable
                    onDragStart={() => handlePostitDragStart(id)}
                    onDragOver={(e) => handlePostitDragOver(e, id)}
                    onDragEnd={handlePostitDragEnd}
                    style={{ background: '#e6f3ff', padding: 16, borderRadius: 8, boxShadow: '0 2px 4px rgba(0,0,0,0.1)', cursor: 'move', opacity: draggedPostitBox === id ? 0.5 : 1 }}
                  >
                    <h3 style={{ margin: '0 0 12px 0', fontSize: 16, fontWeight: 700 }}>Psykiatri</h3>
                    <button className="button" onClick={() => handleToolChange('madrs')} style={{ marginBottom: 8, width: '100%', textAlign: 'left' }}>
                      <div style={{ fontWeight: 600, fontSize: 14 }}>MADRS</div>
                    </button>
                    <button className="button" onClick={() => handleToolChange('gad-7')} style={{ marginBottom: 8, width: '100%', textAlign: 'left' }}>
                      <div style={{ fontWeight: 600, fontSize: 14 }}>GAD-7</div>
                    </button>
                    <button className="button" onClick={() => handleToolChange('asrs')} style={{ marginBottom: 8, width: '100%', textAlign: 'left' }}>
                      <div style={{ fontWeight: 600, fontSize: 14 }}>ASRS v1.1</div>
                    </button>
                    <button className="button" onClick={() => handleToolChange('audit')} style={{ marginBottom: 8, width: '100%', textAlign: 'left' }}>
                      <div style={{ fontWeight: 600, fontSize: 14 }}>AUDIT</div>
                    </button>
                  </div>
                );
                if (id === 'kardiologi') return (
                  <div
                    key={id}
                    draggable
                    onDragStart={() => handlePostitDragStart(id)}
                    onDragOver={(e) => handlePostitDragOver(e, id)}
                    onDragEnd={handlePostitDragEnd}
                    style={{ background: '#ffe6e6', padding: 16, borderRadius: 8, boxShadow: '0 2px 4px rgba(0,0,0,0.1)', cursor: 'move', opacity: draggedPostitBox === id ? 0.5 : 1 }}
                  >
                    <h3 style={{ margin: '0 0 12px 0', fontSize: 16, fontWeight: 700 }}>Kardiologi</h3>
                    <button className="button" onClick={() => handleCalcChange('nyha')} style={{ marginBottom: 8, width: '100%', textAlign: 'left' }}>
                      <div style={{ fontWeight: 600, fontSize: 14 }}>NYHA</div>
                    </button>
                    <button className="button" onClick={() => handleCalcChange('ccs')} style={{ marginBottom: 8, width: '100%', textAlign: 'left' }}>
                      <div style={{ fontWeight: 600, fontSize: 14 }}>CCS</div>
                    </button>
                    <button className="button" onClick={() => handleCalcChange('chadsvasc')} style={{ marginBottom: 8, width: '100%', textAlign: 'left' }}>
                      <div style={{ fontWeight: 600, fontSize: 14 }}>CHA₂DS₂-VA</div>
                    </button>
                    <button className="button" onClick={() => handleCalcChange('hasbled')} style={{ marginBottom: 8, width: '100%', textAlign: 'left' }}>
                      <div style={{ fontWeight: 600, fontSize: 14 }}>HAS-BLED</div>
                    </button>
                  </div>
                );
                if (id === 'lungemedisin') return (
                  <div
                    key={id}
                    draggable
                    onDragStart={() => handlePostitDragStart(id)}
                    onDragOver={(e) => handlePostitDragOver(e, id)}
                    onDragEnd={handlePostitDragEnd}
                    style={{ background: '#e6fff2', padding: 16, borderRadius: 8, boxShadow: '0 2px 4px rgba(0,0,0,0.1)', cursor: 'move', opacity: draggedPostitBox === id ? 0.5 : 1 }}
                  >
                    <h3 style={{ margin: '0 0 12px 0', fontSize: 16, fontWeight: 700 }}>Lungemedisin</h3>
                    <button className="button" onClick={() => handleCalcChange('act')} style={{ marginBottom: 8, width: '100%', textAlign: 'left' }}>
                      <div style={{ fontWeight: 600, fontSize: 14 }}>ACT voksne</div>
                    </button>
                    <button className="button" onClick={() => handleCalcChange('act-child')} style={{ marginBottom: 8, width: '100%', textAlign: 'left' }}>
                      <div style={{ fontWeight: 600, fontSize: 14 }}>ACT barn</div>
                    </button>
                    <button className="button" onClick={() => handleCalcChange('mmrc')} style={{ marginBottom: 8, width: '100%', textAlign: 'left' }}>
                      <div style={{ fontWeight: 600, fontSize: 14 }}>mMRC</div>
                    </button>
                    <button className="button" onClick={() => handleCalcChange('cat')} style={{ marginBottom: 8, width: '100%', textAlign: 'left' }}>
                      <div style={{ fontWeight: 600, fontSize: 14 }}>CAT</div>
                    </button>
                    <button className="button" onClick={() => handleCalcChange('crb65')} style={{ marginBottom: 8, width: '100%', textAlign: 'left' }}>
                      <div style={{ fontWeight: 600, fontSize: 14 }}>CRB-65</div>
                    </button>
                  </div>
                );
                if (id === 'hematologi') return (
                  <div
                    key={id}
                    draggable
                    onDragStart={() => handlePostitDragStart(id)}
                    onDragOver={(e) => handlePostitDragOver(e, id)}
                    onDragEnd={handlePostitDragEnd}
                    style={{ background: '#fff0f5', padding: 16, borderRadius: 8, boxShadow: '0 2px 4px rgba(0,0,0,0.1)', cursor: 'move', opacity: draggedPostitBox === id ? 0.5 : 1 }}
                  >
                    <h3 style={{ margin: '0 0 12px 0', fontSize: 16, fontWeight: 700 }}>Hematologi</h3>
                      <button className="button" onClick={() => handleCalcChange('doak-dosing')} style={{ marginBottom: 8, width: '100%', textAlign: 'left' }}>
                        <div style={{ fontWeight: 600, fontSize: 14 }}>DOAK-dosering</div>
                      </button>
                      <button className="button" onClick={() => handleCalcChange('anemia-assessment')} style={{ marginBottom: 8, width: '100%', textAlign: 'left' }}>
                        <div style={{ fontWeight: 600, fontSize: 14 }}>Anemivurdering</div>
                      </button>
                  </div>
                );
                if (id === 'gastromedisin') return (
                  <div
                    key={id}
                    draggable
                    onDragStart={() => handlePostitDragStart(id)}
                    onDragOver={(e) => handlePostitDragOver(e, id)}
                    onDragEnd={handlePostitDragEnd}
                    style={{ background: '#fff8e6', padding: 16, borderRadius: 8, boxShadow: '0 2px 4px rgba(0,0,0,0.1)', cursor: 'move', opacity: draggedPostitBox === id ? 0.5 : 1 }}
                  >
                    <h3 style={{ margin: '0 0 12px 0', fontSize: 16, fontWeight: 700 }}>Gastromedisin</h3>
                    <button className="button" onClick={() => handleCalcChange('fib4')} style={{ marginBottom: 8, width: '100%', textAlign: 'left' }}>
                      <div style={{ fontWeight: 600, fontSize: 14 }}>FIB-4</div>
                    </button>
                  </div>
                );
                if (id === 'urologi') return (
                  <div
                    key={id}
                    draggable
                    onDragStart={() => handlePostitDragStart(id)}
                    onDragOver={(e) => handlePostitDragOver(e, id)}
                    onDragEnd={handlePostitDragEnd}
                    style={{ background: '#f0e6ff', padding: 16, borderRadius: 8, boxShadow: '0 2px 4px rgba(0,0,0,0.1)', cursor: 'move', opacity: draggedPostitBox === id ? 0.5 : 1 }}
                  >
                    <h3 style={{ margin: '0 0 12px 0', fontSize: 16, fontWeight: 700 }}>Urologi</h3>
                      <button className="button" onClick={() => handleCalcChange('psa-age-adjusted')} style={{ marginBottom: 8, width: '100%', textAlign: 'left' }}>
                        <div style={{ fontWeight: 600, fontSize: 14 }}>Aldersjustert PSA</div>
                      </button>
                  </div>
                );
                if (id === 'revmatologi') return (
                  <div
                    key={id}
                    draggable
                    onDragStart={() => handlePostitDragStart(id)}
                    onDragOver={(e) => handlePostitDragOver(e, id)}
                    onDragEnd={handlePostitDragEnd}
                    style={{ background: '#e9f7ef', padding: 16, borderRadius: 8, boxShadow: '0 2px 4px rgba(0,0,0,0.1)', cursor: 'move', opacity: draggedPostitBox === id ? 0.5 : 1 }}
                  >
                    <h3 style={{ margin: '0 0 12px 0', fontSize: 16, fontWeight: 700 }}>Revmatologi</h3>
                    <button className="button" onClick={() => handleToolChange('eular-ra-2010')} style={{ marginBottom: 8, width: '100%', textAlign: 'left' }}>
                      <div style={{ fontWeight: 600, fontSize: 14 }}>EULAR 2010 Revmatoid Artritt</div>
                    </button>
                    <button className="button" onClick={() => handleToolChange('eular-pmr-2012')} style={{ marginBottom: 8, width: '100%', textAlign: 'left' }}>
                      <div style={{ fontWeight: 600, fontSize: 14 }}>EULAR 2012 Polymyalgia Rheumatica</div>
                    </button>
                  </div>
                );
                return null;
              })}
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
              className="section" 
              style={{ padding: 8, cursor: "pointer", display: "flex", justifyContent: "space-between", alignItems: "center", width: "100%" }}
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
              className="section" 
              style={{ padding: 8, marginTop: 12, cursor: "pointer", display: "flex", justifyContent: "space-between", alignItems: "center", width: "100%" }}
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
                  {(activeTool.pdfUrl || activeTool) && (
                    <select
                      value={pdfVersion}
                      onChange={(e) => setPdfVersion(e.target.value as "a" | "b")}
                      style={{
                        padding: '6px 12px',
                        border: '1px solid #d0d0d0',
                        borderRadius: 6,
                        fontSize: 12,
                        fontWeight: 600,
                        cursor: 'pointer',
                        background: 'white',
                        color: '#374151'
                      }}
                    >
                      <option value="a">Versjon A</option>
                      <option value="b">Versjon B</option>
                    </select>
                  )}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                  {activeTool.pdfUrl && (
                    <>
                      <a
                        href={pdfVersion === "a" ? activeTool.pdfUrl : "#"}
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
                  <div className="summary" style={{ marginTop: 12 }}>
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
                  </div>
                  {(activeCalc.pdfUrl || activeCalc) && (
                    <select
                      value={pdfVersion}
                      onChange={(e) => setPdfVersion(e.target.value as "a" | "b")}
                      style={{
                        padding: '6px 12px',
                        border: '1px solid #d0d0d0',
                        borderRadius: 6,
                        fontSize: 12,
                        fontWeight: 600,
                        cursor: 'pointer',
                        background: 'white',
                        color: '#374151'
                      }}
                    >
                      <option value="a">Versjon A</option>
                      <option value="b">Versjon B</option>
                    </select>
                  )}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                  {activeCalc.pdfUrl && (
                    <>
                      <a
                        href={pdfVersion === "a" ? activeCalc.pdfUrl : "#"}
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

      {activeTab === "guides" && (
        <div style={{ marginTop: 20 }} className="form-section">
          <div style={{ display: "flex", flexWrap: "wrap", gap: 12 }}>
            {linkBoxes.map((box, i) => {
              const isCollapsed = Boolean(collapsedBoxes[box.id]);
              const isDragging = draggedBox === box.id;
              // Color palette for post-it notes
              const noteColors = [
                { bg: '#fffbe7', border: '#ffe066', title: '#b08900', text: '#7c6f00' }, // yellow
                { bg: '#e7f7ff', border: '#66d9ff', title: '#0077b6', text: '#00506b' }, // blue
                { bg: '#e7ffe7', border: '#66ff99', title: '#008b2f', text: '#006622' }, // green
                { bg: '#ffe7f7', border: '#ff66c4', title: '#b0006b', text: '#7c004a' }, // pink
                { bg: '#fff0e7', border: '#ffb366', title: '#b05e00', text: '#7c3f00' }, // orange
              ];
              const color = noteColors[i % noteColors.length];
              return (
                <div
                  key={box.id}
                  draggable
                  onDragStart={() => handleDragStart(box.id)}
                  onDragOver={(e) => handleDragOver(e, box.id)}
                  onDragEnd={handleDragEnd}
                  style={{
                    width: 320,
                    background: color.bg,
                    border: `1.5px solid ${color.border}`,
                    borderRadius: 10,
                    boxShadow: "0 6px 14px rgba(0,0,0,0.08)",
                    overflow: "hidden",
                    cursor: "move",
                    opacity: isDragging ? 0.5 : 1,
                    transition: "opacity 0.2s ease",
                    padding: 0,
                    margin: 0,
                    height: isCollapsed ? undefined : 'auto',
                  }}
                >
                  <button
                    type="button"
                    onClick={() => setCollapsedBoxes(p => ({ ...p, [box.id]: !p[box.id] }))}
                    aria-expanded={!isCollapsed}
                    style={{
                      width: "100%",
                      textAlign: "left",
                      padding: "12px 14px",
                      background: color.border + '22',
                      border: "none",
                      cursor: "pointer",
                      fontWeight: 700,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      gap: 8,
                      color: color.title
                    }}
                  >
                    <span>{box.title}</span>
                    <span style={{ fontSize: 12 }}>{isCollapsed ? "+" : "–"}</span>
                  </button>
                  <div style={{ display: isCollapsed ? 'none' : 'block', padding: isCollapsed ? 0 : "12px 14px", margin: 0 }}>
                    {!isCollapsed && (
                      <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "grid", gap: 8 }}>
                        {box.items.map(item => {
                          const isEditing = editingLink?.boxId === box.id && editingLink?.itemId === item.id;
                          return (
                            <li key={item.id}>
                              {isEditing ? (
                                <div style={{ display: "flex", gap: 4 }}>
                                  <input
                                    type="text"
                                    value={editLabelValue}
                                    onChange={(e) => setEditLabelValue(e.target.value)}
                                    onKeyDown={(e) => {
                                      if (e.key === "Enter") handleLabelSave(box.id, item.id);
                                      if (e.key === "Escape") handleLabelCancel();
                                    }}
                                    style={{
                                      flex: 1,
                                      padding: "4px 6px",
                                      fontSize: 14,
                                      border: "1px solid #999",
                                      borderRadius: 4
                                    }}
                                    autoFocus
                                  />
                                  <button
                                    type="button"
                                    onClick={() => handleLabelSave(box.id, item.id)}
                                    style={{
                                      padding: "4px 8px",
                                      fontSize: 12,
                                      background: "#4CAF50",
                                      color: "white",
                                      border: "none",
                                      borderRadius: 4,
                                      cursor: "pointer"
                                    }}
                                  >
                                    ✓
                                  </button>
                                  <button
                                    type="button"
                                    onClick={handleLabelCancel}
                                    style={{
                                      padding: "4px 8px",
                                      fontSize: 12,
                                      background: "#f44336",
                                      color: "white",
                                      border: "none",
                                      borderRadius: 4,
                                      cursor: "pointer"
                                    }}
                                  >
                                    ✕
                                  </button>
                                </div>
                              ) : (
                                <div
                                  draggable
                                  onDragStart={(e) => handleItemDragStart(e, box.id, item.id)}
                                  onDragOver={(e) => handleItemDragOver(e, box.id, item.id)}
                                  onDrop={(e) => handleItemDrop(e, box.id, item.id)}
                                  onDragEnd={handleItemDragEnd}
                                  style={{
                                    color: "#1a1a1a",
                                    textDecoration: "none",
                                    display: "flex",
                                    alignItems: "center",
                                    gap: 6,
                                    cursor: draggedItem?.boxId === box.id && draggedItem?.itemId === item.id ? "grabbing" : "grab",
                                    opacity: draggedItem?.boxId === box.id && draggedItem?.itemId === item.id ? 0.5 : 1,
                                    padding: "4px 0",
                                  }}
                                  title={item.url}
                                >
                                  <button
                                    type="button"
                                    onClick={(e) => handleRenameClick(e, box.id, item.id, item.label)}
                                    style={{
                                      flex: "0 0 auto",
                                      background: "none",
                                      border: "none",
                                      padding: "2px 4px",
                                      cursor: "pointer",
                                      fontSize: 14,
                                      display: "flex",
                                      alignItems: "center",
                                      justifyContent: "center",
                                      borderRadius: 4,
                                      transition: "background 0.2s ease"
                                    }}
                                    onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(0,0,0,0.1)")}
                                    onMouseLeave={(e) => (e.currentTarget.style.background = "none")}
                                    title="Klikk for å endre navn på lenken"
                                  >
                                    📚
                                  </button>
                                  <a
                                    href={item.url}
                                    target="_blank"
                                    rel="noreferrer"
                                    style={{
                                      color: "#1a1a1a",
                                      textDecoration: "none",
                                      display: "flex",
                                      alignItems: "center",
                                      gap: 4,
                                      flex: 1,
                                      minWidth: 0,
                                      fontSize: 13
                                    }}
                                    onClick={(e) => e.stopPropagation()}
                                  >
                                    {getFaviconUrl(item.url) && (
                                      <img
                                        src={getFaviconUrl(item.url)}
                                        alt=""
                                        width={14}
                                        height={14}
                                        style={{ flex: "0 0 14px" }}
                                      />
                                    )}
                                    <span style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                                      {item.label}
                                    </span>
                                  </a>
                                </div>
                              )}
                            </li>
                          );
                        })}
                      </ul>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

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
        <div
          style={{
            marginTop: 20,
            padding: 20,
            borderRadius: 16,
            border: "1px solid #e6e2d6",
            background: "linear-gradient(135deg, #fff7e6 0%, #f0f7ff 100%)",
            boxShadow: "0 10px 30px rgba(15, 23, 42, 0.08)"
          }}
        >
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
            <div>
              <h2 style={{ marginBottom: 6, fontSize: 22 }}>Kalender</h2>
              <p style={{ marginBottom: 0, color: "#5b6472", fontSize: 14 }}>
                Legg til eller trekk fra i en mer fleksibel datobygger.
              </p>
            </div>
            <div style={{
              padding: "6px 12px",
              borderRadius: 999,
              background: "#0f172a",
              color: "#f8fafc",
              fontSize: 12,
              fontWeight: 700,
              letterSpacing: 0.4
            }}>
              DATO-VERKTOY
            </div>
          </div>

          <div style={{ display: "grid", gap: 16, marginTop: 16, gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))" }}>
            <div style={{
              padding: 16,
              borderRadius: 14,
              background: "#ffffff",
              border: "1px solid rgba(15, 23, 42, 0.08)",
              boxShadow: "0 8px 20px rgba(15, 23, 42, 0.06)"
            }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
                <div style={{ fontSize: 13, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.6, color: "#9a3412" }}>
                  Startdato
                </div>
                <button
                  type="button"
                  onClick={() => {
                    const now = new Date();
                    setCalendarBaseYear(String(now.getFullYear()));
                    setCalendarBaseMonth(String(now.getMonth() + 1));
                    setCalendarBaseDay(String(now.getDate()));
                  }}
                  style={{
                    padding: "6px 10px",
                    borderRadius: 999,
                    border: "1px solid rgba(15, 23, 42, 0.12)",
                    background: "#fff4de",
                    color: "#9a3412",
                    fontSize: 12,
                    fontWeight: 700,
                    cursor: "pointer"
                  }}
                >
                  I dag
                </button>
              </div>
              <div style={{ marginTop: 10, display: "grid", gap: 12, gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))" }}>
                <label style={{ display: "grid", gap: 6, fontSize: 13 }}>
                  År
                  <ComboBox value={calendarBaseYear} options={yearOptions} onChange={setCalendarBaseYear} placeholder="År" />
                </label>
                <label style={{ display: "grid", gap: 6, fontSize: 13 }}>
                  Måned
                  <ComboBox value={calendarBaseMonth} options={monthOptions} onChange={setCalendarBaseMonth} placeholder="Måned" />
                </label>
                <label style={{ display: "grid", gap: 6, fontSize: 13 }}>
                  Dag
                  <ComboBox value={calendarBaseDay} options={dayOptions} onChange={setCalendarBaseDay} placeholder="Dag" />
                </label>
              </div>
            </div>

            <div style={{
              padding: 16,
              borderRadius: 14,
              background: "#0f172a",
              color: "#e2e8f0",
              border: "1px solid rgba(15, 23, 42, 0.2)",
              boxShadow: "0 8px 20px rgba(15, 23, 42, 0.18)"
            }}>
              <div style={{ fontSize: 13, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.6, color: "#fbbf24" }}>
                Legg til / trekk fra
              </div>
              <div style={{ marginTop: 10, display: "grid", gap: 12, gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))" }}>
                <label style={{ display: "grid", gap: 6, fontSize: 13, color: "#e2e8f0" }}>
                  År
                  <ComboBox value={calendarYears} options={deltaYearOptions} onChange={setCalendarYears} placeholder="0" />
                </label>
                <label style={{ display: "grid", gap: 6, fontSize: 13, color: "#e2e8f0" }}>
                  Mnd
                  <ComboBox value={calendarMonths} options={deltaMonthOptions} onChange={setCalendarMonths} placeholder="0" />
                </label>
                <label style={{ display: "grid", gap: 6, fontSize: 13, color: "#e2e8f0" }}>
                  Uker
                  <ComboBox value={calendarWeeks} options={deltaWeekOptions} onChange={setCalendarWeeks} placeholder="0" />
                </label>
                <label style={{ display: "grid", gap: 6, fontSize: 13, color: "#e2e8f0" }}>
                  Dager
                  <ComboBox value={calendarDays} options={deltaDayOptions} onChange={setCalendarDays} placeholder="0" />
                </label>
              </div>

              <div style={{ marginTop: 14, display: "flex", gap: 10, flexWrap: "wrap" }}>
                <button
                  type="button"
                  onClick={() => applyCalendarShift("add")}
                  style={{
                    padding: "10px 16px",
                    borderRadius: 999,
                    border: "none",
                    background: "#f59e0b",
                    color: "#1f2937",
                    fontWeight: 700,
                    cursor: "pointer",
                    boxShadow: "0 6px 16px rgba(245, 158, 11, 0.35)"
                  }}
                >
                  Legg til
                </button>
                <button
                  type="button"
                  onClick={() => applyCalendarShift("subtract")}
                  style={{
                    padding: "10px 16px",
                    borderRadius: 999,
                    border: "1px solid rgba(248, 250, 252, 0.3)",
                    background: "transparent",
                    color: "#e2e8f0",
                    fontWeight: 700,
                    cursor: "pointer"
                  }}
                >
                  Trekk fra
                </button>
              </div>
            </div>
          </div>

          <div style={{
            marginTop: 18,
            padding: 16,
            borderRadius: 14,
            background: "#ffffff",
            border: "1px solid rgba(15, 23, 42, 0.08)",
            display: "grid",
            gap: 6
          }}>
            <div style={{ fontSize: 12, textTransform: "uppercase", letterSpacing: 0.8, color: "#64748b" }}>Resultat</div>
            <div style={{ fontSize: 20, fontWeight: 800, color: "#0f172a" }}>
              {calendarResult || "Velg en handling"}
            </div>
            {calendarAction && (
              <div style={{ fontSize: 13, color: "#6b7280" }}>{calendarAction}</div>
            )}
          </div>
        </div>
      )}

      {activeTab === "patientinfo" && <div style={{ marginTop: 20, padding: 24, textAlign: "center" }}><p>Pasientinformasjon kommer snart.</p></div>}
      
      {activeTab === "chatgpt" && <ChatGPTPrompt />}
    </section>
  );
}
