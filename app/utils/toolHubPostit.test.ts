import { describe, expect, it } from "vitest";
import { buildPostitSections, defaultPostitBoxOrder } from "./toolHubPostit";

describe("buildPostitSections", () => {
  it("places the special calculator shortcuts in the Generelle section", () => {
    const sections = buildPostitSections(defaultPostitBoxOrder, [], []);
    const generelle = sections.find((section) => section.boxId === "generelle");

    expect(generelle?.items.some((item) => item.id === "date-calculator" && item.label === "Datokalkulator")).toBe(true);
    expect(generelle?.items.some((item) => item.id === "medication-calculator" && item.label === "Legemiddelberegner")).toBe(true);
    expect(generelle?.items.some((item) => item.id === "tapering-plan" && item.label === "Nedtrappingsplan")).toBe(true);
    expect(generelle?.items.some((item) => item.id === "pregnancy-calculator" && item.label === "Svangerskap")).toBe(true);
  });
});
