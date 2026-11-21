import { pendingFollowupContracts } from './pendingInventory.js';
import { isTerminatedNetContract } from './cancellationArchive.js';
import { skipsOnlineAppointment, hasProcessingRequest } from './dashboardStateModel.js';
import { validDay, shiftDay } from './dailyReportModel.js';
import { SALARY_BANDS } from './salaryBands.js';
import { calculateSalary } from './salaryModel.js';

const norm=value=>String(value||'').trim().toLowerCase();
export function ownProspects(reports,userId,day) {
  const eligible=(Array.isArray(reports)?reports:[]).filter(row=>row.user_id===userId&&row.status==='submitted'&&validDay(row.report_date)&&row.report_date>=shiftDay(day,-2)&&row.report_date<=day&&Array.isArray(row.data?.sources)&&row.data.sources.every(s=>Number.isInteger(s.leads)&&s.leads>=0&&Number.isInteger(s.closed)&&s.closed>=0&&s.closed<=s.leads));
  eligible.sort((a,b)=>b.report_date.localeCompare(a.report_date)||String(b.updated_at||'').localeCompare(String(a.updated_at||'')));
  const row=eligible[0];if(!row)return null;
  return {day:row.report_date,leads:row.data.sources.reduce((n,s)=>n+s.leads,0),closed:row.data.sources.reduce((n,s)=>n+s.closed,0)};
}

export function ownSalaryMilestone(payload,account,day) {
  if(payload?.month!==day.slice(0,7)||payload.asOf!==day||!Array.isArray(payload.rows))return null;
  const row=payload.rows.find(row=>norm(row.acc)===norm(account));
  if(!row||typeof row.probation!=='boolean'||row.probation||![row.net,row.vvip].every(n=>Number.isInteger(n)&&n>=0))return null;
  const result=calculateSalary(row.net,row.vvip,false),next=SALARY_BANDS.find(b=>b.from>result.compared);
  if(!next||result.salary===null)return null;
  const remaining=Math.max(0,next.from*10-5-(row.net*8+row.vvip*17));
  return {salary:result.salary,nextSalary:next.salary,netNeeded:Math.ceil(remaining/8),vvipNeeded:Math.ceil(remaining/17),provisional:payload.provisional!==false};
}

export function encouragementContext({data,notes={},account,day,target,growth,reports=[],userId,salary=null}) {
  const own=data.filter(row=>norm(row.staff)===norm(account)),followup=pendingFollowupContracts(own,notes,day);
  const active=followup.filter(row=>(!row.date||row.date>day)&&!isTerminatedNetContract(row)&&!skipsOnlineAppointment(notes[row.id]?.result));
  const aged=active.filter(row=>(Date.parse(day)-Date.parse(row.created))/86400000>7).length;
  const overdue=active.filter(row=>validDay(notes[row.id]?.expected)&&notes[row.id].expected<day).length;
  const approvedTarget=Number.isInteger(target)&&target>0?target:null;
  const completion=approvedTarget===null?null:Math.round(growth.current/approvedTarget*1000)/10,missing=approvedTarget===null?null:Math.max(0,approvedTarget-growth.current);
  const days=new Date(Date.UTC(+day.slice(0,4),+day.slice(5,7),0)).getUTCDate();
  return {pending:followup.length,active:active.length,aged,overdue,processing:followup.filter(row=>hasProcessingRequest(notes[row.id])).length,needsUpdates:followup.filter(row=>row.date&&row.date<=day).length,completion,missing,behind:approvedTarget!==null&&growth.current/approvedTarget<Number(day.slice(-2))/days,prospects:ownProspects(reports,userId,day),salary};
}

const focusActions={
  overdue:['Gọi xác nhận lại lịch và chốt rõ bước tiếp theo nhé.','Ưu tiên một lịch đã lỡ hẹn, phối hợp kỹ thuật gỡ vướng nhé.','Cập nhật khách rồi cùng đội triển khai thống nhất lịch mới.','Chọn ca gần hoàn tất nhất để theo sát hôm nay nhé.','Làm rõ lý do lỡ hẹn và chủ động nhờ hỗ trợ nhé.','Chốt một đầu việc cụ thể cho từng ca đang trễ hẹn.','Hỏi khách thời điểm phù hợp rồi xác nhận lại với kỹ thuật.','Một lịch rõ ràng hôm nay sẽ giúp mình chủ động hơn nhé.'],
  aged:['Chọn một ca tồn lâu để cùng kỹ thuật tháo gỡ nhé.','Rà nguyên nhân từng ca và nhờ hỗ trợ đúng đầu mối.','Bắt đầu từ ca có thể triển khai sớm nhất nhé.','Chốt rõ bước xử lý tiếp theo với khách và kỹ thuật.','Chọn một vướng mắc để giải quyết dứt điểm hôm nay nhé.','Chủ động cập nhật khách, đừng để lịch hẹn bị bỏ quên.','Cùng đồng đội tìm phương án cho ca chờ lâu nhất nhé.','Mỗi ca được gỡ vướng là thêm một cơ hội cải thiện kết quả.'],
  processing:['Cập nhật rõ vướng mắc để TP cùng hỗ trợ nhé.','Chọn một ca và chốt phương án xử lý tiếp với TP.','Rà lại thông tin khách trước khi trao đổi phương án nhé.','Xin hỗ trợ đúng đầu mối để ca khó có bước tiến.','Cùng TP xác nhận bước xử lý khả thi tiếp theo nhé.','Ghi rõ điều cần hỗ trợ để đồng đội tiếp sức đúng chỗ.','Chủ động hẹn thời điểm phản hồi lại khách nhé.','Một cập nhật rõ ràng sẽ giúp cả nhóm phối hợp nhanh hơn.'],
  pending:['Chọn ca gần hoàn tất để xác nhận lịch triển khai nhé.','Gọi lại khách đang hẹn và phối hợp kỹ thuật thật sát.','Chốt rõ lịch và đầu mối xử lý cho một ca hôm nay nhé.','Bắt đầu từ hợp đồng có thể Online sớm nhất nhé.','Chủ động gỡ một vướng mắc để tiến gần mục tiêu hơn.','Nhờ đồng đội hỗ trợ ca có cơ hội hoàn tất nhé.','Rà lịch khách và giữ liên lạc với đội triển khai.','Chăm chắc từng ca đang chờ, mình cùng tiến thêm một bước.'],
  prospects:['Rà lại nhóm có nhu cầu rõ và hẹn bước tiếp theo nhé.','Hỏi khách còn phân vân điều gì rồi tư vấn đúng nhu cầu.','Ưu tiên khách đã trao đổi kỹ để chăm sóc tiếp nhé.','Gọi lại đúng lịch và chốt rõ việc cần làm tiếp theo.','Thử một cách giải thích dễ hiểu hơn cho khách nhé.','Cùng đồng đội tìm cách cho một khách đang phân vân.','Chọn một cơ hội có nhu cầu thực để theo sát hôm nay.','Lắng nghe kỹ và đề xuất phương án phù hợp nhé.'],
  prospecting:['Hôm nay thử thêm một nguồn khách phù hợp nhé.','Chủ động hỏi thăm khách cũ và tìm cơ hội giới thiệu nhé.','Dành một khung giờ rõ ràng để tìm nguồn mới.','Thử tiếp cận một nhóm khách có nhu cầu thật nhé.','Cùng đồng đội trao đổi một cách tìm nguồn hiệu quả.','Một cuộc hỏi thăm đúng lúc có thể mở ra cơ hội.','Chọn một kênh phù hợp và làm thật đều hôm nay nhé.','Bắt đầu từ một cuộc trò chuyện mới có chuẩn bị nhé.'],
  plan:['Chọn một cơ hội rõ nhu cầu để theo sát nhé.','Rà lại những ca gần hoàn tất để chốt bước tiếp theo.','Mình chia mục tiêu còn lại thành từng việc nhỏ hôm nay nhé.','Nhờ đồng đội góp ý cho một cơ hội đang vướng.','Giữ sự chủ động với khách và làm chắc từng lịch hẹn.','Chọn việc có khả năng tạo kết quả sớm để ưu tiên nhé.','Mỗi ca được làm chắc sẽ giúp mình tiến gần kế hoạch.','Cùng đội tìm thêm một cách tiếp cận hiệu quả nhé.'],
  salary:['Ưu tiên cơ hội đủ điều kiện trong kỳ và tư vấn đúng nhu cầu nhé.','Rà ca gần hoàn tất để tiến thêm một bước tới mốc mới.','Theo sát lịch triển khai và giữ chất lượng từng hợp đồng.','Cùng kỹ thuật gỡ một ca có thể hoàn tất trong kỳ nhé.','Chăm kỹ cơ hội phù hợp, đừng vội chạy theo số lượng.','Thêm một bước chắc hôm nay để tiến gần mốc mới nhé.','Kiểm tra kỳ ghi nhận ở mục LCB khi theo sát cơ hội nhé.','Mình làm chắc từng ca và cùng hướng tới mốc tiếp theo.'],
  records:['Bổ sung thông tin để cả đội theo dõi đúng tình hình nhé.','Rà các hồ sơ còn thiếu để cập nhật gọn hôm nay nhé.','Một cập nhật rõ sẽ giúp đồng đội phối hợp tốt hơn.','Hoàn thiện phần còn thiếu rồi tập trung cơ hội tiếp theo nhé.'],
  achievement:['Giữ chất lượng và chia sẻ cách làm hay với đồng đội nhé.','Chăm tốt khách đã tin tưởng mình và giữ nhịp vui nhé.','Cảm ơn nỗ lực của bạn, cùng tiếp sức cho cả đội nào!','Giữ sự chỉn chu trong từng lịch hẹn tiếp theo nhé.','Một mẹo hay của bạn có thể giúp đồng đội tiến lên.','Mình cùng nối tiếp những việc đang hiệu quả nhé.','Dành một tràng vỗ tay cho sự bền bỉ của bạn nào!','Hôm nay cùng chăm thêm một khách thật tốt nhé.'],
};

export function encouragementFocus(context,index=0) {
  if(!context)return null;
  const c=context,p=c.prospects,date=p?.day.split('-').reverse().slice(0,2).join('/'),pct=Number.isFinite(c.completion)?c.completion.toLocaleString('vi-VN',{maximumFractionDigits:1}):null;
  let type,summary;
  if(c.overdue){type='overdue';summary=c.overdue+' HĐ chưa Online đã qua ngày hẹn.';}
  else if(c.aged){type='aged';summary=c.aged+' HĐ chưa Online đang tồn quá 7 ngày.';}
  else if(c.processing){type='processing';summary=c.processing+' HĐ đang được TP yêu cầu xử lý tiếp.';}
  else if(c.behind&&c.active){type='pending';summary='Kế hoạch tháng đạt '+pct+'%; '+c.active+' HĐ đang chờ Online.';}
  else if(c.salary&&c.salary.netNeeded<=3){type='salary';summary='LCB tạm tính: ước tính thêm '+c.salary.netNeeded+' NET hoặc '+c.salary.vvipNeeded+' V.VIP hợp lệ để chạm bậc kế tiếp.';}
  else if(p&&p.leads>p.closed){type='prospects';summary='Báo cáo '+date+': '+p.leads+' KHTN mới, '+p.closed+' đã chốt.';}
  else if(c.completion!==null&&c.missing===0){type='achievement';summary='Bạn đã đạt '+pct+'% kế hoạch tháng.';}
  else if(p&&p.leads===0&&c.behind){type='prospecting';summary='Báo cáo '+date+' ghi nhận 0 KHTN mới; kế hoạch tháng đạt '+pct+'%.';}
  else if(c.completion!==null&&c.missing>0){type='plan';summary='Kế hoạch tháng đạt '+pct+'%; còn '+c.missing+' HĐ để chạm mục tiêu.';}
  else if(c.active){type='pending';summary=c.active+' HĐ đang chờ Online là những cơ hội cần được theo sát.';}
  else if(c.salary){type='salary';summary='LCB tạm tính: ước tính thêm '+c.salary.netNeeded+' NET hoặc '+c.salary.vvipNeeded+' V.VIP hợp lệ để chạm bậc kế tiếp.';}
  else if(c.needsUpdates){type='records';summary=c.needsUpdates+' HĐ đã Online còn cần hoàn thiện cập nhật.';}
  else if(p&&p.leads===0){type='prospecting';summary='Báo cáo '+date+' chưa ghi nhận KHTN mới.';}
  else return null;
  const choices=focusActions[type];return {type,body:summary+' '+choices[index%choices.length]};
}
