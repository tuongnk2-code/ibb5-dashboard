import { requireProfile } from './_supabaseAdmin.js';
import { sharedRow } from './_dashboardState.js';
import { careScope,canManageCare,normCare,cleanCareContact,cleanCareCampaign,eligibleCare,CARE_STATUS,nextCareTime,onlineCareContract } from '../js/customerCareModel.js';

const check=r=>{if(r.error)throw r.error;return r.data;};
const uuid=v=>typeof v==='string'&&/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v);
async function allRows(query){const rows=[];for(let offset=0;;offset+=1000){const batch=check(await query.range(offset,offset+999));rows.push(...batch);if(batch.length<1000)return rows;}}
export function createCustomerCareHandler(authenticate=requireProfile){return async function handler(req,res){
  res.setHeader('Cache-Control','no-store');
  const fail=(status,error)=>res.status(status).json({error});
  try{
    const auth=await authenticate(req);if(auth.error)return fail(auth.status,auth.error);
    if(!['GET','POST'].includes(req.method)){res.setHeader('Allow','GET, POST');return fail(405,'Phương thức không hỗ trợ.');}
    const {admin,caller}=auth;
    const people=check(await admin.from('profiles').select('id,acc,full_name,role'));
    const byAcc=new Map(people.filter(p=>p.acc).map(p=>[normCare(p.acc),p])),byId=new Map(people.map(p=>[p.id,p]));
    const snapshot=await sharedRow(admin,'snapshot');
    if(!snapshot?.data?.data)return fail(503,'Cần cập nhật dữ liệu NET tại Trung tâm dữ liệu trước khi sử dụng CSKH.');
    const contracts=new Map(snapshot.data.data.filter(r=>r.type==='Internet').map(r=>[r.id,r]));
    const scoped=[...contracts.values()].filter(r=>careScope(caller,byAcc.get(normCare(r.staff))));
    const visible=scoped.filter(r=>onlineCareContract(r));
    const historyIds=new Set(scoped.map(r=>r.id));
    const visibleIds=new Set(visible.map(r=>r.id));
    const owners=people.filter(p=>careScope(caller,p));
    const ownerIds=owners.map(p=>p.id);
    const contacts=await allRows(admin.from('care_contacts').select('*').order('contract_id'));
    const contactMap=new Map(contacts.map(c=>[c.contract_id,c]));
    if(req.method==='GET'){
      const campaigns=ownerIds.length?await allRows(admin.from('care_campaigns').select('*').in('owner_id',ownerIds).order('created_at',{ascending:false}).order('id')):[];
      const campaignIds=campaigns.map(c=>c.id);
      const results=[];for(let i=0;i<campaignIds.length;i+=100)results.push(...await allRows(admin.from('care_results').select('*').in('campaign_id',campaignIds.slice(i,i+100)).order('campaign_id').order('round').order('contract_id')));
      return res.status(200).json({customers:visible.map(r=>({id:r.id,customer:r.customer||'',staff:r.staff,created:r.created,date:r.date,status:r.status,owner_id:byAcc.get(normCare(r.staff)).id,contact:contactMap.get(r.id)||null})),people:owners,campaigns,results:results.filter(r=>historyIds.has(r.contract_id)),serverTime:new Date().toISOString()});
    }
    const input=req.body||{},now=new Date().toISOString();
    if(JSON.stringify(input).length>150000)return fail(400,'Nội dung quá lớn.');
    if(input.action==='contact'){
      const contract=contracts.get(input.contract_id),owner=contract&&byAcc.get(normCare(contract.staff));
      if(!contract||!careScope(caller,owner))return fail(403,'Không có quyền cập nhật khách hàng này.');
      if(!onlineCareContract(contract))return fail(400,'CSKH chỉ áp dụng HĐ đã Online và chưa chấm dứt theo NET mới nhất.');
      const existing=contactMap.get(contract.id),revision=existing?.revision||0;
      if(input.revision!==revision)return fail(409,'Thông tin KH vừa thay đổi. Tải lại trước khi lưu.');
      const record={contract_id:contract.id,...cleanCareContact(input),revision:revision+1,updated_at:now,updated_by:caller.id};
      const query=existing?admin.from('care_contacts').update(record).eq('contract_id',contract.id).eq('revision',revision):admin.from('care_contacts').insert(record);
      const saved=check(await query.select().maybeSingle());if(!saved)return fail(409,'Thông tin KH vừa thay đổi. Tải lại trước khi lưu.');
      return res.status(200).json({contact:saved});
    }
    if(input.action==='create'){
      const owner=byId.get(input.owner_id);if(!owner||!canManageCare(caller,owner))return fail(403,'Chỉ tạo chiến dịch cho bản thân hoặc nhân sự do TP phân công.');
      if(!uuid(input.id))return fail(400,'Mã chiến dịch không hợp lệ.');
      const campaign=cleanCareCampaign(input),phones=new Set();
      for(const id of campaign.contract_ids){
        const contract=contracts.get(id),contact=contactMap.get(id);
        if(!contract||!visibleIds.has(id)||normCare(contract.staff)!==normCare(owner.acc))return fail(403,'Danh sách có KH không thuộc nhân sự được chọn.');
        if(!eligibleCare(contact))return fail(400,'Chỉ chọn KH có SĐT và đồng ý nhận chăm sóc.');
        if(phones.has(contact.phone))return fail(400,'Có SĐT trùng trong danh sách. Chỉ chọn một HĐ cho mỗi SĐT.');
        phones.add(contact.phone);
      }
      const saved=check(await admin.from('care_campaigns').insert({id:input.id,owner_id:owner.id,...campaign,first_at:campaign.scheduled_at,created_by:caller.id}).select().single());
      return res.status(200).json({campaign:saved});
    }
    if(!uuid(input.campaign_id))return fail(400,'Chọn chiến dịch hợp lệ.');
    const campaign=check(await admin.from('care_campaigns').select('*').eq('id',input.campaign_id).maybeSingle());
    if(!campaign||!canManageCare(caller,byId.get(campaign.owner_id)))return fail(403,'Không có quyền thay đổi chiến dịch này.');
    if(input.action==='result'){
      if(campaign.status!=='active'||input.round!==campaign.round)return fail(409,'Chiến dịch đã đổi trạng thái hoặc kỳ chăm sóc. Tải lại trước khi cập nhật.');
      if(!campaign.contract_ids.includes(input.contract_id)||!visibleIds.has(input.contract_id))return fail(403,'KH không thuộc chiến dịch hoặc ngoài quyền hiện tại.');
      if(!Object.hasOwn(CARE_STATUS,input.status)||typeof input.note!=='string'||input.note.length>1000)return fail(400,'Kết quả hoặc ghi chú không hợp lệ.');
      if(!eligibleCare(contactMap.get(input.contract_id))&&!['optout','no_zalo','pending'].includes(input.status))return fail(400,'KH chưa có SĐT hoặc không đồng ý nhận tin.');
      const existing=check(await admin.from('care_results').select('*').eq('campaign_id',campaign.id).eq('round',campaign.round).eq('contract_id',input.contract_id).maybeSingle()),revision=existing?.revision||0;
      if(input.revision!==revision)return fail(409,'Kết quả vừa thay đổi. Tải lại trước khi lưu.');
      if(input.status==='optout'){
        const contact=contactMap.get(input.contract_id);
        // A refusal applies to this phone even when it appears on multiple contracts.
        if(contact)for(const match of contacts.filter(c=>c.phone===contact.phone&&c.consent))check(await admin.from('care_contacts').update({consent:false,revision:match.revision+1,updated_at:now,updated_by:caller.id}).eq('contract_id',match.contract_id).eq('revision',match.revision).select().single());
      }
      const record={campaign_id:campaign.id,round:campaign.round,contract_id:input.contract_id,status:input.status,note:input.note.trim(),revision:revision+1,updated_at:now,updated_by:caller.id};
      const query=existing?admin.from('care_results').update(record).eq('campaign_id',campaign.id).eq('round',campaign.round).eq('contract_id',input.contract_id).eq('revision',revision):admin.from('care_results').insert(record);
      const saved=check(await query.select().maybeSingle());if(!saved)return fail(409,'Kết quả vừa thay đổi. Tải lại trước khi lưu.');
      return res.status(200).json({result:saved});
    }
    if(input.revision!==campaign.revision)return fail(409,'Chiến dịch vừa thay đổi. Tải lại trước khi lưu.');
    let patch;
    if(input.action==='toggle'&&['active','paused'].includes(campaign.status))patch={status:campaign.status==='active'?'paused':'active'};
    else if(input.action==='finish'&&campaign.status==='active'){
      const results=check(await admin.from('care_results').select('contract_id,status').eq('campaign_id',campaign.id).eq('round',campaign.round));
      const todo=campaign.contract_ids.filter(id=>visibleIds.has(id)&&eligibleCare(contactMap.get(id))&&!results.some(r=>r.contract_id===id&&r.status!=='pending'));
      if(todo.length)return fail(400,'Còn '+todo.length+' KH chưa cập nhật kết quả.');
      patch=campaign.repeat_days?{round:campaign.round+1,scheduled_at:nextCareTime(campaign)}:{status:'done'};
    }else return fail(400,'Thao tác không hợp lệ.');
    const saved=check(await admin.from('care_campaigns').update({...patch,revision:campaign.revision+1,updated_at:now}).eq('id',campaign.id).eq('revision',campaign.revision).select().maybeSingle());
    if(!saved)return fail(409,'Chiến dịch vừa thay đổi. Tải lại trước khi lưu.');
    return res.status(200).json({campaign:saved});
  }catch(error){
    if(error.code==='23505')return fail(409,'Dữ liệu đã được lưu hoặc vừa thay đổi. Tải lại để đối chiếu.');
    if(['42P01','PGRST205'].includes(error.code))return fail(503,'Mục CSKH chưa sẵn sàng trên máy chủ.');
    if(!error.code&&error instanceof Error&&!['TypeError','AbortError'].includes(error.name))return fail(400,error.message);
    console.error('customer-care:',error.code||error.name);return fail(500,'Chưa lưu được CSKH. Vui lòng thử lại.');
  }
};}
export default createCustomerCareHandler();
