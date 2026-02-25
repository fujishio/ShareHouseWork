export function calculateUsageRate(totalContributed: number, totalSpent: number): number {
  const safeContributed =
    Number.isFinite(totalContributed) && totalContributed > 0 ? totalContributed : 0;
  const safeSpent = Number.isFinite(totalSpent) && totalSpent >= 0 ? totalSpent : 0;

  if (safeContributed === 0) {
    return 0;
  }

  return Math.min(100, Math.max(0, Math.round((safeSpent / safeContributed) * 100)));
}
