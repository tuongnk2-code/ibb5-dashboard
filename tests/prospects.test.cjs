const test=require('node:test'),assert=require('node:assert/strict'),{fixture}=require('./prospects-fixture.cjs');
test('KHTN is restricted to exact members; claims are exclusive and handlers cannot edit another owner',async()=>{
 const {ids,tables,request}=await fixture();
 assert.equal((await request(null)).status,401);assert.equal((await request(ids.other,'GET',null,{access:'1'})).body.allowed,false);assert.equal((await request(ids.other)).status,403);
 const input={action:'create',id:'55555555-5555-4555-8555-555555555555',name:'Khách thử',phone:'+84 990 000 001',source:'Nguồn phòng',need:'Internet',address:'Đà Nẵng',description:'Đầu mối mới'};
 const created=await request(ids.manager,'POST',input);assert.equal(created.status,200);assert.equal(created.body.lead.phone,'0990000001');assert.equal(created.body.lead.stage,'new');assert.equal((await request(ids.manager,'POST',{...input,id:'66666666-6666-4666-8666-666666666666'})).status,409);
 const id=input.id;assert.equal((await request(ids.dat,'POST',{action:'claim',id,revision:1})).status,200);assert.equal((await request(ids.hoa,'POST',{action:'claim',id,revision:1})).status,409);
 assert.equal((await request(ids.hoa,'POST',{action:'update',id,revision:2,stage:'contacted',note:'Unauthorized'})).status,403);
 assert.equal((await request(ids.dat,'POST',{action:'assign',id,revision:2,assignee_id:ids.hoa})).status,403);
 assert.equal((await request(ids.dat,'POST',{action:'update',id,revision:2,stage:'appointment',note:'Hẹn lại'})).status,400);
 const saved=await request(ids.dat,'POST',{action:'update',id,revision:2,stage:'appointment',note:'KH hẹn gọi lại',next_followup_at:'2026-11-25T09:00:00+07:00'});assert.equal(saved.status,200);assert.equal(tables.prospect_history.length,3);
 assert.equal((await request(ids.manager,'POST',{action:'assign',id,revision:2,assignee_id:ids.hoa})).status,409);
 assert.equal((await request(ids.other,'GET',null,{id})).status,403);assert.equal((await request(ids.hoa,'GET',null,{id})).body.history.length,3);
 tables.prospect_members[1].active=false;assert.equal((await request(ids.dat)).status,403);
});
test('phones, followups, closing and summary stats use actual stored states',async()=>{
 const {cleanProspect,cleanProspectUpdate,prospectStats}=await import('../js/prospectModel.js');const input={name:'A',phone:'0990000001',source:'',need:'',address:'',description:''};
 assert.equal(cleanProspect({...input,phone:'84990000001'}).phone,input.phone);assert.throws(()=>cleanProspect({...input,phone:'123'}));assert.throws(()=>cleanProspectUpdate({stage:'hack',note:'x'}));assert.throws(()=>cleanProspectUpdate({stage:'appointment',note:'x'}));
 assert.equal(cleanProspectUpdate({stage:'won',note:'Đã chốt',next_followup_at:'2026-11-25T09:00Z'}).next_followup_at,null);
 assert.deepEqual(prospectStats([{stage:'new'},{stage:'received',next_followup_at:'2026-11-22T09:00Z'},{stage:'won',next_followup_at:'2026-11-22T09:00Z'}],Date.parse('2026-11-23T00:00Z')),{total:3,new:1,working:1,due:1,won:1});
});
