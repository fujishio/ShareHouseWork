export { getJstDateString } from "../../shared/lib/time.ts";
import { normalizeIsoDateString } from "../../shared/lib/date-normalization.ts";

export function isTrimmedNonEmpty(value: string): boolean {
  return value.trim().length > 0;
}

export function normalizeShoppingDate(value: string): string | null {
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return normalizeIsoDateString(value);
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toISOString().slice(0, 10);
}
