import { assistantScope, assistantReport, findAssistantContracts, draftAssistantUpdate, validateAssistantDraft, parseAssistantPatch, normalize, NOTE_FIELDS, NOTE_LABELS } from './dashboardAssistantModel.js';
import { reportDay, validDay } from './dailyReportModel.js';
import { STAFF_ROSTER } from './staffRoster.js';
import { installAgedContractDetails } from './agedContractDetails.js';
import { getSession } from './auth.js';
import { dailyReportRollup } from './dailyReportRollupModel.js';
import { assistantAIRequest } from './assistantAIClient.js';
import './dashboardAssistant.css';

const labels={sold:'NET bán mới',online:'NET Online',camera:'Camera Online',vvip:'V.VIP Online',pending:'HĐ tồn',aged:'Tồn >7 ngày',overdue:'Quá ngày hẹn',missing:'Thiếu ngày hẹn',stale:'Quá 3 ngày chưa cập nhật'};
const date=value=>validDay(value)?value.split('-').reverse().join('/'):'—';
const element=(tag,text,className)=>{const node=document.createElement(tag);if(text!==undefined)node.textContent=text;if(className)node.className=className;return node;};
const button=(text,action)=>{const node=element('button',text);node.type='button';node.addEventListener('click',action);return node;};
export function installDashboardAssistant({getData,getNotes,canView,getProfile,getCommitments}){
  if(document.getElementById('ibbAssistant'))return;
  const launcher=button('',()=>open());launcher.id='ibbAssistantLauncher';launcher.setAttribute('aria-label','Trợ lý IBB5');launcher.title='Trợ lý IBB5';launcher.setAttribute('aria-haspopup','dialog');launcher.setAttribute('aria-expanded','false');
  const mascot=document.createElement('img');mascot.src='/images/ibb5-assistant-robot.png';mascot.alt='';mascot.width=88;mascot.height=88;mascot.draggable=false;mascot.className='assistant-robot-body';
  const pose=element('span',undefined,'assistant-robot-pose'),hand=mascot.cloneNode();hand.className='assistant-robot-hand';pose.setAttribute('aria-hidden','true');pose.append(mascot,hand);launcher.append(pose);
  const panel=element('section',undefined,'ibb-assistant');panel.id='ibbAssistant';panel.hidden=true;panel.setAttribute('role','dialog');panel.setAttribute('aria-modal','false');panel.setAttribute('aria-labelledby','ibbAssistantTitle');
  panel.innerHTML=`<header><div><strong id="ibbAssistantTitle">Trợ lý IBB5</strong><small>Tra cứu · Phân tích · Cập nhật HĐ</small></div><button type="button" data-chat-clear aria-label="Xóa nội dung chat">Xóa chat</button><button type="button" data-chat-close aria-label="Đóng trợ lý">×</button></header><div class="chat-scope"><label>Kỳ<select data-chat-period><option value="day">Ngày</option><option value="week">Tuần</option><option value="month" selected>Tháng</option></select></label><label>Ngày tham chiếu<input type="date" data-chat-day></label><label>Bầy<select data-chat-team><option value="">Trong quyền xem</option><option>1</option><option>2</option><option>3</option></select></label><label>Nhân viên<select data-chat-staff><option value="">Tất cả trong quyền</option></select></label></div><div class="chat-messages" role="log" aria-label="Nội dung trao đổi" aria-live="polite" aria-relevant="additions"></div><div class="chat-quick"><button type="button">Tóm tắt tháng này</button><button type="button">Nhân sự cần hỗ trợ</button><button type="button">Kênh bán</button><button type="button">Hướng dẫn cập nhật HĐ</button></div><form class="chat-composer"><label for="ibbAssistantInput" class="chat-sr">Câu hỏi cho trợ lý</label><textarea id="ibbAssistantInput" rows="2" maxlength="1000" placeholder="Ví dụ: HĐ tồn bầy 2; Tìm DAAAR5872"></textarea><button type="submit">Gửi</button></form><p class="chat-foot">Bản chưa kết nối AI · Hỗ trợ các câu hỏi mẫu. Số liệu theo dữ liệu đã đồng bộ và quyền tài khoản.</p>`;
  document.body.append(launcher,panel);
  const $=selector=>panel.querySelector(selector),log=$('.chat-messages'),input=$('textarea'),profile=getProfile();
  const visible=row=>!!profile&&canView(row);
  STAFF_ROSTER.filter(person=>visible({staff:person.acc})).forEach(person=>{const option=element('option',person.acc);option.value=person.acc;$('[data-chat-staff]').append(option);});
  $('[data-chat-day]').value=reportDay();
  let busy=false,selectedRows=[],selectedTitle='',selectedDay=reportDay(),draftSerial=0;
  let aiConfigured=false,aiEnabled=false,aiHistory=[];
  const aiMode=button('Kiểm tra AI…',()=>{if(!aiConfigured){checkAI();return;}aiEnabled=!aiEnabled;renderAIMode();});aiMode.disabled=true;panel.querySelector('header div').after(aiMode);
  const sampleFoot='Câu hỏi mẫu · Số liệu theo dữ liệu đã đồng bộ và quyền tài khoản.';
  function renderAIMode(){aiMode.disabled=false;aiMode.textContent=aiConfigured?(aiEnabled?'AI: Bật':'AI: Tắt'):'Kết nối AI';aiMode.setAttribute('aria-pressed',String(aiEnabled));$('.chat-foot').textContent=aiEnabled?'AI phân tích câu hỏi và số liệu tổng hợp trong quyền xem. Anh kiểm tra bản nháp trước khi lưu.':sampleFoot;}
  async function checkAI(){try{aiMode.disabled=true;const status=await assistantAIRequest();aiConfigured=status.configured===true;aiEnabled=aiConfigured;renderAIMode();if(!aiConfigured)$('.chat-foot').textContent='AI chưa được cấu hình trên máy chủ. Hiện dùng câu hỏi mẫu.';}catch{aiConfigured=false;aiEnabled=false;renderAIMode();$('.chat-foot').textContent='Chưa kết nối được AI. Hiện dùng câu hỏi mẫu; bấm Kết nối AI để kiểm tra lại.';}}
  const details=installAgedContractDetails({button:null,id:'assistantContractDialog',getRows:()=>selectedRows,getAsOf:()=>selectedDay,canView:visible,getTitle:()=>selectedTitle,getDescription:()=> 'Dữ liệu lúc trả lời · Ngày chốt '+date(selectedDay)});
  function open(){panel.hidden=false;launcher.hidden=true;launcher.setAttribute('aria-expanded','true');input.focus();checkAI();}
  function close(){panel.hidden=true;launcher.hidden=false;launcher.setAttribute('aria-expanded','false');launcher.focus();}
  $('[data-chat-close]').onclick=close;
  panel.addEventListener('keydown',event=>{if(event.key==='Escape'&&!document.querySelector('dialog[open]')){event.preventDefault();close();}});
  function message(text,kind='bot'){
    const item=element('article',undefined,'chat-message chat-'+kind);item.append(element('strong',kind==='user'?'Anh':'Trợ lý IBB5','chat-author'));if(text)item.append(element('p',text));log.append(item);while(log.children.length>40)log.firstElementChild.remove();log.scrollTop=log.scrollHeight;return item;
  }
  const note=text=>message(text);
  function welcome(){note('Chào anh. Em có thể tóm tắt ngày/tuần/tháng, so sánh kết quả, xem đóng góp nhân sự, kênh bán và cảnh báo HĐ tồn. Để sửa, nhập “Cập nhật HĐ [mã HĐ]”. Mọi thay đổi đều cần anh xem và xác nhận trước khi lưu.');}
  welcome();
  $('[data-chat-clear]').onclick=()=>{if(busy)return;draftSerial++;aiHistory=[];log.replaceChildren();welcome();};
  const scope=()=>({period:$('[data-chat-period]').value,anchor:$('[data-chat-day]').value,team:$('[data-chat-team]').value,staff:$('[data-chat-staff]').value});
  function scopeLabel(s){return [s.team?'Bầy '+s.team:'Trong quyền tài khoản',s.staff].filter(Boolean).join(' · ');}
  async function refresh(){if(window.IBB5_SYNC?.refresh)await window.IBB5_SYNC.refresh();}
  function showList(rows,title,day){selectedRows=rows.filter(visible);selectedTitle=title;selectedDay=day;details.open();}
  function reportReply(report,s,kind){
    const reply=message(`${date(report.start)} – ${date(report.asOf)} · ${scopeLabel(s)}\nGhi nhận lúc ${new Date().toLocaleTimeString('vi-VN',{timeZone:'Asia/Ho_Chi_Minh'})}. Bấm số để xem HĐ.`);
    if(report.future){reply.append(element('p','Kỳ này chưa bắt đầu. Anh chọn ngày tham chiếu trước hoặc bằng hôm nay.'));return;}
    if(!report.source.length){reply.append(element('p','Chưa có dữ liệu trong phạm vi đã chọn.'));return;}
    const grid=element('div',undefined,'chat-kpis');
    const kinds=kind==='warnings'?['pending','aged','overdue','missing','stale']:kind in labels?[kind]:['sold','online','camera','vvip','pending'];
    kinds.forEach(key=>{const b=button(report.groups[key].length+' · '+labels[key],()=>showList(report.groups[key],labels[key],report.asOf));grid.append(b);});reply.append(grid);
    if(kind==='channels'){
      const total=report.channels.reduce((sum,[,n])=>sum+n,0);reply.append(element('p','NET bán mới có nguồn: '+total+' HĐ. Chưa cập nhật nguồn không được tính vào tỷ trọng.'));
      report.channels.forEach(([name,n])=>reply.append(element('p',name+': '+n+' HĐ · '+(100*n/total).toLocaleString('vi-VN',{maximumFractionDigits:1})+'%')));
    }else if(kind==='people'||kind==='warnings'){
      const teams=new Map();report.staff.forEach(person=>teams.set(person.team,(teams.get(person.team)||0)+person.online));
      reply.append(element('p','Đóng góp Online theo bầy trong phạm vi đang chọn:'));
      [...teams].sort((a,b)=>b[1]-a[1]).forEach(([team,count])=>reply.append(element('p',(team?'Bầy '+team:'Chưa gán bầy')+': '+count+' HĐ · '+(report.groups.online.length?100*count/report.groups.online.length:0).toLocaleString('vi-VN',{maximumFractionDigits:1})+'%')));
      const table=element('table'),head=element('tr');['Acc','Online','Tồn','Cam kết tháng'].forEach(text=>head.append(element('th',text)));const thead=element('thead');thead.append(head);table.append(thead);const body=element('tbody');
      report.staff.forEach(person=>{const row=element('tr');row.append(element('td',person.acc),element('td',String(person.online)),element('td',String(person.pending)),element('td',person.target===null?'Chưa duyệt':person.monthlyOnline+'/'+person.target));body.append(row);});table.append(body);const wrap=element('div',undefined,'chat-table');wrap.append(table);reply.append(wrap);
    }
    if(['summary','people','warnings','advice'].includes(kind)){
      reply.append(element('p',`NET Online: ${report.groups.online.length} HĐ; kỳ liền trước cùng số ngày: ${report.previous.length} HĐ (${report.change>0?'+':''}${report.change}). So sánh theo nguồn hiện có; thiếu file của kỳ trước có thể làm chênh lệch chưa đầy đủ.`));
      const suggestions=[];
      if(report.groups.overdue.length)suggestions.push(`Ưu tiên xác nhận lại lịch ${report.groups.overdue.length} HĐ quá ngày hẹn.`);
      if(report.groups.missing.length)suggestions.push(`Bổ sung ngày hẹn cho ${report.groups.missing.length} HĐ.`);
      if(report.groups.stale.length)suggestions.push(`Rà soát ${report.groups.stale.length} HĐ hơn 3 ngày chưa cập nhật.`);
      const behind=report.staff.filter(person=>person.target>0&&person.monthlyOnline<person.target);
      if(behind.length)suggestions.push(`${behind.length} nhân sự chưa đủ cam kết tháng đã duyệt; kiểm tra tồn và kế hoạch Online trước khi giao thêm việc.`);
      reply.append(element('p',suggestions.join('\n')||'Chưa phát hiện cảnh báo theo các điều kiện trên. Anh có thể kiểm tra chi tiết HĐ tồn và kế hoạch của từng nhân sự.'));
    }
    reply.append(element('small','Online theo ngày Online thực tế từ nguồn NET / Camera / Truyền hình. HĐ đã hủy, chấm dứt không tính vào NET hoạt động. HĐ chưa từng cập nhật được thống kê riêng ở cảnh báo thiếu ngày hẹn.'));
  }
  function searchReply(rows){
    const reply=message(rows.length?'Tìm thấy '+rows.length+' HĐ trong quyền xem (tối đa 100 kết quả).':'Không tìm thấy HĐ trong quyền xem. Anh có thể nhập đầy đủ mã HĐ, Acc hoặc tên khách hàng.');
    if(rows.length)reply.append(button('Mở danh sách',()=>showList(rows,'Kết quả tra cứu',reportDay())));
    rows.slice(0,20).forEach(row=>{const item=element('div',undefined,'chat-contract');item.append(element('p',`${row.id} · ${row.type} · ${row.staff||'—'}\n${row.customer||'Chưa có tên khách hàng'} · Online thực tế: ${date(row.date)}`));if(row.type==='Internet')item.append(button('Cập nhật '+row.id,()=>editContract(row.id)));reply.append(item);});
  }
  async function dailyReply(report,s){
    if(report.future)return;
    const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),15000);
    try{
      const session=await getSession();if(!session?.access_token)throw new Error('Phiên đăng nhập đã hết hạn.');
      const response=await fetch('/api/daily-reports?from='+report.start+'&to='+report.asOf,{headers:{Authorization:'Bearer '+session.access_token},signal:controller.signal,cache:'no-store'}),snapshot=await response.json();
      if(!response.ok)throw new Error(snapshot.error||'Không tải được báo cáo ngày.');
      if(!Array.isArray(snapshot.profiles)||!Array.isArray(snapshot.reports))throw new Error('Dữ liệu báo cáo ngày chưa sẵn sàng.');
      const profiles=snapshot.profiles.filter(p=>visible({staff:p.acc})&&(!s.staff||normalize(p.acc)===normalize(s.staff))&&(!s.team||String(p.team)===String(s.team))),ids=new Set(profiles.map(p=>p.id));
      const result=dailyReportRollup({...snapshot,profiles,reports:snapshot.reports.filter(r=>ids.has(r.user_id))},{start:report.start,end:report.asOf,team:s.team});
      const reply=message(`Tổng hợp từ Báo cáo ngày đã gửi · ${date(report.start)} – ${date(report.asOf)}\nPTTB: ${result.total.actual}/${result.total.commitment} cam kết · KHTN: ${result.total.leads} · Chốt: ${result.total.closed}\nĐã gửi ${result.total.sent}/${result.total.expected} báo cáo · Gửi muộn: ${result.total.late} · Quá hạn chưa gửi: ${result.total.overdue}.`);
      result.rows.forEach(row=>reply.append(element('p',row.profile.acc+': '+row.assessment)));
      if(result.support.length)result.support.forEach(entry=>reply.append(element('p',`${entry.profile.acc} · ${date(entry.date)}\nKhó khăn: ${entry.report.data?.difficulty||'—'}\nĐề nghị hỗ trợ: ${entry.report.data?.support||'—'}`)));
      else reply.append(element('p','Chưa có khó khăn / đề nghị hỗ trợ trong các báo cáo đã gửi của kỳ này.'));
      reply.append(element('small','Số liệu PTTB/KHTN ở đây do nhân viên báo cáo, tách biệt với kết quả Online thực tế từ file nguồn. Không cộng lũy kế Online tháng qua nhiều báo cáo.'));
    }catch(err){note('Chưa tải được phần Báo cáo ngày: '+(err.name==='AbortError'?'Kết nối quá lâu, anh thử lại.':err.message));}
    finally{clearTimeout(timer);}
  }
  function latestRow(id){return getData().find(row=>row.type==='Internet'&&row.id===id&&visible(row));}
  async function editContract(id,patch={},approve=false){
    try{
      await refresh();const row=latestRow(id);if(!row)throw new Error('Không tìm thấy HĐ NET trong quyền cập nhật.');
      const revision=window.IBB5_SHARED_STATE?.revisions?.['pending:'+id]||0,n=getNotes()[id]||{};
      const initial=draftAssistantUpdate(row,n,patch,revision),serial=++draftSerial;
      if(approve){
        if(getProfile()?.role!=='manager')throw new Error('Chỉ Trưởng phòng được duyệt hủy.');
        if(normalize(n.result)!=='huy')throw new Error('HĐ chưa có kết quả Hủy.');
        if(!n.cancelReason?.trim())throw new Error('HĐ chưa có lý do hủy.');
        const reply=message(`Duyệt hủy HĐ ${id}\nNhân viên: ${row.staff}\nKhách hàng: ${row.customer||'—'}\nLý do: ${n.cancelReason}\nSau khi duyệt, HĐ sẽ được ẩn khỏi danh sách theo dõi. Thao tác này không sửa trạng thái trong file NET.`);
        const confirm=button('Xác nhận duyệt hủy',async()=>save(confirm,serial,async()=>{await refresh();if(!latestRow(id)||getProfile()?.role!=='manager')throw new Error('Không còn quyền duyệt HĐ này.');validateAssistantDraft(initial,getNotes()[id],window.IBB5_SHARED_STATE?.revisions?.['pending:'+id]||0);await window.IBB5_SYNC.cancelPending(id,revision);},id));
        reply.append(confirm,button('Bỏ qua',()=>{confirm.disabled=true;}));return;
      }
      const reply=message(`Bản nháp cập nhật ${id} · ${row.staff}\n${row.customer||'Chưa có tên khách hàng'}\nĐây là thông tin nhân viên theo dõi. Ngày và trạng thái Online thực tế vẫn lấy từ file nguồn.`),form=element('form',undefined,'chat-edit');
      for(const field of NOTE_FIELDS){
        const label=element('label',NOTE_LABELS[field]);let control;
        if(field==='result'||field==='timeSlot'){
          control=element('select');const values=field==='result'?['','Chưa Online','Đã Online','Dự Kiến Hủy','Hủy']:['','8h - 10h','10h - 12h','13h30 - 15h30','15h30 - 17h30'];
          if(initial.after[field]&&!values.includes(initial.after[field]))values.push(initial.after[field]);values.forEach(value=>{const option=element('option',value||'Chọn…');option.value=value;control.append(option);});
        }else {control=element('input');control.type=field==='expected'?'date':'text';control.maxLength=field==='cancelReason'?1000:300;}
        control.name=field;control.value=initial.after[field];label.append(control);form.append(label);
      }
      const error=element('p',undefined,'chat-error');error.setAttribute('role','status');const preview=element('button','Xem thay đổi');preview.type='submit';form.append(preview,button('Bỏ nháp',()=>{form.remove();}),error);reply.append(form);
      form.onsubmit=event=>{
        event.preventDefault();try{
          const after=Object.fromEntries(NOTE_FIELDS.map(field=>[field,form.elements.namedItem(field).value]));
          const draft={...initial,after};validateAssistantDraft(draft,getNotes()[id],window.IBB5_SHARED_STATE?.revisions?.['pending:'+id]||0);
          const changed=NOTE_FIELDS.filter(field=>draft.before[field]!==after[field]);if(!changed.length)throw new Error('Anh chưa thay đổi thông tin.');
          const review=message('Xác nhận thay đổi HĐ '+id+'\n'+changed.map(field=>NOTE_LABELS[field]+': '+(draft.before[field]||'Chưa có')+' → '+(after[field]||'Để trống')).join('\n'));
          const confirm=button('Xác nhận lưu '+id,async()=>save(confirm,serial,async()=>{
            await refresh();if(!latestRow(id))throw new Error('Không còn quyền cập nhật HĐ này.');draftAssistantUpdate(latestRow(id),getNotes()[id],{},revision);
            const value=validateAssistantDraft(draft,getNotes()[id],window.IBB5_SHARED_STATE?.revisions?.['pending:'+id]||0);
            if(!window.IBB5_SYNC?.pending)throw new Error('Đồng bộ chưa sẵn sàng. Vui lòng tải lại trang.');await window.IBB5_SYNC.pending(id,value,revision);
          },id));
          review.append(confirm,button('Bỏ qua',()=>{confirm.disabled=true;}));form.remove();
        }catch(err){error.textContent=err.message;}
      };
      log.scrollTop=log.scrollHeight;
    }catch(err){note(err.message);}
  }
  async function save(confirm,serial,operation,id){
    if(busy)return;if(serial!==draftSerial){note('Bản nháp này đã hết hiệu lực. Anh tạo lại bản nháp mới nhất.');confirm.disabled=true;return;}
    busy=true;confirm.disabled=true;
    try{await operation();draftSerial++;note('Đã lưu HĐ '+id+' lên hệ thống lúc '+new Date().toLocaleString('vi-VN',{timeZone:'Asia/Ho_Chi_Minh'})+'. Các bảng sẽ tự cập nhật.');}
    catch(err){note('Chưa lưu: '+err.message+' Anh tạo lại bản nháp sau khi đồng bộ.');}
    finally{busy=false;}
  }
  async function send(text){
    text=text.trim();if(!text||busy)return;message(text,'user');input.value='';busy=true;$('.chat-composer button').disabled=true;
    try{
      if(aiEnabled){
        await refresh();const result=await assistantAIRequest({message:text,scope:scope(),history:aiHistory}),plan=result.plan;
        if(!plan)throw new Error('AI chưa trả kế hoạch hợp lệ.');
        aiHistory=[...aiHistory,{role:'user',content:text.slice(0,1000)},{role:'assistant',content:String(result.answer||plan.intent).slice(0,1000)}].slice(-6);
        const s=plan.scope;$('[data-chat-period]').value=s.period;$('[data-chat-day]').value=s.anchor;$('[data-chat-team]').value=s.team;$('[data-chat-staff]').value=s.staff;
        if(['update','approve'].includes(plan.intent)){await editContract(plan.contractId,plan.patch,plan.intent==='approve');return;}
        if(plan.intent==='search'){searchReply(findAssistantContracts(getData(),plan.query||plan.contractId,visible));return;}
        const report=assistantReport(getData(),{scope:s,notes:getNotes(),canView:visible,commitments:getCommitments()});
        if(result.answer)note(result.answer);
        if(!['daily','chat'].includes(plan.intent))reportReply(report,s,plan.intent);
        if(['daily','warnings'].includes(plan.intent))await dailyReply(report,s);
        return;
      }
      if(/huong dan|giup|help|lam duoc gi/.test(normalize(text))){note('Ví dụ anh có thể hỏi:\n• Tóm tắt tuần này bầy 2\n• So sánh Online tháng 11/2026\n• Nhân sự cần hỗ trợ\n• Kênh bán\n• HĐ tồn quá 7 ngày\n• Tìm DAAAR5872\n• Cập nhật HĐ DAAAR5872 sang 20/11/2026, 15h30 - 17h30\n• Cập nhật HĐ DAAAR5872; nguồn: Web; nguyên nhân: Kh muốn hẹn ngày đó\n• Duyệt hủy HĐ DAAAR5872 (Trưởng phòng)\nAnh bổ sung các trường còn thiếu trong bản nháp rồi bấm Xem thay đổi → Xác nhận lưu.');return;}
      await refresh();const q=normalize(text),data=getData();
      const matchId=data.filter(visible).find(row=>new RegExp('(^|[^a-z0-9])'+String(row.id).replace(/[.*+?^${}()|[\]\\]/g,'\\$&')+'($|[^a-z0-9])','i').test(text));
      const update=/cap nhat|doi|sua|duyet huy/.test(q)&&!/chua cap nhat|chua duoc cap nhat|lan cap nhat|huong dan/.test(q);
      if(update){if(!matchId){note('Anh nhập mã HĐ cụ thể để cập nhật, ví dụ “Cập nhật HĐ DAAAR5872”. Mã HĐ phải thuộc quyền tài khoản.');return;}await editContract(matchId.id,parseAssistantPatch(text),/duyet huy/.test(q));return;}
      const s=assistantScope(text,scope());$('[data-chat-period]').value=s.period;$('[data-chat-day]').value=s.anchor;$('[data-chat-team]').value=s.team;$('[data-chat-staff]').value=s.staff;
      if(matchId||/^(tim|tra cuu)\b/.test(q)){searchReply(findAssistantContracts(data,matchId?matchId.id:text,visible));return;}
      const report=assistantReport(data,{scope:s,notes:getNotes(),canView:visible,commitments:getCommitments()});
      let kind;
      if(/bao cao ngay|de nghi ho tro|kho khan/.test(q))kind='daily';
      else if(/can ho tro|canh bao|uu tien|cham cap nhat|chua cap nhat/.test(q))kind='warnings';
      else if(/qua 3 ngay|3 ngay.*cap nhat/.test(q))kind='stale';
      else if(/qua.*hen|tre hen/.test(q))kind='overdue';
      else if(/thieu.*hen|chua co.*hen/.test(q))kind='missing';
      else if(/7 ngay/.test(q))kind='aged';
      else if(/kenh|nguon/.test(q))kind='channels';
      else if(/nhan su|nhan vien|dong gop|ty trong|xep hang|tot nhat|bay nao/.test(q))kind='people';
      else if(/tu van|de xuat|danh gia|nen lam/.test(q))kind='advice';
      else if(/camera/.test(q))kind='camera';else if(/vvip|v.vip|truyen hinh/.test(q))kind='vvip';
      else if(/ton/.test(q))kind='pending';else if(/ban moi/.test(q))kind='sold';else if(/online/.test(q))kind='online';
      else if(/tom tat|bao cao|ket qua|tuan|thang|hom nay|hom qua/.test(q))kind='summary';
      if(!kind){note('Em chưa hiểu câu này ở bản chưa kết nối AI. Anh dùng câu như “Tóm tắt tuần này”, “Nhân sự cần hỗ trợ”, “Tìm [mã HĐ]” hoặc chọn gợi ý bên dưới.');return;}
      if(kind!=='daily')reportReply(report,s,kind);
      if(kind==='daily'||kind==='warnings')await dailyReply(report,s);
    }catch(err){note('Chưa xử lý được: '+err.message);}
    finally{busy=false;$('.chat-composer button').disabled=false;log.scrollTop=log.scrollHeight;}
  }
  $('.chat-composer').onsubmit=event=>{event.preventDefault();send(input.value);};
  input.addEventListener('keydown',event=>{if(event.key==='Enter'&&!event.shiftKey&&!event.isComposing){event.preventDefault();send(input.value);}});
  panel.querySelectorAll('.chat-quick button').forEach(b=>b.onclick=()=>send(b.textContent));
}
