/* SlateMind service worker.
   - App shell is cached for offline use.
   - HTML: network first, so a new deploy shows up on the next load.
   - Scripts/styles/images: serve the cached copy at once, refresh it in the background.
   - /api/ and cross-origin requests are never touched.
   Bump CACHE_VERSION when the ASSETS list changes. */
const CACHE_VERSION = 'slatemind-v4';
const ASSETS = [
  '/', '/index.html', '/trust.html', '/style.css',
  '/api.js', '/audio.js', '/state.js', '/samples.js', '/gamification.js', '/quiz.js', '/learning.js',
  '/constellation.js', '/tour.js', '/whiteboard.js', '/app.js',
  '/manifest.json', '/icons/icon-192.png', '/icons/icon-512.png',
];

self.addEventListener('install', e => {
  // allSettled: one missing file must not stop the whole app from installing
  e.waitUntil(
    caches.open(CACHE_VERSION)
      .then(cache => Promise.allSettled(ASSETS.map(url => cache.add(url))))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE_VERSION).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

async function networkFirst(request) {
  const cache = await caches.open(CACHE_VERSION);
  try {
    const fresh = await fetch(request);
    if (fresh.ok) cache.put(request, fresh.clone());
    return fresh;
  } catch {
    return (await cache.match(request)) || (await cache.match('/index.html'));
  }
}

async function staleWhileRevalidate(request) {
  const cache = await caches.open(CACHE_VERSION);
  const cached = await cache.match(request);
  const refresh = fetch(request)
    .then(res => { if (res.ok) cache.put(request, res.clone()); return res; })
    .catch(() => cached);
  return cached || refresh;
}

self.addEventListener('fetch', e => {
  const { request } = e;
  const url = new URL(request.url);
  if (request.method !== 'GET' || url.origin !== self.location.origin || url.pathname.startsWith('/api/')) return;
  e.respondWith(request.mode === 'navigate' ? networkFirst(request) : staleWhileRevalidate(request));
});
