export function formatRelativeTime(date: Date): string {
  const now = new Date("2026-02-24T12:00:00");
  const diff = now.getTime() - date.getTime();
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (minutes < 1) return "たった今";
  if (minutes < 60) return `${minutes}分前`;
  if (hours < 24) return `${hours}時間前`;
  if (days === 1) return "昨日";
  return `${days}日前`;
}
