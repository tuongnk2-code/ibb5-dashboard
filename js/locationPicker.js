const normalize=value=>String(value||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/đ/gi,'d').toLowerCase().trim();
const escape=value=>String(value??'').replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));

// Keep the existing select as the committed value used by the price lookup.
export function locationPicker(id) {
  const select=document.getElementById(id),input=document.getElementById(id+'Search'),root=input.parentElement;
  const list=document.createElement('div');list.id=id+'Options';list.className='price-location-options';list.role='listbox';list.hidden=true;root.append(list);
  input.setAttribute('role','combobox');input.setAttribute('aria-autocomplete','list');input.setAttribute('aria-controls',list.id);input.setAttribute('aria-expanded','false');
  let matches=[],active=-1,query='';
  const committed=()=>select.value?select.selectedOptions[0]?.text||'':'';
  function close(restore=true){list.hidden=true;input.setAttribute('aria-expanded','false');input.removeAttribute('aria-activedescendant');if(restore)input.value=committed();active=-1;query='';}
  function render(){
    const words=normalize(query).split(/\s+/).filter(Boolean);
    matches=[...select.options].filter(option=>option.value&&words.every(word=>normalize(option.text).includes(word)));
    list.innerHTML=matches.length?matches.map((option,index)=>'<button type="button" role="option" tabindex="-1" id="'+id+'Option'+index+'" data-index="'+index+'" aria-selected="'+(option.value===select.value)+'">'+escape(option.text)+'</button>').join(''):'<div class="price-location-empty" role="status">Không tìm thấy khu vực phù hợp.</div>';
    active=-1;input.removeAttribute('aria-activedescendant');list.hidden=false;input.setAttribute('aria-expanded','true');
  }
  function choose(index){const option=matches[index];if(!option)return;const changed=select.value!==option.value;select.value=option.value;close();if(changed)select.dispatchEvent(new Event('change',{bubbles:true}));}
  input.addEventListener('focus',()=>{if(!input.disabled){query='';render();input.select();}});
  input.addEventListener('click',()=>{if(list.hidden&&!input.disabled)render();});
  input.addEventListener('input',()=>{
    query=input.value;
    if(!query&&select.value){select.value='';select.dispatchEvent(new Event('change',{bubbles:true}));}
    render();
  });
  input.addEventListener('keydown',event=>{
    if(event.key==='Escape'){event.preventDefault();event.stopPropagation();close();return;}
    if(event.key==='Enter'&&!list.hidden){event.preventDefault();choose(active<0?0:active);return;}
    if(!['ArrowDown','ArrowUp'].includes(event.key))return;
    event.preventDefault();if(list.hidden)render();if(!matches.length)return;
    active=active<0?(event.key==='ArrowDown'?0:matches.length-1):(active+(event.key==='ArrowDown'?1:-1)+matches.length)%matches.length;
    list.querySelectorAll('[role="option"]').forEach((option,index)=>option.classList.toggle('is-active',index===active));
    const option=list.children[active];input.setAttribute('aria-activedescendant',option.id);option.scrollIntoView({block:'nearest'});
  });
  list.addEventListener('pointerdown',event=>event.preventDefault());
  list.addEventListener('click',event=>{const option=event.target.closest('[data-index]');if(option){event.preventDefault();event.stopPropagation();choose(Number(option.dataset.index));}});
  input.addEventListener('blur',()=>close());
  document.addEventListener('pointerdown',event=>{if(!root.contains(event.target))close();});
  return {refresh(placeholder){close();input.placeholder=placeholder||select.options[0]?.text||'Gõ tên để tìm và chọn';input.disabled=select.options.length<=1;}};
}
