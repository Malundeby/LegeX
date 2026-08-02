import type { Calculator, ScoringTool } from "./toolRegistry";

export interface PostitItem {
  id: string;
  label: string;
  itemType: "calc" | "tool" | "link";
  url?: string;
}

export interface PostitSection {
  boxId: string;
  title: string;
  items: PostitItem[];
}

export const defaultPostitBoxOrder = [
  "generelle",
  "psykiatri",
  "kardiologi",
  "lungemedisin",
  "hematologi",
  "gastromedisin",
  "endokrinologi",
  "urologi",
  "svangerskap",
  "pediatri",
  "revmatologi"
];

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

const specialCalculatorItems: PostitItem[] = [
  { id: "date-calculator", label: "Datokalkulator", itemType: "calc" },
  { id: "medication-calculator", label: "Legemiddelberegner", itemType: "calc" },
  { id: "tapering-plan", label: "Nedtrappingsplan", itemType: "calc" },
  { id: "pregnancy-calculator", label: "Svangerskap", itemType: "calc" }
];

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

export function cleanToolDisplayName(name: string): string {
  return name.replace(/\s*\([^)]*\)\s*/g, "").trim();
}

export function buildPostitSections(
  postitBoxOrder: string[],
  sortedCalcs: Calculator[],
  sortedTools: ScoringTool[]
): PostitSection[] {
  const buckets = new Map<string, PostitItem[]>();
  postitBoxOrder.forEach((boxId) => buckets.set(boxId, []));

  sortedCalcs.forEach((calc) => {
    const mapped = calcPostitMap[calc.id];
    const boxId = mapped?.boxId ?? "generelle";
    const label = mapped?.label ?? cleanToolDisplayName(calc.name);
    if (!buckets.has(boxId)) {
      buckets.set(boxId, []);
    }
    buckets.get(boxId)?.push({ id: calc.id, label, itemType: "calc" });
  });

  sortedTools.forEach((tool) => {
    const mapped = toolPostitMap[tool.id];
    const boxId = mapped?.boxId ?? "psykiatri";
    const label = mapped?.label ?? cleanToolDisplayName(tool.name);
    if (!buckets.has(boxId)) {
      buckets.set(boxId, []);
    }
    buckets.get(boxId)?.push({ id: tool.id, label, itemType: "tool" });
  });

  specialCalculatorItems.forEach((item) => {
    buckets.get("generelle")?.push(item);
  });

  Object.entries(externalPostitItemsByBox).forEach(([boxId, items]) => {
    if (!buckets.has(boxId)) {
      buckets.set(boxId, []);
    }
    items.forEach((item) => {
      buckets.get(boxId)?.push({ id: item.id, label: item.label, itemType: "link", url: item.url });
    });
  });

  return postitBoxOrder.map((boxId) => {
    const items = buckets.get(boxId) ?? [];
    const seenCalcLabels = new Set<string>();
    const dedupedItems = items.filter((item) => {
      if (item.itemType !== "calc") {
        return true;
      }
      const key = item.label.trim().toLowerCase();
      if (seenCalcLabels.has(key)) {
        return false;
      }
      seenCalcLabels.add(key);
      return true;
    });

    return {
      boxId,
      title: postitTitles[boxId] ?? boxId,
      items: dedupedItems
    };
  });
}