import test from 'node:test';
import assert from 'node:assert/strict';
import {performanceContractRows} from '../js/performanceContractDetails.js';
test('performance details match current/previous periods, pending and over-seven-day counts',()=>{
 const selection={accs:['DNG.A'],asOf:'2026-11-10',start:'2026-11-01',previousCut:'2026-10-10',previousMonth:'2026-10',room:'IBB5'};
 const row=(id,created,date,staff='DNG.A')=>({id,type:'Internet',room:'IBB5',staff,created,date});
 const data=[row('SOLD','2026-11-10',''),row('BOTH','2026-11-02','2026-11-08'),row('OLD','2026-10-01',''),row('SEVEN','2026-11-03',''),row('PREV','2026-10-01','2026-10-10'),row('LATEPREV','2026-10-01','2026-10-11'),row('FUTURE','2026-11-11',''),row('OTHER','2026-11-01','','DNG.B')];data.push({...data[0]});
 const ids=kind=>performanceContractRows(data,{...selection,kind}).map(r=>r.id);
 assert.deepEqual(ids('sold'),['SOLD','BOTH','SEVEN']);assert.deepEqual(ids('online'),['BOTH']);assert.deepEqual(ids('previous'),['PREV']);
 assert.deepEqual(ids('pending'),['SOLD','OLD','SEVEN']);assert.deepEqual(ids('aged'),['OLD']);
 assert.equal(performanceContractRows(data,{...selection,kind:'sold',accs:['DNG.A','DNG.B']}).length,4);
 assert.deepEqual(performanceContractRows(data,{...selection,kind:'sold',room:'OTHER'}),[]);
});
