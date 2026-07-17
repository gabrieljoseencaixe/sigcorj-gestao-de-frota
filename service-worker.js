// SIGCORJ — Service Worker
// Estratégia: cacheia só o "app shell" (HTML, manifest, ícones) para permitir
// abrir o app offline/instalado. Chamadas para o Supabase (dados) NUNCA são
// cacheadas aqui — sempre vão direto pra rede, pra não mostrar dado desatualizado.

var CACHE_NAME = 'sigcorj-shell-v1';
var APP_SHELL = [
  './index.html',
  './manifest.json',
  './icons/icon-72.png',
  './icons/icon-96.png',
  './icons/icon-128.png',
  './icons/icon-144.png',
  './icons/icon-152.png',
  './icons/icon-180.png',
  './icons/icon-192.png',
  './icons/icon-384.png',
  './icons/icon-512.png',
  './icons/icon-maskable-512.png'
];

self.addEventListener('install', function(event) {
  event.waitUntil(
    caches.open(CACHE_NAME).then(function(cache) {
      return cache.addAll(APP_SHELL);
    }).then(function() {
      return self.skipWaiting();
    })
  );
});

self.addEventListener('activate', function(event) {
  event.waitUntil(
    caches.keys().then(function(keys) {
      return Promise.all(
        keys.filter(function(k) { return k !== CACHE_NAME; })
            .map(function(k) { return caches.delete(k); })
      );
    }).then(function() {
      return self.clients.claim();
    })
  );
});

self.addEventListener('fetch', function(event) {
  var req = event.request;
  var url = new URL(req.url);

  // Nunca interceptar chamadas de API (Supabase ou qualquer domínio externo).
  // Só cacheamos requisições GET do próprio app (mesma origem).
  if (url.origin !== self.location.origin || req.method !== 'GET') {
    return;
  }

  event.respondWith(
    fetch(req)
      .then(function(res) {
        var resClone = res.clone();
        caches.open(CACHE_NAME).then(function(cache) { cache.put(req, resClone); });
        return res;
      })
      .catch(function() {
        return caches.match(req).then(function(cached) {
          return cached || caches.match('./index.html');
        });
      })
  );
});
