import type {
  IsoDateString,
  IsoDateTimeString,
  YearMonthString,
} from "../../types/index.ts";

const DATE_ONLY = /^\d{4}-\d{2}-\d{2}$/;
const YEAR_MONTH_ONLY = /^\d{4}-\d{2}$/;

export function normalizeIsoDateString(value: string): IsoDateString | null {
  if (!DATE_ONLY.test(value)) return null;

  const date = new Date(`${value}T00:00:00.000Z`);
  if (Number.isNaN(date.getTime())) return null;

  const normalized = date.toISOString().slice(0, 10);
  return normalized === value ? value : null;
}

export function normalizeIsoDateTimeString(
  value: string
): IsoDateTimeString | null {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toISOString();
}

export function normalizeYearMonthString(value: string): YearMonthString | null {
  if (!YEAR_MONTH_ONLY.test(value)) return null;

  const [year, month] = value.split("-").map((part) => Number(part));
  if (!Number.isInteger(year) || !Number.isInteger(month)) return null;
  if (month < 1 || month > 12) return null;
  return value;
}
