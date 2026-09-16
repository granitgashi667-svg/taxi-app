'use strict';

/**
 * service-worker.js — PWA Offline + Cache
 */

const CACHE_VERSION = 'taxiapp-v2.0.0';
const CACHE_URLS = [
    '/',
    '/index.html',
    '/driver.html',
    '/client.html',
    '/admin.html',
    '/director.html',
    '/style.css',
    '/css/admin.css',
    '/css/driver.css',
    '/css/client.css',
    '/data.js',
    '/firebase-config.js',
    '/manifest.json'
];

// ═══ INSTALL ═══
self.addEventListener('install', (event) => {
    console.log('📦 SW: Install');
    event.waitUntil(
        caches.open(CACHE_VERSION)
            .then((cache) => {
                console.log('📦 SW: Duke cache...');
                return cache.addAll(CACHE_URLS).catch(err => {
                    console.warn('Cache error (do të vazhdojë):', err);
                });
            })
            .then(() => self.skipWaiting())
    );
});

// ═══ ACTIVATE ═══
self.addEventListener('activate', (event) => {
    console.log('✅ SW: Activate');
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames.map((name) => {
                    if (name !== CACHE_VERSION) {
                        console.log('🗑️ SW: Fshij cache të vjetër:', name);
                        return caches.delete(name);
                    }
                })
            );
        }).then(() => self.clients.claim())
    );
});

// ═══ FETCH ═══
self.addEventListener('fetch', (event) => {
    const url = new URL(event.request.url);

    // Mos cache Firebase, Google APIs
    if (url.hostname.includes('firebase') ||
        url.hostname.includes('googleapis') ||
        url.hostname.includes('gstatic') ||
        url.hostname.includes('firestore') ||
        url.hostname.includes('unpkg.com') ||
        url.hostname.includes('cdn.jsdelivr.net') ||
        url.hostname.includes('cdnjs.cloudflare.com') ||
        url.hostname.includes('tile')) {
        return;
    }

    // Network-first për HTML
    if (event.request.mode === 'navigate' || event.request.destination === 'document') {
        event.respondWith(
            fetch(event.request)
                .then((response) => {
                    const clone = response.clone();
                    caches.open(CACHE_VERSION).then(cache => cache.put(event.request, clone));
                    return response;
                })
                .catch(() => caches.match(event.request))
        );
        return;
    }

    // Cache-first për assets
    event.respondWith(
        caches.match(event.request).then((cached) => {
            if (cached) return cached;

            return fetch(event.request).then((response) => {
                if (!response || response.status !== 200 || response.type !== 'basic') {
                    return response;
                }

                const clone = response.clone();
                caches.open(CACHE_VERSION).then(cache => cache.put(event.request, clone));
                return response;
            });
        }).catch(() => {
            // Fallback për HTML
            if (event.request.mode === 'navigate') {
                return caches.match('/index.html');
            }
        })
    );
});

// ═══ MESSAGE ═══
self.addEventListener('message', (event) => {
    if (event.data && event.data.type === 'SKIP_WAITING') {
        self.skipWaiting();
    }
});

// ═══ NOTIFICATION ═══
self.addEventListener('notificationclick', (event) => {
    event.notification.close();
    event.waitUntil(
        clients.openWindow('/')
    );
});

console.log('✅ Service Worker ngarkuar');
