export function contractAlertSignatures(alerts,notes={}){
 const byId=new Map();for(const [kind,rows] of Object.entries(alerts.groups))for(const row of rows){if(!byId.has(row.id))byId.set(row.id,{row,kinds:[]});byId.get(row.id).kinds.push(kind);}
 return Object.fromEntries([...byId].map(([id,{row,kinds}])=>{const note=notes[id]||{};return [id,JSON.stringify({version:[row.staff||'',row.created||'',row.date||'',row.status||'',note.result||'',note.expected||'',note.timeSlot||'',note.action||'',note.source||'',!!String(note.cancelReason||'').trim(),note.processingRequestedAt||''],kinds:Object.fromEntries(kinds.sort().map(kind=>[kind,kind==='stale'?note.updated||'':'active']))})];}));
}
export function hasViewedContractAlert(current,stored){
 if(current===stored)return true;
 try{const a=JSON.parse(current),b=JSON.parse(stored);return Array.isArray(a.version)&&Array.isArray(b.version)&&JSON.stringify(a.version)===JSON.stringify(b.version)&&!!a.kinds&&!!b.kinds&&Object.entries(a.kinds).every(([kind,value])=>b.kinds[kind]===value);}catch{return false;}
}
export function unreadContractAlerts(alerts,notes={},reads={}){
 const signatures=contractAlertSignatures(alerts,notes);
 const groups=Object.fromEntries(Object.entries(alerts.groups).map(([kind,rows])=>[kind,rows.filter(row=>!hasViewedContractAlert(signatures[row.id],typeof reads[row.id]==='string'?reads[row.id]:reads[row.id]?.signature))]));
 return {...alerts,groups,total:new Set(Object.values(groups).flat().map(row=>row.id)).size,signatures};
}
export function mergeContractAlertReads(...lists){
 const map={};for(const records of lists)for(const record of records||[]){if(!map[record.contract_id]||Date.parse(record.viewed_at)>=Date.parse(map[record.contract_id].viewed_at))map[record.contract_id]=record;}return map;
}
