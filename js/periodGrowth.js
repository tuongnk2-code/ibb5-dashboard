export function periodGrowth(current, previous) {
  if (previous === null) return 'Chưa có dữ liệu T−1';
  if (previous === 0) return current === 0 ? '0,00%' : 'Mới (+' + current + ' HĐ)';
  return ((current - previous) / previous * 100).toFixed(2).replace('.', ',') + '%';
}
