import '../css/channelDocuments.css';
import { getSession } from './auth.js';
import { CHANNEL_BUCKET, DOCUMENT_CHANNELS, DOCUMENT_TYPES, validateChannelDocument } from './channelDocumentModel.js';

const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[c]));
const builtin = { id:'builtin-facebook', title:'Tài liệu chạy quảng cáo Facebook', channel:'Facebook', fileName:'tài liệu chạy ads fb.pdf', extension:'pdf', mime:'application/pdf', size:85739825, uploadedBy:'FPT Telecom × Meta', url:'/documents/sales-channels/facebook-ads.pdf', cover:'/documents/sales-channels/facebook-ads-cover.jpg' };
const sizeLabel = size => size < 1000000 ? Math.max(1,Math.ceil(size/1000)).toLocaleString('vi-VN') + ' KB' : (size / 1000000).toLocaleString('vi-VN',{maximumFractionDigits:1}) + ' MB';
const stamp = value => value ? new Date(value).toLocaleString('vi-VN',{timeZone:'Asia/Ho_Chi_Minh',dateStyle:'short',timeStyle:'short'}) : '';
async function request(method, body, query = '') {
  const session = await getSession(); if (!session?.access_token) throw Error('Vui lòng đăng nhập lại.');
  const response = await fetch('/api/dashboard-sync' + (method === 'GET' ? '?document=sales-channels' + query : ''), { method, headers:{Authorization:'Bearer '+session.access_token,...(method==='POST'?{'Content-Type':'application/json'}:{})}, body:method==='POST'?JSON.stringify({kind:'channel-document',...body}):undefined,cache:'no-store',signal:AbortSignal.timeout(30000) });
  const result = await response.json(); if (!response.ok) throw Error(result.error || 'Chưa kết nối được thư viện tài liệu.'); return result;
}
export function renderChannelDocuments(root) {
  root.innerHTML = '<div class="chdoc-head"><div><h2>Tài liệu kênh bán</h2><p>Tài liệu hướng dẫn và đào tạo theo từng kênh bán hàng.</p></div><div class="chdoc-head-tools"><span class="chdoc-count"></span><button type="button" data-chdoc-upload hidden>+ Tải tài liệu lên</button></div></div>'
    + '<div class="chdoc-filters"><input type="search" data-chdoc-search placeholder="Tìm tên tài liệu, người đăng…" aria-label="Tìm tài liệu"><select data-chdoc-channel aria-label="Lọc kênh bán"><option value="">Tất cả kênh</option>'+DOCUMENT_CHANNELS.map(channel=>'<option>'+channel+'</option>').join('')+'</select><button type="button" data-chdoc-reload>↻ Tải lại</button></div><p data-chdoc-status role="status"></p><div data-chdoc-list></div>'
    + '<section class="chdoc-reader" hidden><div class="chdoc-reader-head"><h3></h3><button type="button" data-chdoc-close>Đóng tài liệu</button></div><p data-chdoc-reader-help></p><div data-chdoc-frame></div></section>';
  let documents=[builtin], canUpload=false, busy=false, pending=null, loadVersion=0;
  const status=root.querySelector('[data-chdoc-status]'), list=root.querySelector('[data-chdoc-list]'), reader=root.querySelector('.chdoc-reader');
  const dialog=document.createElement('dialog');dialog.className='chdoc-upload-dialog';dialog.setAttribute('aria-label','Tải tài liệu kênh bán lên');
  dialog.innerHTML='<form><header><h3>Tải tài liệu lên</h3><button type="button" data-upload-cancel aria-label="Đóng">×</button></header><label>Chọn file<input type="file" name="file" accept="'+Object.keys(DOCUMENT_TYPES).map(ext=>'.'+ext).join(',')+'" required></label><p>PDF, Word (.docx), Excel (.xlsx), PowerPoint (.pptx), JPG, PNG, WebP · tối đa 50 MB/file.</p><label>Tên tài liệu<input name="title" maxlength="160" required></label><label>Kênh bán<select name="channel">'+DOCUMENT_CHANNELS.map(channel=>'<option>'+channel+'</option>').join('')+'</select></label><p data-upload-status role="status"></p><footer><button type="button" data-upload-cancel>Hủy</button><button type="submit">Tải lên & chia sẻ</button></footer></form>';
  root.append(dialog);const form=dialog.querySelector('form'),uploadStatus=dialog.querySelector('[data-upload-status]');
  function draw(){
    const query=root.querySelector('[data-chdoc-search]').value.trim().toLocaleLowerCase('vi'),channel=root.querySelector('[data-chdoc-channel]').value;
    const shown=documents.filter(doc=>(!channel||doc.channel===channel)&&(!query||[doc.title,doc.fileName,doc.uploadedBy].some(value=>String(value||'').toLocaleLowerCase('vi').includes(query))));
    root.querySelector('.chdoc-count').textContent=shown.length+' / '+documents.length+' tài liệu';
    list.innerHTML=shown.map(doc=>'<article class="chdoc-card">'+(doc.cover?'<img src="'+doc.cover+'" alt="Bìa tài liệu quảng cáo Facebook – FPT Telecom và Meta" width="640" height="360">':'<div class="chdoc-file-icon" aria-hidden="true">'+esc(doc.extension.toUpperCase())+'</div>')+'<div><span class="chdoc-tag">'+esc(doc.channel)+'</span><h3>'+esc(doc.title)+'</h3><p class="chdoc-meta">'+esc(doc.extension.toUpperCase())+' · '+(doc.id===builtin.id?'90 trang · ':'')+sizeLabel(doc.size)+'</p><p class="chdoc-meta">'+esc(doc.uploadedBy)+(doc.uploadedAt?' · '+stamp(doc.uploadedAt):' · Masterclass Workshop')+'</p><div class="chdoc-actions">'+(['pdf','png','jpg','jpeg','webp'].includes(doc.extension)?'<button type="button" data-chdoc-read="'+doc.id+'">Đọc tài liệu</button>':'')+(doc.url?'<a href="'+doc.url+'" target="_blank" rel="noopener noreferrer">Mở PDF ↗</a><a href="'+doc.url+'" download="tai-lieu-chay-ads-facebook.pdf">↓ Tải PDF</a>':'<button type="button" data-chdoc-open="'+doc.id+'">Mở tài liệu ↗</button><button type="button" data-chdoc-download="'+doc.id+'">↓ Tải về</button>')+'</div></div></article>').join('')||'<p>Không có tài liệu phù hợp.</p>';
    root.querySelector('[data-chdoc-upload]').hidden=!canUpload;
  }
  async function load(){const version=++loadVersion;try{const result=await request('GET');if(version!==loadVersion)return;documents=[...(result.documents||[]),builtin];canUpload=result.canUpload===true;draw();status.textContent='';}catch(error){if(version===loadVersion)status.textContent=error.message;}}
  async function urlFor(doc,download=false){return doc.url||(await request('GET',null,'&id='+encodeURIComponent(doc.id)+(download?'&download=1':''))).url;}
  list.addEventListener('click',async event=>{
    const button=event.target.closest('[data-chdoc-read],[data-chdoc-open],[data-chdoc-download]');if(!button)return;
    const doc=documents.find(item=>item.id===(button.dataset.chdocRead||button.dataset.chdocOpen||button.dataset.chdocDownload));if(!doc)return;
    const preview=button.hasAttribute('data-chdoc-read'),tab=preview?null:window.open('about:blank','_blank');if(tab)tab.opener=null;
    button.disabled=true;try{const url=await urlFor(doc,button.hasAttribute('data-chdoc-download'));
      if(!preview){if(tab)tab.location.href=url;else{status.textContent='Bấm đường dẫn để mở tài liệu: ';const link=document.createElement('a');link.href=url;link.target='_blank';link.rel='noopener noreferrer';link.textContent='Mở tài liệu';status.append(link);}return;}
      reader.hidden=false;reader.querySelector('h3').textContent=doc.title;root.querySelector('[data-chdoc-frame]').replaceChildren();
      const frame=document.createElement(doc.extension==='pdf'?'iframe':'img');frame.src=url+(doc.extension==='pdf'?'#view=FitH':'');frame.title=doc.title+(doc.id===builtin.id?' – 90 trang':'');if(frame.tagName==='IMG')frame.alt=doc.title;
      root.querySelector('[data-chdoc-frame]').append(frame);
      const help=root.querySelector('[data-chdoc-reader-help]');help.textContent='Mở toàn màn hình để đọc thuận tiện trên điện thoại: ';const link=document.createElement('a');link.href=url;link.target='_blank';link.rel='noopener noreferrer';link.textContent=doc.extension==='pdf'?'Mở PDF ↗':'Mở ảnh ↗';help.append(link);reader.scrollIntoView({behavior:'smooth',block:'start'});
    }catch(error){tab?.close();status.textContent=error.message;}finally{button.disabled=false;}
  });
  root.querySelector('[data-chdoc-close]').onclick=()=>{reader.hidden=true;root.querySelector('[data-chdoc-frame]').replaceChildren();};
  root.querySelector('[data-chdoc-search]').oninput=draw;root.querySelector('[data-chdoc-channel]').onchange=draw;root.querySelector('[data-chdoc-reload]').onclick=load;
  root.querySelector('[data-chdoc-upload]').onclick=()=>{if(canUpload){uploadStatus.textContent='';dialog.showModal();}};
  dialog.querySelectorAll('[data-upload-cancel]').forEach(button=>button.onclick=()=>{if(!busy)dialog.close();});dialog.addEventListener('cancel',event=>{if(busy)event.preventDefault();});
  form.elements.file.onchange=()=>{const file=form.elements.file.files[0];if(file&&!form.elements.title.value)form.elements.title.value=file.name.replace(/\.[^.]+$/,'');pending=null;};
  form.onsubmit=async event=>{
    event.preventDefault();if(busy||!canUpload)return;const file=form.elements.file.files[0];if(!file)return;
    let input;try{input=validateChannelDocument({title:form.elements.title.value,channel:form.elements.channel.value,fileName:file.name,size:file.size});}catch(error){uploadStatus.textContent=error.message;return;}
    const signature=JSON.stringify(input);busy=true;form.querySelectorAll('button,input,select').forEach(control=>control.disabled=true);
    try{
      if(!pending||pending.file!==file||pending.signature!==signature){
        uploadStatus.textContent='1/3 · Chuẩn bị tải file…';const prepared=await request('POST',{action:'prepare',...input});
        uploadStatus.textContent='2/3 · Đang tải file, vui lòng giữ màn hình này…';
        const {supabase}=await import('./supabaseClient.js');const result=await supabase.storage.from(CHANNEL_BUCKET).uploadToSignedUrl(prepared.path,prepared.token,file,{contentType:prepared.mime,upsert:false});if(result.error)throw result.error;
        pending={id:prepared.id,file,signature};
      }
      uploadStatus.textContent='3/3 · Đang kiểm tra & chia sẻ tài liệu…';await request('POST',{action:'complete',id:pending.id});
      pending=null;dialog.close();form.reset();await load();status.textContent='Đã đăng tài liệu vào thư viện chung.';
    }catch(error){uploadStatus.textContent=(error.message||'Chưa tải được file.')+(pending?' Bấm Tải lên & chia sẻ để thử lại bước hoàn tất.':'');}
    finally{busy=false;form.querySelectorAll('button,input,select').forEach(control=>control.disabled=false);}
  };
  draw();return load();
}
