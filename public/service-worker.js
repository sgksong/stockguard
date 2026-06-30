const CACHE='stockguard-v10';
self.addEventListener('install',e=>{e.waitUntil(caches.open(CACHE).then(c=>c.addAll(['/','/index.html','/manifest.webmanifest','/icon.svg'])));self.skipWaiting();});
self.addEventListener('activate',e=>{e.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k)))));self.clients.claim();});
self.addEventListener('fetch',e=>{const u=new URL(e.request.url);if(u.pathname.startsWith('/api/')){e.respondWith(fetch(e.request));return;}e.respondWith(caches.match(e.request).then(r=>r||fetch(e.request)));});