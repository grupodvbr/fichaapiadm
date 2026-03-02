/* ==============================
   CB SYSTEMS® - SERVICE WORKER
   VERSÃO ESTÁVEL / PRODUÇÃO
   ============================== */

const CACHE_NAME = "cb-systems-v2";

/* APENAS arquivos que EXISTEM fisicamente */
const CORE_ASSETS = [
  "/",
  "/index.html",
  "/home.html",
  "/dashboard.html",
  "/fichatecnica.html",
  "/analiseficha.html",
  "/consultaproduto.html",
  "/manifest.json"
];

/* ==============================
   INSTALL
   ============================== */
self.addEventListener("install", event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      return cache.addAll(CORE_ASSETS);
    })
  );
  self.skipWaiting();
});

/* ==============================
   ACTIVATE
   ============================== */
self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys.map(key => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      )
    )
  );
  self.clients.claim();
});

/* ==============================
   FETCH
   Estratégia correta:
   - HTML/JS/CSS → Cache First
   - Supabase / APIs → Network First
   ============================== */
self.addEventListener("fetch", event => {
  const req = event.request;

  if (req.method !== "GET") return;

  /* Supabase e APIs SEMPRE online */
  if (
    req.url.includes("supabase.co") ||
    req.url.includes("/api/")
  ) {
    event.respondWith(
      fetch(req).catch(() => caches.match(req))
    );
    return;
  }

  /* Arquivos estáticos */
  event.respondWith(
    caches.match(req).then(cacheRes => {
      return (
        cacheRes ||
        fetch(req).then(fetchRes => {
          return caches.open(CACHE_NAME).then(cache => {
            cache.put(req, fetchRes.clone());
            return fetchRes;
          });
        })
      );
    }).catch(() => {
      if (req.destination === "document") {
        return caches.match("/index.html");
      }
    })
  );
});
