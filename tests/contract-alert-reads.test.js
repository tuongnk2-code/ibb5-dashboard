import test from 'node:test';
import assert from 'node:assert/strict';
import {contractAlerts} from '../js/contractAlertModel.js';
import {contractAlertSignatures,unreadContractAlerts,mergeContractAlertReads} from '../js/contractAlertReadModel.js';
import {phoneAlertState,phonePushDecision,viewedContractHistory} from '../js/phonePushModel.js';
const now=Date.parse('2026-11-21T09:00:00+07:00'),day='2026-11-21',rows=[{id:'A',staff:'DNG.ManLM3',type:'Internet',created:'2026-11-01',date:''}],notes={A:{result:'Chưa Online',expected:'2026-11-20',timeSlot:'8h - 10h',action:'Chờ lắp',source:'Web',updated:'2026-11-17T08:00:00+07:00'}};
const alerts=(n=notes,time=now)=>contractAlerts({rows,notes:n,now:time,asOf:new Date(time).toISOString().slice(0,10),canView:()=>true});
test('viewing a contract hides it across all warning groups and future days; new information can alert again',()=>{
 const raw=alerts(),signature=contractAlertSignatures(raw,notes).A,reads={A:signature};assert.equal(raw.total,1);assert.equal(unreadContractAlerts(raw,notes,reads).total,0);
 const tomorrow=alerts(notes,now+86400000);assert.equal(unreadContractAlerts(tomorrow,notes,reads).total,0,'Do not re-notify unchanged alerts next day');
 const refreshed={A:{...notes.A,updated:'2026-11-21T08:30:00+07:00'}};assert.equal(unreadContractAlerts(alerts(refreshed),refreshed,reads).total,0,'Removing the stale condition must not resurrect already-viewed remaining conditions');
 const later=alerts(refreshed,now+4*86400000);assert.equal(unreadContractAlerts(later,refreshed,reads).total,1,'A new stale cycle is new information');
 const changed={A:{...notes.A,expected:'2026-11-19'}};assert.equal(unreadContractAlerts(alerts(changed),changed,reads).total,1);
 assert.equal(unreadContractAlerts(raw,notes,{A:'malformed'}).total,1);
});
test('read receipts merge by recency and suppress background daily repeats',()=>{
 const raw=alerts(),signature=contractAlertSignatures(raw,notes).A;
 const merged=mergeContractAlertReads([{contract_id:'A',signature:'old',viewed_at:'2026-11-20T08:00:00Z'}],[{contract_id:'A',signature,viewed_at:'2026-11-21T08:00:00Z'}]);assert.equal(merged.A.signature,signature);
 const state=phoneAlertState({id:'user',role:'staff',acc:'DNG.ManLM3'},{rows,notes},now,{A:signature});assert.equal(state.count,0);
 assert.equal(phonePushDecision({last_comment_at:'2026-11-01',last_alert_signature:'old',last_alert_day:'2026-11-20'},{alerts:state,now:now+86400000}),null);
});

test('viewed history stays recipient scoped, survives resolved alerts and respects current team visibility',()=>{
 const state={rows:[...rows,{id:'OTHER',type:'Internet',staff:'DNG.Vypv',date:''},{id:'REMOVED_TEAM',type:'Internet',staff:'DNG.Hoantt',date:''}],notes};const reads=[{contract_id:'A',signature:contractAlertSignatures(alerts(),notes).A,viewed_at:'2026-11-21T09:00:00Z'},{contract_id:'OTHER',signature:'{}',viewed_at:'2026-11-21T10:00:00Z'},{contract_id:'REMOVED_TEAM',signature:'{}',viewed_at:'2026-11-21T11:00:00Z'},{contract_id:'MISSING',signature:'{}',viewed_at:'2026-11-21T12:00:00Z'}];
 assert.deepEqual(viewedContractHistory({id:'staff',role:'staff',acc:'DNG.ManLM3'},state,reads).map(r=>r.contract_id),['A']);assert.deepEqual(viewedContractHistory({id:'lead',role:'lead',acc:'DNG.HoaNTB6'},state,reads).map(r=>r.contract_id),['A']);state.rows[0]={...state.rows[0],date:'2026-11-21'};assert.equal(viewedContractHistory({id:'staff',role:'staff',acc:'DNG.ManLM3'},state,reads).length,1);assert.equal(viewedContractHistory({id:'manager',role:'manager'},state,reads).length,3);
});
