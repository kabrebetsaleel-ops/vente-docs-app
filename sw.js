const CACHE_NAME = 'edudocs-v1';
const ASSETS = [
  '/vente-docs-app/index.html',
  '/vente-docs-app/auth.html',
  '/vente-docs-app/mes-docs.html',
  '/vente-docs-app/admin.html',
  '/vente-docs-app/style.css',
  '/vente-docs-app/app.js',
  '/vente-docs-app/manifest.json'
];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(ASSETS)).catch(console.error)
  );
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  e.respondWith(
    fetch(e.request)
      .then(res => {
        const clone = res.clone();
        caches.open(CACHE_NAME).then(cache => cache.put(e.request, clone));
        return res;
      })
      .catch(() => caches.match(e.request))
  );
});
