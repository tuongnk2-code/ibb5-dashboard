import { normalizeContactText } from './contactDirectoryModel.js';

export function recipientContacts(contacts){
 const unique=new Map();
 for(const person of contacts||[]){const email=String(person.email||'').trim();if(!/^[^\s@<>;,]+@[^\s@<>;,]+\.[^\s@<>;,]+$/.test(email))continue;const key=email.toLowerCase();if(!unique.has(key))unique.set(key,{name:String(person.name||''),email,group:String(person.group||''),role:String(person.role||'')});}
 return [...unique.values()];
}
export function installRecipientSuggestions(input,contacts){
 const wrapper=document.createElement('span'),list=document.createElement('span');wrapper.className='mail-recipient';input.after(wrapper);wrapper.append(input,list);list.className='mail-recipient-list';list.id='mail-recipients-'+input.name;list.setAttribute('role','listbox');list.setAttribute('aria-label','Gợi ý email '+input.name);list.hidden=true;
 input.setAttribute('role','combobox');input.setAttribute('aria-autocomplete','list');input.setAttribute('aria-controls',list.id);input.setAttribute('aria-expanded','false');input.autocomplete='off';input.placeholder='Gõ tên, mã nhân sự hoặc email…';
 let matches=[],active=-1,range={start:0,end:0};
 const close=()=>{list.hidden=true;input.setAttribute('aria-expanded','false');input.removeAttribute('aria-activedescendant');active=-1;};
 function token(){const value=input.value,pos=input.selectionStart??value.length;let start=pos,end=pos;while(start>0&&!/[;,]/.test(value[start-1]))start--;while(end<value.length&&!/[;,]/.test(value[end]))end++;return {start,end,text:value.slice(start,end).trim()};}
 function highlight(index){active=index;[...list.children].forEach((node,i)=>node.setAttribute('aria-selected',String(i===active)));if(active>=0){input.setAttribute('aria-activedescendant',list.children[active].id);list.children[active].scrollIntoView({block:'nearest'});}}
 function choose(index){const person=matches[index];if(!person)return;const prefix=input.value.slice(0,range.start),suffix=input.value.slice(range.end);input.value=prefix+(prefix?' ':'')+person.email+';'+(suffix? suffix.replace(/^[;,]\s*/,' '):' ');const caret=prefix.length+(prefix?1:0)+person.email.length+2;close();input.focus();input.setSelectionRange(caret,caret);input.dispatchEvent(new Event('change',{bubbles:true}));}
 function draw(){range=token();const q=normalizeContactText(range.text);if(q.length<2){close();return;}const selected=new Set((input.value.slice(0,range.start)+';'+input.value.slice(range.end)).split(/[;,]/).map(s=>s.trim().toLowerCase()));matches=contacts.filter(p=>!selected.has(p.email.toLowerCase())&&normalizeContactText([p.name,p.email,p.group,p.role].join(' ')).includes(q)).slice(0,8);list.replaceChildren();active=-1;
  if(!matches.length){const empty=document.createElement('span');empty.className='mail-recipient-empty';empty.textContent='Không tìm thấy trong danh bạ. Có thể nhập email đầy đủ.';list.append(empty);}else matches.forEach((person,index)=>{const option=document.createElement('span');option.id=list.id+'-'+index;option.setAttribute('role','option');option.setAttribute('aria-selected','false');option.className='mail-recipient-option';const name=document.createElement('strong'),email=document.createElement('span'),detail=document.createElement('small');name.textContent=person.name||person.email;email.textContent=person.email;detail.textContent=[person.group,person.role].filter(Boolean).join(' · ');option.append(name,email,detail);option.onpointerdown=e=>{e.preventDefault();choose(index);};list.append(option);});list.hidden=false;input.setAttribute('aria-expanded','true');
 }
 input.addEventListener('input',draw);input.addEventListener('focus',draw);input.addEventListener('click',draw);input.addEventListener('blur',close);
 input.addEventListener('keydown',event=>{if(event.key==='Escape'){close();return;}if(list.hidden)return;if(event.key==='ArrowDown'||event.key==='ArrowUp'){event.preventDefault();if(matches.length)highlight(active<0?(event.key==='ArrowDown'?0:matches.length-1):(active+(event.key==='ArrowDown'?1:-1)+matches.length)%matches.length);}else if(event.key==='Enter'&&active>=0){event.preventDefault();choose(active);}else if(event.key==='Tab')close();});
 return {close};
}
