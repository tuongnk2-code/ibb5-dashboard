import test from 'node:test';
import assert from 'node:assert/strict';
import {createRegulationsHandler} from '../api/_regulations.js';
const response=()=>({headers:{},setHeader(k,v){this.headers[k]=v;},status(s){this.code=s;return this;},json(p){this.payload=p;return this;}});
test('regulations rejects unauthenticated callers without reading content',async()=>{
 const res=response();await createRegulationsHandler(async()=>({status:401,error:'Login required'}))({method:'GET'},res);assert.equal(res.code,401);assert.equal(res.headers['Cache-Control'],'no-store');assert.equal(res.payload.document,undefined);
});
test('regulations reads only the configured document for a valid profile',async()=>{
 for(const role of ['manager','lead','staff']){
  const calls=[],document={code:'test',sections:[]},chain={select(){return this;},eq(k,v){calls.push([k,v]);return this;},async maybeSingle(){return {data:{data:document}};}};
  const handler=createRegulationsHandler(async()=>({caller:{role},admin:{from(name){assert.equal(name,'dashboard_shared_state');return chain;}}}));
  const res=response();await handler({method:'GET',query:{key:'snapshot'}},res);assert.equal(res.code,200);assert.deepEqual(res.payload.document,document);assert.deepEqual(calls,[['key','qms:2-SEL.0.0.1-QT/KD/HDCV/FTEL']]);
  const post=response();await handler({method:'POST'},post);assert.equal(post.code,405);
 }
});
test('missing or failed document never returns partial data',async()=>{
 for(const result of [{data:null},{error:Error('db unavailable')}]){
  const chain={select(){return this;},eq(){return this;},async maybeSingle(){return result;}};
  const res=response();await createRegulationsHandler(async()=>({admin:{from(){return chain;}}}))({method:'GET'},res);assert.equal(res.code,result.error?500:404);assert.equal(res.payload.document,undefined);
 }
});
