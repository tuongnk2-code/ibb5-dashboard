import { pendingFollowupContracts, agedFollowupContracts } from './pendingInventory.js';
import { normalNetSales } from './dailyPerformanceModel.js';

export function performanceContractRows(data, selection, notes = {}) {
  if (!selection) return [];
  const {kind,accs,asOf,start,previousCut,previousMonth,room} = selection;
  const members = new Set(accs.map(acc=>acc.trim().toLowerCase()));
  if(kind==='sold')return normalNetSales(data).filter(row=>members.has(String(row.staff||'').trim().toLowerCase())&&(!room||row.room===room)&&row.created>=start&&row.created<=asOf);
  const scoped=data.filter(row=>row.type==='Internet'&&members.has(String(row.staff||'').trim().toLowerCase())&&(!room||row.room===room));
  if(kind==='pending')return pendingFollowupContracts(scoped,notes,asOf);
  if(kind==='aged')return agedFollowupContracts(scoped,notes,asOf);
  const rows=scoped.filter(row=>{
    if(kind==='online')return row.date>=start&&row.date<=asOf;
    if(kind==='previous')return row.date?.slice(0,7)===previousMonth&&row.date<=previousCut;
    return false;
  });
  return [...new Map(rows.map(row=>[row.id,row])).values()];
}
