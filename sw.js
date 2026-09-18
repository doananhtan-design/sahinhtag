const CACHE='sahinh-ai-pwa-v1.2.8-total18-hard-timer';
const ASSETS=['./','./index.html','./app.css','./app.js','./apriltag-adapter.js','./manifest.json','./gas-config.js','./icon-192.png','./icon-512.png','./audio/b01/doilenh.mp3','./audio/b01/baobai.mp3','./audio/b01/batdau.mp3','./audio/b01/qua30s.mp3','./audio/quatong.mp3'];
self.addEventListener('install',e=>e.waitUntil(caches.open(CACHE).then(c=>c.addAll(ASSETS)).then(()=>self.skipWaiting())));
self.addEventListener('activate',e=>e.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim())));
self.addEventListener('fetch',e=>{if(e.request.method!=='GET')return;e.respondWith(caches.match(e.request).then(hit=>hit||fetch(e.request).then(r=>{const copy=r.clone();caches.open(CACHE).then(c=>c.put(e.request,copy)).catch(()=>{});return r}).catch(()=>caches.match('./index.html'))))});
