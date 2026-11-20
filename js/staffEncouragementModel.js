import { reportDay, shiftDay, validDay } from './dailyReportModel.js';

const normalize = value => String(value || '').trim().toLowerCase();
function previousCut(day) {
  const [year, month, date] = day.split('-').map(Number), previous = new Date(Date.UTC(year, month - 2, 1));
  const end = new Date(Date.UTC(year, month - 1, 0)).getUTCDate();
  return previous.toISOString().slice(0, 7) + '-' + String(Math.min(date, end)).padStart(2, '0');
}

// Same NET Online dates, distinct IDs and period cutoffs as the staff performance table.
export function personalGrowth(rows, account, day = reportDay()) {
  if (!normalize(account) || !validDay(day)) return null;
  const net = rows.filter(row => row.type === 'Internet'), own = net.filter(row => normalize(row.staff) === normalize(account));
  const count = (start, end) => new Set(own.filter(row => validDay(row.date) && row.date >= start && row.date <= end).map(row => row.id)).size;
  const calculate = asOf => {
    const previous = previousCut(asOf), month = previous.slice(0,7), available = net.some(row => validDay(row.date) && row.date.slice(0,7) === month);
    const current = count(asOf.slice(0,7)+'-01', asOf), before = available ? count(month+'-01', previous) : null;
    return { current, previous:before, delta:before === null ? null : current-before, previousCut:previous };
  };
  const result = calculate(day), yesterday = shiftDay(day,-1);
  const before = yesterday.slice(0,7) === day.slice(0,7) ? calculate(yesterday) : null;
  return { ...result, day, changeSinceYesterday:result.delta !== null && before?.delta !== null && before?.delta !== undefined ? result.delta-before.delta : null };
}

const headlines = {
  negative:[
    ['Cười lên một chút,','mình gỡ từng nút nhé!'],['Xắn tay áo,','cơ hội còn phía trước!'],['Nạp lại năng lượng,','thử thêm một cách nhé!'],['Hôm nay đổi nhịp,','đón thêm cơ hội nào!'],
    ['Cà phê có thể đắng,','ngày mới vẫn đáng mong!'],['Một cuộc gọi mới,','một cơ hội đang chờ!'],['Hôm nay mình hẹn nhau,','làm chắc từng bước nhé!'],['Chỉnh lại nhịp một chút,','rồi cùng tiến lên nào!'],
    ['Đồng đội ơi,','mình cùng tìm cách nhé!'],['Chọn một việc nhỏ,','làm thật tốt hôm nay!'],['Bật chút năng lượng,','gọi lại cơ hội nào!'],['Bình tĩnh lấy đà,','mình đi tiếp nhé!'],
    ['Ngày mới đã tới,','thử một góc nhìn mới!'],['Cười tươi rồi bắt đầu,','từng khách, từng cơ hội!'],['Hôm nay có đồng đội,','cùng tháo gỡ vướng mắc!'],['Tiếp thêm một chút lửa,','mình thử lại hôm nay!'],
  ],
  positive:[
    ['Đà đang lên,','mình bay tiếp nhé!'],['Phong độ đang tốt,','giữ lửa nào, đồng đội!'],['Nhịp đang đẹp,','mình đi tiếp thôi!'],['Thêm kết quả tốt,','thêm một nụ cười!'],
    ['Đồng đội ơi,','bạn đang làm tốt đấy!'],['Năng lượng tích cực,','lan sang cả đội rồi!'],['Một tràng vỗ tay,','dành cho nỗ lực của bạn!'],['Cùng giữ nhịp tốt,','đón thêm khách hài lòng!'],
    ['Tin vui đầu ngày,','bạn đang vượt cùng kỳ!'],['Có đà rồi nhé,','mình bước tiếp thật chắc!'],['Nụ cười hôm nay,','có phần công sức của bạn!'],['Nỗ lực đang lên tiếng,','mình nghe thấy rồi nhé!'],
    ['Ngày mới thêm hứng khởi,','giữ phong độ nào!'],['Bạn đang tiến lên,','cả đội cùng tiếp sức!'],['Thành quả đáng ghi nhận,','chúc bạn giữ nhịp vui!'],['Đà tốt, tinh thần tốt,','cùng làm thêm điều hay!'],
  ],
  neutral:[
    ['Ngày mới mở cửa,','cơ hội cũng chào bạn!'],['Thêm chút chủ động,','mở thêm một cơ hội!'],['Giữ nhịp đã tốt,','thử tiến thêm một bước!'],['Hôm nay mình hẹn nhau,','thêm một việc thật tốt!'],
    ['Khởi động nhẹ nhàng,','bắt nhịp thật tự tin!'],['Một ngày mới tới,','thêm cách làm hay nhé!'],['Chọn một việc chắc,','rồi mình tiến tiếp nào!'],['Cười tươi một chút,','sẵn sàng đón cơ hội!'],
    ['Mở lời thân thiện,','mở thêm một cơ hội!'],['Hôm nay thử nhé,','một cuộc gọi có ích!'],['Đồng đội sẵn sàng,','cùng bắt đầu nào!'],['Giữ sự chỉn chu,','đón thêm điều tích cực!'],
    ['Khách hàng đang chờ,','mình sẵn sàng chưa nào!'],['Tự tin vào việc nhỏ,','chăm chút từng cuộc gọi!'],['Chào ngày mới,','chúc bạn thật nhiều năng lượng!'],['Một chút sáng tạo,','thêm một cách tiếp cận!'],
  ],
};
const bodies = {
  negative:['Mình đi từng bước chắc hơn nhé.','Thử đổi cách mở đầu cuộc trò chuyện nhé.','Một ý kiến từ đồng đội có thể giúp mình gỡ vướng.','Bắt đầu từ khách đang gần quyết định nhất nhé.','Một việc làm tốt hôm nay cũng rất đáng ghi nhận.','Cho mình một nhịp thở rồi bắt đầu lại nhé.','Thử một câu hỏi mới để hiểu khách hơn nhé.','Hôm nay mình ưu tiên những lịch đang chờ nhé.','Bạn không phải xoay xở một mình.','Cứ làm chắc từng bước nhỏ nhé.','Mỗi lần hiểu khách hơn là thêm một cơ hội.','Đổi góc nhìn một chút có khi lại tìm ra cách hay.','Cùng tìm điểm đang vướng để hỗ trợ nhau nhé.','Thử rà lại một cơ hội mình đã bỏ ngỏ nhé.','Nạp chút năng lượng rồi mình đi tiếp.','Một cuộc trao đổi có ích là khởi đầu tốt rồi.'],
  positive:['Cảm ơn nỗ lực của bạn mỗi ngày.','Kết quả này có phần từ sự bền bỉ của bạn.','Một mẹo hay của bạn có thể tiếp sức cả đội!','Dành một tràng vỗ tay cho chính mình nhé.','Khách hàng hài lòng cũng là niềm vui của cả phòng.','Giữ những thói quen đang giúp bạn làm tốt nhé.','Cảm ơn bạn đã mang tin vui tới cả đội.','Đà tốt này rất đáng được ghi nhận.','Một chút tích cực của bạn có thể lan tới đồng đội.','Sự chỉn chu của bạn đang tạo ra kết quả.','Giữ tinh thần vui và làm chắc từng việc nhé.','Bạn đang góp thêm năng lượng cho cả phòng.','Hôm nay mình nối tiếp những điều đang làm tốt.','Cảm ơn bạn đã giữ sự chủ động mỗi ngày.','Có kết quả tốt, mình cùng chia sẻ cách làm hay.','Một ngày làm việc đầy hứng khởi đang chờ bạn.'],
  neutral:['Mình bắt đầu từ một việc có ích nhé.','Chọn một khách đang cần hỗ trợ để bắt đầu.','Một câu hỏi đúng nhu cầu có thể mở ra cơ hội.','Hôm nay thử một cách tiếp cận mới nhé.','Giữ những việc đang hiệu quả và thử thêm điều hay.','Một bước tiến nhỏ cũng đáng được ghi nhận.','Chủ động một chút, mình có thêm điều để thử.','Đồng đội luôn sẵn sàng cùng bạn tìm cách.','Hôm nay mình làm gọn, làm chắc từng việc.','Bắt đầu thân thiện, lắng nghe thật kỹ nhé.','Mỗi khách hàng đều có một nhu cầu đáng lắng nghe.','Chọn một ưu tiên rõ ràng cho hôm nay nhé.','Một cuộc trò chuyện tốt có thể bắt đầu ngày vui.','Mình có cả một ngày mới để thử cách làm hay.','Nạp năng lượng, rồi bắt đầu thật tự tin.','Hôm nay mình dành thêm chút chăm chút cho khách nhé.'],
};
const actions=['Chăm khách kỹ, xác nhận chắc từng lịch hẹn.','Gọi lại một khách đang phân vân nhé.','Hỏi khách còn cần hỗ trợ điều gì nhé.','Nhờ đồng đội hỗ trợ khi có điểm vướng.','Theo sát một lịch triển khai đang chờ nhé.','Chia sẻ một cách làm hay với cả nhóm nhé.','Rà lại những cơ hội đang gần chốt nhé.','Chốt rõ bước tiếp theo sau mỗi cuộc trao đổi.','Gửi một lời hỏi thăm đúng lúc tới khách nhé.','Lắng nghe nhu cầu trước khi tư vấn nhé.','Giữ lời hẹn và cập nhật khách thật rõ ràng.','Cùng đồng đội tìm cách cho một ca đang vướng.','Ưu tiên một khách cần được hỗ trợ hôm nay.','Giữ chất lượng trong từng hợp đồng nhé.','Bắt đầu từ một cuộc gọi có chuẩn bị nhé.','Chăm tốt khách đã tin tưởng mình nhé.'];
const signatures=['Phòng luôn đồng hành cùng bạn.','IBB5 cùng bạn giữ lửa mỗi ngày.','Có đồng đội, mình cùng tìm cách.','Cùng tiếp sức cho một ngày mới nhé!'];

export function encouragementMessage(account, growth) {
  const kind=growth.delta===null?'unavailable':growth.delta<0?'negative':growth.delta>0?'positive':'neutral';
  const bank=kind==='unavailable'?'neutral':kind;
  const dayNumber=Math.floor(Date.parse(growth.day+'T00:00:00Z')/86400000);
  let offset=0;for(const char of normalize(account))offset=(offset*31+char.charCodeAt(0))%4096;
  // A daily sequence of 16×16×16 combinations: consecutive days never reuse a full message.
  const sequence=((dayNumber+offset)%4096+4096)%4096,h=sequence%16,b=Math.floor(sequence/16)%16,a=Math.floor(sequence/256)%16;
  const title=headlines[bank][h];
  const improvement=kind==='negative'&&growth.changeSinceYesterday>0?'Khoảng cách đã thu hẹp '+growth.changeSinceYesterday+' HĐ. ':'';
  return {kind,id:bank+':'+sequence,title,body:improvement+bodies[bank][b]+' '+actions[a],signature:signatures[sequence%4]};
}
