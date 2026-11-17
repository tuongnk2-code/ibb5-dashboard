import '../css/channelShareChart.css';

const palette = ['#1684e6','#ef7b18','#0c9b78','#8254ce','#d84a7e','#138ca7','#b58b0b','#536ac1','#a96136','#6a8d38'];
const names = ['Top Zalo','Đại Lý','FaceBook ADS','Thị Trường','KH Cũ','Khác','Tờ Dán','IBB','Web','FaceBook Free'];
const escape = text => String(text).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const number = n => n.toLocaleString('vi-VN');
const percent = n => n.toLocaleString('vi-VN',{maximumFractionDigits:1})+'%';
const key = name => name.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/\s/g,'');
function color(name) {
  const index = names.findIndex(value=>key(value)===key(name));
  return index < 0 ? `hsl(${[...name].reduce((sum,c)=>sum+c.charCodeAt(0)*13,0)%360},65%,42%)` : palette[index];
}

export function renderChannelShareChart(root, items) {
  const rows = items.filter(([,n])=>Number.isFinite(n)&&n>0).sort((a,b)=>b[1]-a[1]);
  const total = rows.reduce((sum,[,n])=>sum+n,0);
  if(!total){root.innerHTML='<div class="ana-empty">Chưa có hợp đồng đã cập nhật nguồn trong bộ lọc này.</div>';return;}
  const circumference = 2*Math.PI*92;
  let offset = 0;
  const slices = rows.map(([name,n])=>{
    const length=n/total*circumference, start=offset;offset+=length;
    return `<circle cx="120" cy="120" r="92" fill="none" stroke="${color(name)}" stroke-width="28" stroke-dasharray="${length} ${circumference-length}" stroke-dashoffset="${-start}" transform="rotate(-90 120 120)"><title>${escape(name)}: ${number(n)} HĐ · ${percent(n/total*100)}</title></circle>`;
  }).join('');
  const top=rows[0], topThree=rows.slice(0,3).reduce((sum,[,n])=>sum+n,0);
  root.innerHTML=`<div class="channel-share-layout"><div class="channel-share-overview"><div class="channel-share-donut"><svg viewBox="0 0 240 240" role="img" aria-label="Tỷ trọng ${rows.length} kênh bán, tổng ${number(total)} hợp đồng có nguồn">${slices}</svg><div class="channel-share-center"><strong>${number(total)}</strong><span>HĐ có nguồn</span></div></div><div class="channel-share-insight"><span>Kênh dẫn đầu</span><strong>${escape(top[0])} · ${percent(top[1]/total*100)}</strong><small>${rows.length>=3?'3 kênh lớn nhất':'Các kênh đang có'} chiếm ${percent(topThree/total*100)} tổng HĐ có nguồn.</small></div></div><div class="channel-share-legend" role="list">${rows.map(([name,n])=>`<div class="channel-share-row" role="listitem" style="--channel-color:${color(name)}"><div class="channel-share-name"><i aria-hidden="true"></i><span>${escape(name)}</span></div><div class="channel-share-track"><span style="width:${n/total*100}%"></span></div><strong>${percent(n/total*100)}<small>${number(n)} HĐ</small></strong></div>`).join('')}</div></div>`;
}
