import test from 'node:test';
import assert from 'node:assert/strict';
import {dailyReportRollup,rollupPercent} from '../js/dailyReportRollupModel.js';
import {reportDay,shiftDay} from '../js/dailyReportModel.js';

test('rollup sums submitted daily values, not drafts or monthly cumulative values; respects exemptions, creation date and 22h deadline',()=>{
 const snapshot={trackingStart:'2026-11-04',profiles:[{id:'a',acc:'DNG.ManLM3',team:3,role:'staff',created_at:'2026-11-01T00:00:00Z'},{id:'b',acc:'DNG.Vypv',team:1,role:'lead',created_at:'2026-11-09T00:00:00Z'},{id:'m',role:'manager'}],reports:[
  {user_id:'a',report_date:'2026-11-04',status:'submitted',submitted_at:'2026-11-04T14:00:00Z',data:{actual:4,commitment:1,online:1,monthlyOnline:999,sources:[{name:'Zalo',leads:9,closed:3}],support:'Hỗ trợ',difficulty:'Khó'}},
  {user_id:'a',report_date:'2026-11-05',status:'submitted',submitted_at:'2026-11-05T15:01:00Z',data:{actual:2,commitment:2,online:2,monthlyOnline:999,sources:[{name:'zalo',leads:6,closed:2}]}},
  {user_id:'a',report_date:'2026-11-06',status:'exempt',data:{actual:999}},
  {user_id:'a',report_date:'2026-11-07',status:'draft',data:{actual:999,commitment:999,sources:[{name:'Zalo',leads:999,closed:999}]}}
 ]};
 const result=dailyReportRollup(snapshot,{start:'2026-11-01',end:'2026-11-10',now:new Date('2026-11-10T14:00:00Z')});
 const row=result.rows.find(row=>row.profile.id==='a');assert.equal(row.actual,6);assert.equal(row.commitment,3);assert.equal(row.online,3);assert.equal(row.leads,15);assert.equal(row.closed,5);assert.equal(row.expected,6);assert.equal(row.sent,2);assert.equal(row.exempt,1);assert.equal(row.late,1);assert.equal(row.overdue,3);assert.equal(row.pending,1);assert.equal(row.support,1);assert.equal(result.rows.find(row=>row.profile.id==='b').expected,2);assert.equal(result.rows.length,2);assert.equal(result.support.length,1);assert.equal(result.channels.length,1);assert.equal(result.channels[0].leads,15);assert.match(row.assessment,/Đạt cam kết 200%.*Dữ liệu chưa đủ/);
 assert.equal(rollupPercent(5,15),33);assert.equal(rollupPercent(0,0),null);
 assert.equal(dailyReportRollup(snapshot,{start:'2026-11-04',end:'2026-11-10',team:'1'}).rows.length,1);
 const duplicate={...snapshot.reports[0],revision:2,data:{actual:7,commitment:1,sources:[]}};assert.equal(dailyReportRollup({...snapshot,reports:[...snapshot.reports,duplicate]},{start:'2026-11-04',end:'2026-11-04'}).total.actual,7);
 assert.equal(dailyReportRollup({profiles:snapshot.profiles,reports:[],trackingStart:null},{start:'2026-11-01',end:'2026-11-10'}).total.expected,0);
});

test('daily reports range API retains server authorization and bounds and paginates',async()=>{
 const oldFetch=globalThis.fetch;process.env.SUPABASE_URL='https://supabase.test';process.env.SUPABASE_SERVICE_ROLE_KEY='test-only';
 const profiles=[{id:'a',role:'staff',acc:'DNG.ManLM3',created_at:'2020-01-01T00:00:00Z'},{id:'b',role:'staff',acc:'DNG.Vypv',created_at:'2020-01-01T00:00:00Z'},{id:'l',role:'lead',acc:'DNG.HoaNTB6',created_at:'2020-01-01T00:00:00Z'},{id:'m',role:'manager',created_at:'2020-01-01T00:00:00Z'}];
 let caller=profiles[0],queries=[];
 const today=reportDay(),from=shiftDay(today,-5),records=[{user_id:'a',report_date:from,status:'submitted',data:{actual:4}},{user_id:'b',report_date:today,status:'draft',data:{actual:999}}];
 globalThis.fetch=async(input,init={})=>{const url=new URL(input instanceof Request?input.url:input),json=value=>new Response(JSON.stringify(value),{headers:{'Content-Type':'application/json'}});
  if(url.pathname==='/auth/v1/user')return json({id:caller.id});
  if(url.pathname==='/rest/v1/profiles')return json(url.searchParams.has('id')?caller:profiles);
  if(url.pathname==='/rest/v1/daily_reports'){queries.push(url);const users=url.searchParams.get('user_id')||'',visible=records.filter(row=>users.includes(row.user_id));if(url.searchParams.get('select')==='report_date')return json(visible.slice(0,1));const offset=Number(url.searchParams.get('offset')||0),limit=Number(url.searchParams.get('limit')||1000);return json(visible.slice(offset,offset+limit));}
  throw Error('Unexpected '+url.pathname);
 };
 try{const {default:handler}=await import('../api/daily-reports.js');const invoke=async(query,auth=true)=>{const res={setHeader(){},status(code){this.code=code;return this},json(value){this.body=value;return this}};await handler({method:'GET',query,headers:auth?{authorization:'Bearer test'}:{}},res);return res};
  assert.equal((await invoke({from,to:today},false)).code,401);
  const own=await invoke({from,to:today,user_id:'b'});assert.equal(own.code,200);assert.deepEqual(own.body.profiles.map(p=>p.id),['a']);assert.equal(own.body.reports.length,1);assert.equal(own.body.trackingStart,from);assert.ok(queries.some(url=>url.searchParams.get('limit')==='1000'));assert.ok(queries.some(url=>url.searchParams.getAll('report_date').length===2));
  caller=profiles[2];const lead=await invoke({from,to:today});assert.deepEqual(lead.body.profiles.map(p=>p.id),['a','l']);assert.equal(lead.body.reports.length,1);
  caller=profiles[3];const manager=await invoke({from,to:today});assert.deepEqual(manager.body.profiles.map(p=>p.id),['a','b','l']);assert.equal(manager.body.reports.length,2);
  for(const query of [{from:'2026-02-30',to:today},{from:today,to:from},{from},{from:shiftDay(today,-62),to:today},{from,to:shiftDay(today,1)}])assert.equal((await invoke(query)).code,400);
  profiles.push(...Array.from({length:14},(_,i)=>({id:'extra'+i,role:'staff',acc:'TEST'+i,created_at:'2020-01-01T00:00:00Z'})));
  records.splice(0,records.length,...profiles.filter(p=>p.role!=='manager').flatMap(p=>Array.from({length:62},(_,i)=>({user_id:p.id,report_date:shiftDay(today,i-61),status:'submitted',data:{actual:1}}))));queries=[];
  const paginated=await invoke({from:shiftDay(today,-61),to:today});assert.equal(paginated.code,200);assert.equal(paginated.body.reports.length,1054);assert.ok(queries.some(url=>url.searchParams.get('offset')==='1000'));
 }finally{globalThis.fetch=oldFetch;delete process.env.SUPABASE_URL;delete process.env.SUPABASE_SERVICE_ROLE_KEY;}
});
