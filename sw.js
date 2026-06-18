// ===================================================================
// sw.js — service worker for the Kingdom of Order PWA.
//
// Strategy: NETWORK-FIRST for same-origin GETs (so online users always
// get the latest ES modules — avoids stale-code bugs), with a cache
// fallback that makes the app work offline after the first online load.
// ===================================================================

const CACHE = 'kingdom-v1';
// Minimal precache; the rest of the app shell is cached at runtime on
// first online load (avoids all-or-nothing addAll failures).
const PRECACHE = [
    './',
    './index.html',
    './manifest.webmanifest',
    './icons/icon-192.png',
    './icons/icon-512.png',
];

self.addEventListener('install', (e) => {
    self.skipWaiting();
    e.waitUntil(
        caches.open(CACHE).then((c) => Promise.allSettled(PRECACHE.map((u) => c.add(u))))
    );
});

self.addEventListener('activate', (e) => {
    e.waitUntil(
        caches.keys()
            .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
            .then(() => self.clients.claim())
    );
});

self.addEventListener('fetch', (e) => {
    const req = e.request;
    if (req.method !== 'GET') return;
    let url;
    try { url = new URL(req.url); } catch { return; }
    if (url.origin !== self.location.origin) return;   // let cross-origin (CDN, Supabase) pass through

    e.respondWith(
        fetch(req)
            .then((res) => {
                if (res && res.ok) {
                    const copy = res.clone();
                    caches.open(CACHE).then((c) => c.put(req, copy));
                }
                return res;
            })
            .catch(() => caches.match(req).then((r) => r || caches.match('./index.html')))
    );
});

// Push handler (used once the optional push backend is deployed — see
// supabase/push/). Safe no-op until then.
self.addEventListener('push', (e) => {
    let data = {};
    try { data = e.data ? e.data.json() : {}; } catch { data = { body: e.data && e.data.text() }; }
    const title = data.title || 'ממלכת הסדר';
    const options = {
        body: data.body || '',
        icon: './icons/icon-192.png',
        badge: './icons/icon-192.png',
        dir: 'rtl',
        lang: 'he',
        data: { url: data.url || './index.html' },
    };
    e.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', (e) => {
    e.notification.close();
    const target = (e.notification.data && e.notification.data.url) || './index.html';
    e.waitUntil(
        self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((cs) => {
            for (const c of cs) { if ('focus' in c) return c.focus(); }
            if (self.clients.openWindow) return self.clients.openWindow(target);
        })
    );
});
