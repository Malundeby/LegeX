export type OffsetUnit = "day" | "week" | "month" | "year";

export interface DateOffset {
  sign: 1 | -1;
  value: number;
  unit: OffsetUnit;
}

export interface MultiOffset {
  sign: 1 | -1;
  days: number;
  weeks: number;
  months: number;
  years: number;
}

export type OffsetInput = DateOffset | MultiOffset;

const unitMap: Record<string, OffsetUnit> = {
  d: "day",
  u: "week",
  m: "month",
  "år": "year",
  aar: "year"
};

const toNumber = (value: string) => {
  const normalized = value.replace(",", ".");
  const parsed = Number(normalized);
  return Number.isNaN(parsed) ? null : parsed;
};

export const parseOneLineOffset = (input: string): MultiOffset | null => {
  const trimmed = input.trim().toLowerCase();
  if (!trimmed) return null;

  const sign = trimmed.startsWith("-") ? -1 : 1;
  const withoutSign = trimmed.replace(/^\s*[+-]\s*/, "");

  const tokenRegex = /(\d+(?:[.,]\d+)?)\s*(d|u|m|år|aar)/gi;
  const matches = [...withoutSign.matchAll(tokenRegex)];
  if (matches.length === 0) return null;

  const consumed = matches.map(match => match[0]).join("");
  const remaining = withoutSign.replace(tokenRegex, "").trim();
  if (remaining || consumed.length === 0) return null;

  const offset: MultiOffset = {
    sign,
    days: 0,
    weeks: 0,
    months: 0,
    years: 0
  };

  for (const match of matches) {
    const value = toNumber(match[1]);
    const unitKey = match[2];
    if (value === null) return null;

    const unit = unitMap[unitKey];
    if (!unit) return null;

    if (unit === "day") offset.days += value;
    if (unit === "week") offset.weeks += value;
    if (unit === "month") offset.months += value;
    if (unit === "year") offset.years += value;
  }

  return offset;
};

const daysInMonth = (year: number, month: number) => (
  new Date(Date.UTC(year, month, 0)).getUTCDate()
);

const addDays = (date: Date, days: number) => {
  const result = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  result.setUTCDate(result.getUTCDate() + days);
  return result;
};

const addMonths = (date: Date, months: number) => {
  const year = date.getUTCFullYear();
  const month = date.getUTCMonth() + 1;
  const day = date.getUTCDate();

  const totalMonths = year * 12 + (month - 1) + months;
  const targetYear = Math.floor(totalMonths / 12);
  const targetMonth = totalMonths % 12;
  const lastDay = daysInMonth(targetYear, targetMonth + 1);
  const clampedDay = Math.min(day, lastDay);

  return new Date(Date.UTC(targetYear, targetMonth, clampedDay));
};

const addYears = (date: Date, years: number) => {
  const year = date.getUTCFullYear() + years;
  const month = date.getUTCMonth() + 1;
  const day = date.getUTCDate();
  const lastDay = daysInMonth(year, month);
  const clampedDay = Math.min(day, lastDay);

  return new Date(Date.UTC(year, month - 1, clampedDay));
};

export const addOffset = (startDate: Date, offset: OffsetInput) => {
  if ("unit" in offset) {
    const value = Math.round(offset.value);
    if (!Number.isFinite(value)) return startDate;

    const signedValue = offset.sign * value;

    if (offset.unit === "day") {
      return addDays(startDate, signedValue);
    }

    if (offset.unit === "week") {
      return addDays(startDate, signedValue * 7);
    }

    if (offset.unit === "month") {
      return addMonths(startDate, signedValue);
    }

    return addYears(startDate, signedValue);
  }

  const monthsDelta = Math.round(offset.years) * 12 + Math.round(offset.months);
  const daysDelta = Math.round(offset.weeks) * 7 + Math.round(offset.days);

  const afterMonths = addMonths(startDate, offset.sign * monthsDelta);
  return addDays(afterMonths, offset.sign * daysDelta);
};

export const formatNorwegianDate = (date: Date) => {
  const day = String(date.getUTCDate()).padStart(2, "0");
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  const year = date.getUTCFullYear();
  return `${day}.${month}.${year}`;
};

export const isoWeekNumber = (date: Date) => {
  const target = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  const dayIndex = (target.getUTCDay() + 6) % 7;
  target.setUTCDate(target.getUTCDate() - dayIndex + 3);

  const firstThursday = new Date(Date.UTC(target.getUTCFullYear(), 0, 4));
  const firstDayIndex = (firstThursday.getUTCDay() + 6) % 7;
  firstThursday.setUTCDate(firstThursday.getUTCDate() - firstDayIndex + 3);

  const diffMs = target.getTime() - firstThursday.getTime();
  return 1 + Math.round(diffMs / (7 * 24 * 60 * 60 * 1000));
};

export const weekdayName = (date: Date) => {
  const names = ["Søndag", "Mandag", "Tirsdag", "Onsdag", "Torsdag", "Fredag", "Lørdag"];
  return names[date.getUTCDay()];
};
