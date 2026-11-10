/* ==========================================================================
   NTP Ratkoci — service worker
   - Faqja dhe skriptat: rrjeti i pari, cache kur s'ka internet
   - Fotot dhe fontet: cache i pari (ndryshojnë rrallë)
   Rrite VERSION sa herë që ndryshon çmimet ose kodin, që telefonat të marrin versionin e ri.
   ========================================================================== */
const VERSION = '2026.11.2';
const SHELL = `ntp-shell-${VERSION}`;
const MEDIA = 'ntp-media-v2';

const APP_SHELL = [
  './',
  'index.html',
  'manifest.json',
  'assets/css/app.css',
  'assets/js/data/products.js',
  'assets/js/core.js',
  'assets/js/status.js',
  'assets/js/views.js',
  'assets/js/search.js',
  'assets/js/app.js',
  'assets/fonts/archivo-wdth.woff2',
  'assets/icons/icon-192.png',
  'assets/icons/favicon-64.png',
  'assets/img/store-800.webp',
];

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(SHELL).then((c) => c.addAll(APP_SHELL)));
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== SHELL && k !== MEDIA).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  const isMedia = /\.(webp|png|jpe?g|woff2)$/i.test(url.pathname);

  if (isMedia) {
    // cache i pari
    event.respondWith(
      caches.open(MEDIA).then(async (cache) => {
        const hit = await cache.match(req);
        if (hit) return hit;
        const res = await fetch(req);
        if (res.ok) cache.put(req, res.clone());
        return res;
      }).catch(() => caches.match(req))
    );
    return;
  }

  // rrjeti i pari, me rezervë nga cache
  event.respondWith(
    fetch(req).then((res) => {
      if (res.ok) {
        const copy = res.clone();
        caches.open(SHELL).then((c) => c.put(req, copy));
      }
      return res;
    }).catch(async () => (await caches.match(req)) || (req.mode === 'navigate' ? caches.match('index.html') : undefined))
  );
});
