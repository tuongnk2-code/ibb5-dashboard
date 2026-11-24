import { STAFF_ROSTER } from './staffRoster.js';
import { teamOf,validDay } from './dailyReportModel.js';
import { normalNetSales } from './dailyPerformanceModel.js';
import { includeInDashboardReports } from './reportScope.js';
const norm=s=>String(s||'').trim().toLowerCase();
export const canViewDailyCommitments=p=>p?.role==='manager'||(p?.role==='lead'&&teamOf(p)!==null);
export function dailyCommitmentStaff(p){return canViewDailyCommitments(p)?STAFF_ROSTER.filter(s=>p.role==='manager'||s.team===teamOf(p)).slice().sort((a,b)=>a.team-b.team):[];}
export function cleanDailyCommitment(input){if(!validDay(input.date))throw Error('Ngày theo dõi không hợp lệ.');const person=STAFF_ROSTER.find(p=>norm(p.acc)===norm(input.acc));if(!person)throw Error('Nhân sự không hợp lệ.');for(const key of ['sold','online','revision'])if(!Number.isInteger(input[key])||input[key]<0||input[key]>100000)throw Error('Cam kết phải là số nguyên từ 0 đến 100.000.');return {...input,acc:person.acc};}
export function dailyNetActuals(source,date,staff){const counts=Object.fromEntries(staff.map(p=>[norm(p.acc),{sold:0,online:0}]));const net=source.filter(r=>r.type==='Internet'&&includeInDashboardReports(r));const latest=new Map();for(const r of net)if(String(r.id||'').trim())latest.set(String(r.id).trim().toUpperCase(),r);for(const r of normalNetSales(net))if(r.created===date&&counts[norm(r.staff)])counts[norm(r.staff)].sold++;for(const r of latest.values())if(r.date===date&&counts[norm(r.staff)])counts[norm(r.staff)].online++;return Object.fromEntries(staff.map(p=>[p.acc,counts[norm(p.acc)]]));}
export function commitmentDeficit(target,actual){return target==null||actual==null?null:Math.max(0,target-actual);}
