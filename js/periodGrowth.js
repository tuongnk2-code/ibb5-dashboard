export function periodGrowth(current, previous) {
  if (previous === null) return 'Chưa có dữ liệu T−1';
  const change = current - previous;
  return (change > 0 ? '+' : '') + change + ' HĐ';
}
