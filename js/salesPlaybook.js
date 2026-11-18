import slides from './data/salesPlaybookSource.json';
import { PLAYBOOK_CHAPTERS, PLAYBOOK_SOURCE } from './salesPlaybookData.js';
import { PLAYBOOK_DETAILS, readableSourceText } from './salesPlaybookDetails.js';
import '../css/salesPlaybook.css';

const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const normalize = value => String(value).normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/đ/g,'d').replace(/Đ/g,'D').toLowerCase().replace(/\s+/g,'');
const sourceFor = chapter => slides.filter(slide => slide.slide > chapter.start && slide.slide <= chapter.end);
const guideText = chapter => [chapter.title,chapter.category,chapter.situation,chapter.keywords,...chapter.steps,chapter.script,chapter.caution,JSON.stringify(PLAYBOOK_DETAILS[chapter.id])].join(' ');
const matches = (text, query) => normalize(text).includes(normalize(query));
const chapterText = new Map(PLAYBOOK_CHAPTERS.map(chapter => [chapter.id,guideText(chapter)+' '+sourceFor(chapter).flatMap(slide=>slide.text.map(text=>readableSourceText(text,chapter.id))).join(' ')]));

export function renderSalesPlaybook(root) {
  if (!root) return;
  root.classList.remove('planned-module');
  root.classList.add('sales-playbook');
  let selected = PLAYBOOK_CHAPTERS[0].id, view = 'guide', rawSource = false;
  root.innerHTML = `<header class="sp-hero"><div><span class="sp-eyebrow">IBB5 · SỔ TAY BÁN HÀNG</span><h2>Kịch bản gợi ý</h2><p>Tìm đúng tình huống. Có hướng xử lý ngay khi gặp khách.</p></div><div class="sp-source-tag"><strong>${PLAYBOOK_CHAPTERS.length} nhóm tình huống</strong><span>${slides.length} trang · ${esc(PLAYBOOK_SOURCE)}</span></div></header>
  <div class="sp-toolbar"><label class="sp-search"><span>Tìm tình huống hoặc nội dung tài liệu</span><input id="spSearch" type="search" placeholder="Ví dụ: Wi-Fi yếu, hẹn ngày mai, thanh toán…" autocomplete="off"></label><label class="sp-category">Nhóm nội dung<select id="spCategory"><option value="">Tất cả nhóm</option>${[...new Set(PLAYBOOK_CHAPTERS.map(c=>c.category))].map(category=>`<option>${esc(category)}</option>`).join('')}</select></label><button id="spReset" type="button">Đặt lại</button></div>
  <div class="sp-meta"><span id="spCount" role="status"></span><span>Tìm được cả khi nhập không dấu</span></div>
  <div class="sp-workspace"><nav class="sp-topics" aria-label="Các tình huống bán hàng" id="spTopics"></nav><article id="spContent" class="sp-content" aria-label="Nội dung kịch bản"></article></div>`;
  const $ = selector => root.querySelector(selector);
  function drawContent(chapter) {
    if (!chapter) {
      $('#spContent').innerHTML='<div class="sp-empty"><strong>Chưa tìm thấy tình huống phù hợp</strong><p>Thử từ khóa ngắn hơn, bỏ bộ lọc nhóm hoặc bấm “Đặt lại”.</p></div>';
      return;
    }
    const detail=PLAYBOOK_DETAILS[chapter.id],query=$('#spSearch').value.trim(),original=sourceFor(chapter),matching=original.filter(slide=>matches(slide.text.map(text=>readableSourceText(text,chapter.id)).join(' '),query));
    const visibleSource=query&&matching.length?matching:original;
    $('#spContent').innerHTML=`<div class="sp-detail-head"><div class="sp-detail-meta"><span>${esc(chapter.category)}</span><small>Chương ${chapter.roman} · Trang ${chapter.start}–${chapter.end}</small></div><h3>${esc(chapter.title)}</h3><p>${esc(readableSourceText(chapter.situation,chapter.id))}</p></div>
    <div class="sp-views" role="group" aria-label="Cách xem tình huống"><button type="button" data-sp-view="guide" aria-pressed="${view==='guide'}">Nội dung diễn giải</button><button type="button" data-sp-view="source" aria-pressed="${view==='source'}">Ý kiến trong tài liệu <span>${original.length}</span></button></div>
    ${view==='guide'?`<section class="sp-goal"><h4>Mục tiêu tư vấn</h4><p>${esc(detail.goal)}</p></section><section class="sp-questions"><h4>Những câu cần hỏi trước</h4><ul>${detail.questions.map(question=>`<li>${esc(question)}</li>`).join('')}</ul></section><section class="sp-steps"><h4>Cách xử lý đầy đủ</h4><ol>${detail.actions.map(([title,body])=>`<li><strong>${esc(title)}</strong><p>${esc(body)}</p></li>`).join('')}</ol></section><section class="sp-script"><div><h4>${chapter.id==='experience'?'Mẫu ghi lại kinh nghiệm':'Lời thoại mở đầu tham khảo'}</h4><button type="button" id="spCopy">Sao chép lời thoại</button></div><p id="spScriptText">${esc(chapter.script)}</p><span id="spCopyStatus" role="status" aria-live="polite"></span></section><section class="sp-responses"><h4>Khách phản hồi thế nào, trả lời ra sao?</h4>${detail.branches.map(([customer,response])=>`<details open><summary>${esc(customer)}</summary><p>${esc(response)}</p></details>`).join('')}</section><section class="sp-completion"><h4>Trước khi kết thúc buổi tư vấn</h4><ul>${detail.completion.map(item=>`<li>${esc(item)}</li>`).join('')}</ul></section><aside class="sp-caution"><strong>Lưu ý khi áp dụng</strong><p>${esc(chapter.caution)}</p></aside><button type="button" id="spCopyAll">Sao chép toàn bộ kịch bản</button><span id="spCopyAllStatus" role="status" aria-live="polite"></span><p class="sp-provenance">Phần diễn giải được biên soạn từ tình huống và các hướng xử lý trong tài liệu, kèm lời thoại để áp dụng. Chuyển sang “Ý kiến trong tài liệu” để đối chiếu từng trang nguồn.</p>`:
    `<div class="sp-reference-note"><strong>Tài liệu tham khảo nội bộ</strong><p>Các ý kiến có thể khác nhau giữa các nhân sự. Thông tin sản phẩm, giá, voucher và quy trình cần đối chiếu chính sách đang áp dụng trước khi tư vấn khách.</p></div><label class="sp-original-toggle"><input type="checkbox" id="spOriginal" ${rawSource?'checked':''}> Hiển thị nguyên văn, giữ các từ viết tắt</label><p class="sp-provenance">${query&&matching.length?`${matching.length} trang có nội dung khớp từ khóa · `:''}Nguồn: ${esc(PLAYBOOK_SOURCE)} · ${rawSource?'Đang xem nguyên văn':'Các từ viết tắt phổ biến đã được viết đầy đủ để dễ đọc'} · Bấm từng trang để đọc</p><div class="sp-source-pages">${visibleSource.map(slide=>`<details ${query&&matching.length?'open':''}><summary><span>Trang ${slide.slide}</span><strong>${esc(slide.text[0]?.slice(0,90)||'Ý kiến tham khảo')}</strong></summary><div>${slide.text.map(text=>`<p>${esc(rawSource?text:readableSourceText(text,chapter.id))}</p>`).join('')}</div></details>`).join('')}</div>`}`;
    const copy=$('#spCopy');
    if(copy)copy.onclick=async()=>{
      try{await navigator.clipboard.writeText(chapter.script);$('#spCopyStatus').textContent='Đã sao chép lời thoại.';}
      catch{$('#spCopyStatus').textContent='Anh có thể chọn và sao chép trực tiếp phần lời thoại bên trên.';}
    };
    const copyAll=$('#spCopyAll');
    if(copyAll)copyAll.onclick=async()=>{
      const text=[chapter.title,'Mục tiêu: '+detail.goal,'Câu hỏi tìm hiểu nhu cầu',...detail.questions,'Cách xử lý',...detail.actions.map(([title,body],index)=>(index+1)+'. '+title+'\n'+body),'Lời thoại mở đầu',chapter.script,'Phản hồi thường gặp',...detail.branches.map(([customer,response])=>'Khách: '+customer+'\nGợi ý trả lời: '+response),'Trước khi kết thúc',...detail.completion,'Lưu ý: '+chapter.caution].join('\n\n');
      try{await navigator.clipboard.writeText(text);$('#spCopyAllStatus').textContent='Đã sao chép toàn bộ kịch bản.';}
      catch{$('#spCopyAllStatus').textContent='Anh có thể chọn và sao chép trực tiếp nội dung bên trên.';}
    };
    const originalToggle=$('#spOriginal');if(originalToggle)originalToggle.onchange=()=>{rawSource=originalToggle.checked;drawContent(chapter);};
  }
  function draw() {
    const query=$('#spSearch').value.trim(),category=$('#spCategory').value;
    const visible=PLAYBOOK_CHAPTERS.filter(chapter=>(!category||chapter.category===category)&&(!query||matches(chapterText.get(chapter.id),query)));
    if(!visible.some(chapter=>chapter.id===selected))selected=visible[0]?.id;
    $('#spCount').textContent=`${visible.length} / ${PLAYBOOK_CHAPTERS.length} tình huống`;
    $('#spTopics').innerHTML=visible.map(chapter=>`<button type="button" data-sp-chapter="${chapter.id}" aria-current="${chapter.id===selected?'true':'false'}"><span class="sp-chapter-number">${chapter.roman}</span><span><strong>${esc(chapter.title)}</strong><small>${esc(chapter.category)} · Trang ${chapter.start}–${chapter.end}</small></span><span class="sp-topic-arrow" aria-hidden="true">›</span></button>`).join('');
    const chapter=visible.find(c=>c.id===selected);
    if(query&&chapter&&!matches(guideText(chapter),query))view='source';
    drawContent(chapter);
  }
  $('#spSearch').addEventListener('input',()=>{view='guide';draw();});
  $('#spCategory').addEventListener('change',()=>{view='guide';draw();});
  $('#spReset').onclick=()=>{$('#spSearch').value='';$('#spCategory').value='';selected=PLAYBOOK_CHAPTERS[0].id;view='guide';draw();};
  root.addEventListener('click',event=>{
    const topic=event.target.closest('[data-sp-chapter]');
    if(topic){selected=topic.dataset.spChapter;view='guide';draw();}
    const mode=event.target.closest('[data-sp-view]');
    if(mode){view=mode.dataset.spView;drawContent(PLAYBOOK_CHAPTERS.find(chapter=>chapter.id===selected));}
  });
  draw();
}
