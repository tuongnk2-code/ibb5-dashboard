// Cache only a public connection-help page. Reports, sessions, APIs and application code remain network-only.
const CACHE='ibb5-offline-v1',OFFLINE='/offline.html';
self.addEventListener('install',event=>{event.waitUntil(caches.open(CACHE).then(cache=>cache.add(new Request(OFFLINE,{cache:'reload'}))).then(()=>self.skipWaiting()));});
self.addEventListener('activate',event=>{event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(key=>key.startsWith('ibb5-offline-')&&key!==CACHE).map(key=>caches.delete(key)))).then(()=>self.clients.claim()));});
self.addEventListener('fetch',event=>{
 const request=event.request,url=new URL(request.url);
 if(request.method!=='GET'||request.mode!=='navigate'||url.origin!==self.location.origin||url.pathname.startsWith('/api/'))return;
 event.respondWith(fetch(request).catch(async()=>await caches.match(OFFLINE)||new Response('IBB5: Chưa có kết nối mạng.',{status:503,headers:{'Content-Type':'text/plain; charset=utf-8'}})));
});
self.addEventListener('push',event=>{
 event.waitUntil((async()=>{
  let data={};try{data=event.data?.json()||{};}catch{}
  const badge=Number.isInteger(data.badge)?Math.max(0,Math.min(data.badge,99999)):0;
  await self.registration.showNotification(typeof data.title==='string'?data.title.slice(0,80):'IBB5 · Thông báo mới',{body:typeof data.body==='string'?data.body.slice(0,220):'Mở IBB5 để xem thông báo mới.',icon:'/icons/ibb5-192.png',tag:'ibb5-phone-summary',data:{inbox:true},timestamp:Date.now()});
  try{if(badge>0)await self.navigator.setAppBadge?.(badge);else await self.navigator.clearAppBadge?.();}catch{}
  const windows=await self.clients.matchAll({type:'window',includeUncontrolled:true});windows.forEach(client=>client.postMessage({type:'IBB5_PUSH_RECEIVED',kind:data.kind==='test'?'test':'summary'}));
 })());
});
self.addEventListener('notificationclick',event=>{
 event.notification.close();event.waitUntil((async()=>{
  const windows=await self.clients.matchAll({type:'window',includeUncontrolled:true}),client=windows.find(client=>new URL(client.url).origin===self.location.origin);
  if(client){await client.focus();client.postMessage({type:'IBB5_OPEN_NOTIFICATIONS'});}else await self.clients.openWindow('/?inbox=1');
 })());
});
