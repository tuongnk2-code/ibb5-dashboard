import { reportDay, reportState, shiftDay, validDay } from './dailyReportModel.js';

const number=value=>Number.isFinite(Number(value))?Number(value):0;
export const rollupPercent=(actual,target)=>target>0?Math.round(actual/target*100):null;
export function reportAssessment(row) {
  const labels=[];
  if(!row.sent)labels.push('Chưa có báo cáo đã gửi');
  else labels.push(row.commitment>0?(row.actual>=row.commitment?'Đạt cam kết':'Chưa đạt cam kết')+' '+rollupPercent(row.actual,row.commitment)+'%':'Chưa có cam kết PTTB');
  if(row.sent<row.expected)labels.push('Dữ liệu chưa đủ: '+row.sent+'/'+row.expected+' báo cáo');
  if(row.overdue)labels.push(row.overdue+' ngày quá hạn chưa gửi');
  if(row.late)labels.push(row.late+' báo cáo gửi muộn');
  if(row.support)labels.push(row.support+' đề nghị hỗ trợ');
  return labels.join(' · ');
}
export function dailyReportRollup(snapshot,{start,end,team='',now=new Date()}={}) {
  const profiles=(snapshot.profiles||[]).filter(p=>p.role!=='manager'&&(!team||String(p.team)===String(team)));
  const reports=new Map();
  for(const report of snapshot.reports||[]){const key=report.user_id+':'+report.report_date,old=reports.get(key);if(!old||number(report.revision)>number(old.revision))reports.set(key,report);}
  const rows=profiles.map(profile=>{
    const created=profile.created_at?reportDay(new Date(profile.created_at)):start;
    const first=[start,created,snapshot.trackingStart||start].sort().at(-1);
    const row={profile,actual:0,commitment:0,leads:0,closed:0,online:0,sent:0,expected:0,exempt:0,late:0,overdue:0,pending:0,support:0,entries:[],channels:new Map()};
    if(!validDay(start)||!validDay(end)||start>end)return row;
    for(let day=first;day<=end;day=shiftDay(day,1)){
      const report=reports.get(profile.id+':'+day),state=reportState(report,day,now),submitted=report?.status==='submitted';
      // No invented missing history before any report existed in this authorized scope.
      if(!snapshot.trackingStart&&!report)continue;
      row.entries.push({date:day,report,state});
      if(state==='exempt'){row.exempt++;continue;}row.expected++;
      if(state==='overdue')row.overdue++;else if(!submitted)row.pending++;
      if(!submitted)continue;
      row.sent++;if(state==='late')row.late++;
      const data=report.data||{};row.actual+=number(data.actual);row.commitment+=number(data.commitment);row.online+=number(data.online);
      if(String(data.support||'').trim())row.support++;
      for(const source of data.sources||[]){
        const name=String(source.name||'Khác').trim(),key=name.toLocaleLowerCase('vi-VN'),channel=row.channels.get(key)||{name,leads:0,closed:0};
        channel.leads+=number(source.leads);channel.closed+=number(source.closed);row.channels.set(key,channel);
        row.leads+=number(source.leads);row.closed+=number(source.closed);
      }
    }
    row.assessment=reportAssessment(row);return row;
  }).sort((a,b)=>number(a.profile.team)-number(b.profile.team)||String(a.profile.acc||'').localeCompare(String(b.profile.acc||'')));
  const keys=['actual','commitment','leads','closed','online','sent','expected','exempt','late','overdue','pending','support'];
  const total=Object.fromEntries(keys.map(key=>[key,rows.reduce((sum,row)=>sum+row[key],0)]));
  const channels=new Map();for(const row of rows)for(const [key,value] of row.channels){const channel=channels.get(key)||{name:value.name,leads:0,closed:0};channel.leads+=value.leads;channel.closed+=value.closed;channels.set(key,channel);}
  return {start,end,rows,total,channels:[...channels.values()].sort((a,b)=>b.leads-a.leads),support:rows.flatMap(row=>row.entries.filter(entry=>entry.report?.status==='submitted'&&(entry.report.data?.difficulty?.trim()||entry.report.data?.support?.trim())).map(entry=>({...entry,profile:row.profile}))) };
}
