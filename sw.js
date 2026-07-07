const CACHE = 'gyaanpe-v3';
const FILES = [
  '/gyaanpe/',
  '/gyaanpe/index.html',
  '/gyaanpe/manifest.json'
];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(FILES)));
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    ).then(() => clients.claim())
  );
});

self.addEventListener('fetch', e => {
  if (e.request.mode === 'navigate' || e.request.url.indexOf('index.html') > -1) {
    e.respondWith(
      fetch(e.request).then(r => {
        var cp = r.clone();
        caches.open(CACHE).then(c => c.put(e.request, cp));
        return r;
      }).catch(() => caches.match(e.request))
    );
  } else {
    e.respondWith(
      caches.match(e.request).then(r => r || fetch(e.request))
    );
  }
});
