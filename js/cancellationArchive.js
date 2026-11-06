import { validDay } from './dailyReportModel.js';

export const isTerminatedNetContract = row => row?.type === 'Internet' && String(row.status || '').normalize('NFC').trim().replace(/\s+/g,' ').toLocaleLowerCase('vi-VN') === 'đã chấm dứt hợp đồng';

// The first recorded cancellation survives narrower files and later source status changes.
export function mergeCancellationArchive(...sources) {
  const archive=new Map();
  for(const rows of sources)for(const row of rows||[]){
    if(!isTerminatedNetContract(row))continue;
    const id=String(row.id||'').trim().toUpperCase();
    if(!/^[A-Z0-9][A-Z0-9._/-]{0,99}$/.test(id))continue;
    const existing=archive.get(id);
    const record={type:'Internet',id,status:'Đã chấm dứt hợp đồng',created:validDay(row.created)?row.created:'',staff:String(row.staff||'').slice(0,500),room:String(row.room||'').slice(0,500)};
    if(!existing)archive.set(id,record);
    else archive.set(id,{...existing,created:existing.created||record.created,staff:existing.staff||record.staff,room:existing.room||record.room});
  }
  return [...archive.values()];
}
