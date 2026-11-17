import { skipsOnlineAppointment } from './dashboardStateModel.js';
import { validDay } from './dailyReportModel.js';

const slotEnds={'8h - 10h':'10:00','10h - 12h':'12:00','13h30 - 15h30':'15:30','15h30 - 17h30':'17:30'};
export function latestNetUpdate(meta={}){
  return meta?.files?.Internet?.updated||(meta?.audit?.sources?.includes('Internet')?meta.audit.updated:'')||'';
}
// A missed appointment is confirmed only by a NET refresh after the slot ended.
export function scheduledAppointmentStatus(note,day,netUpdatedAt,now=Date.now()){
  const end=slotEnds[note?.timeSlot];
  if(!validDay(day)||!end||note?.expected!==day)return {overdue:false,awaitingRefresh:false};
  const deadline=Date.parse(day+'T'+end+':00+07:00'),passed=now>deadline;
  const refreshed=Number.isFinite(Date.parse(netUpdatedAt))&&Date.parse(netUpdatedAt)>deadline&&Date.parse(netUpdatedAt)<=now;
  return {overdue:passed&&refreshed,awaitingRefresh:passed&&!refreshed};
}

// The KPI and appointment table must count the same eligible NET contracts.
export function scheduledOnlineContracts(data, notes, cutoff, day, {netUpdatedAt='',now=Date.now(),includeOverdue=false}={}) {
  if (!cutoff || !day) return [];
  const distinct = new Map(data.filter(row => row.type === 'Internet' && row.id).map(row => [row.id, row]));
  return [...distinct.values()].filter(row => {
    const note = notes[row.id] || {};
    return !note.cancellationApproved && !skipsOnlineAppointment(note.result) && row.created && row.created <= cutoff && (!row.date || row.date > cutoff) && note.expected === day && (includeOverdue||!scheduledAppointmentStatus(note,day,netUpdatedAt,now).overdue);
  });
}
