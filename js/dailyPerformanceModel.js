import { isTerminatedNetContract } from './cancellationArchive.js';
import { isCancellationResult } from './dashboardStateModel.js';

export function dailyPerformanceContracts(data, notes = {}) {
  const contracts = new Map();
  for (const row of data) {
    if (row.type !== 'Internet' || !row.id) continue;
    const id = String(row.id).trim().toUpperCase(), old = contracts.get(id);
    if (!old || (!old.date && row.date)) contracts.set(id, row);
  }
  return [...contracts.entries()].filter(([id, row]) => {
    const note = notes[id] || notes[row.id] || {};
    const status = String(row.status || '').normalize('NFC').trim().toLocaleLowerCase('vi-VN').replace(/\s+/g, ' ');
    return !isTerminatedNetContract(row) && !isCancellationResult(status) && !['đã hủy', 'đã huỷ'].includes(status) && !note.cancellationApproved && !isCancellationResult(note.result);
  }).map(([, row]) => row);
}

// Overview and trend sales use the same eligible contracts and staff roster as the matrix.
export function dailySoldContracts(data, notes, personnel) {
  const staff=new Set(personnel.map(person=>String(person.acc||'').trim().toLowerCase()));
  return dailyPerformanceContracts(data,notes).filter(row=>staff.has(String(row.staff||'').trim().toLowerCase()));
}
