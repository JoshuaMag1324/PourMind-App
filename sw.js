'use strict';
const CACHE = 'pourmind-mobile-v2';
const FILES = [
  './', './index.html', './styles.css', './data.js', './methods.js', './app.js',
  './mobile.js', './manifest.webmanifest', './photo-files.json', './icons/apple-touch-icon.png',
  './icons/icon-192.png', './icons/icon-512.png', './icons/icon-maskable-512.png'
];
self.addEventListener('install', event => {
  event.waitUntil((async () => {
    const response = await fetch('./photo-files.json', {cache: 'no-store'});
    if (!response.ok) throw new Error('Photo catalogue unavailable');
    const photos = await response.json();
    const cache = await caches.open(CACHE);
    await cache.addAll([...FILES, ...photos.map(path => './' + path)]);
    await self.skipWaiting();
  })());
});
self.addEventListener('activate', event => {
  event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(key => key.startsWith('pourmind-mobile-') && key !== CACHE).map(key => caches.delete(key)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET' || new URL(event.request.url).origin !== self.location.origin) return;
  if (event.request.mode === 'navigate') {
    event.respondWith(fetch(event.request).catch(() => caches.open(CACHE).then(cache => cache.match('./index.html'))));
    return;
  }
  event.respondWith(caches.open(CACHE).then(async cache => (await cache.match(event.request, {ignoreSearch:true})) || fetch(event.request)));
});
