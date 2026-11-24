import './tableZoom.css';
const STORE='ibb5_table_zoom_v1';
const MIN=60,MAX=140,STEP=10;
export function installTableZoom(root=document.body){
 const records=new Map();let saved={},frame=0;
 try{saved=JSON.parse(localStorage.getItem(STORE)||'{}');if(!saved||typeof saved!=='object'||Array.isArray(saved))saved={};}catch{}
 const tableKey=table=>{const scope=table.closest('.panel[id],[role="dialog"][id],dialog[id]')||table.parentElement.closest('[id]')||root;return (scope.id||'dashboard')+':'+(table.id||'table-'+[...scope.querySelectorAll('table')].indexOf(table));};
 const eligible=table=>!table.matches('.perf-table')&&!table.closest('#perfStickyClone,[id$="StickyClone"],.table-zoom-controls')&&(!table.id||document.getElementById(table.id)===table);
 function attach(table){const key=tableKey(table),toolbar=document.createElement('div');toolbar.className='table-zoom-controls';toolbar.setAttribute('data-capture-ui','');toolbar.setAttribute('role','group');toolbar.setAttribute('aria-label','Thu phóng bảng');toolbar.dataset.tableZoomFor=key;
  toolbar.innerHTML='<button type="button" data-zoom="-1" aria-label="Thu nhỏ bảng" title="Thu nhỏ bảng">A−</button><button type="button" data-zoom="reset" aria-label="Khôi phục kích thước bảng" title="Trở về 100%"><output aria-live="polite">100%</output></button><button type="button" data-zoom="1" aria-label="Phóng to bảng" title="Phóng to bảng">A+</button>';
  const container=table.closest('.tablewrap,.dc-scroll,.dp-scroll,.ibbc-scroll,.mk-scroll,.wr-scroll,.ana-monthly-scroll');const anchor=container&&container.querySelectorAll('table').length===1?container:table;anchor.before(toolbar);
  let percent=Number.isFinite(saved[key])?Math.max(MIN,Math.min(MAX,saved[key])):100;
  function apply(){table.style.zoom=percent===100?'':String(percent/100);toolbar.querySelector('output').textContent=percent+'%';toolbar.querySelector('[data-zoom="-1"]').disabled=percent<=MIN;toolbar.querySelector('[data-zoom="1"]').disabled=percent>=MAX;table.dataset.tableZoom=String(percent);}
  toolbar.addEventListener('click',event=>{const button=event.target.closest('[data-zoom]');if(!button||button.disabled)return;percent=button.dataset.zoom==='reset'?100:Math.max(MIN,Math.min(MAX,percent+Number(button.dataset.zoom)*STEP));saved[key]=percent;try{localStorage.setItem(STORE,JSON.stringify(saved));}catch{}apply();window.dispatchEvent(new Event('resize'));});apply();records.set(table,{toolbar});
 }
 function scan(){frame=0;for(const [table,record]of records)if(!root.contains(table)||!root.contains(record.toolbar)){record.toolbar.remove();records.delete(table);}root.querySelectorAll('table').forEach(table=>{if(eligible(table)&&!records.has(table))attach(table);});}
 const observer=new MutationObserver(()=>{if(!frame)frame=requestAnimationFrame(scan);});observer.observe(root,{childList:true,subtree:true});scan();return()=>{observer.disconnect();if(frame)cancelAnimationFrame(frame);for(const [table,{toolbar}]of records){table.style.zoom='';delete table.dataset.tableZoom;toolbar.remove();}records.clear();};
}
