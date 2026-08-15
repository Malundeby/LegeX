import type { Calculator, ScoringTool } from "./toolRegistry";

export interface PostitItem {
  id: string;
  label: string;
  itemType: "calc" | "tool" | "link";
  url?: string;
  subcategory?: string;
}

export interface PostitSection {
  boxId: string;
  title: string;
  items: PostitItem[];
}

export const defaultPostitBoxOrder = [
  "generelle",
  "endokrinologi",
  "gastromedisin",
  "hematologi",
  "kardiologi",
  "lungemedisin",
  "psykiatri",
  "revmatologi",
  "svangerskap",
  "urologi"
];

const postitTitles: Record<string, string> = {
  generelle: "Andre",
  psykiatri: "Psykiatri",
  kardiologi: "Kardiologi",
  lungemedisin: "Lungemedisin",
  hematologi: "Hematologi",
  gastromedisin: "Gastromedisin",
  endokrinologi: "Endokrinologi",
  urologi: "Urologi",
  svangerskap: "Svangerskap",
  revmatologi: "Revmatologi"
};

const excludedCalcIds = new Set(["doak-dosing", "anemia-assessment"]);

const calcPostitMap: Record<string, { boxId: string; label?: string; subcategory?: string }> = {
  bmi: { boxId: "generelle", label: "BMI" },
  nyha: { boxId: "kardiologi", label: "NYHA", subcategory: "Hjertesvikt" },
  ccs: { boxId: "kardiologi", label: "CCS", subcategory: "Angina" },
  "ccs-angina": { boxId: "kardiologi", label: "CCS", subcategory: "Angina" },
  chadsvasc: { boxId: "kardiologi", label: "CHA₂DS₂-VA", subcategory: "Antikoagulasjon" },
  hasbled: { boxId: "kardiologi", label: "HAS-BLED", subcategory: "Antikoagulasjon" },
  act: { boxId: "lungemedisin", label: "ACT voksne", subcategory: "Astma" },
  "act-asthma": { boxId: "lungemedisin", label: "ACT voksne", subcategory: "Astma" },
  "act-child": { boxId: "lungemedisin", label: "ACT barn", subcategory: "Astma" },
  mmrc: { boxId: "lungemedisin", label: "mMRC", subcategory: "KOLS" },
  cat: { boxId: "lungemedisin", label: "CAT", subcategory: "KOLS" },
  "cat-copd": { boxId: "lungemedisin", label: "CAT", subcategory: "KOLS" },
  crb65: { boxId: "lungemedisin", label: "CRB-65", subcategory: "Pneumoni" },
  "wells-dvt": { boxId: "hematologi", label: "Wells DVT", subcategory: "Trombose" },
  "wells-pe": { boxId: "hematologi", label: "Wells Lungeemboli", subcategory: "Trombose" },
  fib4: { boxId: "gastromedisin", label: "FIB-4", subcategory: "Leverfibrose" },
  "homa-ir": { boxId: "endokrinologi", label: "HOMA-IR", subcategory: "Metabolisme" },
  "cpeptide-glucose": { boxId: "endokrinologi", label: "C-peptid/glukose-ratio", subcategory: "Metabolisme" },
  "psa-age-adjusted": { boxId: "urologi", label: "Aldersjustert PSA" },
  ipss: { boxId: "urologi", label: "IPSS-8" }
};

const toolPostitMap: Record<string, { boxId: string; label?: string; subcategory?: string }> = {
  madrs: { boxId: "psykiatri", label: "MADRS", subcategory: "Depresjon" },
  "gad-7": { boxId: "psykiatri", label: "GAD-7", subcategory: "Angst" },
  asrs: { boxId: "psykiatri", label: "ASRS v1.1", subcategory: "ADHD" },
  audit: { boxId: "psykiatri", label: "AUDIT - Kartlegging", subcategory: "Alkohol" },
  "eular-ra-2010": { boxId: "revmatologi", label: "EULAR 2010 Revmatoid Artritt" },
  "eular-pmr-2012": { boxId: "revmatologi", label: "EULAR 2012 Polymyalgia Rheumatica" },
  "ciwa-ar": { boxId: "psykiatri", label: "CIWA-A - Abstinensskår", subcategory: "Alkohol" },
  "ciwa-b": { boxId: "psykiatri", label: "CIWA-B - Abstinensskår", subcategory: "Benzodiazepiner" },
  cage: { boxId: "psykiatri", label: "CAGE - Rask screening", subcategory: "Alkohol" },
  alvarado: { boxId: "gastromedisin", label: "Alvarado-skår", subcategory: "Appendisitt" }
};

const specialCalculatorItems: PostitItem[] = [
  { id: "date-calculator", label: "Datokalkulator", itemType: "calc" },
  { id: "medication-calculator", label: "Legemiddelberegner", itemType: "calc" },
  { id: "tapering-plan", label: "Nedtrappingsplan", itemType: "calc" },
  { id: "pregnancy-calculator", label: "Svangerskap", itemType: "calc" }
];

const externalPostitItemsByBox: Record<string, Array<{ id: string; label: string; url: string; subcategory?: string }>> = {
  svangerskap: [
    { id: "obs-sukk-s", label: "SUKK-S skår", url: "https://www.google.com/search?q=SUKK-S+sk%C3%A5r" }
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
    if (excludedCalcIds.has(calc.id)) {
      return;
    }
    const mapped = calcPostitMap[calc.id];
    const boxId = mapped?.boxId ?? "generelle";
    const label = mapped?.label ?? cleanToolDisplayName(calc.name);
    if (!buckets.has(boxId)) {
      buckets.set(boxId, []);
    }
    buckets.get(boxId)?.push({ id: calc.id, label, itemType: "calc", subcategory: mapped?.subcategory });
  });

  sortedTools.forEach((tool) => {
    const mapped = toolPostitMap[tool.id];
    const boxId = mapped?.boxId ?? "psykiatri";
    const label = mapped?.label ?? cleanToolDisplayName(tool.name);
    if (!buckets.has(boxId)) {
      buckets.set(boxId, []);
    }
    buckets.get(boxId)?.push({ id: tool.id, label, itemType: "tool", subcategory: mapped?.subcategory });
  });

  specialCalculatorItems.forEach((item) => {
    buckets.get("generelle")?.push(item);
  });

  Object.entries(externalPostitItemsByBox).forEach(([boxId, items]) => {
    if (!buckets.has(boxId)) {
      buckets.set(boxId, []);
    }
    items.forEach((item) => {
      buckets.get(boxId)?.push({ id: item.id, label: item.label, itemType: "link", url: item.url, subcategory: item.subcategory });
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

    const sortedItems = [...dedupedItems].sort((a, b) => {
      const subcategoryCompare = (a.subcategory ?? "").localeCompare(b.subcategory ?? "", "nb");
      if (subcategoryCompare !== 0) return subcategoryCompare;
      return a.label.localeCompare(b.label, "nb");
    });

    return {
      boxId,
      title: postitTitles[boxId] ?? boxId,
      items: sortedItems
    };
  });
}