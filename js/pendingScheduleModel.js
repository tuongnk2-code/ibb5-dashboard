import { skipsOnlineAppointment } from './dashboardStateModel.js';

// The KPI and appointment table must count the same eligible NET contracts.
export function scheduledOnlineContracts(data, notes, cutoff, day) {
  if (!cutoff || !day) return [];
  const distinct = new Map(data.filter(row => row.type === 'Internet' && row.id).map(row => [row.id, row]));
  return [...distinct.values()].filter(row => {
    const note = notes[row.id] || {};
    return !note.cancellationApproved && !skipsOnlineAppointment(note.result) && row.created && row.created <= cutoff && (!row.date || row.date > cutoff) && note.expected === day;
  });
}
