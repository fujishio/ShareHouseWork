export function monthToDateRange(month: string): { from: string; to: string } | null {
  const match = /^(\d{4})-(\d{2})$/.exec(month);
  if (!match) return null;

  const year = parseInt(match[1]!, 10);
  const mon = parseInt(match[2]!, 10);
  if (mon < 1 || mon > 12) return null;

  const from = `${String(year).padStart(4, "0")}-${String(mon).padStart(2, "0")}-01`;
  const nextMon = mon === 12 ? 1 : mon + 1;
  const nextYear = mon === 12 ? year + 1 : year;
  const to = `${String(nextYear).padStart(4, "0")}-${String(nextMon).padStart(2, "0")}-01`;
  return { from, to };
}
