import { getSession } from './auth.js';
import { shiftDay } from './dailyReportModel.js';

// Existing authenticated read endpoints; no new database access or policy changes.
export async function loadEncouragementData(profile,day,signal,onData) {
  try{
    const session=await getSession();if(!session?.access_token||signal.aborted)return;
    const month=day.slice(0,7),months=[...new Set([month,shiftDay(day,-2).slice(0,7)])],reports=[];
    async function read(url){const response=await fetch(url,{cache:'no-store',signal,headers:{Authorization:'Bearer '+session.access_token}});if(!response.ok)throw Error('Unavailable');return response.json();}
    await Promise.allSettled([
      ...months.map(async month=>{const data=await read('/api/daily-reports?history=mine&month='+month);if(signal.aborted)return;reports.push(...(Array.isArray(data.reports)?data.reports:[]).filter(report=>report.user_id===profile.id));onData({reports:[...reports]});}),
      (async()=>{const salary=await read('/api/salary?month='+month);if(!signal.aborted)onData({salary:{...salary,rows:(Array.isArray(salary.rows)?salary.rows:[]).filter(row=>String(row.acc||'').trim().toLowerCase()===String(profile.acc).trim().toLowerCase())}});})(),
    ]);
  }catch{/* The welcome remains usable with local NET/commitment data when these optional sources fail. */}
}
