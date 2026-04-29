const CACHE_NAME = 'ntp-ratkoci-v1';
const ASSETS_TO_CACHE = [
  'index.html',
  'manifest.json',
  'https://cdn.tailwindcss.com',
  'https://cdnjs.cloudflare.com/ajax/libs/gsap/3.12.2/gsap.min.js',
  'https://unpkg.com/lucide@latest',
  'https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@300;400;600;700;800&display=swap'
];

// Instalo Service Worker dhe ruaj resurset kryesore
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS_TO_CACHE);
    })
  );
  self.skipWaiting();
});

// Fshi cache-et e vjetra nëse ndryshon versioni
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key))
      );
    })
  );
});

// Strategjia: Shërbe nga Cache, Përditëso nga Rrjeti (Stale-while-revalidate)
self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.match(event.request).then((response) => {
        const fetchPromise = fetch(event.request).then((networkResponse) => {
          // Ruaj një kopje të re në cache për përdorim të ardhshëm
          if (event.request.method === 'GET' && networkResponse.status === 200) {
            cache.put(event.request, networkResponse.clone());
          }
          return networkResponse;
        }).catch(() => {
          // Opsionale: Këtu mund të kthesh një faqe "Offline" nëse s'ka as cache as rrjet
        });
        
        // Kthe përgjigjen nga cache nëse ekziston, përndryshe prit rrjetin
        return response || fetchPromise;
      });
    })
  );
});
