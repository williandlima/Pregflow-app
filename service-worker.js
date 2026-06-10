const CACHE_NAME = 'cifrapro-v1';
const STATIC_ASSETS = [
    '/Pregflow-app/',
    '/Pregflow-app/index.html',
    '/Pregflow-app/styles.css',
    '/Pregflow-app/app.js',
    '/Pregflow-app/manifest.json',
    '/Pregflow-app/icons/icon-192.png',
    '/Pregflow-app/icons/icon-512.png'
];

self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME).then(cache => cache.addAll(STATIC_ASSETS))
    );
    self.skipWaiting();
});

self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then(keys =>
            Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
        )
    );
    clients.claim();
});

self.addEventListener('fetch', (event) => {
    const url = new URL(event.request.url);

    // Network-first for CORS proxy and external APIs
    if (url.hostname.includes('allorigins.win') || url.hostname.includes('corsproxy')) {
        event.respondWith(fetch(event.request));
        return;
    }

    // Cache-first for all static assets
    event.respondWith(
        caches.match(event.request).then(cached => {
            if (cached) return cached;
            return fetch(event.request).then(res => {
                if (!res || res.status !== 200 || res.type === 'opaque') return res;
                const clone = res.clone();
                caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
                return res;
            });
        })
    );
});
