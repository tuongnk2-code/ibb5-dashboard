// Cache only a public connection-help page. Reports, sessions, APIs and application code remain network-only.
const CACHE='ibb5-offline-v1',OFFLINE='/offline.html';
self.addEventListener('install',event=>{event.waitUntil(caches.open(CACHE).then(cache=>cache.add(new Request(OFFLINE,{cache:'reload'}))).then(()=>self.skipWaiting()));});
self.addEventListener('activate',event=>{event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(key=>key.startsWith('ibb5-offline-')&&key!==CACHE).map(key=>caches.delete(key)))).then(()=>self.clients.claim()));});
self.addEventListener('fetch',event=>{
 const request=event.request,url=new URL(request.url);
 if(request.method!=='GET'||request.mode!=='navigate'||url.origin!==self.location.origin||url.pathname.startsWith('/api/'))return;
 event.respondWith(fetch(request).catch(async()=>await caches.match(OFFLINE)||new Response('IBB5: Chưa có kết nối mạng.',{status:503,headers:{'Content-Type':'text/plain; charset=utf-8'}})));
});
