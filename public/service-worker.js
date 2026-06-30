const CACHE='stockguard-v11-fix-1';
self.addEventListener('install',e=>{self.skipWaiting();});
self.addEventListener('activate',e=>{e.waitUntil(caches.keys().then(keys=>Promise.all(keys.map(k=>caches.delete(k)))));self.clients.claim();});
self.addEventListener('fetch',e=>{ if(new URL(e.request.url).pathname.startsWith('/api/')) return; });
