/* ============================================================
   PYM JSON - Service Worker
   Estrategia:
     - HTML / navegación  â†’ network-first (siempre busca lo nuevo)
     - Assets (CSS/JS)    â†’ cache-first + revalidación en background
     - Otros orígenes     â†’ pass-through (no cachea CDN)
   ============================================================ */

const CACHE_VERSION = 'pym-json-v2';   // â† subí este número cuando cambies archivos
const APP_ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './css/estilo.css',

  './js/config.js',
  './js/plataforma.js',
  './js/ui.js',
  './js/estado.js',
  './js/ventana.js',
  './js/menu.js',
  './js/main.js',

  './js/acciones/cargar-json.js',
  './js/acciones/json-a-csv.js',
  './js/acciones/split.js'
];

/* ============================================================
   INSTALL: precachear assets
   ============================================================ */
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_VERSION).then(async (cache) => {
      // Cachear uno por uno para que un 404 no rompa todo el install
      await Promise.all(
        APP_ASSETS.map(async (url) => {
          try {
            await cache.add(url);
          } catch (e) {
            console.warn('[SW] No se pudo cachear:', url, e.message);
          }
        })
      );
    })
  );
  self.skipWaiting();
});

/* ============================================================
   ACTIVATE: borrar caches viejos
   ============================================================ */
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => key !== CACHE_VERSION)
          .map((key) => {
            console.log('[SW] Borrando cache viejo:', key);
            return caches.delete(key);
          })
      )
    )
  );
  self.clients.claim();
});

/* ============================================================
   FETCH: estrategia según tipo de request
   ============================================================ */
self.addEventListener('fetch', (event) => {
  const req = event.request;

  // Solo GET
  if (req.method !== 'GET') return;

  // Ignorar esquemas raros
  let url;
  try {
    url = new URL(req.url);
  } catch {
    return;
  }

  // No cachear otros orígenes (CDN, APIs, etc.)
  if (url.origin !== self.location.origin) return;

  // ---- Navegación (HTML): network-first ----
  if (req.mode === 'navigate' || req.destination === 'document') {
    event.respondWith(networkFirst(req));
    return;
  }

  // ---- Assets: cache-first con revalidación ----
  event.respondWith(cacheFirst(req));
});

/* ============================================================
   Estrategias
   ============================================================ */
async function networkFirst(req) {
  const cache = await caches.open(CACHE_VERSION);
  try {
    const red = await fetch(req);
    // Guardar copia fresca
    cache.put(req, red.clone());
    return red;
  } catch {
    // Sin red â†’ usar cache; si no está, fallback al index
    const cached = await cache.match(req);
    if (cached) return cached;
    const index = await cache.match('./index.html');
    if (index) return index;
    return new Response('Sin conexión y sin cache disponible.', {
      status: 503,
      headers: { 'Content-Type': 'text/plain; charset=utf-8' }
    });
  }
}

async function cacheFirst(req) {
  const cache = await caches.open(CACHE_VERSION);
  const cached = await cache.match(req);
  if (cached) {
    // Revalidar en background (stale-while-revalidate)
    fetch(req).then((red) => {
      if (red && red.ok) cache.put(req, red.clone());
    }).catch(() => {});
    return cached;
  }
  // No está en cache â†’ ir a red y guardar
  try {
    const red = await fetch(req);
    if (red && red.ok) cache.put(req, red.clone());
    return red;
  } catch {
    return new Response('Recurso no disponible offline.', {
      status: 503,
      headers: { 'Content-Type': 'text/plain; charset=utf-8' }
    });
  }
}

/* ============================================================
   MENSAJES desde la app
   ============================================================ */
self.addEventListener('message', (event) => {
  const data = event.data || {};

  // Forzar actualización de cache
  if (data.type === 'SKIP_WAITING') {
    self.skipWaiting();
    return;
  }

  // Limpiar cache bajo demanda
  if (data.type === 'LIMPIAR_CACHE') {
    caches.keys().then((keys) =>
      Promise.all(keys.map((k) => caches.delete(k)))
    ).then(() => {
      event.source?.postMessage({ type: 'CACHE_LIMPIADO' });
    });
  }
});
