/* Çevrimdışı önbellek: ilk açılışta tüm dosyaları kaydeder, sonra internetsiz çalışır.
   Dosyalarda değişiklik yaptığında VERSION değerini artır. */
const VERSION = 'keyif-v1';
const FILES = [
  './', './index.html', './manifest.json', './css/style.css', './js/core.js',
  './icon-192.png', './icon-512.png', './apple-touch-icon.png',
  './games/snake.js', './games/blocks.js', './games/breakout.js', './games/shooter.js',
  './games/mines.js', './games/pong.js', './games/chess.js', './games/dama.js',
  './games/solitaire.js', './games/connect4.js', './games/merge.js', './games/blockpuzzle.js',
  './games/bee.js', './games/runner.js', './games/bubble.js', './games/sudoku.js', './games/memory.js'
];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(VERSION).then(c => c.addAll(FILES)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== VERSION).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

// Önce önbellekten ver (anında + internetsiz), arka planda güncellemeyi dene
self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== self.location.origin) return;
  e.respondWith(
    caches.open(VERSION).then(cache =>
      cache.match(req, { ignoreSearch: true }).then(hit => {
        const net = fetch(req).then(res => {
          if (res && res.ok) cache.put(req, res.clone());
          return res;
        }).catch(() => hit);
        return hit || net;
      })
    )
  );
});
