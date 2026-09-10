const CACHE = 'gyaanpe-v5';

/* Shell + big static data files. These are cache-first, so bump CACHE
   above whenever any of them changes, or clients keep the old copy. */
const FILES = [
  '/gyaanpe/',
  '/gyaanpe/index.html',
  '/gyaanpe/manifest.json',
  '/gyaanpe/data-questions-1.js',
  '/gyaanpe/data-questions-2.js',
  '/gyaanpe/data-hub-1.js',
  '/gyaanpe/data-hub-2.js'
];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE).then(c =>
      /* addAll aborts the whole install if any one file 404s, so fetch
         each one bypassing the HTTP cache and tolerate individual misses */
      Promise.all(FILES.map(u =>
        fetch(new Request(u, { cache: 'reload' }))
          .then(r => (r && r.ok) ? c.put(u, r) : null)
          .catch(() => null)
      ))
    )
  );
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

function isHtmlRequest(req) {
  if (req.mode === 'navigate') return true;
  const u = new URL(req.url);
  return u.pathname.endsWith('.html') || u.pathname.endsWith('/');
}

self.addEventListener('fetch', e => {
  const req = e.request;

  /* Never touch anything but same-origin GETs. Keeps the Cloudflare
     Workers, Firebase and Play Billing calls completely out of the SW. */
  if (req.method !== 'GET') return;
  if (new URL(req.url).origin !== self.location.origin) return;

  if (isHtmlRequest(req)) {
    /* Network-first, and cache: 'reload' so the browser's own HTTP cache
       cannot hand back a stale index.html. GitHub Pages serves HTML with
       a max-age, which is what made updates appear to not arrive. */
    e.respondWith(
      fetch(new Request(req.url, {
        cache: 'reload',
        credentials: 'same-origin',
        redirect: 'follow'
      })).then(r => {
        if (r && r.ok) {
          const cp = r.clone();
          caches.open(CACHE).then(c => c.put(req, cp)).catch(() => {});
        }
        return r;
      }).catch(() =>
        caches.match(req).then(r => r || caches.match('/gyaanpe/index.html'))
      )
    );
    return;
  }

  /* Everything else: cache-first, fall back to network. */
  e.respondWith(
    caches.match(req).then(r => r || fetch(req))
  );
});

/* Lets the page force a waiting worker to take over immediately. */
self.addEventListener('message', e => {
  if (e.data === 'gp-skip-waiting') self.skipWaiting();
});
