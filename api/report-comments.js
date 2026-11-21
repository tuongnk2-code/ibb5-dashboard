import { requireProfile } from './_supabaseAdmin.js';
import { canSeeReport, reportDay, validDay } from '../js/dailyReportModel.js';

const check = result => { if (result.error) throw result.error; return result.data; };
const uuid = value => typeof value === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
const fail = (res, status, error) => res.status(status).json({error});
export default async function handler(req,res) {
 res.setHeader('Cache-Control','no-store');
 try {
  const auth=await requireProfile(req);if(auth.error)return fail(res,auth.status,auth.error);
  const {admin,caller}=auth;
  if(!['GET','POST'].includes(req.method)){res.setHeader('Allow','GET, POST');return fail(res,405,'Phương thức không hỗ trợ.');}
  if(req.method==='GET'&&req.query?.inbox==='mine'){
   const notifications=check(await admin.from('report_notifications').select('id,comment_id,created_at,read_at,comment:report_comments!inner(id,kind,subject_id,report_date,author_id,body)').eq('recipient_id',caller.id).order('read_at',{ascending:false,nullsFirst:true}).order('created_at',{ascending:false}).limit(100));
   const ids=[...new Set(notifications.flatMap(n=>[n.comment.subject_id,n.comment.author_id]))];
   const people=ids.length?check(await admin.from('profiles').select('id,acc,full_name,role').in('id',ids)):[];
   const profiles=new Map(people.map(p=>[p.id,p]));
   return res.status(200).json({notifications:notifications.filter(n=>profiles.has(n.comment.subject_id)&&canSeeReport(caller,profiles.get(n.comment.subject_id))).map(n=>({...n,author:profiles.get(n.comment.author_id)?.acc||'Quản lý',subject:profiles.get(n.comment.subject_id)?.acc||'Nhân sự'}))});
  }
  const input=req.method==='GET'?req.query:req.body||{};
  if(req.method==='POST'&&input.action==='read'){
   if(!Array.isArray(input.comment_ids)||input.comment_ids.length>200||!input.comment_ids.every(uuid))return fail(res,400,'Danh sách phản hồi không hợp lệ.');
   if(input.comment_ids.length)check(await admin.from('report_notifications').update({read_at:new Date().toISOString()}).eq('recipient_id',caller.id).is('read_at',null).in('comment_id',input.comment_ids));
   return res.status(200).json({ok:true});
  }
  const {kind,subject_id,report_date}=input;
  if(!['daily','market'].includes(kind)||!uuid(subject_id)||!validDay(report_date)||report_date>reportDay())return fail(res,400,'Thông tin báo cáo không hợp lệ.');
  const subject=check(await admin.from('profiles').select('id,acc,full_name,role').eq('id',subject_id).maybeSingle());
  if(!subject||!canSeeReport(caller,subject))return fail(res,403,'Không có quyền bình luận báo cáo này.');
  const report=check(await admin.from(kind==='daily'?'daily_reports':'market_reports').select('*').eq('user_id',subject_id).eq('report_date',report_date).maybeSingle());
  if(!report||report.status!=='submitted')return fail(res,409,'Chỉ bình luận sau khi nhân sự đã gửi báo cáo.');
  if(req.method==='POST'){
   const body=typeof input.body==='string'?input.body.trim():'';
   if(input.action!=='comment'||!body||body.length>2000||!uuid(input.request_id))return fail(res,400,'Nhập bình luận từ 1 đến 2.000 ký tự.');
   const existing=check(await admin.from('report_comments').select('id,kind,subject_id,report_date,body').eq('author_id',caller.id).eq('request_id',input.request_id).maybeSingle());
   if(existing){if(existing.kind!==kind||existing.subject_id!==subject_id||existing.report_date!==report_date||existing.body!==body)return fail(res,409,'Yêu cầu gửi đã được sử dụng.');return res.status(200).json({comment:existing});}
   const result=await admin.from('report_comments').insert({kind,subject_id,report_date,author_id:caller.id,body,request_id:input.request_id}).select('id').single();
   if(result.error?.code==='23505')return fail(res,409,'Yêu cầu vừa được lưu. Tải lại bình luận trước khi gửi tiếp.');
   return res.status(201).json({comment:check(result)});
  }
  const comments=check(await admin.from('report_comments').select('id,author_id,body,created_at').eq('kind',kind).eq('subject_id',subject_id).eq('report_date',report_date).order('created_at',{ascending:false}).order('id',{ascending:false}).limit(200)).reverse();
  const ids=[...new Set(comments.map(c=>c.author_id))];
  const people=ids.length?check(await admin.from('profiles').select('id,acc,role').in('id',ids)):[];
  const names=new Map(people.map(p=>[p.id,p.acc||(p.role==='manager'?'Trưởng phòng':'Nhân sự')]));
  return res.status(200).json({report,subject,comments:comments.map(c=>({...c,author:names.get(c.author_id)||'Tài khoản đã ngừng sử dụng'}))});
 }catch(error){
  if(['42P01','PGRST205'].includes(error.code))return fail(res,503,'Tính năng bình luận chưa sẵn sàng trên máy chủ.');
  console.error('report-comments:',error.code||error.name||'server-error');return fail(res,500,'Chưa thể tải hoặc gửi bình luận. Vui lòng thử lại.');
 }
}
