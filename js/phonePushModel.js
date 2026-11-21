import {canSeeReport,reportDay} from './dailyReportModel.js';
import {contractAlerts} from './contractAlertModel.js';
const norm=value=>String(value||'').trim().toLowerCase();
export function phoneAlertState(profile,state,now=Date.now()){
 const alerts=contractAlerts({...state,now,asOf:reportDay(new Date(now)),canView:row=>canSeeReport(profile,{id:norm(profile.acc)&&norm(profile.acc)===norm(row.staff)?profile.id:'other',acc:row.staff,role:'staff'})});
 return {count:alerts.total,signature:JSON.stringify(Object.entries(alerts.groups).map(([kind,rows])=>[kind,rows.map(r=>r.id).sort()]))};
}
export function phonePushDecision(subscription,{alerts,unread=0,latest=null,now=Date.now()}){
 const today=reportDay(new Date(now)),hour=Number(new Intl.DateTimeFormat('en-GB',{timeZone:'Asia/Ho_Chi_Minh',hour:'2-digit',hourCycle:'h23'}).format(new Date(now)));
 const test=subscription.test_requested_at&&Date.parse(subscription.test_requested_at)>Date.parse(subscription.test_delivered_at||'1970-01-01');
 const comment=latest&&Date.parse(latest)>Date.parse(subscription.last_comment_at);
 const businessHours=hour>=8&&hour<20;
 const alert=businessHours&&alerts.count>0&&(alerts.signature!==subscription.last_alert_signature||subscription.last_alert_day!==today)&&(!subscription.last_alert_sent_at||now-Date.parse(subscription.last_alert_sent_at)>=30*60000);
 if(!test&&!comment&&!alert)return null;
 const badge=unread+alerts.count;
 return {payload:{title:test?'IBB5 · Thông báo thử':'IBB5 · Thông báo mới',body:test?'Thông báo điện thoại đã hoạt động trên thiết bị này.':(unread?unread+' phản hồi chưa đọc. ':'')+(alerts.count?alerts.count+' HĐ cần xử lý. ':'')+'Mở IBB5 để xem chi tiết.',badge,kind:test?'test':'summary'},update:{...(comment?{last_comment_at:latest}:{}),...(test?{test_delivered_at:subscription.test_requested_at}:{}),...((alert||test||comment)?{last_alert_signature:alerts.signature,last_alert_day:today,last_alert_sent_at:new Date(now).toISOString(),alert_count:alerts.count}:{})}};
}
