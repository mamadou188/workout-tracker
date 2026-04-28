// ── Workout Tracker Service Worker ───────────────────────────────────────────
// Caches the entire app shell on first install so it works fully offline.
// Strategy: Cache-first for all app assets, network-first for nothing
// (the app is 100% self-contained — no external requests needed).

const CACHE_NAME = 'workout-tracker-v1';

// All files that make up the app shell
const APP_SHELL = [
  './',
  './index.html',
  './manifest.json'
];

// ── Install: pre-cache app shell ─────────────────────────────────────────────
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(APP_SHELL))
  );
  // Take control immediately without waiting for old SW to die
  self.skipWaiting();
});

// ── Activate: delete old caches ──────────────────────────────────────────────
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))
      )
    )
  );
  self.clients.claim();
});

// ── Fetch: serve from cache, fall back to network ────────────────────────────
self.addEventListener('fetch', event => {
  // Only handle GET requests for same-origin resources
  if (event.request.method !== 'GET') return;

  event.respondWith(
    caches.match(event.request).then(cached => {
      if (cached) return cached;

      // Not in cache — fetch from network and cache for next time
      return fetch(event.request).then(response => {
        // Only cache valid responses
        if (!response || response.status !== 200 || response.type !== 'basic') {
          return response;
        }
        const toCache = response.clone();
        caches.open(CACHE_NAME).then(cache => cache.put(event.request, toCache));
        return response;
      }).catch(() => {
        // Network failed and not in cache — nothing we can do
        return new Response('Offline and not cached', { status: 503 });
      });
    })
  );
});
