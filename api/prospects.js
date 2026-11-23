import { requireProfile } from './_supabaseAdmin.js';
import { cleanProspect,cleanProspectUpdate } from '../js/prospectModel.js';
const checked=r=>{if(r.error)throw r.error;return r.data;};
const uuid=v=>typeof v==='string'&&/^[a-f\d]{8}(-[a-f\d]{4}){3}-[a-f\d]{12}$/i.test(v);
export function createProspectHandler(authenticate=requireProfile){return async(req,res)=>{
 res.setHeader('Cache-Control','no-store');const fail=(code,error)=>res.status(code).json({error});
 try{
  const auth=await authenticate(req);if(auth.error)return fail(auth.status,auth.error);const {admin,caller}=auth;
  const membership=checked(await admin.from('prospect_members').select('*').eq('user_id',caller.id).eq('active',true).maybeSingle());
  const allowed=!!membership&&(membership.kind!=='manager'||caller.role==='manager');
  if(req.method==='GET'&&req.query?.access==='1')return res.status(200).json({allowed});
  if(!allowed)return fail(403,'Tab KHTN này chỉ dành cho Trưởng phòng, DNG.DatHX4 và DNG.HoaNTB6 đã được cấp quyền.');
  if(!['GET','POST'].includes(req.method))return fail(405,'Phương thức không hỗ trợ.');
  if(req.method==='GET'){
   const members=checked(await admin.from('prospect_members').select('*').eq('active',true)),people=checked(await admin.from('profiles').select('id,full_name,acc').in('id',members.map(m=>m.user_id))).map(p=>({...p,kind:members.find(m=>m.user_id===p.id).kind}));
   if(req.query?.id){if(!uuid(req.query.id))return fail(400,'Mã khách không hợp lệ.');const lead=checked(await admin.from('prospects').select('*').eq('id',req.query.id).maybeSingle());if(!lead)return fail(404,'Không tìm thấy khách.');const history=checked(await admin.from('prospect_history').select('*').eq('prospect_id',lead.id).order('created_at',{ascending:false}).limit(200));return res.status(200).json({lead,history,people});}
   const leads=[];for(let offset=0;;offset+=1000){const batch=checked(await admin.from('prospects').select('*').order('updated_at',{ascending:false}).order('id').range(offset,offset+999));leads.push(...batch);if(batch.length<1000)break;}
   return res.status(200).json({leads,people,kind:membership.kind,me:caller.id,serverTime:new Date().toISOString()});
  }
  const input=req.body||{};if(JSON.stringify(input).length>12000)return fail(400,'Nội dung quá dài.');if(!uuid(input.id))return fail(400,'Mã khách không hợp lệ.');
  let value;
  if(['create','edit'].includes(input.action)){if(input.action==='edit'&&membership.kind!=='manager')return fail(403,'Chỉ Trưởng phòng được sửa thông tin gốc.');if(input.action==='edit'&&(!Number.isInteger(input.revision)||input.revision<1))return fail(400,'Phiên bản không hợp lệ.');value=cleanProspect(input);if(input.assignee_id&&!uuid(input.assignee_id))return fail(400,'Người phụ trách không hợp lệ.');value.assignee_id=input.assignee_id||null;}
  else{if(!Number.isInteger(input.revision)||input.revision<1)return fail(400,'Phiên bản không hợp lệ.');if(input.action==='update'){value=cleanProspectUpdate(input);if(value.stage==='new')return fail(400,'Dùng Giao khách để chuyển về chờ tiếp nhận.');}else if(input.action==='assign'){if(membership.kind!=='manager')return fail(403,'Chỉ Trưởng phòng được giao khách.');if(input.assignee_id&&!uuid(input.assignee_id))return fail(400,'Người phụ trách không hợp lệ.');value={assignee_id:input.assignee_id||null,note:'Phân công người phụ trách'};}else if(input.action==='claim')value={};else return fail(400,'Thao tác không hợp lệ.');}
  const lead=checked(await admin.rpc('save_prospect',{p_actor:caller.id,p_action:input.action,p_id:input.id,p_revision:input.revision||0,p_value:value}));return res.status(200).json({lead});
 }catch(error){if(error.code==='42501')return fail(403,error.message);if(error.code==='40001')return fail(409,error.message);if(error.code==='23505')return fail(409,'SĐT đã có trong nguồn KHTN. Giữ nguyên hồ sơ cũ, không tạo trùng.');if(['42P01','PGRST202','PGRST205'].includes(error.code))return fail(503,'Tab KHTN đang được chuẩn bị trên máy chủ.');if(error.code==='P0001'||(!error.code&&error instanceof Error&&error.name!=='TypeError'))return fail(400,error.message);console.error('prospects:',error.code||error.name);return fail(500,'Chưa lưu được KHTN. Vui lòng thử lại.');}
};}
export default createProspectHandler();
