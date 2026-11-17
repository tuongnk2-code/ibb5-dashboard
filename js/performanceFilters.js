export const PERF_FIELDS=['acc','tenure','goal','sold','online','prev','growth','pct','projected','missing','need','pending','aged'];
export function matchesPerformanceFilters(fields,filters){
 return PERF_FIELDS.every(field=>{
  const filter=filters[field];if(!filter)return true;const value=fields[field];
  if(filter.startsWith('eq:'))return value.display===filter.slice(3);
  if(value.raw===null||typeof value.raw!=='number')return false;
  return filter==='positive'?value.raw>0:filter==='negative'?value.raw<0:filter==='zero'?value.raw===0:filter==='under100'?value.raw<100:filter==='atleast100'?value.raw>=100:false;
 });
}
export function performanceFilterOptions(field,records){
 const values=[...new Set(records.map(record=>record[field].display))].sort((a,b)=>a.localeCompare(b,'vi',{numeric:true}));
 const special=['pct','projected'].includes(field)?[['under100','Dưới 100%'],['atleast100','Từ 100%']]:field==='growth'?[['positive','Tăng'],['negative','Giảm'],['zero','Không đổi']]:!['acc','tenure'].includes(field)?[['positive','Lớn hơn 0'],['zero','Bằng 0']]:[];
 return [['','Tất cả'],['sort:asc','A → Z (tăng dần)'],['sort:desc','Z → A (giảm dần)'],['sort:none','Bỏ sắp xếp'],...special,...values.map(value=>['eq:'+value,value])];
}
export function sortPerformancePeople(people,records,sort={}){
 if(!PERF_FIELDS.includes(sort.field)||!['asc','desc'].includes(sort.direction))return people;
 return [...people].sort((a,b)=>{
  const team=String(a.team).localeCompare(String(b.team),'vi',{numeric:true});if(team)return team;
  const x=records.get(a.acc).fields[sort.field],y=records.get(b.acc).fields[sort.field];
  const missing=value=>value.raw===null||['—','Chưa có'].includes(value.display);
  if(missing(x)!==missing(y))return missing(x)?1:-1;
  if(missing(x))return 0;
  const order=typeof x.raw==='number'&&typeof y.raw==='number'?x.raw-y.raw:String(x.raw).localeCompare(String(y.raw),'vi',{numeric:true,sensitivity:'base'});
  return sort.direction==='desc'?-order:order;
 });
}
