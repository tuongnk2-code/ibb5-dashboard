import { monthlyStaffChannels } from './analyticsDetails.js';
import { STAFF_ROSTER } from './staffRoster.js';
import { validDay } from './dailyReportModel.js';

const monthEnd=month=>new Date(Date.UTC(+month.slice(0,4),+month.slice(5),0)).toISOString().slice(0,10);
const norm=acc=>String(acc||'').trim().toLowerCase();
export const sourcedCount=record=>record.total-(record.counts['Chưa cập nhật']||0);
export function sourceComparison(current,previous,available=true){
 const delta=available?current-previous:null;
 return {current,previous,delta,percent:available&&previous>0?delta/previous*100:null};
}

// Count currently normal NET contracts by their actual Online dates.
export function compareChannelSources(rows,notes,month,anchor,staff='',roster=STAFF_ROSTER,team=''){
 if(!/^\d{4}-(0[1-9]|1[0-2])$/.test(month)||!validDay(anchor))throw new Error('Ngày đối chiếu kênh bán không hợp lệ.');
 const cutoff=anchor.slice(0,7)===month?anchor:month<anchor.slice(0,7)?monthEnd(month):month+'-'+anchor.slice(8);
 const safeCutoff=cutoff>monthEnd(month)?monthEnd(month):cutoff;
 const previousMonth=new Date(Date.UTC(+month.slice(0,4),+month.slice(5)-2,1)).toISOString().slice(0,7);
 const previousCutoff=previousMonth+'-'+String(Math.min(+safeCutoff.slice(8),+monthEnd(previousMonth).slice(8))).padStart(2,'0');
 // Keep prior-only staff and extra source channels visible in the comparison.
 const people=[...roster],known=new Set(people.map(person=>norm(person.acc)));
 for(const row of rows){
  if(!validDay(row.date)||![month,previousMonth].includes(row.date.slice(0,7)))continue;
  const key=norm(row.staff);if(!key||known.has(key))continue;
  known.add(key);people.push({acc:row.staff||'Chưa gán',team:0});
 }
 const current=monthlyStaffChannels(rows,notes,month,staff,people,team,safeCutoff,'online');
 const previous=monthlyStaffChannels(rows,notes,previousMonth,staff,people,team,previousCutoff,'online');
 const available=current.available&&previous.available;
 const previousPeople=new Map(previous.groups.flatMap(group=>group.rows).map(person=>[norm(person.acc),person]));
 const previousGroups=new Map(previous.groups.map(group=>[group.team,group]));
 const channels=[...new Set([...current.channels,...previous.channels])];
 for(const group of current.groups){
  group.previousCounts=previousGroups.get(group.team)?.counts||{};
  group.comparison=sourceComparison(sourcedCount(group),previousGroups.has(group.team)?sourcedCount(previousGroups.get(group.team)):0,available);
  for(const person of group.rows){
   const prior=previousPeople.get(norm(person.acc));person.previousCounts=prior?.counts||{};
   person.comparison=sourceComparison(sourcedCount(person),prior?sourcedCount(prior):0,available);
  }
 }
 return {current,previous,channels,cutoff:safeCutoff,previousCutoff,previousMonth,available,comparison:sourceComparison(sourcedCount(current),sourcedCount(previous),available)};
}
