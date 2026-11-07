import test from 'node:test';
import assert from 'node:assert/strict';
import { reportDay } from '../js/dailyReportModel.js';

test('salary API scopes counts/settings, only TP can update probation, revisions and months stay independent', async () => {
  const oldFetch=globalThis.fetch;process.env.SUPABASE_URL='https://supabase.test';process.env.SUPABASE_SERVICE_ROLE_KEY='test-only';
  const today=reportDay(),month=today.slice(0,7),settings=new Map();
  let caller={id:'manager',role:'manager',full_name:'TP'},snapshot={data:{data:[...Array.from({length:46},(_,i)=>({type:'Internet',id:'N'+i,staff:'DNG.HoaNTB6',created:month+'-01',date:month+'-01'})),...Array.from({length:6},(_,i)=>({type:'Truyền hình',id:'T'+i,staff:'DNG.HoaNTB6',created:month+'-01',date:month+'-01',vvip:true}))]},updated_at:new Date().toISOString()};
  globalThis.fetch=async(input,init={})=>{
    const url=new URL(input instanceof Request?input.url:input),method=init.method||'GET',json=data=>new Response(JSON.stringify(data),{headers:{'Content-Type':'application/json'}});
    if(url.pathname==='/auth/v1/user')return json({id:caller.id});
    if(url.pathname==='/rest/v1/profiles')return json(caller);
    if(url.pathname==='/rest/v1/dashboard_shared_state')return json(snapshot);
    if(url.pathname==='/rest/v1/salary_settings'){
      const m=url.searchParams.get('month')?.slice(3),a=url.searchParams.get('acc');
      if(method==='GET')return json(a?.startsWith('in.')?[...settings.values()].filter(s=>s.month===m&&a.slice(4,-1).split(',').includes(s.acc)):settings.get(m+':'+a?.slice(3))||null);
      const record=JSON.parse(init.body),key=record.month+':'+record.acc,old=settings.get(key);
      if(method==='PATCH'&&String(old?.revision)!==url.searchParams.get('revision')?.slice(3))return json(null);
      settings.set(key,record);return json(record);
    }
    throw Error('Unexpected '+url.pathname);
  };
  try{
    const {default:handler}=await import('../api/salary.js');
    const invoke=async(method,body={},auth=true,query={month})=>{const res={setHeader(){},status(n){this.code=n;return this},json(v){this.body=v;return this}};await handler({method,query,body:{month,...body},headers:auth?{authorization:'Bearer test'}:{}},res);return res};
    assert.equal((await invoke('GET',{},false)).code,401);
    const list=await invoke('GET');assert.equal(list.code,200);assert.equal(list.body.rows.length,17);const hoa=list.body.rows.find(r=>r.acc==='DNG.HoaNTB6');assert.equal(hoa.net,46);assert.equal(hoa.vvip,6);assert.equal(hoa.salary,7800000);
    assert.equal((await invoke('POST',{acc:hoa.acc,probation:true,revision:0})).code,200);
    assert.equal((await invoke('GET')).body.rows.find(r=>r.acc===hoa.acc).salary,4500000);
    assert.equal((await invoke('POST',{acc:hoa.acc,probation:false,revision:0})).code,409);
    assert.equal((await invoke('POST',{acc:hoa.acc,probation:false,revision:1})).code,200);
    assert.equal((await invoke('GET')).body.rows.find(r=>r.acc===hoa.acc).salary,7800000);
    const previous=new Date(month+'-01T12:00:00Z');previous.setUTCMonth(previous.getUTCMonth()-1);const priorMonth=previous.toISOString().slice(0,7);
    assert.equal((await invoke('POST',{month:priorMonth,acc:hoa.acc,probation:true,revision:0})).code,200);
    assert.equal((await invoke('GET')).body.rows.find(r=>r.acc===hoa.acc).probation,false);
    assert.equal((await invoke('GET',{},true,{month:priorMonth})).body.rows.find(r=>r.acc===hoa.acc).probation,true);
    caller={id:'lead',role:'lead',acc:'DNG.HoaNTB6'};const team=(await invoke('GET')).body.rows;assert.ok(team.every(r=>r.team===3));assert.equal(team.length,8);
    assert.equal((await invoke('POST',{acc:hoa.acc,probation:true,revision:2})).code,403);
    caller={id:'staff',role:'staff',acc:'DNG.HoaNTB6'};assert.deepEqual((await invoke('GET')).body.rows.map(r=>r.acc),[hoa.acc]);
    assert.equal((await invoke('POST',{acc:hoa.acc,probation:true,revision:2})).code,403);
    assert.equal((await invoke('GET',{},true,{month:'2999-01'})).code,400);
    caller={id:'manager',role:'manager'};assert.equal((await invoke('POST',{acc:'UNKNOWN',probation:true,revision:0})).code,400);
    snapshot=null;assert.equal((await invoke('GET')).code,503);
  }finally{globalThis.fetch=oldFetch;delete process.env.SUPABASE_URL;delete process.env.SUPABASE_SERVICE_ROLE_KEY}
});
