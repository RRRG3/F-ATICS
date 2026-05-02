// F-ATICS Service Worker — app-shell caching strategy
const CACHE_NAME = 'f-atics-v1';

// Core app shell: cached on install, served from cache-first
const APP_SHELL = [
  '/',
  '/index.html',
  '/styles.css',
  '/script.js',
  '/quiz-data.js',
  '/circuits-data.js',
  '/race-calendar-data.js',
  '/prediction-model.js',
  '/js/router.js',
  '/manifest.json',
];

// ── Install: pre-cache the app shell ──────────────────────────
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(APP_SHELL))
  );
  self.skipWaiting();
});

// ── Activate: remove stale caches ─────────────────────────────
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// ── Fetch: network-first for API calls, cache-first for assets ─
self.addEventListener('fetch', event => {
  const { request } = event;
  const url = new URL(request.url);

  // Pass through cross-origin requests (CDN scripts, APIs)
  if (url.origin !== self.location.origin) return;

  // Network-first for HTML navigation (always get fresh page)
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request).catch(() => caches.match('/index.html'))
    );
    return;
  }

  // Cache-first for everything else (assets, data files)
  event.respondWith(
    caches.match(request).then(cached => {
      if (cached) return cached;
      return fetch(request).then(response => {
        if (response.ok) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(request, clone));
        }
        return response;
      });
    })
  );
});
