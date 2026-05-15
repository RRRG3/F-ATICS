// F-ATICS Service Worker — app-shell caching strategy
// IMPORTANT: bump CACHE_NAME whenever JS/CSS shape changes so cached
// copies of stale modules don't keep getting served.
const CACHE_NAME = 'f-atics-v4-lab';

// Core app shell: cached on install. Note: JS modules are NOT cached here
// because they evolve rapidly during development. They go through the
// network-first path below.
const APP_SHELL = [
  '/',
  '/index.html',
  '/styles.css',
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

// ── Fetch routing ─────────────────────────────────────────────
self.addEventListener('fetch', event => {
  const { request } = event;
  const url = new URL(request.url);

  // Pass through cross-origin (CDN, APIs)
  if (url.origin !== self.location.origin) return;

  // Network-first for HTML navigation
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request).catch(() => caches.match('/index.html'))
    );
    return;
  }

  // Network-first for JS modules — prevents stale code from
  // sticking around after a deploy / hot-reload.
  if (request.url.endsWith('.js') || request.url.endsWith('.mjs')) {
    event.respondWith(
      fetch(request)
        .then(response => {
          if (response.ok) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then(cache => cache.put(request, clone));
          }
          return response;
        })
        .catch(() => caches.match(request))
    );
    return;
  }

  // Cache-first for static assets (CSS, images, fonts, data files)
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
