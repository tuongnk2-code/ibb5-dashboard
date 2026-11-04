export function dailyPace(gap, asOf) {
  const [year, month, day] = asOf.split('-').map(Number);
  const remaining = new Date(year, month, 0).getDate() - day;
  // Keep the remaining target actionable when the three-day buffer is exhausted.
  const days = Math.max(1, remaining - 3);
  return { remaining, days, pace: gap === null ? null : gap / days };
}
