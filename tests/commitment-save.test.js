import test from 'node:test';
import assert from 'node:assert/strict';
import { commitmentTarget, scopeCommitmentRow } from '../js/dashboardStateModel.js';

test('commitment views use manager / team / own permissions without mutating shared data', () => {
  const row={key:'commit:2026-11:__ALL__',revision:10,data:{manager:{value:450,status:'signed'},staff:{
    'DNG.Vypv':{value:45,status:'approved'},'DNG.ChuongHM':{value:30,status:'pending'},
    'DNG.ManLM3':{value:40,status:'approved'},'DNG.HoaNTB6':{value:45,status:'approved'},
  }}};
  assert.equal(scopeCommitmentRow(row,{role:'manager'}),row);
  assert.deepEqual(Object.keys(scopeCommitmentRow(row,{id:'lead',role:'lead',acc:'DNG.HoaNTB6'}).data.staff),['DNG.ManLM3','DNG.HoaNTB6']);
  assert.deepEqual(Object.keys(scopeCommitmentRow(row,{id:'staff',role:'staff',acc:'dng.manlm3'}).data.staff),['DNG.ManLM3']);
  assert.deepEqual(scopeCommitmentRow(row,{id:'unknown',role:'staff'}).data.staff,{});
  assert.equal(Object.keys(row.data.staff).length,4);
  assert.deepEqual(commitmentTarget(row.data,'submit','DNG.ManLM3'),{value:40,status:'approved',plan:'',submittedAt:null,reviewedAt:null});
  assert.equal(commitmentTarget(row.data,'submit','MISSING'),null);
});

test('atomic commit API checks ownership, routes target guards and scopes all responses', async () => {
  process.env.SUPABASE_URL='https://commit.test';process.env.SUPABASE_SERVICE_ROLE_KEY='test-only';
  let caller={id:'00000000-0000-0000-0000-000000000001',role:'staff',acc:'DNG.ManLM3'},calls=0;
  const row={key:'commit:2026-11:__ALL__',revision:3,data:{manager:null,staff:{'DNG.ManLM3':{value:40,status:'pending'},'DNG.Vypv':{value:45,status:'approved'}}}};
  const savedFetch=globalThis.fetch;
  globalThis.fetch=async(input,init={})=>{
    const url=new URL(input instanceof Request?input.url:input),json=value=>new Response(JSON.stringify(value),{headers:{'Content-Type':'application/json'}});
    if(url.pathname==='/auth/v1/user')return json({id:caller.id});
    if(url.pathname==='/rest/v1/profiles')return json(caller);
    if(url.pathname==='/rest/v1/dashboard_shared_state')return json([row]);
    assert.equal(url.pathname,'/rest/v1/rpc/save_dashboard_commitment');calls++;
    const body=JSON.parse(init.body);assert.equal(body.p_actor,caller.id);assert.equal(body.p_key,row.key);
    if(JSON.stringify(body.p_expected)!==JSON.stringify(commitmentTarget(row.data,body.p_action,body.p_acc)))return json({conflict:true,row});
    row.data.staff[body.p_acc]={value:body.p_value,plan:body.p_plan,status:'pending'};row.revision++;return json({row});
  };
  try{
    const {default:handler}=await import('../api/dashboard-sync.js');
    const invoke=async(body,method='POST',query={})=>{const res={setHeader(){},status(code){this.code=code;return this;},json(data){this.body=data;return this;}};await handler({method,body,query,headers:{authorization:'Bearer test'}},res);return res;};
    const payload={kind:'commit',month:'2026-11',action:'submit',acc:'DNG.ManLM3',value:42,plan:'Plan',revision:0,expectedTarget:commitmentTarget(row.data,'submit','DNG.ManLM3')};
    assert.equal((await invoke({...payload,acc:'DNG.Vypv'})).code,403);assert.equal(calls,0);
    assert.equal((await invoke({...payload,action:'approve'})).code,403);
    const result=await invoke(payload);assert.equal(result.code,200);assert.equal(result.body.row.data.staff['DNG.ManLM3'].value,42);assert.equal(result.body.row.data.staff['DNG.Vypv'],undefined);
    const conflict=await invoke(payload);assert.equal(conflict.code,409);assert.equal(conflict.body.row.data.staff['DNG.Vypv'],undefined);
    const initial=await invoke(null,'GET');assert.deepEqual(Object.keys(initial.body.commitments['2026-11'].__ALL__.staff),['DNG.ManLM3']);
    const keys=await invoke(null,'GET',{keys:JSON.stringify([row.key])});assert.equal(keys.body.rows[0].data.staff['DNG.Vypv'],undefined);
    caller={...caller,role:'manager'};assert.equal((await invoke(null,'GET')).body.commitments['2026-11'].__ALL__.staff['DNG.Vypv'].value,45);
  }finally{globalThis.fetch=savedFetch;}
});
