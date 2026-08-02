
"use client";

import { useMemo, useState, useEffect, useRef, type MouseEvent as ReactMouseEvent } from "react";
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
import { calculateToolHubCalcResult } from "@/app/utils/toolHubCalcEngine";
import { defaultLinkBoxes, type LinkBox } from "@/app/utils/toolHubLinks";

type TabKey = "tools" | "guides" | "resources" | "forms" | "patientinfo";

const tabs: Record<TabKey, string> = {
  tools: "Kalkulatorer",
  guides: "Lenker",
  resources: "Verktøy",
  forms: "Skjemaer",
  patientinfo: "Pasientinformasjon"
};
const tabOrder: TabKey[] = ["guides", "tools", "resources", "forms", "patientinfo"];

interface ResourceCard {
  title: string;
  description: string;
  url: string;
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
  const [calcInputs, setCalcInputs] = useState<Record<string, string | number>>({});
  const [copyState, setCopyState] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [showSearch, setShowSearch] = useState(false);
  const [linkBoxOrder, setLinkBoxOrder] = useState<string[]>([]);
  const [draggedBox, setDraggedBox] = useState<string | null>(null);
  const [draggedItem, setDraggedItem] = useState<{ boxId: string; itemId: string } | null>(null);
  const [showClinicalTip, setShowClinicalTip] = useState(false);
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
            title: "ACT barn",
            description: "Astmakontroll hos barn",
            url: "/pdfs/Utredningsskjema-ACT-barn.pdf"
          },
          {
            title: "ACT voksne",
            description: "Astmakontroll hos voksne",
            url: "/pdfs/Utredningsskjema-ACT-voksne.pdf"
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
            title: "MADRS klinikerutgave",
            description: "Vurdering av depresjon (klinikerutgave)",
            url: "/pdfs/Utredningsskjema-MADRS-klinikerutgave.pdf"
          },
          {
            title: "MADRS pasientutgave",
            description: "Vurdering av depresjon (pasientutgave)",
            url: "/pdfs/Utredningsskjema-MADRS-pasientutgave.pdf"
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
            title: "TMT-3 manual",
            description: "Utredningsskjema for demens – TMT-3 manual",
            url: "/pdfs/Utredningsskjema-Demens-TMT-NR3-manual.pdf"
          },
          {
            title: "TMT-3 testark",
            description: "Utredningsskjema for demens – TMT-3 testark",
            url: "/pdfs/Utredningsskjema-Demens-TMT-NR3-testark.pdf"
          }
        ]
      }
    ], []);

  const resourceCategories = useMemo<ResourceCategory[]>(() => {
    const categories: ResourceCategory[] = [
      {
        title: "Håndkort",
        items: [
          {
            title: "Apotekkort",
            description: "Håndkort for apotekrelatert oppfølging.",
            url: "/pdfs/Håndkort-Apotekkort-ToppenLS.pdf"
          },
          {
            title: "Henvisningskort",
            description: "Håndkort for rask henvisningsstøtte.",
            url: "/pdfs/Håndkort-Henvisningskort-ToppenLS.pdf"
          },
          {
            title: "Sykedagskort",
            description: "Håndkort for strukturert sykedagsvurdering.",
            url: "/pdfs/Håndkort-Sykedagskort.pdf"
          },
          {
            title: "Videre plan",
            description: "Håndkort for planlegging av videre forløp.",
            url: "/pdfs/Håndkort-Videre%20plan-ToppenLS.pdf"
          }
        ]
      },
      {
        title: "Utredningsverktøy",
        items: []
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
          }
        ]
      }
    ];

    return [...categories]
      .sort((left, right) => left.title.localeCompare(right.title, "nb"))
      .map((category) => ({
        ...category,
        items: [...category.items].sort((left, right) => left.title.localeCompare(right.title, "nb"))
      }));
  }, [utredningsverktoySubcategories]);

  const toolResourceCategories = useMemo(
    () => resourceCategories.filter((category) => category.title === "Utredningsverktøy"),
    [resourceCategories]
  );

  const formResourceCategories = useMemo(
    () => resourceCategories.filter((category) => category.title === "Annet" || category.title === "Håndkort"),
    [resourceCategories]
  );

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
    }, 1000);
  };

  const hidePdfPreview = () => {
    clearPreviewHoverTimeout();
    setPreviewResource(null);
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

  const calcResult = useMemo(() => calculateToolHubCalcResult(activeCalc, calcInputs), [activeCalc, calcInputs]);

  const handleAnswerChange = (qid: string, score: number, idx: number) => setAnswers(p => ({ ...p, [qid]: { score, optionIndex: idx } }));
  const handleToolChange = (id: string) => { setActiveToolId(id); setActiveCalcId(""); setAnswers({}); setShowClinicalTip(false); };
  const handleCalcChange = (id: string) => { 
    const specialTab = getSpecialCalcTab(id);
    if (specialTab) {
      setActiveCalcId(id);
      setActiveToolId("");
      setShowClinicalTip(false);
      setCalcTab(specialTab);
      return;
    }

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
      setCalcInputs({});
      setCalcTab("date");
      setSearchQuery("");
      setShowSearch(false);
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
                    {section.items.map((item) => (
                      <button
                        key={item.id}
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
                    ))}
                  </div>
                </div>
              ))}
            </div>
          ) : (
          <div className="form-section">
            {activeTool ? (
              <div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
                  <h2 style={{ margin: 0, fontSize: 20 }}>{activeTool.name}</h2>
                </div>
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
                      </div>
                      <span className="badge" style={{ marginTop: 8 }}>{copyState || "Klar til kopiering"}</span>
                    </div>
                  </div>
                )}
              </div>
            ) : activeSpecialCalcTab ? (
              <div>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16, gap: 12, flexWrap: "wrap" }}>
                  <h2 style={{ margin: 0, fontSize: 20 }}>{specialCalcTabTitle[activeSpecialCalcTab]}</h2>
                  <div className="row" style={{ gap: 8 }}>
                    {(["date", "med", "tapering", "pregnancy"] as SpecialCalcTab[]).map((tab) => (
                      <button
                        key={tab}
                        type="button"
                        className={`button ${calcTab === tab ? "primary" : ""}`}
                        onClick={() => setCalcTab(tab)}
                        style={{ padding: "8px 10px", fontSize: 12 }}
                      >
                        {specialCalcTabTitle[tab]}
                      </button>
                    ))}
                  </div>
                </div>

                {calcTab === "date" && (
                  <div style={{ display: "grid", gap: 12, maxWidth: 760 }}>
                    <div className="calc-field-row">
                      <label style={{ fontWeight: 500, fontSize: 13 }}>Startdato</label>
                      <DatePickerField value={dateCalcStart} onChange={setDateCalcStart} ariaLabel="Velg startdato" />
                    </div>
                    <div className="calc-field-row">
                      <label style={{ fontWeight: 500, fontSize: 13 }}>Retning</label>
                      <div className="row" style={{ gap: 8 }}>
                        <button type="button" className={`button ${dateCalcDirection === "forward" ? "primary" : ""}`} onClick={() => setDateCalcDirection("forward")} style={{ padding: "8px 12px", fontSize: 12 }}>Framover</button>
                        <button type="button" className={`button ${dateCalcDirection === "backward" ? "primary" : ""}`} onClick={() => setDateCalcDirection("backward")} style={{ padding: "8px 12px", fontSize: 12 }}>Bakover</button>
                      </div>
                    </div>
                    <div className="calc-field-row">
                      <label style={{ fontWeight: 500, fontSize: 13 }}>Forskyvning (f.eks. 2u 3d 1m)</label>
                      <input value={dateCalcInline} onChange={(e) => setDateCalcInline(e.target.value)} placeholder="f.eks. 2u 3d" />
                    </div>
                    {dateCalcInline.trim() && !dateCalcInlineParsed && (
                      <p style={{ color: "#b91c1c", fontSize: 13 }}>Ugyldig format. Bruk eksempelvis `2u 3d` eller `-1m 2u`.</p>
                    )}
                    {dateCalcResult && (
                      <div className="summary" style={{ marginTop: 4 }}>
                        <p><strong>Resultatdato:</strong> {dateCalcResult.dateText} ({dateCalcResult.weekday})</p>
                        <p><strong>Ukenummer:</strong> {dateCalcResult.weekNumber}</p>
                        <p><strong>Dager fra start:</strong> {dateCalcResult.dayDiff}</p>
                      </div>
                    )}
                    <div className="row" style={{ gap: 8 }}>
                      <button type="button" className="button primary" onClick={handleCopySpecialCalculatorText}>Kopier resultat</button>
                      <span className="badge">{copyState || "Klar til kopiering"}</span>
                    </div>
                  </div>
                )}

                {calcTab === "med" && (
                  <div style={{ display: "grid", gap: 12, maxWidth: 760 }}>
                    <div className="calc-field-row">
                      <label style={{ fontWeight: 500, fontSize: 13 }}>Reseptdato</label>
                      <DatePickerField value={medStartDate} onChange={setMedStartDate} ariaLabel="Velg reseptdato" />
                    </div>
                    <div className="calc-field-row">
                      <label style={{ fontWeight: 500, fontSize: 13 }}>Antall enheter</label>
                      <input value={medUnits} onChange={(e) => setMedUnits(e.target.value)} placeholder="f.eks. 100" />
                    </div>
                    <div className="calc-field-row">
                      <label style={{ fontWeight: 500, fontSize: 13 }}>Dose per dag</label>
                      <input value={medDosePerDay} onChange={(e) => setMedDosePerDay(e.target.value)} placeholder="f.eks. 1" />
                    </div>
                    {medDurationResult && (
                      <div className="summary" style={{ marginTop: 4 }}>
                        <p><strong>Varighet:</strong> {medDurationResult.durationDays} dager</p>
                        <p><strong>Skal vare til minst:</strong> {medDurationResult.endDateText}</p>
                      </div>
                    )}
                    <div className="row" style={{ gap: 12, flexWrap: "wrap" }}>
                      <label style={{ fontSize: 13 }}><input type="checkbox" checked={copyToJournal} onChange={(e) => setCopyToJournal(e.target.checked)} /> Inkluder journaltekst</label>
                      <label style={{ fontSize: 13 }}><input type="checkbox" checked={generatePatientMessage} onChange={(e) => setGeneratePatientMessage(e.target.checked)} /> Inkluder pasienttekst</label>
                    </div>
                    <div className="row" style={{ gap: 8 }}>
                      <button type="button" className="button primary" onClick={handleCopySpecialCalculatorText}>Kopier tekst</button>
                      <span className="badge">{copyState || "Klar til kopiering"}</span>
                    </div>
                  </div>
                )}

                {calcTab === "tapering" && (
                  <div style={{ display: "grid", gap: 12, maxWidth: 760 }}>
                    <div className="calc-field-row">
                      <label style={{ fontWeight: 500, fontSize: 13 }}>Forrige uttak</label>
                      <DatePickerField value={avgPrevDate} onChange={setAvgPrevDate} ariaLabel="Velg dato for forrige uttak" />
                    </div>
                    <div className="calc-field-row">
                      <label style={{ fontWeight: 500, fontSize: 13 }}>Neste uttak</label>
                      <DatePickerField value={avgNextDate} onChange={setAvgNextDate} ariaLabel="Velg dato for neste uttak" />
                    </div>
                    <div className="calc-field-row">
                      <label style={{ fontWeight: 500, fontSize: 13 }}>Forrige antall enheter</label>
                      <input value={avgPrevUnits} onChange={(e) => setAvgPrevUnits(e.target.value)} placeholder="f.eks. 100" />
                    </div>
                    {avgUsageResult && "error" in avgUsageResult && (
                      <p style={{ color: "#b91c1c", fontSize: 13 }}>{avgUsageResult.error}</p>
                    )}
                    {avgUsageResult && !("error" in avgUsageResult) && (
                      <div className="summary" style={{ marginTop: 4 }}>
                        <p><strong>Antall dager mellom uttak:</strong> {avgUsageResult.daySpan}</p>
                        <p><strong>Gjennomsnittlig daglig forbruk:</strong> {avgUsageResult.daily.toFixed(2)}</p>
                      </div>
                    )}
                    <div className="row" style={{ gap: 8 }}>
                      <button type="button" className="button primary" onClick={handleCopySpecialCalculatorText}>Kopier resultat</button>
                      <span className="badge">{copyState || "Klar til kopiering"}</span>
                    </div>
                  </div>
                )}

                {calcTab === "pregnancy" && (
                  <div style={{ display: "grid", gap: 12, maxWidth: 820 }}>
                    <div className="calc-field-row">
                      <label style={{ fontWeight: 500, fontSize: 13 }}>Siste menstruasjon (LMP)</label>
                      <DatePickerField value={pregnancyDate} onChange={setPregnancyDate} ariaLabel="Velg LMP-dato" />
                    </div>
                    <div className="calc-field-row">
                      <label style={{ fontWeight: 500, fontSize: 13 }}>Para</label>
                      <input value={pregnancyPara} onChange={(e) => setPregnancyPara(e.target.value)} placeholder="f.eks. G2P1" />
                    </div>
                    <div className="row" style={{ gap: 12, flexWrap: "wrap" }}>
                      <div className="calc-field-row" style={{ minWidth: 220 }}>
                        <label style={{ fontWeight: 500, fontSize: 13 }}>Vekt (kg)</label>
                        <input value={pregnancyWeightKg} onChange={(e) => setPregnancyWeightKg(e.target.value)} placeholder="f.eks. 70" />
                      </div>
                      <div className="calc-field-row" style={{ minWidth: 220 }}>
                        <label style={{ fontWeight: 500, fontSize: 13 }}>Høyde (cm)</label>
                        <input value={pregnancyHeightCm} onChange={(e) => setPregnancyHeightCm(e.target.value)} placeholder="f.eks. 168" />
                      </div>
                    </div>
                    <div className="calc-field-row" style={{ alignItems: "flex-start" }}>
                      <label style={{ fontWeight: 500, fontSize: 13 }}>Sykehistorie</label>
                      <textarea value={pregnancyMedicalHistory} onChange={(e) => setPregnancyMedicalHistory(e.target.value)} rows={3} />
                    </div>
                    <div className="calc-field-row" style={{ alignItems: "flex-start" }}>
                      <label style={{ fontWeight: 500, fontSize: 13 }}>Psykisk helse</label>
                      <textarea value={pregnancyMentalHealth} onChange={(e) => setPregnancyMentalHealth(e.target.value)} rows={2} />
                    </div>
                    <div className="calc-field-row" style={{ alignItems: "flex-start" }}>
                      <label style={{ fontWeight: 500, fontSize: 13 }}>Medikamenter</label>
                      <textarea value={pregnancyMedications} onChange={(e) => setPregnancyMedications(e.target.value)} rows={2} />
                    </div>
                    <div className="calc-field-row" style={{ alignItems: "flex-start" }}>
                      <label style={{ fontWeight: 500, fontSize: 13 }}>Andre forhold</label>
                      <textarea value={pregnancyOtherConditions} onChange={(e) => setPregnancyOtherConditions(e.target.value)} rows={2} />
                    </div>
                    <label style={{ fontSize: 13 }}><input type="checkbox" checked={pregnancyRiskPregnancy} onChange={(e) => setPregnancyRiskPregnancy(e.target.checked)} /> Risikosvangerskap</label>

                    {pregnancyResult && (
                      <div className="summary" style={{ marginTop: 4 }}>
                        <p><strong>Termin:</strong> {pregnancyResult.eddText}</p>
                        <p><strong>Konsepsjonsdato:</strong> {pregnancyResult.conceptionText}</p>
                        <p><strong>Svangerskapsalder:</strong> {pregnancyResult.gestationalAgeText}</p>
                        <p><strong>Tid til termin:</strong> {pregnancyResult.timeToDueDateText}</p>
                        {pregnancyBmi !== null && <p><strong>BMI:</strong> {pregnancyBmi.toFixed(1)}</p>}
                      </div>
                    )}

                    <div className="row" style={{ gap: 8 }}>
                      <button type="button" className="button primary" onClick={handleCopySpecialCalculatorText}>Kopier henvisningstekst</button>
                      <span className="badge">{copyState || "Klar til kopiering"}</span>
                    </div>
                  </div>
                )}
              </div>
            ) : activeCalc ? (
              <div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <h2 style={{ margin: 0, fontSize: 20 }}>{activeCalc.name}</h2>
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
          )}
        </div>
      )}

      {activeTab === "guides" && <ModernWidgetDashboard />}

      {(activeTab === "resources" || activeTab === "forms") && (
        <div className="resource-index" style={{ marginTop: 20, padding: 24 }}>
          <h2 style={{ marginBottom: 6, fontSize: 24, fontWeight: 700, color: '#1f2937' }}>
            {activeTab === "resources" ? "Verktøy" : "Skjemaer"}
          </h2>
          <p style={{ marginBottom: 22, color: '#475569' }}>
            {activeTab === "resources"
              ? "Utredningsverktøy og PDF-ressurser."
              : "Håndkort og øvrige skjemaressurser."}
          </p>

          {(activeTab === "resources" ? toolResourceCategories : formResourceCategories).map((category) => {
            const renderResourceRow = (resource: ResourceCard, key: string) => {
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
                        PDF
                      </a>
                    ) : (
                      <span className="resource-pdf-badge unavailable">PDF</span>
                    )}
                  </div>
                </article>
              );
            };

            return (
              <section key={category.title} className="resource-chapter">
                <h3 className="resource-chapter-title">{category.title}</h3>

                {category.title === "Utredningsverktøy" ? (
                  <div>
                    {utredningsverktoySubcategories.map((subcategory) => (
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
        </div>
      )}

      <style jsx>{`
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

      {activeTab === "patientinfo" && <div style={{ marginTop: 20, padding: 24, textAlign: "center" }}><p>Pasientinformasjon kommer snart.</p></div>}
    </section>
  );
}
