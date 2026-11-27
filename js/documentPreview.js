import './documentPreview.css';
import pdfWorker from 'pdfjs-dist/build/pdf.worker.min.mjs?url';

const element = (tag, text) => { const node=document.createElement(tag); if(text!=null)node.textContent=text; return node; };

export function createDocumentPreview(host) {
  let generation=0, controller=null, pdfTask=null, renderTask=null, office=null, resizeTimer=null, currentRender=null;
  let page=1, count=1, zoom=1, cleanFrame=null, nativeFull=false;
  const close = () => {
    generation++; controller?.abort(); renderTask?.cancel(); pdfTask?.destroy()?.catch(()=>{}); office?.destroy?.();
    pdfTask=null;renderTask=null;office=null;currentRender=null;cleanFrame?.();cleanFrame=null;host.replaceChildren();
    if(host.classList.contains('dpv-present')){host.classList.remove('dpv-present');document.body.classList.remove('dpv-present-open');if(document.fullscreenElement===host)document.exitFullscreen?.().catch(()=>{});}
  };
  async function open(doc,url,localData=null) {
    close();const version=generation;controller=new AbortController();const signal=controller.signal;
    host.innerHTML='<div class="dpv-toolbar"><button type="button" data-dpv-prev aria-label="Trang trước">←</button><label>Trang <input type="number" min="1" value="1" data-dpv-page aria-label="Trang đang xem"></label><span data-dpv-total>/ 1</span><button type="button" data-dpv-next aria-label="Trang sau">→</button><select data-dpv-sheet hidden aria-label="Chọn trang tính"></select><span class="dpv-toolbar-gap"></span><button type="button" data-dpv-minus aria-label="Thu nhỏ">−</button><span data-dpv-zoom>100%</span><button type="button" data-dpv-plus aria-label="Phóng to">+</button><button type="button" data-dpv-fit>Vừa màn hình</button><button type="button" data-dpv-present>Trình chiếu</button></div><p class="dpv-note" data-dpv-note role="status">Đang mở tài liệu…</p><div class="dpv-stage" tabindex="0" aria-label="Nội dung tài liệu"><div class="dpv-surface"></div></div>';
    const $=selector=>host.querySelector(selector),stage=$('.dpv-stage'),surface=$('.dpv-surface'),note=$('[data-dpv-note]');page=1;count=1;zoom=1;
    function controls(){if(version!==generation)return;$('[data-dpv-page]').value=page;$('[data-dpv-page]').max=count;$('[data-dpv-total]').textContent='/ '+count;$('[data-dpv-prev]').disabled=page<=1;$('[data-dpv-next]').disabled=page>=count;$('[data-dpv-zoom]').textContent=Math.round(zoom*100)+'%';}
    async function paint(){if(version!==generation||!currentRender)return;controls();try{await currentRender();}catch(error){if(version===generation&&error.name!=='RenderingCancelledException'&&error.name!=='AbortError')note.textContent='Chưa hiển thị được trang: '+error.message;}}
    function go(value){page=Math.max(1,Math.min(count,Number(value)||1));stage.scrollTo(0,0);paint();}
    $('[data-dpv-prev]').onclick=()=>go(page-1);$('[data-dpv-next]').onclick=()=>go(page+1);$('[data-dpv-page]').onchange=event=>go(event.target.value);
    $('[data-dpv-minus]').onclick=()=>{zoom=Math.max(.5,zoom-.25);paint();};$('[data-dpv-plus]').onclick=()=>{zoom=Math.min(3,zoom+.25);paint();};$('[data-dpv-fit]').onclick=()=>{zoom=1;paint();};
    $('[data-dpv-present]').onclick=async()=>{
      const enabled=host.classList.toggle('dpv-present');document.body.classList.toggle('dpv-present-open',enabled);
      $('[data-dpv-present]').textContent=enabled?'Thoát trình chiếu':'Trình chiếu';
      try{if(enabled&&host.requestFullscreen){await host.requestFullscreen();nativeFull=true;}else if(!enabled&&document.fullscreenElement===host)await document.exitFullscreen();}catch{}
      paint();
    };
    const fit = (width,height) => Math.max(.1,Math.min((stage.clientWidth-24)/width,host.classList.contains('dpv-present')?(stage.clientHeight-24)/height:Infinity))*zoom;
    const makeFrame=async()=>{
      const frame=element('iframe');frame.title='Bản xem trước '+doc.title;frame.setAttribute('sandbox','allow-same-origin');
      frame.srcdoc='<!doctype html><html><head><meta charset="utf-8"><meta http-equiv="Content-Security-Policy" content="default-src &#39;none&#39;; img-src data: blob:; style-src &#39;unsafe-inline&#39;; font-src data: blob:;"><style>html,body{margin:0;padding:0;background:white}[hidden]{display:none!important}*{box-sizing:border-box}a{pointer-events:none}</style></head><body></body></html>';
      await new Promise(resolve=>{frame.onload=resolve;surface.append(frame);});if(version!==generation)return null;
      frame.contentDocument.addEventListener('click',event=>{if(event.target.closest('a'))event.preventDefault();},true);
      frame.contentDocument.addEventListener('keydown',event=>{if(host.classList.contains('dpv-present')&&['Escape','ArrowLeft','ArrowRight','ArrowUp','ArrowDown',' '].includes(event.key)){event.preventDefault();host.dispatchEvent(new KeyboardEvent('keydown',{key:event.key,bubbles:true}));}});
      return frame;
    };
    try {
      if(doc.extension==='pdf'){
        const pdf=await import('pdfjs-dist/build/pdf.mjs');if(version!==generation)return;pdf.GlobalWorkerOptions.workerSrc=pdfWorker;
        pdfTask=pdf.getDocument(localData?{data:localData,isEvalSupported:false}:{url,disableAutoFetch:true,disableStream:true,isEvalSupported:false});
        const document=await pdfTask.promise;if(version!==generation)return;count=document.numPages;let renderVersion=0;
        currentRender=async()=>{const request=++renderVersion;renderTask?.cancel();const pdfPage=await document.getPage(page);if(version!==generation||request!==renderVersion)return;
          const base=pdfPage.getViewport({scale:1}),scale=fit(base.width,base.height),viewport=pdfPage.getViewport({scale});
          const ratio=Math.min(window.devicePixelRatio||1,2,4096/Math.max(viewport.width,viewport.height)),canvas=element('canvas');canvas.width=Math.ceil(viewport.width*ratio);canvas.height=Math.ceil(viewport.height*ratio);canvas.style.width=viewport.width+'px';canvas.style.height=viewport.height+'px';canvas.setAttribute('aria-label','Trang '+page+' / '+count);
          surface.replaceChildren(canvas);renderTask=pdfPage.render({canvasContext:canvas.getContext('2d'),viewport,transform:[ratio,0,0,ratio,0,0]});await renderTask.promise;
          if(version===generation&&request===renderVersion)note.textContent='PDF · Dùng ← → hoặc nút chuyển trang để trình chiếu.';
        };
      }else if(['png','jpg','jpeg','webp'].includes(doc.extension)){
        const image=element('img');image.alt=doc.title;image.src=url;await new Promise((resolve,reject)=>{image.onload=resolve;image.onerror=()=>reject(Error('Không tải được ảnh.'));});if(version!==generation)return;
        surface.replaceChildren(image);currentRender=()=>{const scale=fit(image.naturalWidth,image.naturalHeight);image.style.width=image.naturalWidth*scale+'px';image.style.height=image.naturalHeight*scale+'px';note.textContent='Ảnh · Có thể phóng to hoặc trình chiếu toàn màn hình.';};
      }else{
        let data=localData;if(!data){const response=await fetch(url,{signal});if(!response.ok)throw Error('Không tải được bản xem trước.');data=await response.arrayBuffer();}if(version!==generation)return;
        if(doc.extension==='xlsx'){
          const xlsx=await import('xlsx');if(version!==generation)return;const workbook=xlsx.read(data,{type:'array',cellHTML:false}),sheetSelect=$('[data-dpv-sheet]');sheetSelect.hidden=false;
          workbook.SheetNames.forEach(name=>{const option=element('option',name);sheetSelect.append(option);});let rows=[];
          function changeSheet(){rows=xlsx.utils.sheet_to_json(workbook.Sheets[sheetSelect.value],{header:1,raw:false,defval:''});page=1;count=Math.max(1,Math.ceil(rows.length/200));controls();}
          sheetSelect.onchange=()=>{changeSheet();paint();};changeSheet();
          currentRender=()=>{const table=element('table'),body=element('tbody');for(const row of rows.slice((page-1)*200,page*200)){const tr=element('tr');for(const value of row)tr.append(element('td',String(value)));body.append(tr);}table.append(body);table.style.fontSize=12*zoom+'px';surface.replaceChildren(table);note.textContent='Trang tính '+sheetSelect.value+' · Dòng '+(rows.length?(page-1)*200+1:0)+'–'+Math.min(page*200,rows.length)+' / '+rows.length+'. Bản xem trước giá trị; biểu đồ và công thức phức tạp có thể khác Excel.';};
        }else if(doc.extension==='docx'){
          const docx=await import('docx-preview');if(version!==generation)return;const frame=await makeFrame();if(!frame)return;
          const body=frame.contentDocument.body,styles=element('div');body.append(styles);const content=element('div');body.append(content);
          await docx.renderAsync(data,content,styles,{inWrapper:false,breakPages:true,renderAltChunks:false,useBase64URL:true});if(version!==generation)return;
          const pages=[...content.querySelectorAll('section.docx')];if(!pages.length)pages.push(content);count=pages.length;
          currentRender=()=>{frame.contentDocument.documentElement.style.zoom='1';pages.forEach((node,index)=>node.hidden=index!==page-1);const bounds=pages[page-1].getBoundingClientRect(),width=Math.max(bounds.width,300),height=Math.max(bounds.height,200),scale=fit(width,height);frame.contentDocument.documentElement.style.zoom=String(scale);frame.style.width=Math.ceil(width*scale)+'px';frame.style.height=Math.ceil(height*scale+8)+'px';note.textContent='Word · Bản xem trước; font và cách ngắt trang có thể khác bản gốc.';};
        }else if(doc.extension==='pptx'){
          const pptx=await import('pptx-preview');if(version!==generation)return;const frame=await makeFrame();if(!frame)return;
          const container=frame.contentDocument.body;office=pptx.init(container,{width:960,height:540,mode:'slide'});await office.load(data);if(version!==generation)return;count=office.slideCount;
          if(!count)throw Error('Tài liệu không có slide.');
          currentRender=()=>{office.renderSingleSlide(page-1);const scale=fit(960,540);frame.contentDocument.documentElement.style.zoom=String(scale);frame.style.width=Math.ceil(960*scale)+'px';frame.style.height=Math.ceil(540*scale)+'px';note.textContent='PowerPoint · Bản xem trước slide; hiệu ứng chuyển động, video và một số biểu đồ có thể không hiển thị như bản gốc.';};
        }else throw Error('Chưa hỗ trợ định dạng này.');
      }
      if(version===generation){controls();await paint();}
    }catch(error){if(version===generation&&error.name!=='AbortError')note.textContent='Chưa xem được tài liệu: '+error.message+' Anh/chị có thể thử mở lại hoặc tải bản gốc.';}
  }
  window.addEventListener('resize',()=>{clearTimeout(resizeTimer);resizeTimer=setTimeout(()=>Promise.resolve().then(()=>currentRender?.()).catch(()=>{}),150);});
  document.addEventListener('fullscreenchange',()=>{if(nativeFull&&document.fullscreenElement!==host){nativeFull=false;host.classList.remove('dpv-present');document.body.classList.remove('dpv-present-open');const button=host.querySelector('[data-dpv-present]');if(button)button.textContent='Trình chiếu';Promise.resolve().then(()=>currentRender?.()).catch(()=>{});}});
  document.addEventListener('keydown',event=>{
    if(!host.classList.contains('dpv-present')||event.target.matches('input,select,textarea'))return;
    if(event.key==='Escape'){host.classList.remove('dpv-present');document.body.classList.remove('dpv-present-open');const button=host.querySelector('[data-dpv-present]');if(button)button.textContent='Trình chiếu';Promise.resolve().then(()=>currentRender?.()).catch(()=>{});}
    else if(['ArrowRight','ArrowDown',' '].includes(event.key)){event.preventDefault();host.querySelector('[data-dpv-next]')?.click();}
    else if(['ArrowLeft','ArrowUp'].includes(event.key)){event.preventDefault();host.querySelector('[data-dpv-prev]')?.click();}
  });
  return { open, close };
}
