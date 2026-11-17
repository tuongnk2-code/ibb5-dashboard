import { validDay, shiftDay } from './dailyReportModel.js';
import { skipsOnlineAppointment } from './dashboardStateModel.js';
import { isTerminatedNetContract } from './cancellationArchive.js';
import { STAFF_ROSTER } from './staffRoster.js';
const norm=value=>String(value||'').trim().toLowerCase();
const searchText=value=>norm(value).normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/đ/g,'d');

export function remainingOnlineSchedule(data,{cutoff,notes={},canView=()=>false,team='',query='',roster=STAFF_ROSTER}={}){
  if(!validDay(cutoff))return {days:[],rows:[],groups:[],total:0,totals:[],start:'',end:''};
  const start=shiftDay(cutoff,1),end=new Date(Date.UTC(+cutoff.slice(0,4),+cutoff.slice(5,7),0)).toISOString().slice(0,10),days=[];
  for(let day=start;day<=end;day=shiftDay(day,1))days.push(day);
  const rosterByAcc=new Map(roster.map(person=>[norm(person.acc),person]));
  const inScope=person=>(!team||String(person.team)===String(team))&&(!query||searchText(person.acc+' '+(person.name||'')).includes(searchText(query)));
  const people=new Map(roster.filter(person=>canView({staff:person.acc})&&inScope(person)).map(person=>[norm(person.acc),{...person,cells:days.map(()=>[]),rows:[]}]));
  const unique=new Map(data.filter(row=>row.type==='Internet'&&row.id).map(row=>[String(row.id).trim().toUpperCase(),row]));
  const rows=[];
  for(const [id,row] of unique){
    const note=notes[row.id]||notes[id]||{},person=rosterByAcc.get(norm(row.staff))||{acc:row.staff||'Chưa gán Acc',name:'',team:0};
    const status=String(row.status||'').normalize('NFC').trim().toLocaleLowerCase('vi-VN').replace(/\s+/g,' ');
    if(!canView(row)||!inScope(person)||isTerminatedNetContract(row)||skipsOnlineAppointment(status)||['đã hủy','đã huỷ'].includes(status)||note.cancellationApproved||skipsOnlineAppointment(note.result))continue;
    if(!validDay(row.created)||row.created>cutoff||(validDay(row.date)&&row.date<=cutoff)||!validDay(note.expected)||note.expected<start||note.expected>end)continue;
    const scheduled={...row,expected:note.expected,timeSlot:note.timeSlot||''};rows.push(scheduled);
    if(!people.has(norm(person.acc)))people.set(norm(person.acc),{...person,cells:days.map(()=>[]),rows:[]});
    const entry=people.get(norm(person.acc));entry.cells[days.indexOf(note.expected)].push(scheduled);entry.rows.push(scheduled);
  }
  const groups=[1,2,3,0].map(team=>{
    const members=[...people.values()].filter(person=>Number(person.team)===team);members.forEach(person=>person.cells.forEach(cell=>cell.sort((a,b)=>a.id.localeCompare(b.id,'vi',{numeric:true}))));
    const groupRows=members.flatMap(person=>person.rows);
    return {team,people:members,rows:groupRows,total:groupRows.length,totals:days.map(day=>groupRows.filter(row=>row.expected===day).length)};
  }).filter(group=>group.people.length);
  return {start,end,days,rows,groups,total:rows.length,totals:days.map(day=>rows.filter(row=>row.expected===day).length)};
}
