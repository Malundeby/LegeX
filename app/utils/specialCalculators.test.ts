import { describe, expect, it } from "vitest";
import {
  getSpecialCalcTab,
  specialCalcIdToTab,
  specialCalcTabTitle
} from "./specialCalculators";

describe("special calculator mappings", () => {
  it("maps the four special calculator IDs to tabs", () => {
    expect(specialCalcIdToTab["date-calculator"]).toBe("date");
    expect(specialCalcIdToTab["medication-calculator"]).toBe("med");
    expect(specialCalcIdToTab["tapering-plan"]).toBe("tapering");
    expect(specialCalcIdToTab["pregnancy-calculator"]).toBe("pregnancy");
  });

  it("exposes Norwegian titles for every special tab", () => {
    expect(specialCalcTabTitle.date).toBe("Datokalkulator");
    expect(specialCalcTabTitle.med).toBe("Legemiddelberegner");
    expect(specialCalcTabTitle.tapering).toBe("Nedtrappingsplan");
    expect(specialCalcTabTitle.pregnancy).toBe("Svangerskapsmodulen");
  });

  it("returns null for non-special calculator IDs", () => {
    expect(getSpecialCalcTab("fib4")).toBeNull();
  });
});
