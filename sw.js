const CACHE = 'gyaanpe-v69';

/* Works on both https://mahapatraswapnajit-prog.github.io/gyaanpe/ and https://gyaanpe.com/ :
   every path is resolved against the folder this sw.js lives in. */
const BASE = self.registration ? self.registration.scope : new URL('./', self.location).href;
const at = p => new URL(p, BASE).href;

/* Shell + big static data files. These are cache-first, so bump CACHE
   above whenever any of them changes, or clients keep the old copy. */
const FILES = [
  './',
  'index.html',
  'manifest.json',
  'data-questions-1.js',
  'data-questions-2.js',
  'data-ncert.js',
  'data-qbank.js',
  'data-hub-1.js',
  'data-hub-2.js'
].map(at);

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
      /* 'gp-meta' holds the page's note for reminders (name, streak, last open); keep it */
      .then(keys => Promise.all(keys.filter(k => k !== CACHE && k !== 'gp-meta').map(k => caches.delete(k))))
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
        /* Cloudflare Pages redirects /page.html -> /page. A redirected response
           cannot be handed to a navigation, so let the browser follow it itself. */
        if (r && r.redirected) return Response.redirect(r.url, 301);
        if (r && r.ok) {
          const cp = r.clone();
          caches.open(CACHE).then(c => c.put(req, cp)).catch(() => {});
        }
        return r;
      }).catch(() =>
        caches.match(req).then(r => r || caches.match(at('index.html')))
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

/* ============ Daily reminder (Web Push) ============
   The gyaanpe-push Worker sends an EMPTY push around 6 pm IST. The text is
   chosen here from what the page last saved in the 'gp-meta' cache. */
const GP_MSGS = [
  ['Aaj ka sawaal ready hai! 🎯', '5 minute do, ek naya chapter seekho aur XP kamao.'],
  ['Arjun Sir intezaar kar rahe hain 🤖', 'Koi doubt hai? AI Tutor se abhi poochho.'],
  ['Ek chhota sa quiz? 🧠', '10 sawaal, 5 minute. Dekho kitne sahi hote hain!'],
  ['Board ki taiyari, thoda roz 📚', 'Aaj ek chapter ka practice karo, kal aasaan lagega.'],
  ['Coins tumhara intezaar kar rahe hain 🪙', 'App kholo aur aaj ka reward lo.']
];
function gpDayStr(d) { return d.getFullYear() + '-' + (d.getMonth() + 1) + '-' + d.getDate(); }

self.addEventListener('push', e => {
  e.waitUntil((async () => {
    let m = {};
    try {
      const c = await caches.open('gp-meta');
      const r = await c.match('/__gp_meta');
      if (r) m = await r.json();
    } catch (_) {}
    const now = new Date();
    const y = new Date(now); y.setDate(now.getDate() - 1);
    const name = (m.name && m.name !== 'Champ') ? String(m.name).slice(0, 16) : '';
    const streak = parseInt(m.streak, 10) || 0;
    let title, body;
    if (m.last === gpDayStr(now)) {
      title = 'Shabaash' + (name ? ', ' + name : '') + '! 🌟';
      body = 'Aaj ki padhai ho gayi. Ek quiz aur khel kar XP badhao?';
    } else if (m.last === gpDayStr(y) && streak >= 2) {
      title = '🔥 ' + streak + ' din ki streak khatre me!';
      body = (name ? name + ', ' : '') + 'aaj 5 minute padho aur streak bachao.';
    } else {
      const i = Math.floor(now.getTime() / 864e5) % GP_MSGS.length;
      title = GP_MSGS[i][0];
      body = (name ? name + ', ' : '') + GP_MSGS[i][1];
    }
    await self.registration.showNotification(title, {
      body,
      icon: at('GyaanPe_Logo_Final.png'),
      tag: 'gp-daily',
      data: { url: at('./?src=push') }
    });
  })());
});

self.addEventListener('notificationclick', e => {
  e.notification.close();
  const url = (e.notification.data && e.notification.data.url) || at('./');
  e.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(list => {
      for (const c of list) { if (c.url.indexOf(BASE) === 0 && 'focus' in c) return c.focus(); }
      return self.clients.openWindow(url);
    })
  );
});
