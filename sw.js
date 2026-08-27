// F-ATICS Service Worker
//
// Previous versions cached CSS and the app shell cache-first, which is the
// right strategy for a finished site and the wrong one for a site being
// iterated on: a visitor could sit on a build weeks old, see none of the
// work, and have no way to know. Markup, styles and scripts are therefore
// network-first now — the cache exists to survive an offline visit, not to
// decide what version you get. Only genuinely immutable assets (images,
// fonts, models) stay cache-first.
const VERSION    = 'v12';
const SHELL      = 'fatics-shell-' + VERSION;
const ASSETS     = 'fatics-assets-' + VERSION;

const SHELL_URLS = ['/', '/index.html', '/manifest.json'];

// Anything whose bytes never change for a given URL.
const IMMUTABLE = /\.(?:png|jpe?g|gif|webp|avif|svg|ico|woff2?|ttf|otf|glb|gltf|mp3|m4a|ogg)$/i;

self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(SHELL)
            .then((c) => c.addAll(SHELL_URLS))
            // A single missing shell URL must not abort the whole install.
            .catch(() => undefined)
            .then(() => self.skipWaiting())
    );
});

self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys()
            .then((keys) => Promise.all(
                keys.filter((k) => k !== SHELL && k !== ASSETS).map((k) => caches.delete(k))
            ))
            .then(() => self.clients.claim())
    );
});

// Let the page ask us to step aside immediately.
self.addEventListener('message', (event) => {
    if (event.data === 'skipWaiting') self.skipWaiting();
});

async function networkFirst(request, cacheName) {
    try {
        const fresh = await fetch(request);
        if (fresh && fresh.ok) {
            const copy = fresh.clone();
            caches.open(cacheName).then((c) => c.put(request, copy)).catch(() => {});
        }
        return fresh;
    } catch (err) {
        const hit = await caches.match(request);
        if (hit) return hit;
        if (request.mode === 'navigate') {
            const shell = await caches.match('/index.html');
            if (shell) return shell;
        }
        throw err;
    }
}

async function cacheFirst(request, cacheName) {
    const hit = await caches.match(request);
    if (hit) return hit;
    const fresh = await fetch(request);
    if (fresh && fresh.ok) {
        const copy = fresh.clone();
        caches.open(cacheName).then((c) => c.put(request, copy)).catch(() => {});
    }
    return fresh;
}

self.addEventListener('fetch', (event) => {
    const { request } = event;
    if (request.method !== 'GET') return;

    const url = new URL(request.url);
    if (url.origin !== self.location.origin) return;   // CDNs and APIs pass through

    if (request.mode === 'navigate' || /\.(?:html|css|js|mjs|json)$/i.test(url.pathname)) {
        event.respondWith(networkFirst(request, SHELL));
        return;
    }

    if (IMMUTABLE.test(url.pathname)) {
        event.respondWith(cacheFirst(request, ASSETS));
        return;
    }

    event.respondWith(networkFirst(request, ASSETS));
});
