/* Ragdoll Lab production cache; first run needs Internet, thereafter the engine
 * and our own core assets are eligible for offline use from the installed PWA.
 */
const CACHE='ragdoll-lab-production-1';
const ENGINE='https://cdn.jsdelivr.net/npm/three@0.161.0/build/three.module.js';
const SHELL=['./','./index.html','./game.js','./premium.js','./manifest.webmanifest','./icon.svg'];
self.addEventListener('install',event=>{
 event.waitUntil(caches.open(CACHE).then(async cache=>{
   await cache.addAll(SHELL);
   await cache.add(ENGINE).catch(()=>{});
 }).then(()=>self.skipWaiting()));
});
self.addEventListener('activate',event=>{
 event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(key=>key.startsWith('ragdoll-lab-')&&key!==CACHE).map(key=>caches.delete(key)))).then(()=>self.clients.claim()));
});
self.addEventListener('fetch',event=>{
 const req=event.request;
 if(req.method!=='GET')return;
 const target=new URL(req.url);
 if(target.origin===self.location.origin){
   event.respondWith(fetch(req).then(response=>{
     if(response&&response.ok){
       const copy=response.clone();caches.open(CACHE).then(cache=>cache.put(req,copy)).catch(()=>{});
     }
     return response;
   }).catch(()=>caches.match(req).then(hit=>hit||Response.error())));
 }else{
   event.respondWith(caches.match(req).then(hit=>hit||fetch(req).then(response=>{
     if(response&&(response.ok||response.type==='opaque')){
       const copy=response.clone();caches.open(CACHE).then(cache=>cache.put(req,copy)).catch(()=>{});
     }
     return response;
   }).catch(()=>Response.error())));
 }
});