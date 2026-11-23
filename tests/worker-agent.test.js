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
