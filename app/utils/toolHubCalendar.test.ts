import { describe, expect, it } from "vitest";
import {
  buildDateCalcOffset,
  buildMedJournalMessage,
  buildMedPatientMessage,
  calculateAvgUsageResult,
  calculateMedDurationResult,
  calculatePregnancyBmi,
  parseCalendarInlineOffset
} from "./toolHubCalendar";

describe("toolHubCalendar", () => {
  it("applies fallback direction when inline offset has no explicit sign", () => {
    const parsed = parseCalendarInlineOffset("2u");
    const forward = buildDateCalcOffset("2u", "forward", parsed);
    const backward = buildDateCalcOffset("2u", "backward", parsed);

    expect(forward?.sign).toBe(1);
    expect(backward?.sign).toBe(-1);
  });

  it("keeps explicit sign in inline offset", () => {
    const parsed = parseCalendarInlineOffset("-2u");
    const result = buildDateCalcOffset("-2u", "forward", parsed);

    expect(result?.sign).toBe(-1);
  });

  it("calculates medication duration and messages", () => {
    const medDuration = calculateMedDurationResult("2026-01-10", "30", "2");

    expect(medDuration?.durationDays).toBe(15);
    expect(medDuration?.endDateText).toBe("24.01.2026");

    const patientText = buildMedPatientMessage(medDuration ?? null, "2026-01-10", "30", "2");
    const journalText = buildMedJournalMessage(medDuration ?? null, "30", "2");

    expect(patientText).toContain("24.01.2026");
    expect(journalText).toContain("Varighet: 15 dager");
  });

  it("returns average-usage validation error for invalid date range", () => {
    const result = calculateAvgUsageResult("2026-01-10", "2026-01-10", "10");

    expect(result).toEqual({ error: "Neste dato må være etter forrige dato." });
  });

  it("calculates pregnancy BMI from locale-aware input", () => {
    const bmi = calculatePregnancyBmi("75", "170");

    expect(bmi).not.toBeNull();
    expect(Number(bmi?.toFixed(1))).toBe(26);
  });
});