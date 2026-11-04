export function dailyPace(gap, asOf) {
  const [year, month, day] = asOf.split('-').map(Number);
  const remaining = new Date(year, month, 0).getDate() - day;
  const days = Math.max(0, remaining);
  return { remaining, days, pace: gap === null || !days ? null : gap / days };
}
