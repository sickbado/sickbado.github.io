const CACHE='ragdoll-lab-v01';
const SHELL=['./','./index.html','./game.js','./manifest.webmanifest','./icon.svg'];
self.addEventListener('install',event=>{event.waitUntil(caches.open(CACHE).then(c=>c.addAll(SHELL)).then(()=>self.skipWaiting()))});
self.addEventListener('activate',event=>{event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(key=>key!==CACHE).map(key=>caches.delete(key)))).then(()=>self.clients.claim()))});
self.addEventListener('fetch',event=>{
 const request=event.request;
 if(request.method!=='GET')return;
 event.respondWith(caches.match(request).then(hit=>hit||fetch(request).then(response=>{
   if(response&&response.ok){const clone=response.clone();caches.open(CACHE).then(cache=>cache.put(request,clone)).catch(()=>{})}
   return response;
 }).catch(()=>hit||Response.error())));
});