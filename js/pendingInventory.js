import { isCancellationResult, skipsOnlineAppointment, requiresCancellationReason } from './dashboardStateModel.js';

export function pendingFollowupFilled(note = {}) {
  return ['action', 'result', 'source', ...(skipsOnlineAppointment(note.result) ? [] : ['expected', 'timeSlot'])].every(key => String(note[key] || '').trim())
    && (!requiresCancellationReason(note.result) || !!note.cancelReason?.trim());
}

// Match the follow-up list: retain Online contracts until staff finish updating them.
export function pendingFollowupContracts(rows, notes, asOf) {
  if (!asOf) return [];
  const net = new Map(rows.filter(row => row.type === 'Internet' && row.id).map(row => [row.id, row]));
  return [...net.values()].filter(row => {
    const note = notes[row.id] || {};
    return !note.cancellationApproved && row.created && row.created <= asOf
      && ((!row.date || row.date > asOf) || !pendingFollowupFilled(note) || isCancellationResult(note.result));
  });
}
