import test from 'node:test';
import assert from 'node:assert/strict';
import { personalGrowth, encouragementMessage } from '../js/staffEncouragementModel.js';
import { shiftDay } from '../js/dailyReportModel.js';

const net=(id,staff,date)=>({id,type:'Internet',staff,date});
test('personal growth uses own distinct Online contracts and same-day previous-month cutoff',()=>{
 const rows=[net('A','DNG.Me','2026-11-05'),net('A','DNG.Me','2026-11-05'),net('B','DNG.Me','2026-11-20'),net('C','DNG.Me','2026-11-21'),net('D','DNG.Me','2026-10-05'),net('E','DNG.Me','2026-10-19'),net('F','DNG.Me','2026-10-21'),net('G','OTHER','2026-11-01')];
 assert.deepEqual(personalGrowth(rows,' dng.ME ','2026-11-20'),{day:'2026-11-20',current:2,previous:2,delta:0,previousCut:'2026-10-20',changeSinceYesterday:1});
 assert.equal(personalGrowth(rows,'DNG.Me','2026-11-19').delta,-1);
 assert.equal(personalGrowth(rows,'DNG.Me','2026-11-01').changeSinceYesterday,null);
 assert.equal(personalGrowth(rows,'','2026-11-20'),null);
 assert.equal(personalGrowth(rows,'DNG.Me','2026-02-30'),null);
});
test('February cutoffs clamp correctly and zero own baseline differs from missing source coverage',()=>{
 const rows=[net('A','DNG.Me','2024-02-29'),net('B','DNG.Me','2024-03-31')];
 assert.equal(personalGrowth(rows,'DNG.Me','2024-03-31').previousCut,'2024-02-29');
 assert.equal(personalGrowth(rows,'DNG.Me','2024-03-31').delta,0);
 const missing=personalGrowth([net('A','DNG.Me','2026-11-01')],'DNG.Me','2026-11-20');
 assert.equal(missing.previous,null);assert.equal(encouragementMessage('DNG.Me',missing).kind,'unavailable');
 const zero=personalGrowth([net('A','DNG.Me','2026-11-01'),net('B','OTHER','2026-10-01')],'DNG.Me','2026-11-20');
 assert.equal(zero.delta,1);assert.equal(encouragementMessage('DNG.Me',zero).kind,'positive');
});
test('persistent negative growth receives different daily messages, deterministically across devices',()=>{
 const messages=new Set(),titles=new Set();
 for(let n=0;n<400;n++){
  const growth={day:shiftDay('2026-11-20',n),delta:-4,changeSinceYesterday:0},message=encouragementMessage('DNG.Me',growth);
  assert.equal(message.kind,'negative');assert.deepEqual(encouragementMessage('dng.me',growth),message);
  messages.add(JSON.stringify([message.title,message.body]));if(n<16)titles.add(message.title.join(' '));
 }
 assert.equal(messages.size,400);assert.equal(titles.size,16);
 const sameDay={day:'2026-11-20',delta:-4,changeSinceYesterday:2};
 assert.match(encouragementMessage('DNG.Me',sameDay).body,/thu hẹp 2 HĐ/);
 assert.notEqual(encouragementMessage('DNG.Me',sameDay).id,encouragementMessage('DNG.Other',sameDay).id);
 assert.equal(encouragementMessage('DNG.Me',{...sameDay,delta:0}).kind,'neutral');
 assert.equal(encouragementMessage('DNG.Me',{...sameDay,delta:4}).kind,'positive');
});
