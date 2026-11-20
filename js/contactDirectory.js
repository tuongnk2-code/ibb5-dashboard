import { buildContactRegions, CONTACT_LEVELS } from './contactDirectoryModel.js';
import './contactDirectory.css';

const escape = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

export function installContactDirectory(contacts) {
  const root = document.getElementById('ctDiagram'), search = document.getElementById('ctSearch'), count = document.getElementById('ctCount');
  if (!root) return;
  const dialog = document.createElement('dialog');
  dialog.className = 'ct-contact-dialog'; dialog.setAttribute('aria-labelledby', 'ctContactName');
  document.body.append(dialog);
  let regions = [], people = new Map(), openRegions = new Set(['dng']);
  const personButton = person => '<button type="button" class="ct-person" data-contact="'+person.key+'" aria-label="Xem liên hệ '+escape(person.name)+'"><strong>'+escape(person.name || 'Chưa có họ tên')+'</strong><span>'+escape(person.role || 'Chưa có chức danh')+'</span></button>';
  function regionBody(region) {
    const tiers = [...new Set(region.leaders.map(p => p.level))];
    return '<div class="ct-region-content"><div class="ct-chart" aria-label="Sơ đồ chức danh '+escape(region.group)+'">'+
      tiers.map(level => '<section class="ct-lead-tier"><h4>'+CONTACT_LEVELS[level]+'</h4><div class="ct-lead-people">'+region.leaders.filter(p=>p.level===level).map(personButton).join('')+'</div></section>').join('')+
      '<div class="ct-department-chart" style="--ct-department-count:'+Math.max(1,region.departments.length)+'"><div class="ct-branches">'+region.departments.map(department => '<div class="ct-branch"><h4 class="ct-branch-title">'+department.name+'<span>'+department.people.length+' liên hệ</span></h4></div>').join('')+'</div>'+[...new Set(region.people.filter(p=>p.level>=4).map(p=>p.level))].map(level=>{
        const list=region.people.filter(p=>p.level===level);
        return '<details class="ct-contact-level" data-level="'+level+'" '+(level<=5?'open':'')+'><summary>'+CONTACT_LEVELS[level]+' <span>'+list.length+' liên hệ</span></summary><div class="ct-rank-grid">'+region.departments.map(department=>{
          const members=department.people.filter(p=>p.level===level);
          return '<section class="ct-rank-department '+(members.length?'':'ct-empty-department')+'" data-department="'+escape(department.name)+'">'+(members.length?'<h5 class="ct-mobile-department">'+department.name+'</h5><div class="ct-level-people">'+members.map(personButton).join('')+'</div>':'')+'</section>';
        }).join('')+'</div></details>';
      }).join('')+'</div></div></div>';
  }
  function render() {
    regions = buildContactRegions(contacts,search.value);
    people = new Map(regions.flatMap(region=>region.people.map(person=>[person.key,person])));
    count.textContent='Hiển thị '+people.size.toLocaleString('vi-VN')+' / '+contacts.length.toLocaleString('vi-VN')+' liên hệ · '+regions.length+' nhóm Phòng / Khu vực';
    root.innerHTML=regions.length?regions.map((region,index)=>'<details class="ct-region" data-region="'+escape(region.key)+'" '+(search.value.trim()||openRegions.has(region.key)?'open':'')+'><summary class="ct-region-heading"><span><strong>'+escape(region.group)+'</strong><small>'+region.people.length+' liên hệ · '+escape([...new Set(region.people.map(p=>p.source).filter(Boolean))].join(' / '))+'</small></span><span class="ct-region-chevron" aria-hidden="true">⌄</span></summary><div class="ct-region-body" data-region-index="'+index+'"></div></details>').join(''):'<p class="ct-empty">Không tìm thấy Phòng / Khu vực phù hợp.</p>';
    root.querySelectorAll('.ct-region').forEach(details=>{
      const body=details.querySelector('.ct-region-body'),region=regions[Number(body.dataset.regionIndex)];
      const populate=()=>{if(details.open&&!body.childElementCount){body.innerHTML='<div class="ct-chart-actions"><span>Xếp theo cấp chức danh</span><button type="button" class="ct-expand-all" aria-expanded="false">Mở toàn bộ liên hệ</button></div>'+regionBody(region);}};
      populate();
      details.addEventListener('toggle',()=>{if(details.open)openRegions.add(region.key);else openRegions.delete(region.key);populate();});
    });
  }
  function showContact(person) {
    const phone=String(person.phone||''),digits=phone.replace(/[^0-9+]/g,''),email=String(person.email||'');
    const phoneHtml=/^\+?\d{9,13}$/.test(digits)?'<a href="tel:'+escape(digits)+'">'+escape(phone)+'</a>':escape(phone||'Chưa có thông tin');
    const emailHtml=/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)?'<a href="mailto:'+escape(encodeURIComponent(email))+'">'+escape(email)+'</a>':escape(email||'Chưa có thông tin');
    dialog.innerHTML='<div class="ct-dialog-heading"><div><p>'+escape(person.group||'Chưa ghi Phòng / Khu vực')+'</p><h3 id="ctContactName">'+escape(person.name)+'</h3><p>'+escape(person.role||'Chưa có chức danh')+'</p></div><form method="dialog"><button aria-label="Đóng thông tin liên hệ">✕</button></form></div><dl><div><dt>Di động</dt><dd>'+phoneHtml+'</dd></div><div><dt>Máy lẻ / IPP</dt><dd>'+escape(person.ext||'Chưa có thông tin')+'</dd></div><div><dt>Email</dt><dd>'+emailHtml+'</dd></div><div><dt>Ghi chú / Phụ trách</dt><dd>'+escape(person.note||'Chưa có thông tin')+'</dd></div><div><dt>Nguồn danh bạ</dt><dd>'+escape([person.source,person.sheet].filter(Boolean).join(' · '))+'</dd></div></dl>';
    dialog.showModal();
  }
  root.addEventListener('click',event=>{
    const button=event.target.closest('[data-contact]');if(button){const person=people.get(button.dataset.contact);if(person)showContact(person);}
    const expand=event.target.closest('.ct-expand-all');if(expand){const open=expand.getAttribute('aria-expanded')!=='true';expand.closest('.ct-region-body').querySelectorAll('.ct-contact-level').forEach(level=>level.open=open);expand.setAttribute('aria-expanded',String(open));expand.textContent=open?'Thu gọn liên hệ':'Mở toàn bộ liên hệ';}
  });
  search.addEventListener('input',render);
  render();
}
