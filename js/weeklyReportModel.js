import { reportDay, shiftDay, validDay } from './dailyReportModel.js';
import { dailyPerformanceContracts } from './dailyPerformanceModel.js';
import { includeInDashboardReports } from './reportScope.js';
import { includeInOperationalReports } from './analyticsDetails.js';
import { onlineCameraContracts } from './cameraKpi.js';
import { STAFF_ROSTER } from './staffRoster.js';

const norm = value => String(value || '').trim().toLowerCase();
const unique = rows => [...new Map(rows.filter(row => row.id).map(row => [String(row.id).trim().toUpperCase(), row])).values()];
const between = (value, start, end) => validDay(value) && value >= start && value <= end;
export function latestWeeklyActivity(data, {today=reportDay(),canView=()=>false,team='',roster=STAFF_ROSTER}={}) {
  const dates=data.filter(includeInDashboardReports).filter(row=>['Internet','Truyền hình','Camera'].includes(row.type)&&canView(row)&&(!team||roster.some(person=>String(person.team)===String(team)&&norm(person.acc)===norm(row.staff))))
    .flatMap(row=>[row.created,row.date]).filter(value=>validDay(value)&&value<=today);
  return dates.sort().at(-1)||null;
}
export function weeklyPeriod(anchor, today = reportDay()) {
  if (!validDay(anchor)) anchor = today;
  const weekday = new Date(anchor+'T12:00:00Z').getUTCDay();
  const start = shiftDay(anchor, -((weekday+6)%7)), end = shiftDay(start, 6);
  const asOf = end < today ? end : today;
  return { start, end, asOf, future: start > today, previousStart: shiftDay(start,-7), previousEnd: shiftDay(asOf,-7) };
}

export function weeklyReport(data, {anchor, today=reportDay(), team='', canView=()=>false, notes={}, roster=STAFF_ROSTER}={}) {
  const period = weeklyPeriod(anchor, today);
  const people = roster.filter(person => canView({staff:person.acc}) && (!team || String(person.team)===String(team)));
  const visible = row => canView(row) && (!team || roster.some(person=>String(person.team)===String(team)&&norm(person.acc)===norm(row.staff)));
  const source = data.filter(includeInDashboardReports).filter(visible);
  const net = dailyPerformanceContracts(source.filter(includeInOperationalReports), notes);
  const inWeek = field => row => !period.future && between(row[field],period.start,period.asOf);
  const sold = net.filter(inWeek('created')), online = net.filter(inWeek('date'));
  const previous = period.future ? [] : net.filter(row=>between(row.date,period.previousStart,period.previousEnd));
  const vvip = unique(source.filter(row=>row.type==='Truyền hình'&&row.vvip===true&&inWeek('date')(row)));
  const camera = period.future ? [] : onlineCameraContracts(source,period.start,period.asOf);
  const pending = period.future ? [] : net.filter(row=>validDay(row.created)&&row.created<=period.asOf&&(!validDay(row.date)||row.date>period.asOf));
  const aged = pending.filter(row=>row.created<shiftDay(period.asOf,-7));
  const overdue = pending.filter(row=>validDay(notes[row.id]?.expected)&&notes[row.id].expected<period.asOf);
  const missing = pending.filter(row=>!validDay(notes[row.id]?.expected));
  const groups = {sold, online, previous, vvip, camera, pending, aged, overdue, missing};
  // Include source accounts missing from the roster instead of silently dropping their results.
  const accounts = new Map(people.map(person=>[norm(person.acc),person]));
  for(const row of source) if(!accounts.has(norm(row.staff))) accounts.set(norm(row.staff),{acc:row.staff||'',team:0});
  const rows = [...accounts.values()].map(person=>{
    const counts=Object.fromEntries(Object.entries(groups).map(([key,records])=>[key,records.filter(row=>norm(row.staff)===norm(person.acc)).length]));
    return {...person,...counts,change:counts.online-counts.previous};
  }).sort((a,b)=>Number(a.team)-Number(b.team)||b.online-a.online||a.acc.localeCompare(b.acc));
  const days=Array.from({length:7},(_,i)=>{const date=shiftDay(period.start,i);return {date,future:date>today,sold:sold.filter(row=>row.created===date).length,online:online.filter(row=>row.date===date).length};});
  const hasPrevious = !period.future && net.some(row=>validDay(row.date)&&row.date<=period.previousEnd);
  return {period,groups,rows,days,hasPrevious,change:online.length-previous.length,onlineStaff:rows.filter(row=>row.online>0).length,staffCount:rows.length};
}
