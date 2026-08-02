import { describe, expect, it } from "vitest";
import {
  calculatorRegistry,
  resolveToolSlug,
  scoringToolRegistry,
  toolAliasExists
} from "./toolRegistry";

describe("toolRegistry", () => {
  it("resolves legacy and canonical aliases", () => {
    expect(resolveToolSlug("gad7")).toEqual({ id: "gad-7", type: "score" });
    expect(resolveToolSlug("fib-4")).toEqual({ id: "fib4", type: "calc" });
    expect(resolveToolSlug("unknown-tool")).toBeNull();
  });

  it("keeps the first calculator definition when ids overlap", () => {
    const bmiCalculator = calculatorRegistry.find((calculator) => calculator.id === "bmi");

    expect(bmiCalculator).toBeDefined();
    expect(bmiCalculator?.name).toBe("⚖️ BMI-kalkulator");
  });

  it("only reports aliases for real registry entries", () => {
    const madrsAlias = resolveToolSlug("madrs");
    const fibAlias = resolveToolSlug("fib-4");

    expect(scoringToolRegistry.some((tool) => tool.id === madrsAlias?.id)).toBe(true);
    expect(madrsAlias && toolAliasExists(madrsAlias)).toBe(true);
    expect(fibAlias && toolAliasExists(fibAlias)).toBe(true);
    expect(resolveToolSlug("norrisk-2")).toBeNull();
  });
});