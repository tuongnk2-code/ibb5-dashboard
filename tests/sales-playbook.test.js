import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { PLAYBOOK_CHAPTERS } from '../js/salesPlaybookData.js';
import { PLAYBOOK_DETAILS, readableSourceText } from '../js/salesPlaybookDetails.js';

test('all ten source chapters have complete explanatory content and traceable page ranges',()=>{
 const slides=JSON.parse(fs.readFileSync(new URL('../js/data/salesPlaybookSource.json',import.meta.url),'utf8'));
 assert.equal(slides.length,156);assert.equal(PLAYBOOK_CHAPTERS.length,10);
 const pages=[];
 for(const chapter of PLAYBOOK_CHAPTERS){
  const detail=PLAYBOOK_DETAILS[chapter.id];assert.equal(detail.actions.length,5);assert.equal(detail.questions.length,3);assert.equal(detail.branches.length,3);assert.equal(detail.completion.length,3);
  for(const [title,body] of detail.actions){assert.ok(title.length>10);assert.ok(body.length>80);}
  for(let slide=chapter.start;slide<=chapter.end;slide++)pages.push(slide);
 }
 assert.deepEqual(pages,Array.from({length:154},(_,i)=>i+3));
});
test('abbreviation expansion preserves names and does not reinterpret Camera HD',()=>{
 assert.equal(readableSourceText('NVKD hỏi KH về PHM và AP.','wifi'),'nhân viên kinh doanh hỏi khách hàng về phí hòa mạng và bộ phát Wi-Fi bổ sung.');
 assert.equal(readableSourceText('Hình ảnh HD, Khoa xem Camera.','camera'),'Hình ảnh HD, Khoa xem Camera.');
});
