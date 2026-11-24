const test=require('node:test'),assert=require('node:assert/strict'),{fixture}=require('./daily-commitments-fixture.cjs');
test('daily commitment read scope cannot be widened with request parameters or forged team fields',async()=>{
 const {ids,profiles,tables,request}=await fixture(),date='2026-11-24';
 for(const acc of ['DNG.Vypv','DNG.Hoantt','DNG.Nhannt137','DNG.Namnh170','DNG.HoaNTB6'])assert.equal((await request(ids.manager,'POST',{date,acc,sold:3,online:2,revision:0})).status,200);
 profiles.find(p=>p.id===ids.staff).team=2;
 const own=await request(ids.staff,'GET',null,{date,team:2,acc:'DNG.Namnh170'});assert.equal(own.status,200);assert.deepEqual(own.body.targets.map(t=>t.acc),['DNG.Vypv']);assert.deepEqual(Object.keys(own.body.actuals),['DNG.Vypv']);
 for(const [id,team]of[[ids.staff2,2],[ids.lead,3]]){const result=(await request(id,'GET',null,{date,team:1})).body;const allowed=new Set(result.staff.map(p=>p.acc));assert.ok(result.staff.every(p=>p.team===team));assert.ok(result.targets.every(t=>allowed.has(t.acc)));assert.ok(Object.keys(result.actuals).every(acc=>allowed.has(acc)));assert.equal(result.canEdit,false);assert.equal((await request(id,'POST',{date,acc:'DNG.Vypv',sold:9,online:9,revision:1})).status,403);}
 profiles.find(p=>p.id===ids.unknown).role='staff';profiles.find(p=>p.id===ids.unknown).team=2;assert.equal((await request(ids.unknown,'GET',null,{date})).status,403);assert.equal((await request(null,'GET',null,{date})).status,401);
});
