export { getJstDateString } from "@/shared/lib/time";

export function isTrimmedNonEmpty(value: string): boolean {
  return value.trim().length > 0;
}

export function normalizeShoppingDate(value: string): string | null {
  const dateOnly = /^\d{4}-\d{2}-\d{2}$/;

  if (dateOnly.test(value)) {
    const date = new Date(`${value}T00:00:00.000Z`);
    if (Number.isNaN(date.getTime())) {
      return null;
    }
    const normalized = date.toISOString().slice(0, 10);
    return normalized === value ? value : null;
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return date.toISOString().slice(0, 10);
}
