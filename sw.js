const CACHE='sahinh-ai-pwa-v1.4.14';
const ASSETS=["./","./index.html","./app.css","./app.js","./apriltag-adapter.js","./manifest.json","./gas-config.js","./icon-192.png","./audio/KT/baobai.mp3","./audio/KT/batdau.mp3","./audio/KT/chuaden.mp3","./audio/KT/dung.mp3","./audio/KT/dungxe.mp3","./audio/KT/hoanthanh.mp3","./audio/KT/quagio.mp3","./audio/KT/quavitri.mp3","./audio/KT/tutdoc.mp3","./audio/THKC/THKC.mp3","./audio/THKC/saiquytrinh.mp3","./audio/b01/baobai.mp3","./audio/b01/batdau.mp3","./audio/b01/doilenh.mp3","./audio/b01/qua30s.mp3","./audio/b02/baobai.mp3","./audio/b02/batdau.mp3","./audio/b02/chuaden.mp3","./audio/b02/dung.mp3","./audio/b02/dungxe.mp3","./audio/b02/khongdung.mp3","./audio/b02/quavitri.mp3","./audio/b03/baobai.mp3","./audio/b03/batdau.mp3","./audio/b03/chuaden.mp3","./audio/b03/dung.mp3","./audio/b03/dungxe.mp3","./audio/b03/qua30s.mp3","./audio/b03/quavitri.mp3","./audio/b03/tutdoc.mp3","./audio/b04/baobai.mp3","./audio/b04/batdau.mp3","./audio/b05/baobai.mp3","./audio/b05/batdau.mp3","./audio/b06/baobai.mp3","./audio/b06/batdau.mp3","./audio/b06/quatg1.mp3","./audio/b07/baobai.mp3","./audio/b07/batdau.mp3","./audio/b08/baobai.mp3","./audio/b08/batdau.mp3","./audio/b08/chuaden.mp3","./audio/b08/dung.mp3","./audio/b08/dungxe.mp3","./audio/b08/quatg1.mp3","./audio/b08/quavitri.mp3","./audio/b09/baobai.mp3","./audio/b09/batdau.mp3","./audio/b09/chuaden.mp3","./audio/b09/dung.mp3","./audio/b09/dungxe.mp3","./audio/b09/quatg1.mp3","./audio/b09/quatg30.mp3","./audio/b09/quavitri.mp3","./audio/b09/tutdoc.mp3","./audio/b10/baobai.mp3","./audio/b10/batdau.mp3","./audio/b10/chuaden.mp3","./audio/b10/dung.mp3","./audio/b10/dungxe.mp3","./audio/b10/quagio.mp3","./audio/b10/quavitri.mp3","./audio/b10/tutdoc.mp3","./audio/b11/baobai.mp3","./audio/b11/batdau.mp3","./audio/b11/chuaden.mp3","./audio/b11/dung.mp3","./audio/b11/dungxe.mp3","./audio/b11/quagio.mp3","./audio/b11/quavitri.mp3","./audio/b11/thieutoc.mp3","./audio/b11/tutdoc.mp3","./audio/b12/baobai.mp3","./audio/b12/batdau.mp3","./audio/b12/chuaden.mp3","./audio/b12/dung.mp3","./audio/b12/dungxe.mp3","./audio/b12/quatg1.mp3","./audio/b12/quavitri.mp3","./audio/b13/baobai.mp3","./audio/b13/batdau.mp3","./audio/b13/chuaden.mp3","./audio/b13/dung.mp3","./audio/b13/dungxe.mp3","./audio/b13/quagio.mp3","./audio/b13/quavitri.mp3","./audio/b13/tutdoc.mp3","./audio/quatong.mp3","./audio/thitruot.mp3"];
self.addEventListener('install',e=>e.waitUntil(caches.open(CACHE).then(c=>Promise.all(ASSETS.map(u=>c.add(u).catch(err=>{console.warn('CACHE_SKIP',u,err);})))).then(()=>self.skipWaiting())));
self.addEventListener('activate',e=>e.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim())));
self.addEventListener('fetch',e=>{
  if(e.request.method!=='GET')return;
  const url=new URL(e.request.url);
  const isAudio=url.pathname.includes('/audio/');
  e.respondWith(
    caches.match(e.request).then(hit=>{
      if(hit)return hit;
      return fetch(e.request).then(r=>{
        if(r && r.ok){
          const copy=r.clone();
          caches.open(CACHE).then(c=>c.put(e.request,copy)).catch(()=>{});
        }
        return r;
      }).catch(err=>{
        if(isAudio){ throw err; }
        return caches.match('./index.html');
      });
    })
  );
});
