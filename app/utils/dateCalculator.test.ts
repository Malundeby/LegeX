import { describe, expect, it } from "vitest";
import { addOffset, formatNorwegianDate, parseOneLineOffset } from "./dateCalculator";

const makeDate = (year: number, month: number, day: number) => (
  new Date(Date.UTC(year, month - 1, day))
);

describe("addOffset", () => {
  it("clamps end-of-month forward", () => {
    const result = addOffset(makeDate(2023, 1, 31), { sign: 1, value: 1, unit: "month" });
    expect(formatNorwegianDate(result)).toBe("28.02.2023");
  });

  it("clamps end-of-month backward", () => {
    const result = addOffset(makeDate(2023, 3, 31), { sign: -1, value: 1, unit: "month" });
    expect(formatNorwegianDate(result)).toBe("28.02.2023");
  });

  it("handles leap-year February", () => {
    const result = addOffset(makeDate(2024, 1, 31), { sign: 1, value: 1, unit: "month" });
    expect(formatNorwegianDate(result)).toBe("29.02.2024");
  });

  it("clamps Feb 29 on year change", () => {
    const result = addOffset(makeDate(2024, 2, 29), { sign: 1, value: 1, unit: "year" });
    expect(formatNorwegianDate(result)).toBe("28.02.2025");
  });

  it("adds weeks as 7 days", () => {
    const result = addOffset(makeDate(2025, 5, 10), { sign: 1, value: 2, unit: "week" });
    expect(formatNorwegianDate(result)).toBe("24.05.2025");
  });
});

describe("parseOneLineOffset", () => {
  it("parses days without sign", () => {
    expect(parseOneLineOffset("14d")).toEqual({ sign: 1, days: 14, weeks: 0, months: 0, years: 0 });
  });

  it("parses positive months", () => {
    expect(parseOneLineOffset("+3m")).toEqual({ sign: 1, days: 0, weeks: 0, months: 3, years: 0 });
  });

  it("parses negative years", () => {
    expect(parseOneLineOffset("-1år")).toEqual({ sign: -1, days: 0, weeks: 0, months: 0, years: 1 });
  });

  it("parses weeks", () => {
    expect(parseOneLineOffset("6u")).toEqual({ sign: 1, days: 0, weeks: 6, months: 0, years: 0 });
  });

  it("parses mixed units", () => {
    expect(parseOneLineOffset("1u 5d")).toEqual({ sign: 1, days: 5, weeks: 1, months: 0, years: 0 });
    expect(parseOneLineOffset("5d 1u")).toEqual({ sign: 1, days: 5, weeks: 1, months: 0, years: 0 });
  });
});
