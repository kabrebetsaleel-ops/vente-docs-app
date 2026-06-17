const CACHE_NAME = 'edudocs-v2';
const ASSETS = [
  '/vente-docs-app/index.html',
  '/vente-docs-app/auth.html',
  '/vente-docs-app/mes-docs.html',
  '/vente-docs-app/admin.html',
  '/vente-docs-app/style.css',
  '/vente-docs-app/app.js',
  '/vente-docs-app/manifest.json'
];

// Domaines à ne JAMAIS mettre en cache (Firebase, EmailJS, CDN)
const BYPASS_DOMAINS = [
  'firestore.googleapis.com',
  'firebase.googleapis.com',
  'firebaseapp.com',
  'googleapis.com',
  'gstatic.com',
  'jsdelivr.net',
  'emailjs.com',
  'fonts.googleapis.com',
  'fonts.gstatic.com',
  'ibb.co',
  'unsplash.com'
];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(ASSETS))
      .catch(err => console.warn('Cache install error:', err))
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
  const url = new URL(e.request.url);

  // Laisser passer tout ce qui n'est pas GET
  if (e.request.method !== 'GET') return;

  // Laisser passer Firebase et autres APIs
  if (BYPASS_DOMAINS.some(d => url.hostname.includes(d))) return;

  // Pour les fichiers locaux : réseau d'abord, cache en fallback
  e.respondWith(
    fetch(e.request)
      .then(res => {
        if (res && res.status === 200) {
          const clone = res.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(e.request, clone));
        }
        return res;
      })
      .catch(() => caches.match(e.request))
  );
});
