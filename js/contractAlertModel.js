import { pendingFollowupContracts, pendingFollowupFilled } from './pendingInventory.js';
import { includeInDashboardReports } from './reportScope.js';
import { includeInOperationalReports, isTerminatedNetContract } from './analyticsDetails.js';
import { hasProcessingRequest, skipsOnlineAppointment } from './dashboardStateModel.js';
import { reportDay, validDay } from './dailyReportModel.js';
import { scheduledAppointmentStatus } from './pendingScheduleModel.js';

export const CONTRACT_ALERT_LABELS={overdue:'Quá ngày / mốc hẹn Online',incomplete:'Hồ sơ HĐ tồn thiếu cập nhật',stale:'Quá 3 ngày chưa cập nhật',aged:'Chưa Online, tồn quá 7 ngày'};
export function contractAlerts({rows=[],notes={},canView=()=>false,asOf=reportDay(),netUpdatedAt='',now=Date.now()}={}){
 const groups=Object.fromEntries(Object.keys(CONTRACT_ALERT_LABELS).map(key=>[key,[]]));
 if(!validDay(asOf))return {groups,total:0,asOf,netUpdatedAt};
 const distinct=[...new Map(rows.filter(r=>r.type==='Internet'&&r.id).map(r=>[r.id,r])).values()];
 const eligible=distinct.filter(row=>includeInDashboardReports(row)&&(includeInOperationalReports(row)||hasProcessingRequest(notes[row.id]))&&canView(row));
 for(const row of pendingFollowupContracts(eligible,notes,asOf)){
  const note=notes[row.id]||{},active=(!row.date||row.date>asOf)&&!isTerminatedNetContract(row)&&!skipsOnlineAppointment(note.result);
  const entry={...row,expected:validDay(note.expected)?note.expected:'',timeSlot:note.timeSlot||'',updated:Number.isFinite(Date.parse(note.updated))?note.updated:'',reason:note.action||'',online:!!row.date&&row.date<=asOf};
  if(active&&validDay(note.expected)&&(note.expected<asOf||scheduledAppointmentStatus(note,asOf,netUpdatedAt,now).overdue))groups.overdue.push(entry);
  if(!pendingFollowupFilled(note))groups.incomplete.push(entry);
  if((active||hasProcessingRequest(note))&&Number.isFinite(Date.parse(note.updated))&&now-Date.parse(note.updated)>3*86400000)groups.stale.push(entry);
  if(active&&validDay(row.created)&&(Date.parse(asOf)-Date.parse(row.created))/86400000>7)groups.aged.push(entry);
 }
 const total=new Set(Object.values(groups).flat().map(row=>row.id)).size;
 return {groups,total,asOf,netUpdatedAt};
}
