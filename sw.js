/* CPSR Yönetim Sistemi — çevrimdışı önbellek
   Program dosyası her açılışta önce internetten güncellenir (varsa),
   internet yoksa telefondaki son kopya açılır. Verileriniz bu önbellekte değil,
   cihazın kendi veritabanında (IndexedDB) durur. */
const CACHE = 'cpsr-v29-1';
const CORE = ['./', './index.html', './manifest.webmanifest', './icon-180.png', './icon-192.png', './icon-512.png'];
const CDN = [
  'https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js',
  'https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js'
];
self.addEventListener('install', e => {
  e.waitUntil((async () => {
    const c = await caches.open(CACHE);
    await c.addAll(CORE);
    await Promise.all(CDN.map(u => fetch(u, { mode: 'no-cors' }).then(r => c.put(u, r)).catch(() => {})));
    self.skipWaiting();
  })());
});
self.addEventListener('activate', e => {
  e.waitUntil((async () => {
    for (const k of await caches.keys()) if (k !== CACHE) await caches.delete(k);
    self.clients.claim();
  })());
});
self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  // Program sayfası: önce ağ (güncel sürüm), olmazsa önbellek
  if (req.mode === 'navigate' || (url.origin === location.origin && url.pathname.endsWith('.html'))) {
    e.respondWith((async () => {
      try {
        const r = await fetch(req);
        const c = await caches.open(CACHE); c.put('./index.html', r.clone());
        return r;
      } catch (_) {
        return (await caches.match('./index.html')) || (await caches.match('./'));
      }
    })());
    return;
  }
  // Diğer dosyalar ve kütüphaneler: önce önbellek, yoksa ağ
  e.respondWith((async () => {
    const hit = await caches.match(req);
    if (hit) return hit;
    try {
      const r = await fetch(req);
      if (url.origin === location.origin || CDN.includes(req.url)) {
        const c = await caches.open(CACHE); c.put(req, r.clone());
      }
      return r;
    } catch (_) { return hit || Response.error(); }
  })());
});
