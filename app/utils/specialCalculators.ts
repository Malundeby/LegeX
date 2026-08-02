export type SpecialCalcTab = "date" | "med" | "pregnancy" | "tapering";

export const specialCalcIdToTab: Record<string, SpecialCalcTab> = {
  "date-calculator": "date",
  "medication-calculator": "med",
  "tapering-plan": "tapering",
  "pregnancy-calculator": "pregnancy"
};

export const specialCalcTabTitle: Record<SpecialCalcTab, string> = {
  date: "Datokalkulator",
  med: "Legemiddelberegner",
  tapering: "Nedtrappingsplan",
  pregnancy: "Svangerskapsmodulen"
};

export const getSpecialCalcTab = (id: string): SpecialCalcTab | null => {
  return specialCalcIdToTab[id] ?? null;
};
