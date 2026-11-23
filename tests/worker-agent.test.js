import test from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { mkdtempSync,writeFileSync,readFileSync,existsSync,rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join,resolve } from 'node:path';
import { spawn } from 'node:child_process';

test('local runner executes a fixed adapter once and retries only its acknowledgement after a lost response',async()=>{
 const folder=mkdtempSync(join(tmpdir(),'ibb5-worker-test-')),counter=join(folder,'counter.txt'),configPath=join(folder,'ibb5-worker.local.json');
 const adapter=join(folder,'adapter.mjs'),agent=resolve('public/digital-worker/worker-agent.mjs');
 writeFileSync(adapter,`import{writeFileSync}from'node:fs';let text='';for await(const chunk of process.stdin)text+=chunk;const task=JSON.parse(text);if(task.config.content!=='Reviewed task')process.exit(3);writeFileSync(${JSON.stringify(counter)},'once');console.log(JSON.stringify({status:'succeeded',summary:'Adapter confirmed test only'}));`);
 let claimed=false,completions=0,confirmed=false,child;
 const run={id:'00000000-0000-0000-0000-000000000020',task_snapshot:{name:'Local test',channel:'other',config:{content:'Reviewed task'}}};
 const server=createServer(async(req,res)=>{let raw='';for await(const chunk of req)raw+=chunk;const body=JSON.parse(raw);assert.equal(req.headers.authorization,'Bearer dw_'+'A'.repeat(43));let result={run:null,active:null};
  if(body.action==='poll'&&!claimed){claimed=true;result.run=run;}
  if(body.action==='complete'){completions++;assert.equal(body.status,'succeeded');if(completions===1){req.socket.destroy();return;}confirmed=true;result={run:{...run,status:'succeeded'}};}
  res.setHeader('Content-Type','application/json');res.end(JSON.stringify(result));
 });
 await new Promise(r=>server.listen(0,'127.0.0.1',r));
 writeFileSync(configPath,JSON.stringify({server:'http://127.0.0.1:'+server.address().port,token:'dw_'+'A'.repeat(43),pollSeconds:15,handlers:{other:{command:process.execPath,args:[adapter],timeoutSeconds:10}}}));
 const wait=async predicate=>{const end=Date.now()+15000;while(!predicate()){if(Date.now()>end)throw Error('Runner timeout');await new Promise(r=>setTimeout(r,50));}};
 const start=()=>spawn(process.execPath,[agent,configPath],{windowsHide:true,stdio:'ignore'});
 const stop=async()=>{if(!child||child.exitCode!==null)return;const old=child;old.kill('SIGKILL');await new Promise(r=>old.once('exit',r));};
 try{
  child=start();await wait(()=>completions===1);assert.equal(readFileSync(counter,'utf8'),'once');
  await stop();assert.equal(JSON.parse(readFileSync(configPath+'.journal','utf8')).outcome.status,'succeeded');
  child=start();await wait(()=>confirmed);await wait(()=>readFileSync(configPath+'.journal','utf8')==='null');
  assert.equal(completions,2);assert.equal(readFileSync(counter,'utf8'),'once');assert.equal(claimed,true);
 }finally{await stop();await new Promise(r=>server.close(r));assert.ok(folder.startsWith(join(tmpdir(),'ibb5-worker-test-')));rmSync(folder,{recursive:true,force:true});}
});

test('workflow passes output locally in order, stops on failure, and never uploads intermediate data',async()=>{
 for(const failFirst of [false,true]){
  const folder=mkdtempSync(join(tmpdir(),'ibb5-worker-test-')),log=join(folder,'steps.txt'),configPath=join(folder,'ibb5-worker.local.json'),adapter=join(folder,'steps.mjs');
  writeFileSync(adapter,`import{appendFileSync}from'node:fs';let raw='';for await(const c of process.stdin)raw+=c;const task=JSON.parse(raw);const first=task.channel==='meta_facebook';if(!first&&task.previous?.marker!=='PRIVATE_LOCAL')process.exit(4);appendFileSync(${JSON.stringify(log)},first?'A':'B');console.log(JSON.stringify({status:first&&${failFirst}?'failed':'succeeded',summary:first?'Scan confirmed':'Prepared confirmed',output:{marker:'PRIVATE_LOCAL'}}));`);
  let claimed=false,completion=null,child;
  const run={id:'00000000-0000-0000-0000-000000000021',task_snapshot:{name:'Workflow',channel:'other',config:{steps:[{name:'Scan',channel:'meta_facebook',content:'Read allowed source'},{name:'Prepare',channel:'top_zalo',content:'Prepare only'}]}}};
  const server=createServer(async(req,res)=>{let raw='';for await(const c of req)raw+=c;const body=JSON.parse(raw);let result={run:null,active:null};if(body.action==='poll'&&!claimed){assert.ok(body.capabilities.includes('workflow_v1'));claimed=true;result.run=run;}if(body.action==='complete'){completion=body;result={run:{status:body.status}};}res.setHeader('Content-Type','application/json');res.end(JSON.stringify(result));});
  await new Promise(r=>server.listen(0,'127.0.0.1',r));
  writeFileSync(configPath,JSON.stringify({server:'http://127.0.0.1:'+server.address().port,token:'dw_'+'A'.repeat(43),pollSeconds:15,handlers:{meta_facebook:{command:process.execPath,args:[adapter]},top_zalo:{command:process.execPath,args:[adapter]}}}));
  try{child=spawn(process.execPath,[resolve('public/digital-worker/worker-agent.mjs'),configPath],{windowsHide:true,stdio:'ignore'});const end=Date.now()+15000;while(!completion){if(Date.now()>end)throw Error('Workflow timeout');await new Promise(r=>setTimeout(r,50));}assert.equal(readFileSync(log,'utf8'),failFirst?'A':'AB');assert.equal(completion.status,failFirst?'failed':'succeeded');assert.equal(JSON.stringify(completion).includes('PRIVATE_LOCAL'),false);}
  finally{if(child&&child.exitCode===null){child.kill('SIGKILL');await new Promise(r=>child.once('exit',r));}await new Promise(r=>server.close(r));assert.ok(folder.startsWith(join(tmpdir(),'ibb5-worker-test-')));rmSync(folder,{recursive:true,force:true});}
 }
});
