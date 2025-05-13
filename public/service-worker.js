/* eslint-disable no-restricted-globals */ // <-- self için uyarıyı bastırır

const CACHE_NAME = 'anne-asistan-cache-v1';

const urlsToCache = [
  '/',
  '/index.html',
  '/manifest.json',
  '/favicon.ico',
  '/logo192.png',
  '/logo512.png',
  // Diğer sabit varlıkları da buraya ekleyebilirsin
];

// Kurulum sırasında önbelleğe alma
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('Opened cache');
        return cache.addAll(urlsToCache);
      })
  );
});

// Her istek geldiğinde önbellekten döndür, yoksa ağdan al
self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request).then((response) => {
      return response || fetch(event.request);
    })
  );
});

// Eski cache’leri temizleme
self.addEventListener('activate', (event) => {
  const cacheWhitelist = [CACHE_NAME];
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (!cacheWhitelist.includes(cacheName)) {
            return caches.delete(cacheName);
          }
          return null; // eslint: map içinde her zaman bir değer dönmeli
        })
      );
    })
  );
});
