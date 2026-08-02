import scoringToolsData from "../../data/scoring-tools.json";
import calculatorsData from "../../data/calculators.json";
import calculatorsNewData from "../../data/calculators-new.json";

export interface ToolOption {
  label: string;
  score: number;
}

export interface ToolQuestion {
  id: string;
  text: string;
  options: ToolOption[];
  part?: string;
}

export interface ToolThreshold {
  minScore: number;
  label: string;
  color?: string;
}

export interface PdfOption {
  label: string;
  url: string;
  patientFacing?: boolean;
}

export interface ScoringTool {
  id: string;
  name: string;
  description: string;
  questions: ToolQuestion[];
  thresholds: ToolThreshold[];
  pdfUrl?: string;
  patientPdfUrl?: string;
  pdfOptions?: PdfOption[];
}

export interface CalcField {
  id: string;
  label: string;
  type: "number" | "select";
  min?: number;
  max?: number;
  step?: number;
  options?: string[];
  part?: string;
}

export interface CalcThreshold {
  max: number;
  label: string;
  color: string;
}

export interface Calculator {
  id: string;
  name: string;
  description: string;
  fields: CalcField[];
  thresholds: CalcThreshold[];
  layout?: "horizontal" | "vertical-select";
  pdfUrl?: string;
  patientPdfUrl?: string;
}

export type ToolAliasType = "score" | "calc";

export interface ToolAlias {
  id: string;
  type: ToolAliasType;
}

export const scoringToolRegistry = scoringToolsData as ScoringTool[];

export const calculatorRegistry = (() => {
  const merged = [...(calculatorsData as Calculator[]), ...(calculatorsNewData as Calculator[])];
  const byId = new Map<string, Calculator>();

  merged.forEach((calculator) => {
    if (!byId.has(calculator.id)) {
      byId.set(calculator.id, calculator);
    }
  });

  return [...byId.values()];
})();

export const toolAliases: Record<string, ToolAlias> = {
  madrs: { id: "madrs", type: "score" },
  "gad-7": { id: "gad-7", type: "score" },
  gad7: { id: "gad-7", type: "score" },
  asrs: { id: "asrs", type: "score" },
  "asrs-v1.1": { id: "asrs", type: "score" },
  audit: { id: "audit", type: "score" },
  "eular-ra-2010": { id: "eular-ra-2010", type: "score" },
  "eular-pmr-2012": { id: "eular-pmr-2012", type: "score" },
  bmi: { id: "bmi", type: "calc" },
  ccs: { id: "ccs", type: "calc" },
  "ccs-angina": { id: "ccs-angina", type: "calc" },
  nyha: { id: "nyha", type: "calc" },
  chadsvasc: { id: "chadsvasc", type: "calc" },
  "cha2ds2-vasc": { id: "chadsvasc", type: "calc" },
  hasbled: { id: "hasbled", type: "calc" },
  mmrc: { id: "mmrc", type: "calc" },
  "cat-copd": { id: "cat", type: "calc" },
  cat: { id: "cat", type: "calc" },
  crb65: { id: "crb65", type: "calc" },
  act: { id: "act", type: "calc" },
  "act-asthma": { id: "act", type: "calc" },
  "act-voksne": { id: "act", type: "calc" },
  "act-barn": { id: "act-child", type: "calc" },
  "act-child": { id: "act-child", type: "calc" },
  fib4: { id: "fib4", type: "calc" },
  "fib-4": { id: "fib4", type: "calc" },
  ipss: { id: "ipss", type: "calc" },
  "wells-dvt": { id: "wells-dvt", type: "calc" },
  "wells-pe": { id: "wells-pe", type: "calc" },
  "doak-dosing": { id: "doak-dosing", type: "calc" },
  "psa-age-adjusted": { id: "psa-age-adjusted", type: "calc" },
  "anemia-assessment": { id: "anemia-assessment", type: "calc" }
};

const scoringToolIds = new Set(scoringToolRegistry.map((tool) => tool.id));
const calculatorIds = new Set(calculatorRegistry.map((calculator) => calculator.id));

export function resolveToolSlug(toolSlug?: string | null): ToolAlias | null {
  if (!toolSlug) {
    return null;
  }

  return toolAliases[toolSlug.toLowerCase()] ?? null;
}

export function toolAliasExists(toolAlias: ToolAlias): boolean {
  return toolAlias.type === "score"
    ? scoringToolIds.has(toolAlias.id)
    : calculatorIds.has(toolAlias.id);
}