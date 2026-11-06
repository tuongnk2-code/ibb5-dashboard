import { isTerminatedNetContract } from './cancellationArchive.js';
import { validDay } from './dailyReportModel.js';
import { STAFF_ROSTER } from './staffRoster.js';

const unique = rows => [...new Map(rows.filter(row => row.id).map(row => [row.id, row])).values()];

export function overdueContracts(rows, asOf) {
  if (!validDay(asOf)) return [];
  return unique(rows).filter(row => validDay(row.created) && row.created <= asOf && (!row.date || row.date > asOf))
    .map(row => ({ ...row, age: Math.floor((Date.parse(asOf+'T00:00:00Z')-Date.parse(row.created+'T00:00:00Z'))/86400000) }))
    .filter(row => row.age > 5).sort((a,b) => b.age-a.age || a.id.localeCompare(b.id));
}

export const SALES_CHANNELS = ['Face Book','Web','Thị Trường','Đại Lý','Top Zalo','SMS','KH cũ','Tờ Dán','Phướn','Người Quen + Thân','Telesale','Khác'];
const normalized = value => String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/đ/gi,'d').toLowerCase().replace(/[^a-z0-9]/g,'');
const aliases = new Map(SALES_CHANNELS.map(channel=>[normalized(channel),channel]));
for (const [alias,channel] of [['facebookads','Face Book'],['fb','Face Book'],['fbads','Face Book'],['website','Web'],['zalo','Top Zalo'],['khachhangcu','KH cũ'],['nguoiquen','Người Quen + Thân'],['nguoithan','Người Quen + Thân'],['telesales','Telesale'],['ibb','IBB']]) aliases.set(alias,channel);

// Creation month and source priority are unchanged. Unknown sources retain their own columns.
export function monthlyStaffChannels(rows, notes, month, staff = '', roster = STAFF_ROSTER) {
  const sourceRows = unique(rows).filter(row=>validDay(row.created)&&row.created.slice(0,7)===month);
  const sourceOf = row => {
    const source = String(notes[row.id]?.source || row.sourceExcel || '').trim();
    return source ? aliases.get(normalized(source)) || source : 'Chưa cập nhật';
  };
  const extra = [...new Set(sourceRows.map(sourceOf))].filter(channel=>!SALES_CHANNELS.includes(channel)).sort((a,b)=>a.localeCompare(b,'vi'));
  const channels = [...SALES_CHANNELS,...extra];
  const normAcc = value=>String(value||'').trim().toLowerCase();
  const people = new Map(roster.filter(person=>!staff||normAcc(person.acc)===normAcc(staff)).map(person=>[normAcc(person.acc),{acc:person.acc,team:person.team,counts:Object.fromEntries(channels.map(channel=>[channel,0])),total:0}]));
  let missing=0;
  for (const row of sourceRows.filter(row=>!staff||normAcc(row.staff)===normAcc(staff))) {
    const key=normAcc(row.staff)||'unknown';
    if (!people.has(key)) people.set(key,{acc:row.staff||'Chưa gán',team:0,counts:Object.fromEntries(channels.map(channel=>[channel,0])),total:0});
    const person=people.get(key),channel=sourceOf(row);
    person.counts[channel]++;person.total++;if(channel==='Chưa cập nhật')missing++;
  }
  const totalCounts = members=>Object.fromEntries(channels.map(channel=>[channel,members.reduce((sum,person)=>sum+person.counts[channel],0)]));
  const groups=[1,2,3,0].map(team=>{
    const members=[...people.values()].filter(person=>Number(person.team)===team);
    return {team,rows:members,counts:totalCounts(members),total:members.reduce((sum,person)=>sum+person.total,0)};
  }).filter(group=>group.rows.length);
  const all=groups.flatMap(group=>group.rows);
  return {channels,groups,counts:totalCounts(all),total:all.reduce((sum,person)=>sum+person.total,0),missing,available:sourceRows.length>0};
}

// NET source status, independent of the pending-follow-up cancellation workflow.
export { isTerminatedNetContract } from './cancellationArchive.js';

export const includeInOperationalReports = row => !(isTerminatedNetContract(row) && ['2026-09','2026-10'].includes(String(row.created || '').slice(0,7)));
