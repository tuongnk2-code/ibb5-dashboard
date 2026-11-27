import test from 'node:test';
import assert from 'node:assert/strict';
import { validateChannelDocument, matchesDocumentHeader, CHANNEL_FILE_LIMIT } from '../js/channelDocumentModel.js';
import { handleChannelDocuments } from '../api/_channelDocuments.js';

const body = { title:'Tài liệu test',channel:'Facebook',fileName:'tài liệu.pdf',size:100 };
test('upload validates formats, names, size and file signatures', () => {
  assert.equal(validateChannelDocument(body).mime,'application/pdf');
  for(const value of [{size:0},{size:CHANNEL_FILE_LIMIT+1},{fileName:'a.html'},{fileName:'../a.pdf'},{channel:'bad'},{title:''}]) assert.throws(()=>validateChannelDocument({...body,...value}));
  assert.equal(matchesDocumentHeader('pdf',Array.from(Buffer.from('%PDF-1.7'))),true);
  assert.equal(matchesDocumentHeader('pdf',Array.from(Buffer.from('<script>'))),false);
  assert.equal(matchesDocumentHeader('docx',[80,75,3,4]),true);
});
test('private library uploads are scoped to authenticated owner, published only after validation, shared with read-only CTV',async()=>{
  const records=new Map(),uploads=[],signed=[];let infoSize=100,header='%PDF-1.7',failStorage=false;
  const admin={from(){let operation='read',value,key,revision,like=false;
    const chain={select(){return this;},eq(field,v){if(field==='key')key=v;if(field==='revision')revision=v;return this;},like(){like=true;return this;},order(){return this;},range(){return this;},maybeSingle(){return this;},insert(v){operation='insert';value=v;return this;},update(v){operation='update';value=v;return this;},then(resolve){let data;if(operation==='read')data=like?[...records.values()]:records.get(key)||null;else if(operation==='update'&&records.get(key)?.revision!==revision)data=null;else{data=operation==='insert'?value:{...records.get(key),...value};records.set(data.key,data);}return Promise.resolve({data,error:null}).then(resolve);}};return chain;},storage:{from(bucket){assert.equal(bucket,'sales-channel-documents');return {async createSignedUploadUrl(path,options){assert.equal(options.upsert,false);uploads.push(path);return {data:{token:'upload-token'},error:failStorage?Error('Storage unavailable'):null};},async info(){return {data:{size:infoSize}};},async createSignedUrl(path,expiry,options){signed.push({path,expiry,options});return {data:{signedUrl:'https://storage.test/signed.pdf'}};}};}}};
  const originalFetch=globalThis.fetch;globalThis.fetch=async()=>new Response(header);
  const caller={id:'owner',role:'staff',acc:'DNG.ManLM3'};
  const invoke=async(method,input={},profile=caller,query={})=>{const res={status(code){this.code=code;return this;},json(body){this.body=body;return this;}};await handleChannelDocuments({method,body:input,query},res,{admin,caller:profile});return res;};
  try{
    assert.equal((await invoke('POST',{action:'prepare',...body},{id:'ctv',role:'ctv'})).code,403);
    for(const role of ['manager','lead','staff'])assert.equal((await invoke('POST',{action:'prepare',...body},{...caller,role})).code,200);
    const prepare=await invoke('POST',{action:'prepare',...body});assert.equal(prepare.code,200);const id=prepare.body.id;assert.ok(uploads.at(-1).startsWith('owner/'+id+'/'));assert.equal(prepare.body.token,'upload-token');
    assert.deepEqual((await invoke('GET')).body.documents,[]);
    assert.equal((await invoke('POST',{action:'complete',id},{id:'other',role:'manager'})).code,403);
    assert.equal((await invoke('GET',{},caller,{id})).code,404);
    infoSize=101;assert.equal((await invoke('POST',{action:'complete',id})).code,400);
    infoSize=100;header='<html>invalid';assert.equal((await invoke('POST',{action:'complete',id})).code,400);assert.deepEqual((await invoke('GET')).body.documents,[]);
    header='%PDF-1.7';assert.equal((await invoke('POST',{action:'complete',id})).code,200);assert.equal((await invoke('POST',{action:'complete',id})).code,200);
    const view=await invoke('GET',{}, {id:'ctv',role:'ctv'});assert.equal(view.body.documents.length,1);assert.equal(view.body.canUpload,false);assert.equal(view.body.documents[0].uploadedBy,caller.acc);assert.equal(view.body.documents[0].path,undefined);
    assert.equal((await invoke('GET',{},caller,{id,download:'1'})).code,200);assert.equal(signed.at(-1).options.download,body.fileName);
    assert.equal((await invoke('GET',{},caller,{id:'../../secret'})).code,400);
  }finally{globalThis.fetch=originalFetch;}
});
