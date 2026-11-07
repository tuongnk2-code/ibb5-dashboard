// Salary schedule supplied by the user. Keep amounts explicit for easy review.
export const PROBATION_SALARY = 4500000;
export const SALARY_BANDS = [
  [0, 25, 4700000], [26, 30, 5200000], [31, 35, 5700000],
  [36, 40, 6200000], [41, 45, 7000000], [46, 50, 7800000],
  [51, 55, 8600000], [56, 60, 9400000], [61, 65, 10300000],
  [66, 70, 11200000], [71, 75, 12100000], [76, 80, 13000000],
  [81, 85, 13900000], [86, 90, 14800000], [91, 95, 15700000],
  [96, 100, 16700000], [101, 105, 17700000], [106, 110, 18700000],
  [111, 115, 19700000], [116, 120, 20700000], [121, 125, 21900000],
  [126, 130, 23100000], [131, 135, 24300000], [136, 140, 25500000],
  [141, 145, 26700000], [146, 150, 27900000], [151, 155, 29400000],
  [156, 160, 30900000], [161, 165, 32400000], [166, 170, 33900000],
  [171, 175, 35400000], [176, 180, 36900000], [181, Infinity, 38900000],
].map(([from, to, salary]) => Object.freeze({ from, to, salary }));

export function lookupSalary(total, probation = false) {
  if (typeof total !== 'number' || !Number.isFinite(total) || total < 0) return null;
  if (probation) return { salary: PROBATION_SALARY, label: 'Thử việc', from: null, to: null };
  const band = SALARY_BANDS.find(b => total >= b.from && total <= b.to);
  return band ? { ...band, label: band.to === Infinity ? 'Từ ' + band.from + ' INT' : band.from + '–' + band.to + ' INT' } : null;
}
