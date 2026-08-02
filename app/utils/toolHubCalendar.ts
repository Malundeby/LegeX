import {
  addOffset,
  formatNorwegianDate,
  isoWeekNumber,
  parseOneLineOffset,
  weekdayName,
  type MultiOffset
} from "./dateCalculator";

export type DateCalcDirection = "forward" | "backward";

export interface DateCalcResult {
  date: Date;
  dateText: string;
  weekday: string;
  weekNumber: number;
  dayDiff: number;
}

export interface MedDurationResult {
  durationDays: number;
  endDate: Date;
  endDateText: string;
}

export interface AvgUsageErrorResult {
  error: string;
}

export interface AvgUsageValueResult {
  daySpan: number;
  daily: number;
}

export type AvgUsageResult = AvgUsageErrorResult | AvgUsageValueResult;

export interface PregnancyResult {
  eddDate: Date;
  lmpDate: Date;
  conceptionDate: Date;
  eddText: string;
  conceptionText: string;
  gestationalAgeText: string;
  timeToDueDateText: string;
}

export interface PregnancyReferralInput {
  pregnancyPara: string;
  pregnancyResult: PregnancyResult | null;
  pregnancyWeightKg: string;
  pregnancyHeightCm: string;
  pregnancyBmi: number | null;
  pregnancyOtherConditions: string;
  pregnancyMedicalHistory: string;
  pregnancyMedications: string;
  pregnancyMentalHealth: string;
  pregnancyRiskPregnancy: boolean;
}

export const getTodayIso = () => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

export const parseIsoDate = (value: string) => {
  if (!value) return null;
  const [year, month, day] = value.split("-").map(Number);
  if (!year || !month || !day) return null;
  return new Date(Date.UTC(year, month - 1, day));
};

export const parseLocaleNumber = (value: string) => {
  const trimmed = value.trim();
  if (!trimmed) return null;
  const normalized = trimmed.replace(",", ".");
  const parsed = Number(normalized);
  return Number.isNaN(parsed) ? null : parsed;
};

export const daysBetweenUtc = (start: Date, end: Date) => (
  Math.round((end.getTime() - start.getTime()) / (24 * 60 * 60 * 1000))
);

export function buildDateCalcOffset(
  dateCalcInline: string,
  dateCalcDirection: DateCalcDirection,
  dateCalcInlineParsed: MultiOffset | null
) {
  if (dateCalcInline.trim()) {
    if (!dateCalcInlineParsed) return null;
    const hasExplicitSign = /^[+-]/.test(dateCalcInline.trim());
    const sign = hasExplicitSign ? dateCalcInlineParsed.sign : (dateCalcDirection === "forward" ? 1 : -1);
    return { ...dateCalcInlineParsed, sign };
  }

  return null;
}

export function calculateDateCalcResult(dateCalcStart: string, dateCalcOffset: MultiOffset | null): DateCalcResult | null {
  const baseDate = parseIsoDate(dateCalcStart);
  if (!baseDate || !dateCalcOffset) return null;

  const resultDate = addOffset(baseDate, dateCalcOffset);
  return {
    date: resultDate,
    dateText: formatNorwegianDate(resultDate),
    weekday: weekdayName(resultDate),
    weekNumber: isoWeekNumber(resultDate),
    dayDiff: daysBetweenUtc(baseDate, resultDate)
  };
}

export function calculateMedDurationResult(
  medStartDate: string,
  medUnits: string,
  medDosePerDay: string
): MedDurationResult | null {
  const startDate = parseIsoDate(medStartDate);
  if (!startDate) return null;

  const unitValue = parseLocaleNumber(medUnits);
  const doseValue = parseLocaleNumber(medDosePerDay);
  if (unitValue === null || doseValue === null || doseValue <= 0) return null;

  const totalUnits = Math.round(unitValue);
  if (totalUnits <= 0) return null;

  const durationDays = Math.ceil(totalUnits / doseValue);
  const endDate = addOffset(startDate, { sign: 1, value: durationDays - 1, unit: "day" });

  return {
    durationDays,
    endDate,
    endDateText: formatNorwegianDate(endDate)
  };
}

export function buildMedPatientMessage(
  medDurationResult: MedDurationResult | null,
  medStartDate: string,
  medUnits: string,
  medDosePerDay: string
): string {
  if (!medDurationResult) return "";

  const prescribedDate = parseIsoDate(medStartDate);
  const prescribedDateText = prescribedDate ? formatNorwegianDate(prescribedDate) : medStartDate;
  const tabletsText = String(Math.round(parseLocaleNumber(medUnits) ?? 0));
  const doseInput = medDosePerDay.trim() || "0";

  return `Det er ${prescribedDateText} skrevet resept på ${tabletsText} tabletter. Basert på et forbruk av ${doseInput} tabletter om dagen, skal dette vare til minst ${medDurationResult.endDateText}.`;
}

export function buildMedJournalMessage(
  medDurationResult: MedDurationResult | null,
  medUnits: string,
  medDosePerDay: string
): string {
  if (!medDurationResult) return "";

  const tabletsText = String(Math.round(parseLocaleNumber(medUnits) ?? 0));
  const doseText = medDosePerDay.trim() || "0";

  return `Resept på ${tabletsText} tabletter. Dosert ${doseText} om dagen. Skal minst vare til: ${medDurationResult.endDateText} (Uke ${isoWeekNumber(medDurationResult.endDate)} ${medDurationResult.endDate.getUTCFullYear()}). Varighet: ${medDurationResult.durationDays} dager.`;
}

export function calculateAvgUsageResult(
  avgPrevDate: string,
  avgNextDate: string,
  avgPrevUnits: string
): AvgUsageResult | null {
  const prevDate = parseIsoDate(avgPrevDate);
  const nextDate = parseIsoDate(avgNextDate);
  if (!prevDate || !nextDate) return null;

  const units = parseLocaleNumber(avgPrevUnits);
  if (units === null) return null;

  const daySpan = daysBetweenUtc(prevDate, nextDate);
  if (daySpan <= 0) {
    return { error: "Neste dato må være etter forrige dato." };
  }

  return {
    daySpan,
    daily: units / daySpan
  };
}

export function calculatePregnancyResult(pregnancyDate: string): PregnancyResult | null {
  const lmpDate = parseIsoDate(pregnancyDate);
  if (!lmpDate) return null;

  const pregnancyLengthDays = 283;
  const conceptionOffsetDays = 14;

  const today = parseIsoDate(getTodayIso());
  if (!today) return null;

  const eddDate = addOffset(lmpDate, { sign: 1, value: pregnancyLengthDays, unit: "day" });
  const conceptionDate = addOffset(lmpDate, { sign: 1, value: conceptionOffsetDays, unit: "day" });

  const gestationalAgeDays = daysBetweenUtc(lmpDate, today);
  const gestationalWeeks = Math.floor(Math.abs(gestationalAgeDays) / 7);
  const gestationalDaysRemainder = Math.abs(gestationalAgeDays) % 7;

  const daysToDueDate = daysBetweenUtc(today, eddDate);
  const weeksToDueDate = Math.floor(Math.abs(daysToDueDate) / 7);
  const daysToDueDateRemainder = Math.abs(daysToDueDate) % 7;

  return {
    eddDate,
    lmpDate,
    conceptionDate,
    eddText: `${formatNorwegianDate(eddDate)} (${weekdayName(eddDate)})`,
    conceptionText: `${formatNorwegianDate(conceptionDate)} (${weekdayName(conceptionDate)})`,
    gestationalAgeText: `${gestationalWeeks} Uker, ${gestationalDaysRemainder} Dager (${gestationalAgeDays} Dager)`,
    timeToDueDateText: `${weeksToDueDate} Uker, ${daysToDueDateRemainder} Dager (${daysToDueDate} Dager)`
  };
}

export function calculatePregnancyBmi(
  pregnancyWeightKg: string,
  pregnancyHeightCm: string
): number | null {
  const weight = parseLocaleNumber(pregnancyWeightKg);
  const height = parseLocaleNumber(pregnancyHeightCm);
  if (weight === null || height === null || weight <= 0 || height <= 0) return null;

  const heightMeters = height / 100;
  const bmi = weight / (heightMeters * heightMeters);
  if (!Number.isFinite(bmi) || bmi <= 0) return null;
  return bmi;
}

export function buildPregnancyReferralText(input: PregnancyReferralInput): string {
  const lines: string[] = [];

  const patientInfoLines: string[] = [];
  const trimmedPara = input.pregnancyPara.trim();
  if (trimmedPara) {
    patientInfoLines.push(`Para: ${trimmedPara}`);
  }
  if (input.pregnancyResult) {
    patientInfoLines.push(`LMP: ${formatNorwegianDate(input.pregnancyResult.lmpDate)}`);
    patientInfoLines.push(`Termin beregnet fra LMP: ${formatNorwegianDate(input.pregnancyResult.eddDate)}`);
  }
  if (patientInfoLines.length > 0) {
    if (lines.length > 0) {
      lines.push("");
    }
    lines.push("Informasjon om den gravide:", ...patientInfoLines);
  }

  const bodyMeasurementsLines: string[] = [];
  const trimmedWeight = input.pregnancyWeightKg.trim();
  const trimmedHeight = input.pregnancyHeightCm.trim();
  if (trimmedWeight) {
    bodyMeasurementsLines.push(`Vekt (kg): ${trimmedWeight}`);
  }
  if (trimmedHeight) {
    bodyMeasurementsLines.push(`Høyde (cm): ${trimmedHeight}`);
  }
  if (input.pregnancyBmi !== null) {
    bodyMeasurementsLines.push(`BMI: ${input.pregnancyBmi.toFixed(1)}`);
  }
  if (bodyMeasurementsLines.length > 0) {
    lines.push("", "Kroppsmål:", ...bodyMeasurementsLines);
  }

  const trimmedMedicalHistory = input.pregnancyMedicalHistory.trim();
  if (trimmedMedicalHistory) {
    lines.push("", "Sykehistorie:", trimmedMedicalHistory);
  }

  const trimmedMentalHealth = input.pregnancyMentalHealth.trim();
  if (trimmedMentalHealth) {
    lines.push("", `Psykisk: ${trimmedMentalHealth}`);
  }

  const trimmedMedications = input.pregnancyMedications.trim();
  if (trimmedMedications) {
    lines.push("", `Medisiner: ${trimmedMedications}`);
  }

  const trimmedOtherConditions = input.pregnancyOtherConditions.trim();
  if (trimmedOtherConditions) {
    lines.push("", "Andre forhold:", trimmedOtherConditions);
  }

  if (input.pregnancyRiskPregnancy) {
    lines.push("", "Risikosvangerskap: Ja");
  }

  lines.push("", "V/T", "Henvises for tidlig ultralyd (11+0-13+6) og rutine ultralyd (17-19).");

  return lines.join("\n");
}

export const parseCalendarInlineOffset = parseOneLineOffset;