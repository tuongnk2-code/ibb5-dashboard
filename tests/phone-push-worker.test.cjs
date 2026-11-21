const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
test('background push shows a visible notification and app badge; tap focuses the app or opens the inbox',async()=>{
 const handlers={},notifications=[],messages=[],opened=[];let badge=-1,focused=0,clients=[{url:'https://ibb5.test/#performance',focus:async()=>{focused++},postMessage:value=>messages.push(value)}];
 let closed=0;const self={location:{origin:'https://ibb5.test'},addEventListener:(name,handler)=>handlers[name]=handler,registration:{showNotification:async(title,options)=>notifications.push({title,options}),getNotifications:async()=>[{close:()=>closed++}]},navigator:{setAppBadge:async n=>badge=n,clearAppBadge:async()=>badge=0},clients:{matchAll:async()=>clients,openWindow:async path=>opened.push(path)}};
 vm.runInNewContext(fs.readFileSync('public/sw.js','utf8'),{self,URL,Date,Response,Request});let pending;
 handlers.push({data:{json:()=>({title:'IBB5',body:'Có phản hồi mới',badge:4,kind:'test',url:'https://evil.test'})},waitUntil:p=>pending=p});await pending;assert.equal(notifications.length,1);assert.equal(badge,4);assert.equal(notifications[0].options.tag,'ibb5-phone-summary');assert.equal(messages[0].kind,'test');
 handlers.notificationclick({notification:{close(){}},waitUntil:p=>pending=p});await pending;assert.equal(focused,1);assert.equal(messages.at(-1).type,'IBB5_OPEN_NOTIFICATIONS');
 clients=[];handlers.notificationclick({notification:{close(){}},waitUntil:p=>pending=p});await pending;assert.deepEqual(opened,['/?inbox=1']);
 handlers.push({data:{json:()=>{throw Error('bad payload')}},waitUntil:p=>pending=p});await pending;assert.equal(badge,0);assert.equal(notifications.length,2);
 handlers.message({data:{type:'IBB5_SYNC_BADGE',count:7},source:{url:'https://ibb5.test/#overview'},waitUntil:p=>pending=p});await pending;assert.equal(badge,7);
 handlers.message({data:{type:'IBB5_SYNC_BADGE',count:0},source:{url:'https://ibb5.test/#overview'},waitUntil:p=>pending=p});await pending;assert.equal(badge,0);assert.equal(closed,1);
});
