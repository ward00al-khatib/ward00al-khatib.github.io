// Offline cache for the licensed-copies tool. Bump VERSION when files change.
const VERSION = 'roze-v4';
const FILES = ['./', './index.html', './manifest.webmanifest',
  './assets/pdf-lib.min.js', './assets/logo.svg', './assets/pwa-192.png', './assets/pwa-512.png',
  './assets/IBMPlexSansArabic-Regular.ttf', './assets/IBMPlexSansArabic-Medium.ttf', './assets/IBMPlexSansArabic-SemiBold.ttf',
  './assets/Tajawal-Medium.ttf', './assets/Tajawal-Bold.ttf'];
self.addEventListener('install', e => { e.waitUntil(caches.open(VERSION).then(c => c.addAll(FILES))); self.skipWaiting(); });
self.addEventListener('activate', e => { e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== VERSION).map(k => caches.delete(k))))); self.clients.claim(); });
self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  // network first, cache as fallback, so updates arrive when online
  e.respondWith(fetch(e.request).then(r => { const c = r.clone(); caches.open(VERSION).then(x => x.put(e.request, c)); return r; })
    .catch(() => caches.match(e.request).then(r => r || caches.match('./index.html'))));
});
